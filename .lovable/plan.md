## ปัญหา
หน้า "สมัครสมาชิก" เลือกฝ่ายไม่ได้ (ดรอปดาวน์ว่าง)

**สาเหตุ (ยืนยันจาก DB แล้ว):** ตาราง `departments` เปิด RLS แต่มี policy อ่านให้เฉพาะ role `authenticated` เท่านั้น — ผู้ใช้ที่ยังไม่ได้ล็อกอิน (anon) จึงอ่านไม่ได้ ทำให้ `<Select>` ฝ่ายว่างเปล่า  
(เทียบกับ `permission_templates` ที่มี policy `Public can view active permission templates for signup` สำหรับ anon จึงโหลดตำแหน่งงานได้ปกติ)

## แผนแก้ไข

### 1. เปิดให้ anon อ่านรายชื่อฝ่ายที่ active ได้ (Migration)
- เพิ่ม policy `Public can view active departments for signup` บน `public.departments` — `TO anon USING (is_active = true)`
- `GRANT SELECT ON public.departments TO anon`
- ไม่แตะ policy อื่น (authenticated ยังเห็นทั้งหมดเหมือนเดิม, admin ยังจัดการได้)

### 2. ตรวจสอบ Loop สมัคร → อนุมัติสิทธิ์ ให้ครบ
ยืนยันจากโค้ด/DB ว่าปัจจุบันครบแล้ว ไม่ต้องแก้เพิ่ม:
- `Login.tsx` ส่ง `requested_job_role` + `requested_department` เข้า `signUp` metadata ✓
- Trigger `handle_new_user` เขียนลง `profiles.requested_job_role`, `profiles.requested_department` และ seed `profiles.department` ✓
- `PermissionWizard` อ่านค่าที่ผู้ใช้ขอมา pre-select ให้ Admin/Super Admin (ตาม memory `onboarding-flow-v1`)
- `useAuth` มี `enforceHiddenGuard` บล็อกผู้ใช้ที่ถูก hide ✓

### 3. QA หลังแก้
- เปิดหน้า `/` แบบไม่ได้ล็อกอิน → tab "สมัครสมาชิก" → ดรอปดาวน์ "ฝ่ายที่สังกัด" ต้องมีรายการ
- สมัคร user ทดสอบ → เช็ค `profiles` ว่ามี `requested_job_role/department`
- Login ด้วย Admin → หน้าจัดการผู้ใช้ → เปิด Wizard → เห็นค่าที่ผู้ใช้ขอมา pre-select

## หมายเหตุความปลอดภัย
รายชื่อฝ่ายที่ active ถือเป็นข้อมูล low-sensitivity (จำเป็นต้องเปิดเผยเพื่อให้สมัครได้ เหมือน `permission_templates`) — เปิด anon read เฉพาะแถว `is_active = true` เท่านั้น ไม่กระทบข้อมูลอื่น
