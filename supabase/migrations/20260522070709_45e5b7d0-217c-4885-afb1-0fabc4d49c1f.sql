
-- Add PO Item No. and Warranty Years to support OCR data flow through to reports
ALTER TABLE public.media_players
  ADD COLUMN IF NOT EXISTS po_item_no text,
  ADD COLUMN IF NOT EXISTS warranty_years numeric;

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS po_item_no text,
  ADD COLUMN IF NOT EXISTS warranty_years numeric;

ALTER TABLE public.goods_receipt_pending
  ADD COLUMN IF NOT EXISTS po_item_no text,
  ADD COLUMN IF NOT EXISTS warranty_years numeric;

CREATE INDEX IF NOT EXISTS idx_media_players_po_item_no ON public.media_players(po_item_no) WHERE po_item_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_po_item_no ON public.equipment(po_item_no) WHERE po_item_no IS NOT NULL;
