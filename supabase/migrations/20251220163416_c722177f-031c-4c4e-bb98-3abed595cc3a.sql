-- อัพเดท RLS policies สำหรับ goods_receipt_pending ให้ receiver จัดการได้
DROP POLICY IF EXISTS "Staff and admins can update pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Staff, admins and receivers can update pending receipts" 
ON public.goods_receipt_pending 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role));

-- อัพเดท RLS policies สำหรับ goods_receipt ให้ receiver สร้างได้
DROP POLICY IF EXISTS "Staff and admins can create goods receipts" ON public.goods_receipt;
CREATE POLICY "Staff, admins and receivers can create goods receipts" 
ON public.goods_receipt 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role));

-- อัพเดท RLS policies สำหรับ equipment ให้ receiver เพิ่มสต็อกได้
DROP POLICY IF EXISTS "Staff and admins can update equipment" ON public.equipment;
CREATE POLICY "Staff, admins and receivers can update equipment" 
ON public.equipment 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role));

DROP POLICY IF EXISTS "Staff and admins can insert equipment" ON public.equipment;
CREATE POLICY "Staff, admins and receivers can insert equipment" 
ON public.equipment 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role));