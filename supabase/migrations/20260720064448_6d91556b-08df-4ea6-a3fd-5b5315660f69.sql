
CREATE TABLE IF NOT EXISTS public.tool_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tool_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_images TO authenticated;
GRANT ALL ON public.tool_images TO service_role;

ALTER TABLE public.tool_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tool images" ON public.tool_images FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage tool images" ON public.tool_images
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tool_images_tool_id ON public.tool_images(tool_id);

CREATE POLICY "Public read tool-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'tool-images');

CREATE POLICY "Authenticated upload tool-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tool-images');

CREATE POLICY "Authenticated update tool-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'tool-images');

CREATE POLICY "Authenticated delete tool-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'tool-images');
