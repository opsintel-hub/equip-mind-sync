DROP POLICY IF EXISTS "Staff and admins can create goods_issue_pending_items" ON public.goods_issue_pending_items;
CREATE POLICY "Owners and staff can create goods_issue_pending_items"
ON public.goods_issue_pending_items
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.goods_issue_pending p
    WHERE p.id = goods_issue_pending_items.pending_id
      AND (p.created_by = auth.uid() OR p.created_by IS NULL)
  )
);

DROP POLICY IF EXISTS "Staff and admins can update goods_issue_pending_items" ON public.goods_issue_pending_items;
CREATE POLICY "Owners and staff can update goods_issue_pending_items"
ON public.goods_issue_pending_items
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.goods_issue_pending p
    WHERE p.id = goods_issue_pending_items.pending_id
      AND p.created_by = auth.uid()
      AND p.status IN ('pending', 'pending_approval', 'rejected')
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.goods_issue_pending p
    WHERE p.id = goods_issue_pending_items.pending_id
      AND p.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Requesters and staff can create issue requests" ON public.goods_issue_pending;
CREATE POLICY "Authenticated users can create issue requests"
ON public.goods_issue_pending
FOR INSERT
TO authenticated
WITH CHECK (created_by IS NULL OR created_by = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.goods_issue_pending_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.goods_issue_pending TO authenticated;