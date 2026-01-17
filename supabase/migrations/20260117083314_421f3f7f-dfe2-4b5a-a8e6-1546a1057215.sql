-- Create receipt_purposes table
CREATE TABLE public.receipt_purposes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  purpose_type TEXT NOT NULL DEFAULT 'storage', -- 'storage' = ฝากเก็บ, 'regular' = นำเข้าปกติ
  max_storage_days INTEGER, -- จำนวนวันสูงสุดที่ฝากเก็บได้ (null = ไม่จำกัด)
  requires_location BOOLEAN NOT NULL DEFAULT false, -- ต้องระบุตำแหน่งจัดเก็บหรือไม่
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_purposes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view receipt_purposes"
ON public.receipt_purposes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert receipt_purposes"
ON public.receipt_purposes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update receipt_purposes"
ON public.receipt_purposes
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete receipt_purposes"
ON public.receipt_purposes
FOR DELETE
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_receipt_purposes_updated_at
  BEFORE UPDATE ON public.receipt_purposes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add vendor_code column to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS vendor_code TEXT;

-- Insert some default receipt purposes
INSERT INTO public.receipt_purposes (name, description, purpose_type, max_storage_days, requires_location) VALUES
('ฝากเก็บ (ไม่เกิน 24 ชั่วโมง)', 'ฝากเก็บชั่วคราวไม่เกิน 24 ชั่วโมง', 'storage', 1, false),
('ฝากเก็บชั่วคราว (ไม่เกิน 7 วัน)', 'ฝากเก็บชั่วคราวไม่เกิน 7 วัน', 'storage', 7, false),
('ฝากเก็บชั่วคราว (ไม่เกิน 30 วัน)', 'ฝากเก็บชั่วคราวไม่เกิน 30 วัน', 'storage', 30, false),
('ฝากเก็บ (ของขวัญปีใหม่)', 'ฝากเก็บของขวัญปีใหม่', 'storage', NULL, false),
('นำเข้าปกติ', 'นำสินค้าเข้าคลังปกติ ต้องจัดเก็บตามตำแหน่ง', 'regular', NULL, true),
('นำเข้าจากการซื้อ', 'นำสินค้าเข้าจากการสั่งซื้อ', 'regular', NULL, true);