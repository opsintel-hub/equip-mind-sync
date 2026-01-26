-- Add media_player_id column to goods_issue_pending table
ALTER TABLE public.goods_issue_pending 
ADD COLUMN IF NOT EXISTS media_player_id uuid REFERENCES public.media_players(id);

-- Add is_media_player flag to goods_issue_pending table  
ALTER TABLE public.goods_issue_pending 
ADD COLUMN IF NOT EXISTS is_media_player boolean DEFAULT false;

-- Add media_player_id column to goods_issue_pending_items table
ALTER TABLE public.goods_issue_pending_items 
ADD COLUMN IF NOT EXISTS media_player_id uuid REFERENCES public.media_players(id);

-- Add is_media_player flag to goods_issue_pending_items table
ALTER TABLE public.goods_issue_pending_items 
ADD COLUMN IF NOT EXISTS is_media_player boolean DEFAULT false;