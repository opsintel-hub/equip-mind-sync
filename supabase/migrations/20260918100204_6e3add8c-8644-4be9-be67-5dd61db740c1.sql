DROP POLICY IF EXISTS "Staff can create pending receipts" ON public.goods_receipt_pending;

CREATE POLICY "Authorized users can create pending receipts"
ON public.goods_receipt_pending
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_function_permission(auth.uid(), 'delivery_entry')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
  OR public.has_role(auth.uid(), 'receiver')
);