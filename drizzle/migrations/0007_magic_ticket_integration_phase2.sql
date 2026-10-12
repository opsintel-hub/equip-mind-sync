ALTER TABLE public.magic_ticket_api_keys ADD COLUMN IF NOT EXISTS allowed_ips text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.magic_ticket_events ADD COLUMN IF NOT EXISTS reverted_at timestamptz;
ALTER TABLE public.magic_ticket_events ADD COLUMN IF NOT EXISTS reverted_reason text;
ALTER TABLE public.magic_ticket_events ADD COLUMN IF NOT EXISTS reverted_serial_number text;

CREATE TABLE public.magic_ticket_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  ticket_code text NOT NULL,
  pending_id uuid,
  gi_document_no text,
  api_key_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.magic_ticket_requests TO authenticated;
GRANT ALL ON public.magic_ticket_requests TO service_role;
ALTER TABLE public.magic_ticket_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read magic ticket requests" ON public.magic_ticket_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.magic_ticket_set_allowed_ips(p_id uuid, p_ips text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'เฉพาะ Super Admin เท่านั้น'; END IF;
  UPDATE public.magic_ticket_api_keys SET allowed_ips = coalesce((SELECT array_agg(DISTINCT trim(x)) FROM unnest(p_ips) x WHERE trim(x) <> ''), '{}')
  WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_set_allowed_ips(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magic_ticket_set_allowed_ips(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.magic_ticket_bind_ticket(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ticket text := nullif(trim(p->>'ticket_code'), ''); v_doc text := nullif(trim(p->>'gi_document_no'), '');
  v_dept text := nullif(trim(p->>'department_code'), ''); h public.goods_issue_pending%ROWTYPE; v_new boolean;
BEGIN
  IF v_ticket IS NULL OR v_doc IS NULL THEN
    RETURN jsonb_build_object('http_status', 400, 'body', jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'ต้องระบุ ticket_code และ gi_document_no'));
  END IF;
  SELECT * INTO h FROM public.goods_issue_pending WHERE document_no = v_doc;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('http_status', 404, 'body', jsonb_build_object('success', false, 'code', 'DOCUMENT_NOT_FOUND', 'message', 'ไม่พบเอกสาร ' || v_doc));
  END IF;
  IF h.status IN ('rejected','cancelled') THEN
    RETURN jsonb_build_object('http_status', 409, 'body', jsonb_build_object('success', false, 'code', 'DOCUMENT_CLOSED', 'message', 'เอกสารถูกปฏิเสธหรือยกเลิกแล้ว'));
  END IF;
  v_new := NOT EXISTS (SELECT 1 FROM public.magic_ticket_ticket_map WHERE ticket_code = v_ticket AND gi_document_no = h.document_no);
  INSERT INTO public.magic_ticket_ticket_map (ticket_code, gi_document_no, pending_id, department_code, event_count)
  VALUES (v_ticket, h.document_no, h.id, v_dept, 0)
  ON CONFLICT (ticket_code, gi_document_no) DO UPDATE SET department_code = coalesce(EXCLUDED.department_code, magic_ticket_ticket_map.department_code);
  RETURN jsonb_build_object('http_status', 200, 'body', jsonb_build_object('success', true, 'code', 'OK',
    'message', CASE WHEN v_new THEN 'ผูก Ticket สำเร็จ' ELSE 'Ticket ผูกกับเอกสารนี้อยู่แล้ว' END,
    'duplicate', NOT v_new, 'ticket_code', v_ticket, 'gi_document_no', h.document_no, 'status', h.status));
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_bind_ticket(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_bind_ticket(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.magic_ticket_issue_request(p jsonb, p_api_key_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req text := nullif(trim(p->>'request_id'), ''); v_ticket text := nullif(trim(p->>'ticket_code'), '');
  v_emp text := nullif(trim(p->>'employee_code'), ''); v_dept text := nullif(trim(p->>'department'), '');
  v_proj text := nullif(trim(p->>'department_code'), ''); v_purpose text := nullif(trim(p->>'purpose'), '');
  v_items jsonb := p->'items'; v_existing public.magic_ticket_requests%ROWTYPE;
  it jsonb; e public.equipment%ROWTYPE; v_qty numeric; v_err jsonb := '[]'::jsonb; v_lines jsonb := '[]'::jsonb;
  v_total int := 0; v_count int := 0; v_first public.equipment%ROWTYPE; v_pid uuid; v_doc text; v_purpose_id uuid;
  v_resp jsonb; v_pickup date;
BEGIN
  IF v_req IS NULL OR v_ticket IS NULL OR v_emp IS NULL OR v_dept IS NULL OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('http_status', 400, 'body', jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR',
      'message', 'ต้องระบุ request_id, ticket_code, employee_code, department และ items (อย่างน้อย 1 รายการ)'));
  END IF;
  IF jsonb_array_length(v_items) > 50 THEN
    RETURN jsonb_build_object('http_status', 400, 'body', jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'items ได้ไม่เกิน 50 รายการ'));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('magic_ticket_req:' || v_req));
  SELECT * INTO v_existing FROM public.magic_ticket_requests WHERE request_id = v_req;
  IF FOUND THEN RETURN jsonb_build_object('http_status', 200, 'body', v_existing.response || jsonb_build_object('duplicate', true)); END IF;

  IF NOT EXISTS (SELECT 1 FROM public.departments WHERE name = v_dept AND is_active) THEN
    RETURN jsonb_build_object('http_status', 422, 'body', jsonb_build_object('success', false, 'code', 'DEPARTMENT_NOT_FOUND', 'message', 'ไม่พบฝ่าย ' || v_dept));
  END IF;
  IF v_purpose IS NOT NULL THEN
    SELECT id INTO v_purpose_id FROM public.issue_purposes WHERE name = v_purpose AND is_active AND NOT coalesce(is_transfer, false) LIMIT 1;
    IF v_purpose_id IS NULL THEN
      RETURN jsonb_build_object('http_status', 422, 'body', jsonb_build_object('success', false, 'code', 'PURPOSE_NOT_FOUND', 'message', 'ไม่พบวัตถุประสงค์ ' || v_purpose));
    END IF;
  END IF;
  BEGIN v_pickup := nullif(p->>'pickup_date','')::date; EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('http_status', 400, 'body', jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'pickup_date ต้องเป็น YYYY-MM-DD'));
  END;

  FOR it IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    BEGIN v_qty := (it->>'quantity')::numeric; EXCEPTION WHEN others THEN v_qty := NULL; END;
    e := NULL;
    SELECT * INTO e FROM public.equipment WHERE code = trim(it->>'item_code') AND is_active AND department = v_dept LIMIT 1;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty <> trunc(v_qty) THEN
      v_err := v_err || jsonb_build_object('item_code', it->>'item_code', 'code', 'VALIDATION_ERROR', 'message', 'quantity ต้องเป็นจำนวนเต็มมากกว่า 0');
    ELSIF e.id IS NULL THEN
      v_err := v_err || jsonb_build_object('item_code', it->>'item_code', 'code', 'ITEM_NOT_FOUND', 'message', 'ไม่พบสินค้าในฝ่าย ' || v_dept);
    ELSIF coalesce(e.quantity_in_stock, 0) < v_qty THEN
      v_err := v_err || jsonb_build_object('item_code', e.code, 'code', 'INSUFFICIENT_STOCK', 'message', 'สต็อกคงเหลือ ' || coalesce(e.quantity_in_stock,0) || ' ไม่พอ', 'available_qty', coalesce(e.quantity_in_stock,0));
    ELSE
      IF v_count = 0 THEN v_first := e; END IF;
      v_count := v_count + 1; v_total := v_total + v_qty::int;
      v_lines := v_lines || jsonb_build_object('id', e.id, 'code', e.code, 'name', e.name, 'unit', coalesce(e.unit, 'ชิ้น'), 'qty', v_qty::int);
    END IF;
  END LOOP;
  IF jsonb_array_length(v_err) > 0 THEN
    RETURN jsonb_build_object('http_status', 409, 'body', jsonb_build_object('success', false, 'code', 'ITEM_VALIDATION_FAILED',
      'message', 'บางรายการไม่ผ่านการตรวจสอบ — ไม่ได้สร้างใบเบิก', 'errors', v_err));
  END IF;

  INSERT INTO public.goods_issue_pending (equipment_id, equipment_code, equipment_name, quantity, unit, purpose, purpose_id,
    requester_name, requester_department, notes, status, total_items, pickup_date, pickup_type, created_by, destination)
  VALUES (v_first.id, v_first.code, v_first.name, v_total, coalesce(v_first.unit, 'ชิ้น'), v_purpose, v_purpose_id,
    v_emp, v_dept, concat_ws(' | ', 'สร้างจาก Magic Ticket ' || v_ticket, 'Project: ' || v_proj, nullif(trim(p->>'notes'), '')),
    'pending', v_count, v_pickup, 'scheduled', NULL, nullif(trim(p->>'destination'), ''))
  RETURNING id, document_no INTO v_pid, v_doc;
  INSERT INTO public.goods_issue_pending_items (pending_id, equipment_id, equipment_code, equipment_name, quantity, unit, status, remaining_quantity, notes)
  SELECT v_pid, (l->>'id')::uuid, l->>'code', l->>'name', (l->>'qty')::int, l->>'unit', 'pending', (l->>'qty')::int, 'Magic Ticket ' || v_ticket
  FROM jsonb_array_elements(v_lines) l;
  INSERT INTO public.magic_ticket_ticket_map (ticket_code, gi_document_no, pending_id, department_code, event_count)
  VALUES (v_ticket, v_doc, v_pid, v_proj, 0) ON CONFLICT (ticket_code, gi_document_no) DO NOTHING;

  v_resp := jsonb_build_object('success', true, 'code', 'OK', 'message', 'สร้างใบเบิกสำเร็จ รอคลังอนุมัติและจ่าย', 'duplicate', false,
    'request_id', v_req, 'gi_document_no', v_doc, 'status', 'pending', 'total_items', v_count, 'total_quantity', v_total);
  INSERT INTO public.magic_ticket_requests (request_id, ticket_code, pending_id, gi_document_no, api_key_id, payload, response)
  VALUES (v_req, v_ticket, v_pid, v_doc, p_api_key_id, p, v_resp);
  RETURN jsonb_build_object('http_status', 201, 'body', v_resp);
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_issue_request(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_issue_request(jsonb, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.magic_ticket_revert_event(p jsonb, p_api_key_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id text := nullif(trim(p->>'event_id'), ''); v_reason text := nullif(trim(p->>'reason'), '');
  ev public.magic_ticket_events%ROWTYPE; l public.goods_issue_pending_items%ROWTYPE; v_inst numeric; v_ok boolean := true; v_resp jsonb;
BEGIN
  IF v_id IS NULL OR v_reason IS NULL THEN
    RETURN jsonb_build_object('http_status', 400, 'body', jsonb_build_object('success', false, 'code', 'VALIDATION_ERROR', 'message', 'ต้องระบุ event_id และ reason'));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('magic_ticket:' || v_id));
  SELECT * INTO ev FROM public.magic_ticket_events WHERE event_id = v_id AND status = 'applied' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('http_status', 404, 'body', jsonb_build_object('success', false, 'code', 'EVENT_NOT_FOUND', 'message', 'ไม่พบเหตุการณ์ที่บันทึกสำเร็จ ' || v_id));
  END IF;
  IF ev.reverted_at IS NOT NULL THEN
    RETURN jsonb_build_object('http_status', 200, 'body', jsonb_build_object('success', true, 'code', 'OK', 'duplicate', true, 'message', 'เหตุการณ์นี้ถูกยกเลิกไปแล้ว', 'event_id', v_id));
  END IF;
  SELECT * INTO l FROM public.goods_issue_pending_items WHERE id = ev.pending_item_id FOR UPDATE;

  IF ev.event_type = 'install' THEN
    v_inst := greatest(0, coalesce(l.installed_qty, CASE WHEN l.billboard_id IS NOT NULL THEN coalesce(l.issued_quantity, l.quantity, 0) ELSE 0 END) - ev.quantity);
    UPDATE public.goods_issue_pending_items SET installed_qty = v_inst,
      billboard_id = CASE WHEN v_inst = 0 THEN NULL ELSE billboard_id END,
      install_status = CASE WHEN v_inst = 0 THEN 'pending' ELSE install_status END,
      notes = concat_ws(' | ', nullif(notes, ''), 'Magic Ticket ยกเลิกการติดตั้ง ' || ev.quantity || ': ' || v_reason)
    WHERE id = l.id;
    IF v_inst = 0 AND l.media_player_id IS NOT NULL THEN
      UPDATE public.media_players SET billboard_id = NULL WHERE id = l.media_player_id AND billboard_id = ev.billboard_id;
    END IF;
  ELSIF ev.event_type = 'return_good' THEN
    UPDATE public.issue_good_returns SET status = 'cancelled' WHERE id = ev.linked_return_id AND status = 'pending';
    v_ok := FOUND;
    IF v_ok THEN UPDATE public.goods_issue_pending_items SET returned_good_qty = greatest(0, returned_good_qty - ev.quantity),
      notes = concat_ws(' | ', nullif(notes, ''), 'Magic Ticket ยกเลิกส่งคืนของดี ' || ev.quantity || ': ' || v_reason) WHERE id = l.id; END IF;
  ELSE
    UPDATE public.defective_returns SET status = 'cancelled' WHERE id = ev.linked_return_id AND status = 'pending_warehouse_entry';
    v_ok := FOUND;
    IF v_ok THEN UPDATE public.goods_issue_pending_items SET returned_defective_qty = greatest(0, returned_defective_qty - ev.quantity),
      notes = concat_ws(' | ', nullif(notes, ''), 'Magic Ticket ยกเลิกส่งคืนของเสีย ' || ev.quantity || ': ' || v_reason) WHERE id = l.id; END IF;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('http_status', 409, 'body', jsonb_build_object('success', false, 'code', 'ALREADY_PROCESSED_BY_WAREHOUSE',
      'message', 'คลังรับเข้าแล้ว ยกเลิกผ่าน API ไม่ได้ กรุณาติดต่อเจ้าหน้าที่คลัง', 'event_id', v_id));
  END IF;
  IF ev.event_type <> 'install' THEN
    UPDATE public.goods_issue_pending h SET is_complete = false,
      status = CASE WHEN EXISTS (SELECT 1 FROM public.goods_issue_pending_items i WHERE i.pending_id = h.id AND (i.returned_good_qty + i.returned_defective_qty) > 0) THEN 'partial_return' ELSE 'issued' END,
      return_quantity = (SELECT coalesce(sum(returned_good_qty + returned_defective_qty), 0) FROM public.goods_issue_pending_items i WHERE i.pending_id = h.id)
    WHERE h.id = ev.pending_id AND h.status IN ('returned','partial_return');
  ELSE
    UPDATE public.goods_issue_pending SET is_complete = false WHERE id = ev.pending_id;
  END IF;
  UPDATE public.magic_ticket_events SET reverted_at = now(), reverted_reason = v_reason, reverted_serial_number = serial_number, serial_number = NULL WHERE id = ev.id;
  v_resp := jsonb_build_object('success', true, 'code', 'OK', 'message', 'ยกเลิกเหตุการณ์สำเร็จ', 'duplicate', false, 'event_id', v_id,
    'item', public.magic_ticket_line_json(l.id));
  RETURN jsonb_build_object('http_status', 200, 'body', v_resp);
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_revert_event(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_revert_event(jsonb, uuid) TO service_role;