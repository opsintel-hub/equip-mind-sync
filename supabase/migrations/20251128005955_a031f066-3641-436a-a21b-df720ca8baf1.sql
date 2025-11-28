-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(category_id, name)
);

-- Add subcategory_id to equipment table
ALTER TABLE public.equipment
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "All authenticated users can view categories"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS for subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS policies for subcategories
CREATE POLICY "All authenticated users can view subcategories"
ON public.subcategories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subcategories"
ON public.subcategories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on categories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on subcategories
CREATE TRIGGER update_subcategories_updated_at
BEFORE UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
('เครื่องมือ', 'เครื่องมือและอุปกรณ์'),
('วัสดุสิ้นเปลือง', 'วัสดุที่ใช้แล้วหมดไป'),
('อะไหล่', 'ชิ้นส่วนอะไหล่'),
('อุปกรณ์ไฟฟ้า', 'อุปกรณ์ไฟฟ้าและอิเล็กทรอนิกส์'),
('วัสดุก่อสร้าง', 'วัสดุสำหรับงานก่อสร้าง');