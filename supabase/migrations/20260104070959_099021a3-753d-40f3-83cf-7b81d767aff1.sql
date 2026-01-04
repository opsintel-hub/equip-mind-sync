-- Add document_url column to goods_receipt table for storing document after receiving goods
ALTER TABLE public.goods_receipt
ADD COLUMN document_url TEXT NULL;