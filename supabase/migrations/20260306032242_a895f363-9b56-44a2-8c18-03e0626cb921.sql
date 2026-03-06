
-- Create storage bucket for media player images
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-player-images', 'media-player-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create table for media player images (up to 10 per media player)
CREATE TABLE public.media_player_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_player_id uuid NOT NULL REFERENCES public.media_players(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.media_player_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view media player images"
  ON public.media_player_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert media player images"
  ON public.media_player_images FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update media player images"
  ON public.media_player_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete media player images"
  ON public.media_player_images FOR DELETE TO authenticated USING (true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload media player images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media-player-images');

CREATE POLICY "Anyone can view media player images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'media-player-images');

CREATE POLICY "Authenticated users can delete media player images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-player-images');
