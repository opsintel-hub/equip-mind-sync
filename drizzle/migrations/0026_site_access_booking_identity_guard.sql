CREATE OR REPLACE FUNCTION public.access_ticket_calendar(_from timestamptz, _to timestamptz)
RETURNS TABLE(id uuid, ticket_no text, warehouse_id uuid, warehouse_name text, warehouse_code text, supervisor_name text, department text, contractor_name text, worker_count integer, purpose text, status text, planned_start_at timestamptz, planned_end_at timestamptz, checkin_at timestamptz, checkout_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT t.id, t.ticket_no, t.warehouse_id, w.name, w.code, t.supervisor_name, COALESCE(t.department, p.department),
 t.contractor_name, t.worker_count, t.purpose, t.status, t.planned_start_at, t.planned_end_at, t.checkin_at, t.checkout_at
 FROM public.warehouse_access_tickets t
 LEFT JOIN public.warehouses w ON w.id=t.warehouse_id
 LEFT JOIN public.profiles p ON p.id=t.supervisor_id
 WHERE auth.uid() IS NOT NULL AND t.status <> 'cancelled'
 AND t.planned_start_at < _to AND t.planned_end_at >= _from
 ORDER BY t.planned_start_at
$$;
REVOKE ALL ON FUNCTION public.access_ticket_calendar(timestamptz,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_ticket_calendar(timestamptz,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_access_ticket_booking_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE actor uuid := auth.uid(); super boolean := COALESCE(public.has_role(auth.uid(), 'super_admin'), false); expected_name text;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.supervisor_name IS DISTINCT FROM OLD.supervisor_name OR NEW.department IS DISTINCT FROM OLD.department OR NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
   IF actor IS NULL OR NOT super THEN
    RAISE EXCEPTION 'Only Super Admin can correct booking name or department' USING ERRCODE='42501';
   END IF;
   IF NEW.department IS DISTINCT FROM OLD.department AND (NEW.department IS NULL OR NOT EXISTS(SELECT 1 FROM public.departments d WHERE d.name=NEW.department AND d.is_active)) THEN
    RAISE EXCEPTION 'Invalid booking department' USING ERRCODE='23514';
   END IF;
  END IF;
 ELSIF actor IS NOT NULL THEN
  IF NEW.department IS NULL OR NOT EXISTS(SELECT 1 FROM public.departments d WHERE d.name=NEW.department AND d.is_active) OR (NOT super AND NOT public.has_department_permission(actor, NEW.department, 'view')) THEN
   RAISE EXCEPTION 'Booking department is not permitted' USING ERRCODE='42501';
  END IF;
  IF NOT super THEN
   SELECT COALESCE(NULLIF(p.display_name,''),p.full_name) INTO expected_name FROM public.profiles p WHERE p.id=actor;
   IF NEW.supervisor_id IS DISTINCT FROM actor OR NEW.created_by IS DISTINCT FROM actor OR NEW.supervisor_name IS DISTINCT FROM expected_name THEN
    RAISE EXCEPTION 'Booking name must match your profile' USING ERRCODE='42501';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_access_ticket_booking_identity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_access_ticket_booking_identity BEFORE INSERT OR UPDATE ON public.warehouse_access_tickets FOR EACH ROW EXECUTE FUNCTION public.guard_access_ticket_booking_identity();
COMMENT ON FUNCTION public.guard_access_ticket_booking_identity() IS 'Only Super Admin can correct saved booking identity; ordinary creation must use the actor profile and an allowed department. Status/gate updates remain unchanged.';