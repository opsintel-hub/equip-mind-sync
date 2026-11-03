CREATE TABLE public.mp_sub_media_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_sub_media_types TO authenticated;
GRANT ALL ON public.mp_sub_media_types TO service_role;
ALTER TABLE public.mp_sub_media_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sub media types" ON public.mp_sub_media_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins insert sub media types" ON public.mp_sub_media_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update sub media types" ON public.mp_sub_media_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete sub media types" ON public.mp_sub_media_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_mp_sub_media_types_updated_at BEFORE UPDATE ON public.mp_sub_media_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mp_sub_media_types (name, sort_order)
SELECT v, ord FROM unnest(ARRAY['TOPSHELF_1','TOPSHELF_2','TOPSHELF_3','SPECIAL_1','SPECIAL_2','OVERVAULT_1','OVERVAULT_2','OPENTYPE_1','OPENTYPE_2']) WITH ORDINALITY AS t(v, ord);

CREATE OR REPLACE FUNCTION public.validate_mp_sub_media_type()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.department IS NOT NULL AND lower(btrim(NEW.department)) = lower('7-Eleven Media') THEN
    IF NEW.sub_media_type IS NULL OR btrim(NEW.sub_media_type) = '' THEN
      RAISE EXCEPTION 'ฝ่าย 7-Eleven Media ต้องระบุ Sub Media Type';
    END IF;
    -- Allow keeping an existing (possibly deactivated) value unchanged
    IF TG_OP = 'UPDATE' AND NEW.sub_media_type IS NOT DISTINCT FROM OLD.sub_media_type THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.mp_sub_media_types WHERE name = NEW.sub_media_type AND is_active) THEN
      RAISE EXCEPTION 'Sub Media Type ไม่ถูกต้อง: %', NEW.sub_media_type;
    END IF;
  ELSE
    NEW.sub_media_type := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.import_media_player_row(jsonb)'::regprocedure) INTO d;
  d := replace(d, 'ARRAY[''TOPSHELF_1'',''TOPSHELF_2'',''TOPSHELF_3'',''SPECIAL_1'',''SPECIAL_2'',''OVERVAULT_1'',''OVERVAULT_2'',''OPENTYPE_1'',''OPENTYPE_2'']',
    'COALESCE((SELECT array_agg(s.name) FROM public.mp_sub_media_types s WHERE s.is_active), ARRAY[]::text[])');
  EXECUTE d;
END
$do$;