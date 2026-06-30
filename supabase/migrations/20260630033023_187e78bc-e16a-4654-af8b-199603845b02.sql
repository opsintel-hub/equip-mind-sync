
-- ad_issue_requests: restrict to admin/warehouse/receiver roles
DROP POLICY IF EXISTS "Authenticated users can manage ad_issue_requests" ON public.ad_issue_requests;

CREATE POLICY "Admins and warehouse can manage ad_issue_requests"
  ON public.ad_issue_requests
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
  );

-- goods_receipt_pending: scope role to authenticated
DROP POLICY IF EXISTS "Admins can delete pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Admins can delete pending receipts"
  ON public.goods_receipt_pending
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Staff, admins and receivers can update pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Staff, admins and receivers can update pending receipts"
  ON public.goods_receipt_pending
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
    OR public.has_role(auth.uid(), 'receiver'::app_role)
  );
