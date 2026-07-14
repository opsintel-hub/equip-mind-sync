
-- 1. Restrict billboard_equipment SELECT to authenticated users only
DROP POLICY IF EXISTS "All authenticated users can view billboard equipment" ON public.billboard_equipment;

CREATE POLICY "Authenticated users can view billboard equipment"
ON public.billboard_equipment
FOR SELECT
TO authenticated
USING (true);

-- 2. Public RPC exposing only non-sensitive fields for QR public view
CREATE OR REPLACE FUNCTION public.public_get_billboard_equipment(_billboard_id uuid)
RETURNS TABLE (
  id uuid,
  billboard_id uuid,
  equipment_id uuid,
  quantity numeric,
  installation_date date,
  equipment_code text,
  equipment_name text,
  equipment_unit text,
  equipment_category text,
  expiry_date date,
  warranty_expiry_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    be.id,
    be.billboard_id,
    be.equipment_id,
    be.quantity::numeric,
    be.installation_date,
    e.code,
    e.name,
    e.unit,
    e.category,
    e.expiry_date,
    e.warranty_expiry_date
  FROM public.billboard_equipment be
  LEFT JOIN public.equipment e ON e.id = be.equipment_id
  WHERE be.billboard_id = _billboard_id;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_billboard_equipment(uuid) TO anon, authenticated;

-- 3. Storage bucket INSERT policies — restrict strictly to authenticated role
DROP POLICY IF EXISTS "Authenticated users can upload delivery confirmation files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload delivery documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media player images" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Images" ON storage.objects;

CREATE POLICY "Authenticated users can upload delivery confirmation files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-confirmations' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload delivery documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload media player images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-player-images' AND auth.uid() IS NOT NULL);
