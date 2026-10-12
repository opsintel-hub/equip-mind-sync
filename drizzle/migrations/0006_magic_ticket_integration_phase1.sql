CREATE TABLE public.magic_ticket_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  environment text NOT NULL DEFAULT 'UAT' CHECK (environment IN ('UAT','PROD')),
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
);
GRANT SELECT ON public.magic_ticket_api_keys TO authenticated;
GRANT ALL ON public.magic_ticket_api_keys TO service_role;
ALTER TABLE public.magic_ticket_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads magic ticket keys" ON public.magic_ticket_api_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.magic_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text,
  status text NOT NULL CHECK (status IN ('applied','rejected')),
  http_status integer NOT NULL,
  result_code text NOT NULL,
  message text,
  ticket_code text,
  department_code text,
  billboard_old_code text,
  employee_name text,
  gi_document_no text,
  item_code text,
  event_type text,
  quantity numeric,
  serial_number text,
  event_time timestamptz,
  pending_id uuid,
  pending_item_id uuid,
  billboard_id uuid,
  linked_return_id uuid,
  api_key_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX magic_ticket_events_applied_event_uidx ON public.magic_ticket_events (event_id) WHERE status = 'applied';
CREATE INDEX magic_ticket_events_item_idx ON public.magic_ticket_events (pending_item_id, status);
CREATE INDEX magic_ticket_events_created_idx ON public.magic_ticket_events (created_at DESC);
GRANT SELECT ON public.magic_ticket_events TO authenticated;
GRANT ALL ON public.magic_ticket_events TO service_role;
ALTER TABLE public.magic_ticket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read magic ticket events" ON public.magic_ticket_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.magic_ticket_ticket_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text NOT NULL,
  gi_document_no text NOT NULL,
  pending_id uuid,
  department_code text,
  event_count integer NOT NULL DEFAULT 0,
  first_event_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_code, gi_document_no)
);
GRANT SELECT ON public.magic_ticket_ticket_map TO authenticated;
GRANT ALL ON public.magic_ticket_ticket_map TO service_role;
ALTER TABLE public.magic_ticket_ticket_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read magic ticket map" ON public.magic_ticket_ticket_map FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Key management (Super Admin only). Plain key is returned once and never stored.
CREATE OR REPLACE FUNCTION public.magic_ticket_create_api_key(p_name text, p_environment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_key text; v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'เฉพาะ Super Admin เท่านั้น'; END IF;
  IF p_environment NOT IN ('UAT','PROD') THEN RAISE EXCEPTION 'environment ต้องเป็น UAT หรือ PROD'; END IF;
  v_key := 'mt_' || lower(p_environment) || '_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.magic_ticket_api_keys (name, environment, key_prefix, key_hash, created_by)
  VALUES (coalesce(nullif(trim(p_name),''), 'Magic Ticket'), p_environment, left(v_key, 12),
          encode(extensions.digest(v_key, 'sha256'), 'hex'), auth.uid())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'api_key', v_key);
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_create_api_key(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magic_ticket_create_api_key(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.magic_ticket_revoke_api_key(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'เฉพาะ Super Admin เท่านั้น'; END IF;
  UPDATE public.magic_ticket_api_keys SET is_active = false, revoked_at = now(), revoked_by = auth.uid() WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_revoke_api_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.magic_ticket_revoke_api_key(uuid) TO authenticated;

-- Helpers
CREATE OR REPLACE FUNCTION public.magic_ticket_split_serials(p text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(s ORDER BY ord), '{}') FROM (
    SELECT DISTINCT ON (lower(trim(x))) trim(x) AS s, ord
    FROM regexp_split_to_table(coalesce(p, ''), E'[\\n/]') WITH ORDINALITY AS t(x, ord)
    WHERE trim(x) <> '' ORDER BY lower(trim(x)), ord) d
$$;

CREATE OR REPLACE FUNCTION public.magic_ticket_line_json(p_item_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'pending_item_id', i.id,
    'item_code', i.equipment_code,
    'item_name', i.equipment_name,
    'unit', i.unit,
    'is_media_player', coalesce(i.is_media_player, i.media_player_id IS NOT NULL),
    'issued_qty', q.issued,
    'installed_qty', q.installed,
    'returned_good_qty', coalesce(i.returned_good_qty, 0),
    'returned_defective_qty', coalesce(i.returned_defective_qty, 0),
    'written_off_qty', coalesce(i.written_off_qty, 0),
    'transferred_qty', coalesce(i.transferred_qty, 0),
    'unused_qty', greatest(0, q.issued - q.installed - coalesce(i.returned_good_qty,0) - coalesce(i.returned_defective_qty,0)
                  - coalesce(i.written_off_qty,0) - coalesce(i.transferred_qty,0)),
    'needs_return', i.needs_return,
    'has_serial', cardinality(public.magic_ticket_split_serials(i.serial_number)) > 0,
    'serials', coalesce((
      SELECT jsonb_agg(jsonb_build_object('serial_number', s.sn, 'status',
        CASE (SELECT e.event_type FROM public.magic_ticket_events e
              WHERE e.pending_item_id = i.id AND e.status = 'applied' AND lower(e.serial_number) = lower(s.sn)
              ORDER BY e.created_at DESC LIMIT 1)
          WHEN 'install' THEN 'INSTALLED' WHEN 'return_good' THEN 'RETURNED' WHEN 'return_defective' THEN 'RETURNED'
          ELSE 'AVAILABLE' END) ORDER BY s.ord)
      FROM unnest(public.magic_ticket_split_serials(i.serial_number)) WITH ORDINALITY s(sn, ord)), '[]'::jsonb)
  )
  FROM public.goods_issue_pending_items i
  CROSS JOIN LATERAL (SELECT coalesce(i.issued_quantity, i.quantity, 0)::numeric AS issued,
    coalesce(i.installed_qty, CASE WHEN i.billboard_id IS NOT NULL THEN coalesce(i.issued_quantity, i.quantity, 0) ELSE 0 END)::numeric AS installed) q
  WHERE i.id = p_item_id
$$;
REVOKE ALL ON FUNCTION public.magic_ticket_line_json(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_line_json(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.magic_ticket_document_json(p_pending_id uuid, p_only_open boolean)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH lines AS (
    SELECT public.magic_ticket_line_json(i.id) AS j FROM public.goods_issue_pending_items i
    WHERE i.pending_id = p_pending_id AND coalesce(i.issued_quantity, 0) > 0 ORDER BY i.created_at, i.id
  )
  SELECT jsonb_build_object(
    'gi_document_no', h.document_no,
    'status', h.status,
    'request_date', h.created_at,
    'issued_at', h.issued_at,
    'requester_name', h.requester_name,
    'requester_department', h.requester_department,
    'company_name', c.name,
    'purpose', h.purpose,
    'ticket_codes', coalesce((SELECT jsonb_agg(m.ticket_code ORDER BY m.first_event_at) FROM public.magic_ticket_ticket_map m WHERE m.pending_id = h.id), '[]'::jsonb),
    'total_unused_qty', coalesce((SELECT sum((j->>'unused_qty')::numeric) FROM lines), 0),
    'items', coalesce((SELECT jsonb_agg(j) FROM lines WHERE NOT p_only_open OR (j->>'unused_qty')::numeric > 0), '[]'::jsonb)
  )
  FROM public.goods_issue_pending h LEFT JOIN public.companies c ON c.id = h.company_id
  WHERE h.id = p_pending_id
$$;
REVOKE ALL ON FUNCTION public.magic_ticket_document_json(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_document_json(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.magic_ticket_pending_usage(
  p_search text DEFAULT NULL, p_ticket_code text DEFAULT NULL, p_doc_no text DEFAULT NULL,
  p_department text DEFAULT NULL, p_include_consumed boolean DEFAULT false,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_term text := nullif(lower(trim(coalesce(p_search, ''))), ''); v_rows jsonb; v_total integer;
BEGIN
  WITH docs AS (
    SELECT h.id, h.created_at FROM public.goods_issue_pending h
    LEFT JOIN public.companies c ON c.id = h.company_id
    WHERE h.status IN ('issued','partial_return','partially_issued','returned')
      AND (p_doc_no IS NULL OR h.document_no ILIKE p_doc_no)
      AND (p_department IS NULL OR h.requester_department = p_department)
      AND (p_ticket_code IS NULL OR EXISTS (SELECT 1 FROM public.magic_ticket_ticket_map m WHERE m.pending_id = h.id AND m.ticket_code = p_ticket_code))
      AND (v_term IS NULL OR lower(concat_ws(' ', h.document_no, h.requester_name, h.requester_department, c.name, h.purpose)) LIKE '%' || v_term || '%'
           OR EXISTS (SELECT 1 FROM public.goods_issue_pending_items i WHERE i.pending_id = h.id
                      AND lower(concat_ws(' ', i.equipment_code, i.equipment_name, i.serial_number)) LIKE '%' || v_term || '%'))
      AND EXISTS (SELECT 1 FROM public.goods_issue_pending_items i WHERE i.pending_id = h.id AND coalesce(i.issued_quantity,0) > 0)
  ), built AS (
    SELECT d.created_at, public.magic_ticket_document_json(d.id, NOT p_include_consumed) AS j FROM docs d
  ), kept AS (
    SELECT * FROM built WHERE p_include_consumed OR (j->>'total_unused_qty')::numeric > 0
  )
  SELECT (SELECT count(*) FROM kept),
         coalesce((SELECT jsonb_agg(j ORDER BY created_at DESC) FROM (SELECT * FROM kept ORDER BY created_at DESC
           LIMIT least(greatest(coalesce(p_limit,50),1),200) OFFSET greatest(coalesce(p_offset,0),0)) x), '[]'::jsonb)
  INTO v_total, v_rows;
  RETURN jsonb_build_object('total', v_total, 'limit', least(greatest(coalesce(p_limit,50),1),200), 'offset', greatest(coalesce(p_offset,0),0), 'items', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_pending_usage(text, text, text, text, boolean, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_pending_usage(text, text, text, text, boolean, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.magic_ticket_work_log(p jsonb, p_api_key_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_id text := nullif(trim(p->>'event_id'), '');
  v_type text := p->>'event_type';
  v_doc text := nullif(trim(p->>'gi_document_no'), '');
  v_item text := nullif(trim(p->>'item_code'), '');
  v_ticket text := nullif(trim(p->>'ticket_code'), '');
  v_emp text := nullif(trim(p->>'employee_code'), '');
  v_dept text := nullif(trim(p->>'department_code'), '');
  v_old text := nullif(trim(p->>'billboard_old_code'), '');
  v_sn text := nullif(trim(p->>'serial_number'), '');
  v_qty numeric; v_time timestamptz;
  v_existing public.magic_ticket_events%ROWTYPE;
  h public.goods_issue_pending%ROWTYPE;
  l public.goods_issue_pending_items%ROWTYPE;
  v_serials text[]; v_issued numeric; v_installed numeric; v_left numeric;
  v_bb uuid; v_link uuid; v_http int := 200; v_code text := 'OK'; v_msg text; v_resp jsonb; v_settled boolean; v_returned numeric;
BEGIN
  BEGIN v_qty := (p->>'quantity')::numeric; EXCEPTION WHEN others THEN v_qty := NULL; END;
  BEGIN v_time := coalesce((p->>'event_time')::timestamptz, now()); EXCEPTION WHEN others THEN v_time := NULL; END;

  IF v_event_id IS NULL OR v_doc IS NULL OR v_item IS NULL OR v_ticket IS NULL OR v_emp IS NULL THEN
    v_http := 400; v_code := 'VALIDATION_ERROR'; v_msg := 'ต้องระบุ event_id, ticket_code, employee_code, gi_document_no และ item_code';
  ELSIF v_type IS NULL OR v_type NOT IN ('install','return_good','return_defective') THEN
    v_http := 400; v_code := 'VALIDATION_ERROR'; v_msg := 'event_type ต้องเป็น install, return_good หรือ return_defective';
  ELSIF v_qty IS NULL OR v_qty <= 0 OR v_qty <> trunc(v_qty) THEN
    v_http := 400; v_code := 'VALIDATION_ERROR'; v_msg := 'quantity ต้องเป็นจำนวนเต็มมากกว่า 0';
  ELSIF v_time IS NULL THEN
    v_http := 400; v_code := 'VALIDATION_ERROR'; v_msg := 'event_time ไม่ถูกต้อง (ISO 8601)';
  ELSIF v_type = 'install' AND v_old IS NULL THEN
    v_http := 400; v_code := 'VALIDATION_ERROR'; v_msg := 'การ install ต้องระบุ billboard_old_code';
  END IF;

  IF v_http = 200 THEN
    PERFORM pg_advisory_xact_lock(hashtext('magic_ticket:' || v_event_id));
    SELECT * INTO v_existing FROM public.magic_ticket_events WHERE event_id = v_event_id AND status = 'applied';
    IF FOUND THEN
      RETURN jsonb_build_object('http_status', 200, 'body', v_existing.response || jsonb_build_object('duplicate', true));
    END IF;

    SELECT * INTO h FROM public.goods_issue_pending WHERE document_no = v_doc FOR UPDATE;
    IF NOT FOUND THEN
      v_http := 404; v_code := 'DOCUMENT_NOT_FOUND'; v_msg := 'ไม่พบเอกสาร ' || v_doc;
    ELSIF h.status NOT IN ('issued','partial_return','partially_issued','returned') THEN
      v_http := 409; v_code := 'DOCUMENT_NOT_ISSUED'; v_msg := 'เอกสารยังไม่ได้จ่ายสินค้า (สถานะ ' || h.status || ')';
    ELSE
      SELECT * INTO l FROM public.goods_issue_pending_items i
      WHERE i.pending_id = h.id AND i.equipment_code = v_item AND coalesce(i.issued_quantity, 0) > 0
        AND (v_sn IS NULL OR lower(v_sn) = ANY (SELECT lower(x) FROM unnest(public.magic_ticket_split_serials(i.serial_number)) x))
      ORDER BY greatest(0, coalesce(i.issued_quantity,0)
        - coalesce(i.installed_qty, CASE WHEN i.billboard_id IS NOT NULL THEN coalesce(i.issued_quantity,0) ELSE 0 END)
        - coalesce(i.returned_good_qty,0) - coalesce(i.returned_defective_qty,0) - coalesce(i.written_off_qty,0) - coalesce(i.transferred_qty,0)) DESC, i.created_at
      LIMIT 1 FOR UPDATE;
      IF NOT FOUND THEN
        v_http := 404; v_code := CASE WHEN v_sn IS NULL THEN 'ITEM_NOT_FOUND' ELSE 'SERIAL_NOT_FOUND' END;
        v_msg := CASE WHEN v_sn IS NULL THEN 'ไม่พบสินค้า ' || v_item || ' ที่จ่ายแล้วในเอกสาร ' || v_doc
                      ELSE 'ไม่พบ S/N ' || v_sn || ' ของสินค้า ' || v_item || ' ในเอกสาร ' || v_doc END;
      END IF;
    END IF;
  END IF;

  IF v_http = 200 THEN
    v_serials := public.magic_ticket_split_serials(l.serial_number);
    v_issued := coalesce(l.issued_quantity, l.quantity, 0);
    v_installed := coalesce(l.installed_qty, CASE WHEN l.billboard_id IS NOT NULL THEN v_issued ELSE 0 END);
    v_left := greatest(0, v_issued - v_installed - coalesce(l.returned_good_qty,0) - coalesce(l.returned_defective_qty,0)
              - coalesce(l.written_off_qty,0) - coalesce(l.transferred_qty,0));
    IF cardinality(v_serials) > 0 AND v_sn IS NULL THEN
      v_http := 422; v_code := 'SERIAL_REQUIRED'; v_msg := 'สินค้านี้มี S/N ต้องระบุ serial_number';
    ELSIF cardinality(v_serials) > 0 AND v_qty <> 1 THEN
      v_http := 422; v_code := 'SERIAL_QUANTITY_MUST_BE_ONE'; v_msg := 'สินค้าที่มี S/N ต้องส่ง quantity = 1';
    ELSIF v_sn IS NOT NULL AND EXISTS (SELECT 1 FROM public.magic_ticket_events e WHERE e.pending_item_id = l.id
          AND e.status = 'applied' AND lower(e.serial_number) = lower(v_sn)) THEN
      v_http := 409; v_code := 'SERIAL_NOT_AVAILABLE'; v_msg := 'S/N ' || v_sn || ' ถูกใช้งานหรือคืนไปแล้ว';
    ELSIF v_qty > v_left THEN
      v_http := 409; v_code := 'QUANTITY_EXCEEDS_UNUSED'; v_msg := 'จำนวน ' || v_qty || ' เกินยอดคงเหลือ ' || v_left;
    END IF;
  END IF;

  IF v_http = 200 AND v_old IS NOT NULL THEN
    SELECT id INTO v_bb FROM public.billboards WHERE old_code = v_old ORDER BY created_at DESC LIMIT 1;
    IF v_bb IS NULL AND v_type = 'install' THEN
      v_http := 422; v_code := 'BILLBOARD_NOT_FOUND'; v_msg := 'ไม่พบป้าย OldCode ' || v_old;
    END IF;
  END IF;

  IF v_http = 200 THEN
    IF v_type = 'install' THEN
      UPDATE public.goods_issue_pending_items SET installed_qty = v_installed + v_qty, billboard_id = v_bb,
        install_status = 'installed', intended_billboard_id = NULL,
        notes = concat_ws(' | ', nullif(notes, ''), 'Magic Ticket ' || v_ticket || ' ติดตั้ง ' || v_qty || ' ที่ป้าย ' || v_old)
      WHERE id = l.id;
      IF l.media_player_id IS NOT NULL THEN
        UPDATE public.media_players SET billboard_id = v_bb WHERE id = l.media_player_id;
      END IF;
    ELSIF v_type = 'return_good' THEN
      INSERT INTO public.issue_good_returns (pending_id, pending_item_id, document_no, equipment_id, media_player_id, is_media_player,
        equipment_code, equipment_name, serial_number, quantity, unit, department, notes, submitted_by_name)
      VALUES (h.id, l.id, h.document_no, CASE WHEN l.media_player_id IS NULL THEN l.equipment_id END, l.media_player_id,
        coalesce(l.is_media_player, l.media_player_id IS NOT NULL), l.equipment_code, l.equipment_name, coalesce(v_sn, l.serial_number),
        v_qty, l.unit, h.requester_department, 'ส่งคืนผ่าน Magic Ticket ' || v_ticket, v_emp)
      RETURNING id INTO v_link;
      UPDATE public.goods_issue_pending_items SET returned_good_qty = coalesce(returned_good_qty,0) + v_qty, returned_at = now(),
        notes = concat_ws(' | ', nullif(notes, ''), 'Magic Ticket ' || v_ticket || ' ส่งคืนของดี ' || v_qty)
      WHERE id = l.id;
    ELSE
      INSERT INTO public.defective_returns (equipment_id, media_player_id, is_media_player, quantity, billboard_id, item_condition,
        reason, status, source_type, source_issue_item_id, source_document, dispose_status, reporter_name, reporter_department, notes)
      VALUES (CASE WHEN l.media_player_id IS NULL THEN l.equipment_id END, l.media_player_id, coalesce(l.is_media_player, l.media_player_id IS NOT NULL),
        v_qty, v_bb, 'defective', '[คืนจาก Magic Ticket ' || v_ticket || ']' || CASE WHEN v_sn IS NOT NULL THEN ' | S/N: ' || v_sn ELSE '' END,
        'pending_warehouse_entry', 'from_issue', l.id, h.document_no, 'pending_disposal_review', v_emp, h.requester_department,
        'Magic Ticket ' || v_ticket || coalesce(' / ' || v_dept, ''))
      RETURNING id INTO v_link;
      UPDATE public.goods_issue_pending_items SET returned_defective_qty = coalesce(returned_defective_qty,0) + v_qty, returned_at = now(),
        notes = concat_ws(' | ', nullif(notes, ''), 'Magic Ticket ' || v_ticket || ' ส่งคืนของเสีย ' || v_qty)
      WHERE id = l.id;
    END IF;

    SELECT coalesce(sum(coalesce(returned_good_qty,0) + coalesce(returned_defective_qty,0)), 0),
           bool_and(coalesce(returned_good_qty,0) + coalesce(returned_defective_qty,0) + coalesce(written_off_qty,0) + coalesce(transferred_qty,0)
             + coalesce(installed_qty, CASE WHEN billboard_id IS NOT NULL THEN coalesce(issued_quantity, quantity, 0) ELSE 0 END)
             >= coalesce(issued_quantity, quantity, 0))
      INTO v_returned, v_settled
    FROM public.goods_issue_pending_items WHERE pending_id = h.id;
    IF v_type <> 'install' THEN
      UPDATE public.goods_issue_pending SET return_quantity = v_returned, returned_at = now(),
        status = CASE WHEN v_settled THEN 'returned' ELSE 'partial_return' END,
        is_complete = CASE WHEN v_settled THEN true ELSE is_complete END
      WHERE id = h.id;
    ELSIF v_settled AND h.status <> 'partially_issued' THEN
      UPDATE public.goods_issue_pending SET is_complete = true WHERE id = h.id;
    END IF;

    INSERT INTO public.magic_ticket_ticket_map (ticket_code, gi_document_no, pending_id, department_code, event_count)
    VALUES (v_ticket, h.document_no, h.id, v_dept, 1)
    ON CONFLICT (ticket_code, gi_document_no) DO UPDATE SET event_count = magic_ticket_ticket_map.event_count + 1,
      last_event_at = now(), department_code = coalesce(EXCLUDED.department_code, magic_ticket_ticket_map.department_code);

    v_msg := 'บันทึกสำเร็จ';
    v_resp := jsonb_build_object('success', true, 'code', 'OK', 'message', v_msg, 'event_id', v_event_id, 'duplicate', false,
      'gi_document_no', h.document_no, 'linked_return_id', v_link, 'item', public.magic_ticket_line_json(l.id));
  ELSE
    v_resp := jsonb_build_object('success', false, 'code', v_code, 'message', v_msg, 'reason', v_msg, 'event_id', v_event_id,
      'unused_qty', CASE WHEN l.id IS NOT NULL THEN v_left END);
  END IF;

  INSERT INTO public.magic_ticket_events (event_id, status, http_status, result_code, message, ticket_code, department_code,
    billboard_old_code, employee_name, gi_document_no, item_code, event_type, quantity, serial_number, event_time,
    pending_id, pending_item_id, billboard_id, linked_return_id, api_key_id, payload, response)
  VALUES (v_event_id, CASE WHEN v_http = 200 THEN 'applied' ELSE 'rejected' END, v_http, v_code, v_msg, v_ticket, v_dept,
    v_old, v_emp, v_doc, v_item, v_type, v_qty, v_sn, v_time, h.id, l.id, v_bb, v_link, p_api_key_id, coalesce(p, '{}'::jsonb), v_resp);

  RETURN jsonb_build_object('http_status', v_http, 'body', v_resp);
END $$;
REVOKE ALL ON FUNCTION public.magic_ticket_work_log(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_work_log(jsonb, uuid) TO service_role;