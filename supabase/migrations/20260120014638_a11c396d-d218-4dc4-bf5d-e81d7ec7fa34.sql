-- Add dimension columns to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS width_cm numeric,
ADD COLUMN IF NOT EXISTS height_cm numeric,
ADD COLUMN IF NOT EXISTS depth_cm numeric,
ADD COLUMN IF NOT EXISTS volume_cm3 numeric,
ADD COLUMN IF NOT EXISTS used_volume_cm3 numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.locations.width_cm IS 'ความกว้าง (ซ้าย-ขวา) เป็นเซนติเมตร';
COMMENT ON COLUMN public.locations.height_cm IS 'ความสูง (บน-ล่าง) เป็นเซนติเมตร';
COMMENT ON COLUMN public.locations.depth_cm IS 'ความลึก (หน้า-หลัง) เป็นเซนติเมตร';
COMMENT ON COLUMN public.locations.volume_cm3 IS 'ปริมาตรรวม (กว้าง × สูง × ลึก) เป็นลูกบาศก์เซนติเมตร';
COMMENT ON COLUMN public.locations.used_volume_cm3 IS 'ปริมาตรที่ใช้ไปแล้ว เป็นลูกบาศก์เซนติเมตร';

-- Add dimension column to goods_receipt_pending for storage space tracking
ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS storage_volume_cm3 numeric;

COMMENT ON COLUMN public.goods_receipt_pending.storage_volume_cm3 IS 'ขนาดพื้นที่ที่ต้องการใช้ เป็นลูกบาศก์เซนติเมตร';