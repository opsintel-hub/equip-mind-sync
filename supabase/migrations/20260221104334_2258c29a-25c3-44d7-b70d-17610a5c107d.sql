
-- 1. เพิ่มคอลัมน์ใหม่ในตาราง tools
ALTER TABLE public.tools 
  ADD COLUMN IF NOT EXISTS is_asset boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS asset_code text,
  ADD COLUMN IF NOT EXISTS responsible_person text,
  ADD COLUMN IF NOT EXISTS is_personal_tool boolean DEFAULT false;

-- 2. สร้างตาราง tool_code_prefixes
CREATE TABLE public.tool_code_prefixes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix varchar(7) NOT NULL UNIQUE,
  description text,
  next_number integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.tool_code_prefixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view tool_code_prefixes"
  ON public.tool_code_prefixes FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage tool_code_prefixes"
  ON public.tool_code_prefixes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 3. Function สร้างรหัสเครื่องมืออัตโนมัติ
CREATE OR REPLACE FUNCTION public.get_next_tool_code(p_prefix varchar)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next_number INT;
  v_code TEXT;
BEGIN
  UPDATE public.tool_code_prefixes
  SET next_number = next_number + 1
  WHERE prefix = p_prefix
  RETURNING next_number - 1 INTO v_next_number;
  
  IF v_next_number IS NULL THEN
    RAISE EXCEPTION 'Prefix not found: %', p_prefix;
  END IF;
  
  v_code := p_prefix || ' ' || LPAD(v_next_number::TEXT, 4, '0');
  RETURN v_code;
END;
$$;

-- 4. สร้างตาราง technicians
CREATE TABLE public.technicians (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  department text,
  phone text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view technicians"
  ON public.technicians FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage technicians"
  ON public.technicians FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 5. สร้างตาราง technician_tools
CREATE TABLE public.technician_tools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(technician_id, tool_id)
);

ALTER TABLE public.technician_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view technician_tools"
  ON public.technician_tools FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage technician_tools"
  ON public.technician_tools FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 6. Trigger updated_at สำหรับตารางใหม่
CREATE TRIGGER update_tool_code_prefixes_updated_at
  BEFORE UPDATE ON public.tool_code_prefixes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_tools_updated_at
  BEFORE UPDATE ON public.technician_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
