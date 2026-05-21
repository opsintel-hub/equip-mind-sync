ALTER TABLE public.media_players
ADD COLUMN IF NOT EXISTS asset_caretaker text,
ADD COLUMN IF NOT EXISTS planned_install_location text;