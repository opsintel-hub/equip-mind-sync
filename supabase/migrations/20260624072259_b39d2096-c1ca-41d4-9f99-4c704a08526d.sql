
-- 1. equipment_pm_history: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Users can view equipment_pm_history" ON public.equipment_pm_history;
CREATE POLICY "Users can view equipment_pm_history"
ON public.equipment_pm_history
FOR SELECT
TO authenticated
USING (true);

-- 2. equipment_pm_schedules: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Users can view equipment_pm_schedules" ON public.equipment_pm_schedules;
CREATE POLICY "Users can view equipment_pm_schedules"
ON public.equipment_pm_schedules
FOR SELECT
TO authenticated
USING (true);

-- 3. tool_pm_history: restrict SELECT to authenticated
DROP POLICY IF EXISTS "All authenticated users can view tool_pm_history" ON public.tool_pm_history;
CREATE POLICY "Authenticated users can view tool_pm_history"
ON public.tool_pm_history
FOR SELECT
TO authenticated
USING (true);

-- 4. suppliers: column-level restriction. Sensitive contact columns
-- (contact_person, phone, email, address, notes) only readable by admins
-- via SECURITY DEFINER RPC. Authenticated users keep SELECT on safe columns.
REVOKE SELECT ON public.suppliers FROM authenticated;
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (id, code, name, vendor_code, is_active, created_at, updated_at, created_by)
  ON public.suppliers TO authenticated;

CREATE OR REPLACE FUNCTION public.get_suppliers_admin()
RETURNS SETOF public.suppliers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  RETURN QUERY SELECT * FROM public.suppliers ORDER BY code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_suppliers_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_suppliers_admin() TO authenticated;
