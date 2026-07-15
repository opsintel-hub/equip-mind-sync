
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS keywords text[], ADD COLUMN IF NOT EXISTS examples text, ADD COLUMN IF NOT EXISTS usage_hint text;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS keywords text[], ADD COLUMN IF NOT EXISTS examples text, ADD COLUMN IF NOT EXISTS usage_hint text;
ALTER TABLE public.tool_categories ADD COLUMN IF NOT EXISTS keywords text[], ADD COLUMN IF NOT EXISTS examples text, ADD COLUMN IF NOT EXISTS usage_hint text;
ALTER TABLE public.tool_subcategories ADD COLUMN IF NOT EXISTS keywords text[], ADD COLUMN IF NOT EXISTS examples text, ADD COLUMN IF NOT EXISTS usage_hint text;
