
-- Billboard Packages table
CREATE TABLE public.billboard_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  media_type TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billboard Package Items (links packages to billboards)
CREATE TABLE public.billboard_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.billboard_packages(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, billboard_id)
);

-- Enable RLS
ALTER TABLE public.billboard_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_package_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for billboard_packages
CREATE POLICY "Authenticated users can read billboard_packages" ON public.billboard_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert billboard_packages" ON public.billboard_packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update billboard_packages" ON public.billboard_packages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete billboard_packages" ON public.billboard_packages FOR DELETE TO authenticated USING (true);

-- RLS policies for billboard_package_items
CREATE POLICY "Authenticated users can read billboard_package_items" ON public.billboard_package_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert billboard_package_items" ON public.billboard_package_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete billboard_package_items" ON public.billboard_package_items FOR DELETE TO authenticated USING (true);
