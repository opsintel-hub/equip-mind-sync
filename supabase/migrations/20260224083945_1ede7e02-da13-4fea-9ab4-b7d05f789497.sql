-- 1. Add columns to media_players
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS model_id uuid;
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS usage_lifespan_months integer;
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS po_document_url text;
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS pr_document_url text;
ALTER TABLE public.media_players ADD COLUMN IF NOT EXISTS invoice_document_url text;

-- 2. Create media_player_models table
CREATE TABLE IF NOT EXISTS public.media_player_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Enable RLS for media_player_models
ALTER TABLE public.media_player_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view models" ON public.media_player_models
  FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage models" ON public.media_player_models
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- 3. Create media_player_statuses table
CREATE TABLE IF NOT EXISTS public.media_player_statuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  value text UNIQUE NOT NULL,
  label text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for media_player_statuses
ALTER TABLE public.media_player_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view statuses" ON public.media_player_statuses
  FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage statuses" ON public.media_player_statuses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Insert default statuses
INSERT INTO public.media_player_statuses (value, label) VALUES
  ('active', 'Active'),
  ('spare_office_bamed', 'Spare Office Bamed'),
  ('spare_office_planto_tw', 'Spare Office Planto Tw'),
  ('fix_or_break', 'Fix or Break'),
  ('claim', 'Claim'),
  ('spare_ow', 'Spare Ow'),
  ('spare_online', 'Spare Online พร้อมใช้งาน')
ON CONFLICT (value) DO NOTHING;

-- 4. Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('media-player-images', 'media-player-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media-player-documents', 'media-player-documents', true) ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Public Access Images" ON storage.objects FOR SELECT USING (bucket_id = 'media-player-images');
CREATE POLICY "Auth Upload Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media-player-images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Images" ON storage.objects FOR UPDATE USING (bucket_id = 'media-player-images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete Images" ON storage.objects FOR DELETE USING (bucket_id = 'media-player-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public Access Docs" ON storage.objects FOR SELECT USING (bucket_id = 'media-player-documents');
CREATE POLICY "Auth Upload Docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media-player-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Docs" ON storage.objects FOR UPDATE USING (bucket_id = 'media-player-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete Docs" ON storage.objects FOR DELETE USING (bucket_id = 'media-player-documents' AND auth.role() = 'authenticated');
