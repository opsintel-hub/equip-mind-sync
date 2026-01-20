-- Add new columns to goods_receipt_pending for department, warehouse, lot_number_2, document_file_name, and dimension fields
ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id),
ADD COLUMN IF NOT EXISTS lot_number_2 text,
ADD COLUMN IF NOT EXISTS document_file_name text,
ADD COLUMN IF NOT EXISTS storage_width_cm numeric,
ADD COLUMN IF NOT EXISTS storage_height_cm numeric,
ADD COLUMN IF NOT EXISTS storage_depth_cm numeric;