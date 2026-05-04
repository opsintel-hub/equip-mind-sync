-- Split PO and PR document URLs into their own columns to match the 4 explicit upload fields in DeliveryEntry
ALTER TABLE public.goods_receipt_pending
  ADD COLUMN IF NOT EXISTS po_document_url text,
  ADD COLUMN IF NOT EXISTS pr_document_url text;

ALTER TABLE public.goods_receipt
  ADD COLUMN IF NOT EXISTS po_document_url text,
  ADD COLUMN IF NOT EXISTS pr_document_url text,
  ADD COLUMN IF NOT EXISTS invoice_document_url text,
  ADD COLUMN IF NOT EXISTS delivery_note_document_url text;

-- Backfill: for existing pending records, derive po/pr from purchase_document_url when it is a single URL
-- (we cannot reliably split historical combined values, leave them in purchase_document_url for legacy access)