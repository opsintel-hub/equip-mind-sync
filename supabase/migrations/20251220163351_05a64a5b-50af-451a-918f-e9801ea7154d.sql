-- ขั้นตอนที่ 1: เพิ่มบทบาทใหม่ใน enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receiver';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'requester';