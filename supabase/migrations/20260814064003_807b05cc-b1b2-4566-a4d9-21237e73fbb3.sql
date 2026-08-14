CREATE OR REPLACE FUNCTION public.notify_admins_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    NEW.id,
    'profile',
    false
  );
  RETURN NEW;
END;
$function$;