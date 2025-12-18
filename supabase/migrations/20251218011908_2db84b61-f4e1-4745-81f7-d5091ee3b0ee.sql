-- Add electrical specification columns to equipment table
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS volt numeric NULL,
ADD COLUMN IF NOT EXISTS amp numeric NULL,
ADD COLUMN IF NOT EXISTS watt numeric NULL,
ADD COLUMN IF NOT EXISTS lumen numeric NULL,
ADD COLUMN IF NOT EXISTS lux numeric NULL;