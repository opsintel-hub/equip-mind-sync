
-- Tool subcategories linked to tool_categories
CREATE TABLE IF NOT EXISTS public.tool_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tool_category_id UUID NOT NULL REFERENCES public.tool_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_subcategories TO authenticated;
GRANT ALL ON public.tool_subcategories TO service_role;

ALTER TABLE public.tool_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tool_subcategories"
  ON public.tool_subcategories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage tool_subcategories"
  ON public.tool_subcategories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tool_subcategories_updated_at
  BEFORE UPDATE ON public.tool_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tool_subcategories_category ON public.tool_subcategories(tool_category_id);

-- Link column in tools
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS tool_subcategory_id UUID REFERENCES public.tool_subcategories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tools_subcategory ON public.tools(tool_subcategory_id);
