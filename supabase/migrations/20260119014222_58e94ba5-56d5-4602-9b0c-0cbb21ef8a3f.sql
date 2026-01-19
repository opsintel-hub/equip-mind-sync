-- Create units table for dropdown
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert units" ON public.units FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update units" ON public.units FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete units" ON public.units FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some common units
INSERT INTO public.units (name, description) VALUES
  ('ชิ้น', 'หน่วยนับทั่วไป'),
  ('ตัว', 'หน่วยนับสำหรับอุปกรณ์'),
  ('อัน', 'หน่วยนับทั่วไป'),
  ('เมตร', 'หน่วยความยาว'),
  ('กล่อง', 'หน่วยบรรจุภัณฑ์'),
  ('ม้วน', 'หน่วยสำหรับสายไฟ/เทป'),
  ('แผ่น', 'หน่วยสำหรับแผ่นวัสดุ'),
  ('ชุด', 'หน่วยสำหรับชุดอุปกรณ์');

-- Add dimension columns to equipment table
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS depth_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS volume_cm3 NUMERIC(15,2);

-- Create equipment_images table
CREATE TABLE public.equipment_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read equipment images" ON public.equipment_images FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert equipment images" ON public.equipment_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update equipment images" ON public.equipment_images FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete equipment images" ON public.equipment_images FOR DELETE USING (true);

-- Create storage bucket for equipment images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for equipment images
CREATE POLICY "Anyone can view equipment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can update equipment images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can delete equipment images"
ON storage.objects FOR DELETE
USING (bucket_id = 'equipment-images');