CREATE OR REPLACE FUNCTION public.has_function_permission(_user_id uuid, _function_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_function_permissions
    WHERE user_id = _user_id AND function_name = _function_name AND can_access = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'super_admin' OR (role = 'admin' AND _function_name IS DISTINCT FROM 'site_access_manage'))
  )
$function$;