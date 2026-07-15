
-- 1) Tighten billboard_equipment SELECT to users with an assigned role (staff)
DROP POLICY IF EXISTS "Authenticated users can view billboard equipment" ON public.billboard_equipment;

CREATE POLICY "Staff can view billboard equipment"
ON public.billboard_equipment
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- 2) Restrict INSERT on storage bucket 'delivery-confirmations' to staff roles
DROP POLICY IF EXISTS "Authenticated users can upload delivery confirmation files" ON storage.objects;

CREATE POLICY "Staff can upload delivery confirmation files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-confirmations'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
  )
);

-- 3) Restrict INSERT on storage bucket 'delivery-documents' to staff roles
DROP POLICY IF EXISTS "Authenticated users can upload delivery documents" ON storage.objects;

CREATE POLICY "Staff can upload delivery documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'warehouse_staff'::app_role)
  )
);
