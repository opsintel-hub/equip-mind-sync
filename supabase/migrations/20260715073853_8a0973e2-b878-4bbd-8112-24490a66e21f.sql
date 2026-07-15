ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS company_code text;
CREATE INDEX IF NOT EXISTS idx_suppliers_vendor_code ON public.suppliers (vendor_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id ON public.suppliers (tax_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_code ON public.suppliers (company_code);