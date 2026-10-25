CREATE OR REPLACE FUNCTION public.site_access_report(_from timestamptz, _to timestamptz)
RETURNS TABLE(id uuid, ticket_no text, department text, warehouse_id uuid, warehouse_name text, contractor_name text, worker_count integer, purpose text, status text, created_at timestamptz, planned_start_at timestamptz, planned_end_at timestamptz, checkin_at timestamptz, checkout_at timestamptz, admin_closed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
SELECT t.id, t.ticket_no, p.department, t.warehouse_id, w.name, t.contractor_name, t.worker_count, t.purpose, t.status, t.created_at, t.planned_start_at, t.planned_end_at, t.checkin_at, t.checkout_at, t.admin_closed_at
FROM public.warehouse_access_tickets t
LEFT JOIN public.profiles p ON p.id = t.supervisor_id
LEFT JOIN public.warehouses w ON w.id = t.warehouse_id
WHERE auth.uid() IS NOT NULL
AND public.is_approved_user(auth.uid())
AND (public.has_role(auth.uid(), 'super_admin') OR public.has_department_permission(auth.uid(), p.department, 'view'))
AND _to > _from AND _to <= _from + interval '367 days'
AND ((t.created_at >= _from AND t.created_at < _to) OR (t.planned_start_at >= _from AND t.planned_start_at < _to) OR (t.checkin_at >= _from AND t.checkin_at < _to))
ORDER BY t.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.site_access_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.site_access_report(timestamptz, timestamptz) TO authenticated, service_role;
COMMENT ON FUNCTION public.site_access_report(timestamptz, timestamptz) IS 'Read-only department-scoped analytics for approved users; excludes phones, vehicle plates, photos and notes. Range capped at 367 days.';