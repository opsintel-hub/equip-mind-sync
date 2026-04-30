
-- 1. Add disposal workflow fields to defective_returns
ALTER TABLE public.defective_returns
  ADD COLUMN IF NOT EXISTS disposal_method text,           -- 'destroy' | 'sell_scrap' | 'csr' | 'repair_return'
  ADD COLUMN IF NOT EXISTS dispose_status text NOT NULL DEFAULT 'pending_disposal_review',
  ADD COLUMN IF NOT EXISTS disposal_approved_by uuid,
  ADD COLUMN IF NOT EXISTS disposal_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS disposal_notes text,
  ADD COLUMN IF NOT EXISTS disposal_evidence_urls text[],
  ADD COLUMN IF NOT EXISTS swap_request_id uuid,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_defective_returns_dispose_status ON public.defective_returns(dispose_status);
CREATE INDEX IF NOT EXISTS idx_defective_returns_swap_request_id ON public.defective_returns(swap_request_id);

-- 2. Expand swap_requests to support all asset types
ALTER TABLE public.swap_requests
  ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'media_player', -- 'media_player' | 'equipment'
  ADD COLUMN IF NOT EXISTS old_equipment_id uuid,
  ADD COLUMN IF NOT EXISTS old_media_player_id uuid,
  ADD COLUMN IF NOT EXISTS old_serial_number text,
  ADD COLUMN IF NOT EXISTS new_equipment_id uuid,
  ADD COLUMN IF NOT EXISTS new_media_player_id uuid,
  ADD COLUMN IF NOT EXISTS new_serial_number text,
  ADD COLUMN IF NOT EXISTS defective_return_id uuid,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid;

CREATE INDEX IF NOT EXISTS idx_swap_requests_asset_type ON public.swap_requests(asset_type);
CREATE INDEX IF NOT EXISTS idx_swap_requests_defective_return_id ON public.swap_requests(defective_return_id);
