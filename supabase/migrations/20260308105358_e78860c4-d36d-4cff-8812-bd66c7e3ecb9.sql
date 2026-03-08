
-- Update has_role to also match super_admin when checking for admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND (
      role = _role
      OR (_role = 'admin' AND role = 'super_admin')
    )
  )
$$;

-- Update has_function_permission to also check super_admin
CREATE OR REPLACE FUNCTION public.has_function_permission(_user_id uuid, _function_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_function_permissions
    WHERE user_id = _user_id
      AND function_name = _function_name
      AND can_access = true
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Update has_department_permission to also check super_admin
CREATE OR REPLACE FUNCTION public.has_department_permission(_user_id uuid, _department text, _permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'super_admin')) THEN true
      ELSE
        CASE _permission
          WHEN 'view' THEN COALESCE((SELECT can_view FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'create' THEN COALESCE((SELECT can_create FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'edit' THEN COALESCE((SELECT can_edit FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          WHEN 'delete' THEN COALESCE((SELECT can_delete FROM public.user_departments WHERE user_id = _user_id AND department = _department), false)
          ELSE false
        END
    END;
$$;

-- Update get_users_emails to allow super_admin access too
CREATE OR REPLACE FUNCTION public.get_users_emails()
 RETURNS TABLE(id uuid, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au;
END;
$$;
