-- Drop FK that prevents Media Player and Tool IDs from being logged in stock_movements
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_equipment_id_fkey;

-- Add index instead (for performance, but no FK constraint since equipment_id is polymorphic: equipment | media_player | tool)
CREATE INDEX IF NOT EXISTS idx_stock_movements_equipment_id ON public.stock_movements(equipment_id);