
-- Create a security definer function to save user roles atomically
-- This prevents the self-locking issue when admin edits their own roles
CREATE OR REPLACE FUNCTION public.save_user_roles(
  _target_user_id uuid,
  _roles app_role[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check that the calling user is admin or super_admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: only admins can manage roles';
  END IF;

  -- Delete existing roles
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;

  -- Insert new roles
  IF array_length(_roles, 1) > 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT _target_user_id, unnest(_roles);
  END IF;
END;
$$;
