DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('subcategories','Authenticated users can view subcategories'),
    ('media_player_code_prefixes','Allow authenticated users to read media_player_code_prefixes'),
    ('tool_pm_types','All authenticated users can view tool_pm_types'),
    ('equipment_images','Anyone can read equipment images'),
    ('tool_code_prefixes','All authenticated users can view tool_code_prefixes'),
    ('sections','Authenticated users can view sections'),
    ('tool_subcategories','Authenticated can read tool_subcategories'),
    ('mp_sub_media_types','Authenticated can view sub media types'),
    ('locations','All authenticated users can view locations'),
    ('tool_categories','Authenticated users can view tool_categories'),
    ('equipment_code_prefixes','Allow authenticated users to read equipment code prefixes')
  ) AS t(tbl, pol) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()))', 'Approved users can view ' || r.tbl, r.tbl);
  END LOOP;

  DROP POLICY IF EXISTS "Public can view locations for QR profile" ON public.locations;

  FOR r IN SELECT unnest(ARRAY['media-player-images','tool-images','delivery-documents','delivery-confirmations','tool-documents','ad-files','media-player-documents','pm-task-images','equipment-images']) AS b LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'Authenticated users can upload to ' || r.b);
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND owner_id = (auth.uid())::text AND public.is_approved_user(auth.uid()))', 'Authenticated users can upload to ' || r.b, r.b);
  END LOOP;
END $$;