-- Create equipment_pm_tasks table for tracking PM inspection results
CREATE TABLE public.equipment_pm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number TEXT NOT NULL UNIQUE,
  equipment_pm_schedule_id UUID NOT NULL REFERENCES public.equipment_pm_schedules(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.equipment_pm_tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  inspection_result TEXT CHECK (inspection_result IN ('passed', 'passed_incomplete', 'failed', 'recheck')),
  inspection_notes TEXT,
  observation_details TEXT,
  quantity_checked INTEGER,
  inspection_date TIMESTAMP WITH TIME ZONE,
  inspected_by UUID,
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_pm_task_images table for storing multiple images per task
CREATE TABLE public.equipment_pm_task_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_pm_task_id UUID NOT NULL REFERENCES public.equipment_pm_tasks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on both tables
ALTER TABLE public.equipment_pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_pm_task_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_pm_tasks
CREATE POLICY "Allow authenticated users to view equipment_pm_tasks"
  ON public.equipment_pm_tasks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert equipment_pm_tasks"
  ON public.equipment_pm_tasks FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update equipment_pm_tasks"
  ON public.equipment_pm_tasks FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete equipment_pm_tasks"
  ON public.equipment_pm_tasks FOR DELETE
  TO authenticated USING (true);

-- RLS policies for equipment_pm_task_images
CREATE POLICY "Allow authenticated users to view equipment_pm_task_images"
  ON public.equipment_pm_task_images FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert equipment_pm_task_images"
  ON public.equipment_pm_task_images FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete equipment_pm_task_images"
  ON public.equipment_pm_task_images FOR DELETE
  TO authenticated USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_equipment_pm_tasks_updated_at
  BEFORE UPDATE ON public.equipment_pm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for task numbers
CREATE SEQUENCE IF NOT EXISTS equipment_pm_task_number_seq START 1;

-- Create function to generate task number
CREATE OR REPLACE FUNCTION public.generate_equipment_pm_task_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'PMT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('equipment_pm_task_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Create storage bucket for PM task images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pm-task-images', 'pm-task-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pm-task-images bucket
CREATE POLICY "Allow authenticated users to upload pm task images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pm-task-images');

CREATE POLICY "Allow public to view pm task images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'pm-task-images');

CREATE POLICY "Allow authenticated users to delete pm task images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pm-task-images');

-- Create index for better query performance
CREATE INDEX idx_equipment_pm_tasks_schedule ON public.equipment_pm_tasks(equipment_pm_schedule_id);
CREATE INDEX idx_equipment_pm_tasks_status ON public.equipment_pm_tasks(status);
CREATE INDEX idx_equipment_pm_tasks_due_date ON public.equipment_pm_tasks(due_date);
CREATE INDEX idx_equipment_pm_task_images_task ON public.equipment_pm_task_images(equipment_pm_task_id);