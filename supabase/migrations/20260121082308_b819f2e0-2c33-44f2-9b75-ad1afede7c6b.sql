-- Create a function to get user emails for admin
CREATE OR REPLACE FUNCTION public.get_users_emails()
RETURNS TABLE (id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au;
END;
$$;