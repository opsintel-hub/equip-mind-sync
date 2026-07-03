
-- 1) repair_actions master data
CREATE TABLE IF NOT EXISTS public.repair_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('hardware','software')),
  applies_to_device text NOT NULL DEFAULT 'both' CHECK (applies_to_device IN ('media_player','monitor','both')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_actions TO authenticated;
GRANT ALL ON public.repair_actions TO service_role;

ALTER TABLE public.repair_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair_actions read all authenticated"
  ON public.repair_actions FOR SELECT TO authenticated USING (true);

CREATE POLICY "repair_actions insert admin"
  ON public.repair_actions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "repair_actions update admin"
  ON public.repair_actions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "repair_actions delete admin"
  ON public.repair_actions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER update_repair_actions_updated_at
  BEFORE UPDATE ON public.repair_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.repair_actions (name, scope, applies_to_device, sort_order) VALUES
  ('ลง Windows ใหม่','software','media_player',10),
  ('ตั้งค่า CMS ใหม่','software','both',20),
  ('อัปเดต Firmware','software','both',30),
  ('Reset การตั้งค่า','software','both',40),
  ('เปลี่ยน HDD/SSD','hardware','media_player',110),
  ('เปลี่ยน RAM','hardware','media_player',120),
  ('เปลี่ยน Adaptor','hardware','both',130),
  ('เปลี่ยน Mainboard','hardware','media_player',140),
  ('เปลี่ยน Panel','hardware','monitor',210),
  ('เปลี่ยน T-CON board','hardware','monitor',220),
  ('เปลี่ยน Power board','hardware','monitor',230),
  ('เปลี่ยน Backlight','hardware','monitor',240),
  ('เปลี่ยนสาย LVDS','hardware','monitor',250),
  ('ทำความสะอาดภายใน','hardware','both',300)
ON CONFLICT DO NOTHING;

-- 2) assessment_logs new columns
ALTER TABLE public.assessment_logs
  ADD COLUMN IF NOT EXISTS repair_scope text[],
  ADD COLUMN IF NOT EXISTS repair_action_ids uuid[],
  ADD COLUMN IF NOT EXISTS repair_actions_snapshot jsonb;
