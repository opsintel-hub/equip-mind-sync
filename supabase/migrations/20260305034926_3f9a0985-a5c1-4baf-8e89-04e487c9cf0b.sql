
ALTER TABLE public.goods_receipt_pending ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.goods_receipt_pending ADD COLUMN IF NOT EXISTS delivery_note_number text;
ALTER TABLE public.goods_receipt_pending ADD COLUMN IF NOT EXISTS invoice_document_url text;
ALTER TABLE public.goods_receipt_pending ADD COLUMN IF NOT EXISTS delivery_note_document_url text;

ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS delivery_note_number text;
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS delivery_note_document_url text;
