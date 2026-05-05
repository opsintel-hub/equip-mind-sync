
ALTER TABLE public.media_players
  ADD COLUMN IF NOT EXISTS is_refurbished boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refurbished_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refurbished_notes text;
