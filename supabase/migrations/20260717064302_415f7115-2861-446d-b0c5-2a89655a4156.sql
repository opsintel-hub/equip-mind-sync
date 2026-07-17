ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_code_key;
ALTER TABLE public.locations ADD CONSTRAINT locations_warehouse_id_code_key UNIQUE (warehouse_id, code);