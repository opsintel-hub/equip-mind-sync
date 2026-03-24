
-- Add contractor access fields to advertisements
ALTER TABLE public.advertisements 
  ADD COLUMN IF NOT EXISTS contractor_access_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS contractor_access_pin TEXT;

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_advertisements_contractor_access_token 
  ON public.advertisements(contractor_access_token) WHERE contractor_access_token IS NOT NULL;

-- Create function to auto-generate contractor access token and PIN when ad is received
CREATE OR REPLACE FUNCTION public.generate_contractor_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only generate when status changes to in_storage and entry_type is 'new'
  IF NEW.status = 'in_storage' AND NEW.entry_type = 'new' 
     AND (OLD.status IS NULL OR OLD.status != 'in_storage')
     AND NEW.contractor_access_token IS NULL THEN
    NEW.contractor_access_token := encode(gen_random_bytes(16), 'hex');
    NEW.contractor_access_pin := lpad(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_generate_contractor_access ON public.advertisements;
CREATE TRIGGER trg_generate_contractor_access
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contractor_access();
