ALTER TABLE public.warehouse_access_tickets
  ADD COLUMN IF NOT EXISTS purpose_other text,
  ADD COLUMN IF NOT EXISTS admin_closed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_closed_by_name text,
  ADD COLUMN IF NOT EXISTS admin_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_close_reason text;

COMMENT ON COLUMN public.warehouse_access_tickets.assigned_location_id IS 'DEPRECATED: placement location no longer assigned on approval';
COMMENT ON COLUMN public.warehouse_access_tickets.assigned_location_note IS 'DEPRECATED: placement note no longer used';

CREATE OR REPLACE FUNCTION public.access_ticket_gate_stamp(_ticket_id uuid, _action text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t public.warehouse_access_tickets;
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
    UPDATE public.warehouse_access_tickets SET status='completed', checkout_at=now(), checkout_by=auth.uid() WHERE id=_ticket_id;
  ELSE
    RAISE EXCEPTION 'action ไม่ถูกต้อง';
  END IF;
  RETURN jsonb_build_object('ok', true, 'at', now());
END $function$;

CREATE OR REPLACE FUNCTION public.admin_close_access_ticket(_ticket_id uuid, _reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t public.warehouse_access_tickets; w public.warehouses; ok boolean := false; nm text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'กรุณาเข้าสู่ระบบ'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลการปิดตั๋ว'; END IF;
  SELECT * INTO t FROM public.warehouse_access_tickets WHERE id=_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบตั๋ว'; END IF;
  IF t.status NOT IN ('checked_in','approved') THEN RAISE EXCEPTION 'ปิดได้เฉพาะตั๋วที่อนุมัติแล้วหรืออยู่ในพื้นที่'; END IF;
  SELECT * INTO w FROM public.warehouses WHERE id=t.warehouse_id;
  IF has_role(auth.uid(),'super_admin') THEN ok := true;
  ELSIF has_role(auth.uid(),'admin') THEN
    ok := (w.department IS NOT NULL AND has_department_permission(auth.uid(), w.department, 'view'))
       OR EXISTS (SELECT 1 FROM unnest(coalesce(w.departments::text[], '{}'::text[])) d WHERE has_department_permission(auth.uid(), d, 'view'));
  END IF;
  IF NOT ok THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ปิดตั๋วของฝ่ายนี้ (ต้องเป็น Admin ของฝ่ายที่เกี่ยวข้อง หรือ Super Admin)'; END IF;
  SELECT coalesce(display_name, full_name) INTO nm FROM public.profiles WHERE id=auth.uid();
  UPDATE public.warehouse_access_tickets SET status='completed',
    checkout_at=coalesce(checkout_at, now()), checkout_by=auth.uid(),
    admin_closed_by=auth.uid(), admin_closed_by_name=nm, admin_closed_at=now(), admin_close_reason=left(trim(_reason),500)
  WHERE id=_ticket_id;
  RETURN jsonb_build_object('ok', true);
END $function$;

REVOKE ALL ON FUNCTION public.admin_close_access_ticket(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_close_access_ticket(uuid,text) TO authenticated;