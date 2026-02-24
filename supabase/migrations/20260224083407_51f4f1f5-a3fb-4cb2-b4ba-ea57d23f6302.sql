
-- 1. Add brand_type to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS brand_type text DEFAULT 'equipment';

-- 2. Add supplier_id to media_players
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- 3. Add supplier_id to equipment
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- 4. Add supplier_id to tools
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);
