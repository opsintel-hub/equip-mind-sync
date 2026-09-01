# ส่งคืนของเสีย — Super Admin ทำได้ทุกขั้น + บันทึก Audit Log

## สรุปสถานะปัจจุบัน (ตรวจจากโค้ดแล้ว)

เมนูกลุ่ม "ส่งคืนของเสีย" มี 4 รายการ: นำของเสียเข้าระบบ, ตัดจำหน่ายของหมดอายุ, อนุมัติจัดการของเสีย, รายงานของเสีย/จำหน่าย

- สิทธิ์แต่ละเมนูผูกกับ function permission: `disposal_request`, `disposal_approve_l1`, `disposal_approve_l2`, `disposal_finance`, `disposal_report`
- `useFunctionPermissions.hasFunctionAccess` คืนค่า true ทันทีถ้าเป็น Super Admin และ `useDepartmentPermissions` ให้ Super Admin เห็นทุกฝ่าย

**คำตอบ:** ใช่ — ตอนนี้ Super Admin ทำได้ครบทุกอย่างในกลุ่มนี้อยู่แล้ว ทั้งเปิดใบ, อนุมัติชั้น 1, ชั้น 2, บัญชีรับทราบ และดูรายงาน โดยคนเดียวได้

สิ่งที่ยังขาดคือ **ร่องรอยการตรวจสอบ** — ตารางของเสียเก็บแค่ "ใครอนุมัติล่าสุดในแต่ละชั้น" ไม่มีประวัติเหตุการณ์ และไม่มีการทำเครื่องหมายว่าใบไหนถูกอนุมัติหลายชั้นโดยคนเดียวกัน

## สิ่งที่จะทำ

คงสิทธิ์ Super Admin ให้ทำได้หมดเหมือนเดิม แต่เพิ่มการบันทึก log ทุกการกระทำ

### 1. ตาราง Audit Log ของเสีย
สร้างตารางใหม่เก็บทุกเหตุการณ์ของใบของเสีย: ใบไหน, ใครทำ, ทำอะไร (สร้างใบ / อนุมัติชั้น 1 / อนุมัติชั้น 2 / บัญชีรับทราบ / ปฏิเสธ / ดำเนินการเสร็จ), สถานะก่อน-หลัง, วิธีจัดการ, หมายเหตุ, เวลา และธงพิเศษ 2 ตัว
- `is_super_admin_action` — ผู้ทำเป็น Super Admin
- `is_self_approval` — ผู้ทำเคยอนุมัติชั้นอื่นของใบนี้มาแล้ว (คนเดียวข้ามชั้น)

บันทึกอัตโนมัติด้วย trigger บนตารางของเสีย เพื่อให้ได้ log ครบแม้แก้ไขจากที่อื่น

### 2. แสดง Log ในหน้าอนุมัติ
- ในหน้าต่างรายละเอียดใบ เพิ่มส่วน "ประวัติการดำเนินการ" เป็น timeline (ชื่อผู้ทำ, การกระทำ, เวลา, หมายเหตุ)
- ถ้าใบใดมีการอนุมัติข้ามชั้นโดยคนเดียวกัน แสดงป้ายเตือนสีส้ม "อนุมัติโดยผู้ใช้คนเดียวกันหลายชั้น"
- ก่อนกดอนุมัติชั้นที่ 2 ในกรณีที่ผู้ใช้เป็นคนอนุมัติชั้น 1 เอง แสดงข้อความเตือนในกล่องยืนยัน (เตือนอย่างเดียว ไม่บล็อก)

### 3. รายงาน
เพิ่มแท็บ "ประวัติการดำเนินการ (Audit)" ในหน้ารายงานของเสีย/จำหน่าย: ตารางค้นหาได้ตามใบ/ผู้ใช้/ช่วงวันที่ พร้อมตัวกรอง "เฉพาะรายการที่อนุมัติข้ามชั้นโดยคนเดียวกัน" และ Export Excel ตามมาตรฐานเดิม

### 4. สิทธิ์
เพิ่ม function key ใหม่ `disposal_audit_view` (ดู Audit Log) — Super Admin เข้าได้อยู่แล้วโดยอัตโนมัติ, บัญชี/ผู้ตรวจสอบมอบสิทธิ์เพิ่มได้จากหน้าจัดการผู้ใช้

## รายละเอียดทางเทคนิค

- ตารางใหม่ `public.defective_disposal_audit` (defective_return_id, actor_id, action, from_status, to_status, disposal_method, notes, is_super_admin_action, is_self_approval, created_at) + GRANT ให้ authenticated/service_role + RLS: อ่านได้เมื่อมี `disposal_audit_view` หรือสิทธิ์อนุมัติใดๆ, เขียนผ่าน trigger (security definer) เท่านั้น
- Trigger `log_defective_disposal_change()` AFTER INSERT/UPDATE บน `defective_returns` แปลงการเปลี่ยน `dispose_status` เป็น action และคำนวณธงทั้งสองจากคอลัมน์ `l1_approved_by` / `l2_approved_by` / `finance_ack_by`
- ฝั่งหน้าจอ: แก้ `src/pages/DisposalApproval.tsx` (timeline + warning), `src/pages/DisposalReport.tsx` (แท็บ audit + export), `src/hooks/useFunctionPermissions.tsx` (เพิ่ม `disposal_audit_view` ใน SYSTEM_FUNCTIONS)
- ไม่แก้ตรรกะการตัดสต็อกและกฎอนุมัติเดิม
