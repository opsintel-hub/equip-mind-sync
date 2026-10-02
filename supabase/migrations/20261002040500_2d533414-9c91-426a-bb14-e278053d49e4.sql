DO $$
DECLARE
  b text;
  buckets text[] := ARRAY[
    'delivery-confirmations','delivery-documents','equipment-images',
    'media-player-images','media-player-documents','ad-files',
    'tool-images','tool-documents','pm-task-images'
  ];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      'Authenticated users can upload to ' || b
    );
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      'Authenticated users can upload to ' || b, b
    );
  END LOOP;
END $$;

-- Drop the old role-restricted INSERT policies now superseded by the permissive ones above
DROP POLICY IF EXISTS "Staff can upload delivery confirmation files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload delivery documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload media player images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload media player documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload ad files" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload tool-images" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload tool-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff to upload pm task images" ON storage.objects;