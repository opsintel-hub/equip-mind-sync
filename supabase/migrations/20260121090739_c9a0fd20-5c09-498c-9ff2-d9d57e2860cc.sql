-- Add PO/PR columns to goods_receipt_pending table
ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS po_number TEXT,
ADD COLUMN IF NOT EXISTS pr_number TEXT,
ADD COLUMN IF NOT EXISTS purchase_document_url TEXT;