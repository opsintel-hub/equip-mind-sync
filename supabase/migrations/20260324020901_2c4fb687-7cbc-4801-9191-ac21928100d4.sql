
CREATE OR REPLACE FUNCTION public.generate_contractor_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.entry_type = 'new' AND NEW.contractor_access_token IS NULL THEN
    NEW.contractor_access_token := encode(extensions.gen_random_bytes(16), 'hex');
    NEW.contractor_access_pin := lpad(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_contractor_access ON public.advertisements;
CREATE TRIGGER trg_generate_contractor_access
  BEFORE INSERT OR UPDATE ON public.advertisements
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contractor_access();
