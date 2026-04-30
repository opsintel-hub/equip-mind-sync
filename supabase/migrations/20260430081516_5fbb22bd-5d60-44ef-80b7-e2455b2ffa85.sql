ALTER TABLE public.swap_requests
  ADD COLUMN IF NOT EXISTS reported_asset_type text,
  ADD COLUMN IF NOT EXISTS reported_equipment_id uuid,
  ADD COLUMN IF NOT EXISTS reported_media_player_id uuid,
  ADD COLUMN IF NOT EXISTS reported_billboard_equipment_id uuid,
  ADD COLUMN IF NOT EXISTS reported_item_name text,
  ADD COLUMN IF NOT EXISTS reported_item_code text,
  ADD COLUMN IF NOT EXISTS reported_serial_number text,
  ADD COLUMN IF NOT EXISTS reported_photos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS received_by uuid,
  ADD COLUMN IF NOT EXISTS received_by_name text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;