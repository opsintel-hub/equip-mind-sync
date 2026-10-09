ALTER TABLE public.goods_issue_pending_items ADD COLUMN IF NOT EXISTS written_off_qty numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.goods_issue_pending_items.written_off_qty IS 'Qty force-closed by Super Admin (consumed / no return / no billboard)';

CREATE TABLE public.special_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  target_table text,
  target_id uuid,
  target_item_id uuid,
  target_doc_number text,
  target_url text,
  quantity numeric,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  attachments text[] NOT NULL DEFAULT '{}',
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  requester_name text,
  department text,
  reviewed_by uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  review_notes text,
  executed_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_special_requests_status ON public.special_requests(status, created_at DESC);
CREATE INDEX idx_special_requests_requester ON public.special_requests(requested_by);
CREATE INDEX idx_special_requests_target ON public.special_requests(target_id);

GRANT SELECT, INSERT, UPDATE ON public.special_requests TO authenticated;
GRANT ALL ON public.special_requests TO service_role;
ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr select own or super admin" ON public.special_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sr insert own" ON public.special_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');
CREATE POLICY "sr update super admin" ON public.special_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "sr cancel own pending" ON public.special_requests FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() AND status = 'pending') WITH CHECK (requested_by = auth.uid() AND status IN ('pending','cancelled'));

CREATE OR REPLACE FUNCTION public.set_special_request_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seq int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) + 1 INTO v_seq FROM public.special_requests WHERE created_at::date = now()::date;
    NEW.request_number := 'SR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
    SELECT COALESCE(full_name, display_name) INTO NEW.requester_name FROM public.profiles WHERE id = NEW.requested_by;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_special_request_defaults BEFORE INSERT OR UPDATE ON public.special_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_special_request_defaults();

CREATE OR REPLACE FUNCTION public.notify_special_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, title, message, type, category, reference_id, reference_type)
    SELECT ur.user_id, 'คำร้องพิเศษใหม่ ' || NEW.request_number,
      COALESCE(NEW.requester_name,'ผู้ใช้') || ' ขอ: ' || NEW.request_type || COALESCE(' (' || NEW.target_doc_number || ')',''),
      CASE WHEN NEW.priority = 'urgent' THEN 'warning' ELSE 'info' END, 'system', NEW.id, 'special_request'
    FROM public.user_roles ur WHERE ur.role = 'super_admin';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','done') THEN
    INSERT INTO public.notifications(user_id, title, message, type, category, reference_id, reference_type)
    VALUES (NEW.requested_by, 'คำร้อง ' || NEW.request_number || CASE NEW.status WHEN 'rejected' THEN ' ไม่อนุมัติ' ELSE ' ดำเนินการแล้ว' END,
      COALESCE(NEW.review_notes, ''), CASE NEW.status WHEN 'rejected' THEN 'warning' ELSE 'success' END, 'system', NEW.id, 'special_request');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_special_request AFTER INSERT OR UPDATE ON public.special_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_special_request();

CREATE TRIGGER trg_audit_special_requests AFTER INSERT OR UPDATE ON public.special_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_activity('special_request');

-- Super Admin executes approval; auto actions for supported types
CREATE OR REPLACE FUNCTION public.review_special_request(_id uuid, _decision text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.special_requests; it public.goods_issue_pending_items; v_left numeric; v_qty numeric; v_name text; v_result jsonb := '{}'::jsonb; v_open int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'เฉพาะ Super Admin เท่านั้น'; END IF;
  SELECT * INTO r FROM public.special_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'ไม่พบคำร้อง'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'คำร้องนี้ถูกดำเนินการแล้ว'; END IF;
  SELECT COALESCE(full_name, display_name) INTO v_name FROM public.profiles WHERE id = auth.uid();

  IF _decision = 'rejected' THEN
    IF COALESCE(trim(_notes),'') = '' THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลที่ไม่อนุมัติ'; END IF;
    UPDATE public.special_requests SET status='rejected', reviewed_by=auth.uid(), reviewer_name=v_name, reviewed_at=now(), review_notes=_notes WHERE id=_id;
    RETURN jsonb_build_object('status','rejected');
  END IF;

  IF r.request_type = 'force_close_issue_item' THEN
    SELECT * INTO it FROM public.goods_issue_pending_items WHERE id = r.target_item_id FOR UPDATE;
    IF it.id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการเบิก'; END IF;
    v_left := GREATEST(COALESCE(NULLIF(it.issued_quantity,0), it.quantity)
      - COALESCE(it.installed_qty, CASE WHEN it.billboard_id IS NOT NULL THEN COALESCE(NULLIF(it.issued_quantity,0), it.quantity) ELSE 0 END)
      - COALESCE(it.returned_good_qty,0) - COALESCE(it.returned_defective_qty,0) - COALESCE(it.written_off_qty,0), 0);
    v_qty := LEAST(COALESCE(r.quantity, v_left), v_left);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'รายการนี้ไม่มียอดค้างแล้ว'; END IF;
    UPDATE public.goods_issue_pending_items
      SET written_off_qty = COALESCE(written_off_qty,0) + v_qty,
          notes = concat_ws(' | ', notes, 'ปิดพิเศษ ' || v_qty || ' โดย Super Admin (' || r.request_number || ')')
      WHERE id = it.id;
    SELECT COUNT(*) INTO v_open FROM public.goods_issue_pending_items i
      WHERE i.pending_id = it.pending_id AND i.status = 'issued'
        AND GREATEST(COALESCE(NULLIF(i.issued_quantity,0), i.quantity)
          - COALESCE(i.installed_qty, CASE WHEN i.billboard_id IS NOT NULL THEN COALESCE(NULLIF(i.issued_quantity,0), i.quantity) ELSE 0 END)
          - COALESCE(i.returned_good_qty,0) - COALESCE(i.returned_defective_qty,0) - COALESCE(i.written_off_qty,0), 0) > 0;
    IF v_open = 0 THEN
      UPDATE public.goods_issue_pending SET is_complete = true WHERE id = it.pending_id;
    END IF;
    v_result := jsonb_build_object('written_off', v_qty, 'document_closed', v_open = 0);
    UPDATE public.special_requests SET status='done', reviewed_by=auth.uid(), reviewer_name=v_name, reviewed_at=now(), review_notes=_notes, executed_result=v_result WHERE id=_id;
    RETURN v_result || jsonb_build_object('status','done');
  END IF;

  -- Manual types: approval = Super Admin will/has handled it on the target page
  UPDATE public.special_requests SET status = CASE WHEN _decision='done' THEN 'done' ELSE 'approved' END,
    reviewed_by=auth.uid(), reviewer_name=v_name, reviewed_at=now(), review_notes=_notes WHERE id=_id;
  RETURN jsonb_build_object('status', CASE WHEN _decision='done' THEN 'done' ELSE 'approved' END);
END $$;
REVOKE ALL ON FUNCTION public.review_special_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_special_request(uuid, text, text) TO authenticated;