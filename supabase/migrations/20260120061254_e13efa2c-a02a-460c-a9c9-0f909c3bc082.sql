-- Add receipt_purpose_id column to goods_receipt_pending table
ALTER TABLE public.goods_receipt_pending 
ADD COLUMN IF NOT EXISTS receipt_purpose_id uuid REFERENCES public.receipt_purposes(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_goods_receipt_pending_receipt_purpose_id 
ON public.goods_receipt_pending(receipt_purpose_id);