
-- RPC: return user list with email + last_sign_in_at + banned status for admin UI
CREATE OR REPLACE FUNCTION public.get_users_admin_meta()
RETURNS TABLE(id uuid, email text, last_sign_in_at timestamptz, banned_until timestamptz, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT au.id, au.email::text, au.last_sign_in_at, au.banned_until, au.created_at
  FROM auth.users au;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_admin_meta() TO authenticated;

-- Trigger: notify admins when a new profile is created (i.e. a new user signed up)
CREATE OR REPLACE FUNCTION public.notify_admins_new_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (title, message, type, category, reference_id, reference_type, is_read)
  VALUES (
    'มีผู้ใช้ใหม่รอการอนุมัติสิทธิ์',
    'ผู้ใช้ ' || COALESCE(NEW.full_name, '-') ||
      COALESCE(' (ฝ่าย: ' || NULLIF(NEW.requested_department, '') || ')', '') ||
      COALESCE(' — ตำแหน่งที่ขอ: ' || NULLIF(NEW.requested_job_role, ''), '') ||
      ' ได้สมัครใช้งาน กรุณาตั้งสิทธิ์ในเมนู "จัดการผู้ใช้"',
    'info',
    'user',
    NEW.id::text,
    'profile',
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_signup ON public.profiles;
CREATE TRIGGER trg_notify_admins_new_signup
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_signup();
