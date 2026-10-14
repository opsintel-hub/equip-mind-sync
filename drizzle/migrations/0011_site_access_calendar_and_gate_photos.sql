DROP POLICY IF EXISTS "wap add" ON public.warehouse_access_photos;
CREATE POLICY "wap add" ON public.warehouse_access_photos FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND EXISTS (
  SELECT 1 FROM public.warehouse_access_tickets t WHERE t.id = ticket_id AND t.status = 'checked_in'
  AND (t.supervisor_id = auth.uid() OR t.created_by = auth.uid()
    OR public.has_function_permission(auth.uid(),'site_access_manage')
    OR public.has_function_permission(auth.uid(),'site_access_gate'))));

CREATE OR REPLACE FUNCTION public.access_ticket_calendar(_from timestamptz, _to timestamptz)
RETURNS TABLE(id uuid, ticket_no text, warehouse_id uuid, warehouse_name text, warehouse_code text,
  supervisor_name text, department text, contractor_name text, worker_count int, purpose text,
  status text, planned_start_at timestamptz, planned_end_at timestamptz, checkin_at timestamptz, checkout_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.ticket_no, t.warehouse_id, w.name, w.code, t.supervisor_name, p.department,
    t.contractor_name, t.worker_count, t.purpose, t.status, t.planned_start_at, t.planned_end_at, t.checkin_at, t.checkout_at
  FROM public.warehouse_access_tickets t
  LEFT JOIN public.warehouses w ON w.id = t.warehouse_id
  LEFT JOIN public.profiles p ON p.id = t.supervisor_id
  WHERE auth.uid() IS NOT NULL AND t.status <> 'cancelled'
    AND t.planned_start_at < _to AND t.planned_end_at >= _from
  ORDER BY t.planned_start_at
$$;
REVOKE ALL ON FUNCTION public.access_ticket_calendar(timestamptz,timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.access_ticket_calendar(timestamptz,timestamptz) TO authenticated;