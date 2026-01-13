
-- Create tool_categories table for tool category management
CREATE TABLE public.tool_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create pm_types table for PM type management  
CREATE TABLE public.pm_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create pm_results table for PM inspection results
CREATE TABLE public.pm_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create tools table for tool management
CREATE TABLE public.tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tool_category_id UUID REFERENCES public.tool_categories(id),
  department TEXT,
  company_id UUID REFERENCES public.companies(id),
  brand TEXT,
  unit TEXT NOT NULL DEFAULT 'ชิ้น',
  initial_quantity INTEGER NOT NULL DEFAULT 1,
  current_quantity INTEGER NOT NULL DEFAULT 1,
  serial_number TEXT,
  unit_price NUMERIC DEFAULT 0,
  warehouse_entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID REFERENCES public.locations(id),
  expiry_date DATE,
  warranty_expiry_date DATE,
  has_warranty BOOLEAN DEFAULT true,
  pm_interval_days INTEGER DEFAULT 30,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create tool_pm_types junction table (many-to-many)
CREATE TABLE public.tool_pm_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  pm_type_id UUID NOT NULL REFERENCES public.pm_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tool_id, pm_type_id)
);

-- Create sequence for tool PM task numbers
CREATE SEQUENCE IF NOT EXISTS tool_pm_task_number_seq START 1;

-- Create function to generate tool PM task number
CREATE OR REPLACE FUNCTION public.generate_tool_pm_task_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TPM-' || lpad(nextval('tool_pm_task_number_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create tool_pm_tasks table
CREATE TABLE public.tool_pm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number TEXT NOT NULL DEFAULT generate_tool_pm_task_number(),
  tool_id UUID NOT NULL REFERENCES public.tools(id),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pm_result_id UUID REFERENCES public.pm_results(id),
  inspection_date TIMESTAMP WITH TIME ZONE,
  inspected_by UUID,
  inspector_name TEXT,
  inspection_notes TEXT,
  observation_details TEXT,
  quantity_checked INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tool_pm_task_images table
CREATE TABLE public.tool_pm_task_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_pm_task_id UUID NOT NULL REFERENCES public.tool_pm_tasks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create tool_pm_history table
CREATE TABLE public.tool_pm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_pm_task_id UUID NOT NULL REFERENCES public.tool_pm_tasks(id),
  tool_id UUID NOT NULL REFERENCES public.tools(id),
  completed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_by UUID,
  inspector_name TEXT,
  pm_result_id UUID REFERENCES public.pm_results(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_pm_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_pm_task_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_pm_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tool_categories
CREATE POLICY "All authenticated users can view tool_categories" ON public.tool_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage tool_categories" ON public.tool_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for pm_types
CREATE POLICY "All authenticated users can view pm_types" ON public.pm_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage pm_types" ON public.pm_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for pm_results
CREATE POLICY "All authenticated users can view pm_results" ON public.pm_results FOR SELECT USING (true);
CREATE POLICY "Admins can manage pm_results" ON public.pm_results FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tools
CREATE POLICY "All authenticated users can view tools" ON public.tools FOR SELECT USING (true);
CREATE POLICY "Staff and admins can manage tools" ON public.tools FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- RLS Policies for tool_pm_types
CREATE POLICY "All authenticated users can view tool_pm_types" ON public.tool_pm_types FOR SELECT USING (true);
CREATE POLICY "Staff and admins can manage tool_pm_types" ON public.tool_pm_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- RLS Policies for tool_pm_tasks
CREATE POLICY "All authenticated users can view tool_pm_tasks" ON public.tool_pm_tasks FOR SELECT USING (true);
CREATE POLICY "All authenticated users can manage tool_pm_tasks" ON public.tool_pm_tasks FOR ALL USING (true);

-- RLS Policies for tool_pm_task_images
CREATE POLICY "All authenticated users can view tool_pm_task_images" ON public.tool_pm_task_images FOR SELECT USING (true);
CREATE POLICY "All authenticated users can manage tool_pm_task_images" ON public.tool_pm_task_images FOR ALL USING (true);

-- RLS Policies for tool_pm_history
CREATE POLICY "All authenticated users can view tool_pm_history" ON public.tool_pm_history FOR SELECT USING (true);
CREATE POLICY "All authenticated users can create tool_pm_history" ON public.tool_pm_history FOR INSERT WITH CHECK (true);

-- Insert default PM types
INSERT INTO public.pm_types (name, description) VALUES
  ('ทำความสะอาด', 'ทำความสะอาดเครื่องมือ'),
  ('หยอดน้ำมัน', 'หยอดน้ำมันหล่อลื่น'),
  ('ตรวจนับจำนวน', 'ตรวจนับจำนวนเครื่องมือ'),
  ('ทดสอบความพร้อม', 'ทดสอบความพร้อมก่อนนำไปใช้งาน');

-- Insert default PM results
INSERT INTO public.pm_results (name, description, color) VALUES
  ('ผ่าน', 'ผ่านการตรวจสอบ', 'green'),
  ('ไม่ผ่าน', 'ไม่ผ่านการตรวจสอบ', 'red'),
  ('ต้องตรวจซ้ำ', 'ต้องทำการตรวจสอบซ้ำ', 'yellow'),
  ('จำหน่ายเสีย', 'เครื่องมือเสียหาย ต้องจำหน่าย', 'gray'),
  ('ต้องจัดหาเพิ่มเติม', 'ต้องจัดหาเครื่องมือเพิ่มเติม', 'blue'),
  ('ผ่านแบบไม่สมบูรณ์', 'ผ่านการตรวจสอบแต่มีข้อสังเกต', 'orange');

-- Insert default tool categories
INSERT INTO public.tool_categories (name, description) VALUES
  ('เครื่องมือวัด', 'เครื่องมือสำหรับการวัด'),
  ('อุปกรณ์ Safety', 'อุปกรณ์ความปลอดภัย'),
  ('เครื่องมือช่าง', 'เครื่องมือสำหรับช่าง'),
  ('เครื่องมือประจำตัว', 'เครื่องมือประจำตัวพนักงาน');

-- Create trigger for auto-create PM task after completion
CREATE OR REPLACE FUNCTION public.create_next_tool_pm_task()
RETURNS TRIGGER AS $$
DECLARE
  v_tool RECORD;
  v_next_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only trigger when task is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get tool info
    SELECT * INTO v_tool FROM public.tools WHERE id = NEW.tool_id;
    
    -- Calculate next due date
    v_next_due_date := NEW.inspection_date + (v_tool.pm_interval_days || ' days')::INTERVAL;
    
    -- Create new PM task
    INSERT INTO public.tool_pm_tasks (tool_id, due_date, status)
    VALUES (NEW.tool_id, v_next_due_date, 'pending');
    
    -- Insert into history
    INSERT INTO public.tool_pm_history (tool_pm_task_id, tool_id, completed_date, completed_by, inspector_name, pm_result_id, notes)
    VALUES (NEW.id, NEW.tool_id, NEW.inspection_date, NEW.inspected_by, NEW.inspector_name, NEW.pm_result_id, NEW.inspection_notes);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_next_tool_pm_task
  AFTER UPDATE ON public.tool_pm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_next_tool_pm_task();
