
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_contractor_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'in_storage' AND NEW.entry_type = 'new' 
     AND (OLD.status IS NULL OR OLD.status != 'in_storage')
     AND NEW.contractor_access_token IS NULL THEN
    NEW.contractor_access_token := encode(extensions.gen_random_bytes(16), 'hex');
    NEW.contractor_access_pin := lpad(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
