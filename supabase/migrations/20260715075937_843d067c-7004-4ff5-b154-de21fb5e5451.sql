
CREATE TABLE IF NOT EXISTS public.media_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_sites TO authenticated;
GRANT ALL ON public.media_sites TO service_role;

ALTER TABLE public.media_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view media sites"
  ON public.media_sites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage media sites"
  ON public.media_sites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_media_sites_updated_at
  BEFORE UPDATE ON public.media_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from existing suppliers.media_site_name
INSERT INTO public.media_sites (name)
SELECT DISTINCT btrim(media_site_name)
FROM public.suppliers
WHERE media_site_name IS NOT NULL AND btrim(media_site_name) <> ''
ON CONFLICT (name) DO NOTHING;
