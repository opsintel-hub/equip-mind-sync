
DROP POLICY IF EXISTS "Authenticated upload tool-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update tool-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete tool-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload tool-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update tool-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete tool-documents" ON storage.objects;

CREATE POLICY "Staff upload tool-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tool-images' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff')));
CREATE POLICY "Staff update tool-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tool-images' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff') OR owner = auth.uid()));
CREATE POLICY "Staff delete tool-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tool-images' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff') OR owner = auth.uid()));

CREATE POLICY "Staff upload tool-documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tool-documents' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff')));
CREATE POLICY "Staff update tool-documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tool-documents' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff') OR owner = auth.uid()));
CREATE POLICY "Staff delete tool-documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tool-documents' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff') OR owner = auth.uid()));
