ALTER TABLE public.goods_receipt_pending ADD COLUMN IF NOT EXISTS sub_media_type TEXT;
COMMENT ON COLUMN public.goods_receipt_pending.sub_media_type IS 'Sub Media Type for 7-Eleven Media MPs (TOPSHELF_1..OPENTYPE_2)';

-- Allow MP master with no department yet (sub_media_type stays NULL) but enforce if dept=7-Eleven Media
-- Trigger already exists from prior migration. No changes needed.
