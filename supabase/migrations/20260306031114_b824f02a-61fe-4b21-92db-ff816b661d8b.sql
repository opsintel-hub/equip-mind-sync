
-- Create media_player_names table
CREATE TABLE public.media_player_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.media_player_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view media_player_names" ON public.media_player_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and admins can manage media_player_names" ON public.media_player_names FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Create media_player_specifications table
CREATE TABLE public.media_player_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.media_player_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view media_player_specifications" ON public.media_player_specifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and admins can manage media_player_specifications" ON public.media_player_specifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));
