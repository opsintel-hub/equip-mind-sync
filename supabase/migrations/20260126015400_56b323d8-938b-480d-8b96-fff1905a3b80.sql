-- Add Media Player support columns to goods_receipt_pending table
ALTER TABLE public.goods_receipt_pending 
ADD COLUMN IF NOT EXISTS is_media_player boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS media_player_id uuid REFERENCES public.media_players(id);

-- Add index for media player lookups
CREATE INDEX IF NOT EXISTS idx_goods_receipt_pending_media_player_id 
ON public.goods_receipt_pending(media_player_id) 
WHERE media_player_id IS NOT NULL;