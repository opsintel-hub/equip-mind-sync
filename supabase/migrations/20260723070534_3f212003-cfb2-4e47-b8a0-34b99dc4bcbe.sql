
-- 1) Make handle_new_user idempotent + always un-hide the profile on (re)signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, phone, requested_job_role, requested_department, department, is_hidden)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_job_role', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_department', ''),
    NULLIF(NEW.raw_user_meta_data->>'requested_department', ''),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    requested_job_role = COALESCE(EXCLUDED.requested_job_role, public.profiles.requested_job_role),
    requested_department = COALESCE(EXCLUDED.requested_department, public.profiles.requested_department),
    department = COALESCE(EXCLUDED.department, public.profiles.department),
    is_hidden = false,
    updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2) Restore the specific user who was hidden
UPDATE public.profiles SET is_hidden = false, updated_at = now()
WHERE id = '52695e74-3647-4a4f-8968-8dc0c5fee405';
