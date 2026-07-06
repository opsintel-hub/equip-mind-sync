
UPDATE public.permission_templates
SET default_dept_can_view = true,
    default_dept_can_create = true,
    default_dept_can_edit = true,
    default_dept_can_delete = false,
    description = 'ดูแลงานปฏิบัติการในฝ่ายที่เลือก — ดู สร้าง และแก้ไขได้ แต่ลบไม่ได้'
WHERE template_key = 'admin';

UPDATE public.permission_templates
SET default_dept_can_view = true,
    default_dept_can_create = false,
    default_dept_can_edit = false,
    default_dept_can_delete = false,
    description = 'อนุมัติคำขอและดูรายงานของฝ่ายที่รับผิดชอบ — ดูได้อย่างเดียว'
WHERE template_key = 'manager';
