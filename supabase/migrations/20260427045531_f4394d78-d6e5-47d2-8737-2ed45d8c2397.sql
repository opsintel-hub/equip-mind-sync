-- 1. Add requested fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_job_role text,
  ADD COLUMN IF NOT EXISTS requested_department text;

-- 2. Update handle_new_user to capture these from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, requested_job_role, requested_department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_job_role', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_department', '')
  );
  RETURN NEW;
END;
$function$;