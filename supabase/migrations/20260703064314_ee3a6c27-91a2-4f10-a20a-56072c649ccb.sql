
-- Tighten suppliers SELECT to privileged roles only (PII protection)
DROP POLICY IF EXISTS "All authenticated users can view suppliers" ON public.suppliers;

CREATE POLICY "Privileged roles can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role)
  OR has_role(auth.uid(), 'receiver'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Allow requesters to view their own ad_issue_requests
CREATE POLICY "Requesters can view own ad_issue_requests"
ON public.ad_issue_requests
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
