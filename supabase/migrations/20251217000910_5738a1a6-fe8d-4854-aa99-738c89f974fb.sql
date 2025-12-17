-- Add warranty_expiry_date column to goods_receipt_pending table
ALTER TABLE public.goods_receipt_pending
ADD COLUMN warranty_expiry_date date;