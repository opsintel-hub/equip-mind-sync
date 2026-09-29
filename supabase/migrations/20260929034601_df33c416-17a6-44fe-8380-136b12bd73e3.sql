CREATE TABLE public.warehouse_access_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text UNIQUE,
  warehouse_id uuid REFERENCES public.warehouses(id),
  supervisor_id uuid NOT NULL,
  supervisor_name text NOT NULL,
  supervisor_phone text,
  contractor_name text NOT NULL,
  worker_count integer NOT NULL DEFAULT 1 CHECK (worker_count >= 1),
  vehicle_plates text[] NOT NULL DEFAULT '{}',
  purpose text NOT NULL DEFAULT 'bring_in',
  items_description text,
  safety_acknowledged boolean NOT NULL DEFAULT false,
  planned_start_at timestamptz NOT NULL,
  planned_end_at timestamptz NOT NULL,
  assigned_location_id uuid REFERENCES public.locations(id),
  assigned_location_note text,
  assigned_by uuid,
  assigned_at timestamptz,
  reject_reason text,
  checkin_at timestamptz,
  checkin_by uuid,
  checkout_at timestamptz,
  checkout_by uuid,
  status text NOT NULL DEFAULT 'pending_assignment'
    CHECK (status IN ('pending_assignment','approved','checked_in','completed','rejected','cancelled')),
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_access_tickets TO authenticated;
GRANT ALL ON public.warehouse_access_tickets TO service_role;
ALTER TABLE public.warehouse_access_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wat_status ON public.warehouse_access_tickets(status);
CREATE INDEX idx_wat_planned ON public.warehouse_access_tickets(planned_start_at);

CREATE OR REPLACE FUNCTION public.set_access_ticket_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prefix text; _n int;
BEGIN
  IF NEW.ticket_no IS NULL OR NEW.ticket_no = '' THEN
    _prefix := 'WAP-' || to_char(now() AT TIME ZONE 'Asia/Bangkok','YYYYMMDD') || '-';
    PERFORM pg_advisory_xact_lock(hashtext(_prefix));
    SELECT COALESCE(MAX(substring(ticket_no from length(_prefix)+1)::int),0)+1 INTO _n
      FROM public.warehouse_access_tickets WHERE ticket_no LIKE _prefix || '%';
    NEW.ticket_no := _prefix || lpad(_n::text, 4, '0');
  END IF;
  IF NEW.planned_end_at <= NEW.planned_start_at THEN
    RAISE EXCEPTION 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_access_ticket_no BEFORE INSERT ON public.warehouse_access_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_access_ticket_no();
CREATE TRIGGER trg_access_ticket_updated BEFORE UPDATE ON public.warehouse_access_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "wat view" ON public.warehouse_access_tickets FOR SELECT TO authenticated
USING (created_by = auth.uid() OR supervisor_id = auth.uid()
  OR has_function_permission(auth.uid(),'site_access_manage')
  OR has_function_permission(auth.uid(),'site_access_gate'));
CREATE POLICY "wat create" ON public.warehouse_access_tickets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND status = 'pending_assignment'
  AND checkin_at IS NULL AND checkout_at IS NULL
  AND (has_function_permission(auth.uid(),'site_access_request') OR has_function_permission(auth.uid(),'site_access_manage')));
CREATE POLICY "wat owner edit pending" ON public.warehouse_access_tickets FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND status = 'pending_assignment')
WITH CHECK (created_by = auth.uid() AND status IN ('pending_assignment','cancelled') AND checkin_at IS NULL);
CREATE POLICY "wat manage" ON public.warehouse_access_tickets FOR ALL TO authenticated
USING (has_function_permission(auth.uid(),'site_access_manage'))
WITH CHECK (has_function_permission(auth.uid(),'site_access_manage'));

-- Gate check-in/out: server timestamp only
CREATE OR REPLACE FUNCTION public.access_ticket_gate_stamp(_ticket_id uuid, _action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.warehouse_access_tickets; _photos int;
BEGIN
  IF NOT (has_function_permission(auth.uid(),'site_access_gate') OR has_function_permission(auth.uid(),'site_access_manage')) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์บันทึกเวลาเข้า-ออก';
  END IF;
  SELECT * INTO t FROM public.warehouse_access_tickets WHERE id = _ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบตั๋ว'; END IF;
  IF _action = 'checkin' THEN
    IF t.status <> 'approved' THEN RAISE EXCEPTION 'ตั๋วยังไม่พร้อมเข้าพื้นที่ (สถานะ %)', t.status; END IF;
    UPDATE public.warehouse_access_tickets SET status='checked_in', checkin_at=now(), checkin_by=auth.uid() WHERE id=_ticket_id;
  ELSIF _action = 'checkout' THEN
    IF t.status <> 'checked_in' THEN RAISE EXCEPTION 'ตั๋วยังไม่ได้บันทึกเข้า'; END IF;
    SELECT count(DISTINCT photo_type) INTO _photos FROM public.warehouse_access_photos
      WHERE ticket_id=_ticket_id AND photo_type IN ('placement','cleanliness');
    IF _photos < 2 THEN RAISE EXCEPTION 'ยังไม่ส่งรูปตรวจพื้นที่ครบ — ห้ามปล่อยรถออก'; END IF;
    UPDATE public.warehouse_access_tickets SET status='completed', checkout_at=now(), checkout_by=auth.uid() WHERE id=_ticket_id;
  ELSE
    RAISE EXCEPTION 'action ไม่ถูกต้อง';
  END IF;
  RETURN jsonb_build_object('ok', true, 'at', now());
END $$;
REVOKE ALL ON FUNCTION public.access_ticket_gate_stamp(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.access_ticket_gate_stamp(uuid,text) TO authenticated;

CREATE TABLE public.warehouse_access_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.warehouse_access_tickets(id) ON DELETE CASCADE,
  photo_type text NOT NULL CHECK (photo_type IN ('placement','cleanliness','other')),
  image_url text NOT NULL,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.warehouse_access_photos TO authenticated;
GRANT ALL ON public.warehouse_access_photos TO service_role;
ALTER TABLE public.warehouse_access_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wap_ticket ON public.warehouse_access_photos(ticket_id);

CREATE POLICY "wap view" ON public.warehouse_access_photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.warehouse_access_tickets t WHERE t.id = ticket_id));
CREATE POLICY "wap add" ON public.warehouse_access_photos FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND EXISTS (
  SELECT 1 FROM public.warehouse_access_tickets t WHERE t.id = ticket_id AND t.status = 'checked_in'
  AND (t.supervisor_id = auth.uid() OR t.created_by = auth.uid() OR has_function_permission(auth.uid(),'site_access_manage'))));
CREATE POLICY "wap delete" ON public.warehouse_access_photos FOR DELETE TO authenticated
USING ((uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.warehouse_access_tickets t WHERE t.id=ticket_id AND t.status='checked_in'))
  OR has_function_permission(auth.uid(),'site_access_manage'));