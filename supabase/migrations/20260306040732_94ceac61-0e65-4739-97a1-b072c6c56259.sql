ALTER TABLE public.goods_receipt_pending 
ADD COLUMN IF NOT EXISTS activate_windows text,
ADD COLUMN IF NOT EXISTS media_player_image_url text;