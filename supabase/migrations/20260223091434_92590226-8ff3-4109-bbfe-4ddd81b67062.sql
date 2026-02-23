
-- 1. Create media_player_code_prefixes table
CREATE TABLE public.media_player_code_prefixes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix varchar(7) NOT NULL UNIQUE,
  description text,
  next_number integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.media_player_code_prefixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read media_player_code_prefixes" ON public.media_player_code_prefixes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert media_player_code_prefixes" ON public.media_player_code_prefixes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update media_player_code_prefixes" ON public.media_player_code_prefixes FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete media_player_code_prefixes" ON public.media_player_code_prefixes FOR DELETE USING (true);

CREATE TRIGGER update_media_player_code_prefixes_updated_at
  BEFORE UPDATE ON public.media_player_code_prefixes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create get_next_media_player_code function
CREATE OR REPLACE FUNCTION public.get_next_media_player_code(p_prefix varchar)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next_number INT;
  v_code TEXT;
BEGIN
  UPDATE public.media_player_code_prefixes
  SET next_number = next_number + 1
  WHERE prefix = p_prefix
  RETURNING next_number - 1 INTO v_next_number;
  
  IF v_next_number IS NULL THEN
    RAISE EXCEPTION 'Prefix not found: %', p_prefix;
  END IF;
  
  v_code := p_prefix || ' ' || LPAD(v_next_number::TEXT, 4, '0');
  RETURN v_code;
END;
$$;

-- 3. Add new columns to media_players
ALTER TABLE public.media_players
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS remote_name text,
  ADD COLUMN IF NOT EXISTS activate_windows text,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS pr_number text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS date_of_receipt date,
  ADD COLUMN IF NOT EXISTS order_for_project text,
  ADD COLUMN IF NOT EXISTS image_url text;
