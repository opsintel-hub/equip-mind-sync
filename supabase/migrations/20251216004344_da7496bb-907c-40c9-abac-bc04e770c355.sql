-- Add new columns to equipment table for enhanced tracking
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS unit_price numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS warehouse_entry_date date NOT NULL DEFAULT CURRENT_DATE;

-- Add index for serial number lookup
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number ON public.equipment(serial_number);

-- Add index for warehouse entry date for Dead Stock reporting
CREATE INDEX IF NOT EXISTS idx_equipment_warehouse_entry_date ON public.equipment(warehouse_entry_date);

-- Update goods_receipt_pending to include unit_price and serial_number
ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS serial_number text,
ADD COLUMN IF NOT EXISTS unit_price numeric;