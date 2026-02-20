
-- Create pm_action_types table (Master Data for PM actions)
CREATE TABLE public.pm_action_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  is_snooze boolean NOT NULL DEFAULT false,
  snooze_days integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pm_action_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pm_action_types
CREATE POLICY "All authenticated users can view pm_action_types"
  ON public.pm_action_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pm_action_types"
  ON public.pm_action_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial data
INSERT INTO public.pm_action_types (name, code, is_snooze, snooze_days, sort_order) VALUES
  ('นำไปสร้างตั๋วใหม่ในระบบติดตามงานซ่อม', 'create_ticket', false, null, 1),
  ('ซ่อนและกลับมาแสดงใหม่ใน 30 วัน', 'snooze_30', true, 30, 2),
  ('ซ่อนและกลับมาแสดงใหม่ใน 60 วัน', 'snooze_60', true, 60, 3),
  ('ซ่อนและกลับมาแสดงใหม่ใน 90 วัน', 'snooze_90', true, 90, 4);

-- Create billboard_pm_actions table (tracks snooze/ticket per billboard)
CREATE TABLE public.billboard_pm_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id uuid NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  action_type_id uuid REFERENCES public.pm_action_types(id),
  action_type text NOT NULL CHECK (action_type IN ('ticket_created', 'snoozed')),
  pm_reason text NOT NULL,
  snooze_until date,
  equipment_snapshot jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billboard_pm_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billboard_pm_actions
CREATE POLICY "All authenticated users can view billboard_pm_actions"
  ON public.billboard_pm_actions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert billboard_pm_actions"
  ON public.billboard_pm_actions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and staff can update billboard_pm_actions"
  ON public.billboard_pm_actions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

CREATE POLICY "Admins can delete billboard_pm_actions"
  ON public.billboard_pm_actions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_billboard_pm_actions_billboard_id ON public.billboard_pm_actions(billboard_id);
CREATE INDEX idx_billboard_pm_actions_snooze_until ON public.billboard_pm_actions(snooze_until);
CREATE INDEX idx_billboard_pm_actions_action_type ON public.billboard_pm_actions(action_type);

-- Create billboard_pm_history table (permanent history)
CREATE TABLE public.billboard_pm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id uuid NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  action_type_id uuid REFERENCES public.pm_action_types(id),
  action_label text NOT NULL,
  pm_reason text NOT NULL,
  equipment_snapshot jsonb,
  billboard_snapshot jsonb,
  notes text,
  actioned_by uuid,
  actioned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billboard_pm_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billboard_pm_history
CREATE POLICY "All authenticated users can view billboard_pm_history"
  ON public.billboard_pm_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert billboard_pm_history"
  ON public.billboard_pm_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage billboard_pm_history"
  ON public.billboard_pm_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_billboard_pm_history_billboard_id ON public.billboard_pm_history(billboard_id);
CREATE INDEX idx_billboard_pm_history_actioned_at ON public.billboard_pm_history(actioned_at);
CREATE INDEX idx_billboard_pm_history_action_type_id ON public.billboard_pm_history(action_type_id);
