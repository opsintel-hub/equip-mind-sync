CREATE TABLE public.user_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sections TO authenticated;
GRANT ALL ON public.user_sections TO service_role;
ALTER TABLE public.user_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own section assignments"
  ON public.user_sections FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage section assignments"
  ON public.user_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_user_sections_updated_at
  BEFORE UPDATE ON public.user_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.section_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('equipment_category','equipment_subcategory','tool_category','tool_subcategory','mp_device_type')),
  ref_id uuid,
  ref_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX section_scopes_unique_idx
  ON public.section_scopes (section_id, scope_type, COALESCE(ref_id::text, ''), COALESCE(ref_text, ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_scopes TO authenticated;
GRANT ALL ON public.section_scopes TO service_role;
ALTER TABLE public.section_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view section scopes"
  ON public.section_scopes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage section scopes"
  ON public.section_scopes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_section_scopes_updated_at
  BEFORE UPDATE ON public.section_scopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.user_has_section(_user_id uuid, _section_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sections
    WHERE user_id = _user_id AND section_id = _section_id AND can_view
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_section_scopes(_user_id uuid)
RETURNS TABLE(section_id uuid, scope_type text, ref_id uuid, ref_text text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.section_id, s.scope_type, s.ref_id, s.ref_text
  FROM public.section_scopes s
  JOIN public.user_sections us ON us.section_id = s.section_id
  WHERE us.user_id = _user_id AND us.can_view;
$$;