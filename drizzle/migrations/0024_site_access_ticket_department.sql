ALTER TABLE public.warehouse_access_tickets ADD COLUMN IF NOT EXISTS department text;
COMMENT ON COLUMN public.warehouse_access_tickets.department IS 'Requester department chosen at booking from the requester''s permitted departments; legacy rows stay NULL and fall back to profile department in reports.';
DROP POLICY IF EXISTS "wat create" ON public.warehouse_access_tickets;
CREATE POLICY "wat create" ON public.warehouse_access_tickets FOR INSERT TO authenticated
WITH CHECK ((created_by = auth.uid()) AND (status = 'pending_assignment') AND (checkin_at IS NULL) AND (checkout_at IS NULL)
 AND (has_function_permission(auth.uid(), 'site_access_request') OR has_function_permission(auth.uid(), 'site_access_manage'))
 AND department IS NOT NULL
 AND (has_role(auth.uid(), 'super_admin') OR has_department_permission(auth.uid(), department, 'view')));
CREATE OR REPLACE FUNCTION public.site_access_report(_from timestamptz, _to timestamptz)
RETURNS TABLE(id uuid, ticket_no text, department text, warehouse_id uuid, warehouse_name text, contractor_name text, worker_count integer, purpose text, status text, created_at timestamptz, planned_start_at timestamptz, planned_end_at timestamptz, checkin_at timestamptz, checkout_at timestamptz, admin_closed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
SELECT t.id, t.ticket_no, COALESCE(t.department, p.department), t.warehouse_id, w.name, t.contractor_name, t.worker_count, t.purpose, t.status, t.created_at, t.planned_start_at, t.planned_end_at, t.checkin_at, t.checkout_at, t.admin_closed_at
FROM public.warehouse_access_tickets t
LEFT JOIN public.profiles p ON p.id = t.supervisor_id
LEFT JOIN public.warehouses w ON w.id = t.warehouse_id
WHERE auth.uid() IS NOT NULL
AND public.is_approved_user(auth.uid())
AND (public.has_role(auth.uid(), 'super_admin') OR public.has_department_permission(auth.uid(), COALESCE(t.department, p.department), 'view'))
AND _to > _from AND _to <= _from + interval '367 days'
AND ((t.created_at >= _from AND t.created_at < _to) OR (t.planned_start_at >= _from AND t.planned_start_at < _to) OR (t.checkin_at >= _from AND t.checkin_at < _to))
ORDER BY t.created_at DESC;
$$;