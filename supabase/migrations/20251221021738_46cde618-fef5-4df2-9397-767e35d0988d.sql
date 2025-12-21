-- Create equipment PM schedules table
CREATE TABLE public.equipment_pm_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'monthly',
  next_due_date DATE NOT NULL,
  last_completed_date DATE,
  advance_notice_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment PM history table
CREATE TABLE public.equipment_pm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_pm_schedule_id UUID NOT NULL REFERENCES public.equipment_pm_schedules(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_pm_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_pm_schedules
CREATE POLICY "Users can view equipment_pm_schedules"
  ON public.equipment_pm_schedules FOR SELECT
  USING (true);

CREATE POLICY "Users can create equipment_pm_schedules"
  ON public.equipment_pm_schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update equipment_pm_schedules"
  ON public.equipment_pm_schedules FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete equipment_pm_schedules"
  ON public.equipment_pm_schedules FOR DELETE
  USING (true);

-- RLS policies for equipment_pm_history
CREATE POLICY "Users can view equipment_pm_history"
  ON public.equipment_pm_history FOR SELECT
  USING (true);

CREATE POLICY "Users can create equipment_pm_history"
  ON public.equipment_pm_history FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_pm_schedules_updated_at
  BEFORE UPDATE ON public.equipment_pm_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();