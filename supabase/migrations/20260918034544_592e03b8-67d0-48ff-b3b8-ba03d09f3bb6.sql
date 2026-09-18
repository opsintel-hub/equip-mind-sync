ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS departments text[] NOT NULL DEFAULT '{}';
UPDATE public.warehouses SET departments = ARRAY[department] WHERE department IS NOT NULL AND department <> '' AND cardinality(departments) = 0;
CREATE INDEX IF NOT EXISTS idx_warehouses_departments ON public.warehouses USING GIN (departments);