
-- 1) billboard_equipment: remove any anon exposure; scope ALL policy to authenticated
DROP POLICY IF EXISTS "Staff and admins can manage billboard equipment" ON public.billboard_equipment;
DROP POLICY IF EXISTS "Staff can view billboard equipment" ON public.billboard_equipment;
DROP POLICY IF EXISTS "Anyone can view billboard equipment" ON public.billboard_equipment;
DROP POLICY IF EXISTS "Public read billboard equipment" ON public.billboard_equipment;

CREATE POLICY "Staff can view billboard equipment"
  ON public.billboard_equipment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Staff and admins can manage billboard equipment"
  ON public.billboard_equipment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 2) equipment_billboard_compatibility & equipment_compatibility_packages: role-based writes
DROP POLICY IF EXISTS "warehouse/admin write compat" ON public.equipment_billboard_compatibility;
CREATE POLICY "warehouse/admin write compat"
  ON public.equipment_billboard_compatibility FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

DROP POLICY IF EXISTS "warehouse/admin write compat pkg" ON public.equipment_compatibility_packages;
CREATE POLICY "warehouse/admin write compat pkg"
  ON public.equipment_compatibility_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 3) goods_issue_pending: enforce created_by = auth.uid() on insert
DROP POLICY IF EXISTS "Requesters and staff can create issue requests" ON public.goods_issue_pending;
CREATE POLICY "Requesters and staff can create issue requests"
  ON public.goods_issue_pending FOR INSERT TO authenticated
  WITH CHECK (
    (created_by IS NULL OR created_by = auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'requester'::app_role)
    )
  );

-- 4) tool_documents: restrict writes to staff roles
DROP POLICY IF EXISTS "Authenticated can insert tool documents" ON public.tool_documents;
DROP POLICY IF EXISTS "Authenticated can update tool documents" ON public.tool_documents;
DROP POLICY IF EXISTS "Authenticated can delete tool documents" ON public.tool_documents;

CREATE POLICY "Staff can insert tool documents"
  ON public.tool_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Staff can update tool documents"
  ON public.tool_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Staff can delete tool documents"
  ON public.tool_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 5) tool_images: restrict writes to staff roles
DROP POLICY IF EXISTS "Authenticated can manage tool images" ON public.tool_images;

CREATE POLICY "Staff can insert tool images"
  ON public.tool_images FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Staff can update tool images"
  ON public.tool_images FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Staff can delete tool images"
  ON public.tool_images FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 6) Storage: tighten equipment-images / media-player-images / tool-images / tool-documents
-- Require uploader ownership OR admin/super_admin for update & delete (warehouse_staff limited to own uploads)
DROP POLICY IF EXISTS "Owner or staff can update equipment-images" ON storage.objects;
DROP POLICY IF EXISTS "Owner or staff can delete equipment-images" ON storage.objects;
DROP POLICY IF EXISTS "Owner or staff can update media-player-images" ON storage.objects;
DROP POLICY IF EXISTS "Owner or staff can delete media-player-images" ON storage.objects;
DROP POLICY IF EXISTS "Staff update tool-images" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete tool-images" ON storage.objects;
DROP POLICY IF EXISTS "Staff update tool-documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete tool-documents" ON storage.objects;

CREATE POLICY "Owner or admin update equipment-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'equipment-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin delete equipment-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin update media-player-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media-player-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin delete media-player-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-player-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin update tool-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tool-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin delete tool-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tool-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin update tool-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tool-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY "Owner or admin delete tool-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tool-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role)));
