-- 1) ad reference data: require an approved (role-assigned) account
DROP POLICY IF EXISTS "Auth can view ad_media_types" ON public.ad_media_types;
CREATE POLICY "Approved users can view ad_media_types"
ON public.ad_media_types FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS "Auth can view ad_sizes" ON public.ad_sizes;
CREATE POLICY "Approved users can view ad_sizes"
ON public.ad_sizes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- 2) goods receipts: no blanket authenticated read
DROP POLICY IF EXISTS "All authenticated users can view goods receipts" ON public.goods_receipt;
CREATE POLICY "Approved users can view goods receipts"
ON public.goods_receipt FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Approved users can view pending receipts"
ON public.goods_receipt_pending FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- 3) image tables: require the referenced parent record to exist
DROP POLICY IF EXISTS "Staff can manage equipment_images" ON public.equipment_images;
CREATE POLICY "Staff can manage equipment_images"
ON public.equipment_images FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role)
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
   OR has_role(auth.uid(), 'warehouse_staff'::app_role) OR has_role(auth.uid(), 'receiver'::app_role))
  AND EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = equipment_images.equipment_id)
);

DROP POLICY IF EXISTS "Staff and admins can insert media player images" ON public.media_player_images;
CREATE POLICY "Staff and admins can insert media player images"
ON public.media_player_images FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
   OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  AND EXISTS (SELECT 1 FROM public.media_players m WHERE m.id = media_player_images.media_player_id)
);

DROP POLICY IF EXISTS "Staff and admins can update media player images" ON public.media_player_images;
CREATE POLICY "Staff and admins can update media player images"
ON public.media_player_images FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role)
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
   OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  AND EXISTS (SELECT 1 FROM public.media_players m WHERE m.id = media_player_images.media_player_id)
);

DROP POLICY IF EXISTS "Staff can insert tool images" ON public.tool_images;
CREATE POLICY "Staff can insert tool images"
ON public.tool_images FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
   OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  AND EXISTS (SELECT 1 FROM public.tools t WHERE t.id = tool_images.tool_id)
);

DROP POLICY IF EXISTS "Staff can update tool images" ON public.tool_images;
CREATE POLICY "Staff can update tool images"
ON public.tool_images FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'warehouse_staff'::app_role)
)
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
   OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  AND EXISTS (SELECT 1 FROM public.tools t WHERE t.id = tool_images.tool_id)
);