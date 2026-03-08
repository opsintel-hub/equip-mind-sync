ALTER TABLE public.direct_shipments
  ADD COLUMN IF NOT EXISTS pr_number text,
  ADD COLUMN IF NOT EXISTS pr_document_url text,
  ADD COLUMN IF NOT EXISTS po_document_url text;