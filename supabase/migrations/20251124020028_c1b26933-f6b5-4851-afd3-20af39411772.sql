-- Add department column to equipment table
ALTER TABLE public.equipment
ADD COLUMN department text;

-- Add comment for the column
COMMENT ON COLUMN public.equipment.department IS 'ฝ่ายที่รับผิดชอบอุปกรณ์';