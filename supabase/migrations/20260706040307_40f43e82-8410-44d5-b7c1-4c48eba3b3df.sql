
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, phone, requested_job_role, requested_department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_job_role', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_department', '')
  );
  RETURN NEW;
END;
$function$;
