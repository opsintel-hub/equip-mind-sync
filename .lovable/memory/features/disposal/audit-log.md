---
name: Disposal Audit Log
description: Audit log ของใบของเสีย บันทึกทุกขั้นอนุมัติ พร้อมธง Super Admin และการอนุมัติข้ามชั้นโดยคนเดียวกัน
type: feature
---
Super Admin ทำได้ทุกขั้นในกลุ่มเมนู "ส่งคืนของเสีย" (ไม่บล็อก segregation of duties) แต่ต้องมี log

- ตาราง `defective_disposal_audit` + trigger `log_defective_disposal_change()` บน `defective_returns` (AFTER INSERT/UPDATE)
- ธง `is_super_admin_action`, `is_self_approval` (คนเดียวอนุมัติหลายชั้นในใบเดียวกัน)
- แสดง timeline ในหน้าต่างรายละเอียดใบ (`DisposalAuditTimeline`) + แท็บ Audit ในรายงานของเสีย (`DisposalAuditTable`) พร้อม Export Excel
- เตือน (ไม่บล็อก) ก่อนอนุมัติชั้น 2 เมื่อผู้ใช้เป็นคนอนุมัติชั้น 1 เอง
- function permission ใหม่: `disposal_audit_view`
