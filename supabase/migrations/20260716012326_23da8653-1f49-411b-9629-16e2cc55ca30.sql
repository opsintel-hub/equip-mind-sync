DROP POLICY IF EXISTS "Authenticated users can upload media player images" ON storage.objects;
CREATE POLICY "Staff can upload media player images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-player-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'warehouse_staff'::app_role)
  )
);