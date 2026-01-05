-- Ensure RLS is enabled on audit-relevant table
ALTER TABLE public.goods_receipt ENABLE ROW LEVEL SECURITY;

-- Explicitly restrict modifications to admins only (audit trail protection)
DROP POLICY IF EXISTS "Only admins can update goods receipts" ON public.goods_receipt;
CREATE POLICY "Only admins can update goods receipts"
ON public.goods_receipt
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can delete goods receipts" ON public.goods_receipt;
CREATE POLICY "Only admins can delete goods receipts"
ON public.goods_receipt
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Tighten PM task images storage access
-- Remove overly-broad policies (names based on existing configuration)
DROP POLICY IF EXISTS "Allow authenticated users to upload pm task images" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff to upload pm task images" ON storage.objects;
CREATE POLICY "Allow staff to upload pm task images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pm-task-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'warehouse_staff'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Allow public to view pm task images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to view pm task images" ON storage.objects;
CREATE POLICY "Allow authenticated to view pm task images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'pm-task-images');

DROP POLICY IF EXISTS "Allow authenticated users to delete pm task images" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner or admin to delete pm task images" ON storage.objects;
CREATE POLICY "Allow owner or admin to delete pm task images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pm-task-images'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
