ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS pr_number text,
  ADD COLUMN IF NOT EXISTS invoice_number text;