ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_companies_aliases ON public.companies USING GIN (aliases);