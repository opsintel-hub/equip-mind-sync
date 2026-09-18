GRANT SELECT, INSERT, UPDATE ON public.delivery_confirmations TO authenticated;
GRANT ALL ON public.delivery_confirmations TO service_role;

DROP POLICY IF EXISTS "Staff can insert delivery_confirmations" ON public.delivery_confirmations;
CREATE POLICY "Authorized users can insert delivery_confirmations"
ON public.delivery_confirmations
FOR INSERT
TO authenticated
WITH CHECK (
  confirmed_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'warehouse_staff')
    OR public.has_role(auth.uid(), 'receiver')
    OR EXISTS (
      SELECT 1
      FROM public.goods_issue_pending gip
      WHERE gip.id = delivery_confirmations.goods_issue_pending_id
        AND gip.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.direct_shipments ds
      WHERE ds.id = delivery_confirmations.direct_shipment_id
        AND ds.created_by = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Staff can update delivery_confirmations" ON public.delivery_confirmations;
CREATE POLICY "Authorized users can update delivery_confirmations"
ON public.delivery_confirmations
FOR UPDATE
TO authenticated
USING (
  confirmed_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
  OR public.has_role(auth.uid(), 'receiver')
)
WITH CHECK (
  confirmed_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'warehouse_staff')
  OR public.has_role(auth.uid(), 'receiver')
);