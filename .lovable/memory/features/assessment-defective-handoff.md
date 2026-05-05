---
name: Assessment Workflow & Decision Support
description: Swap auto-creates Assessment Log (not DR); AssessmentCompleteDialog shows warranty/history/supplier with smart guards
type: feature
---
- Swap Wizard NO LONGER auto-creates defective_returns. เครื่องเก่าถูกถอด → status=`pending_assessment` (logical warehouse via S/N + MP status) + auto-create assessment_logs (status=pending) ผ่าน source_type=swap
- AssessmentCompleteDialog แสดงก่อนเลือกผล: 
  - **Warranty Banner** (เขียว/เหลือง/แดง/เทา) + เบอร์โทร supplier (tel: + คัดลอก) + ปุ่ม "ใช้ผล: ส่งเคลม"
  - **Repeat-failure flag** (≥2 ครั้งใน 6 เดือน → Alert destructive)
  - **Device Info & History panel**: ยี่ห้อ/spec/ราคา/อายุ/มูลค่าคงเหลือ + collapsible installs/assessments/claims history + link เปิดโปรไฟล์เครื่อง
- Outcome side-effects (logical, ไม่ต้องสร้าง warehouse กายภาพ):
  - defective → DR pending + นำทางไป /defective-return-entry
  - claim → claim_records.submitted + flip MP/SN status=in_claim
  - self_repair → flip status=under_repair
  - return_refurb → status=in_stock + is_refurbished=true
- Anti-mistake guard: ถ้า outcome=defective แต่เครื่องยังในประกัน → บังคับ checkbox + เหตุผล (ไม่งั้นกดบันทึกไม่ได้)
- Audit trail อัตโนมัติ: ทุกครั้งบันทึก notes ใน assessment_logs จะ append สถานะประกัน/อายุเครื่อง/เหตุผลสละเคลม/repeat-failure flag
- Document Search: defective_returns, assessment_logs, claim_records, swap_requests, stock_movements
