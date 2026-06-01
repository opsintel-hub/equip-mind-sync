## ปัญหา

จากภาพ ตัวอย่าง `ASM-20260601-0007` (เครื่องเดียวกัน S/N `AB03/BB03`) สร้างรายการของเสียในคลังออกมา **3 ใบ** (`DR-...-0530`, `-0723`, `-7531`) — ทุกใบ `pending_warehouse_entry` รอรับเข้าทั้งหมด ตรวจสอบฐานข้อมูลยืนยันแล้วว่ามาจาก `assessment_log_id` เดียวกัน

### สาเหตุ

ใน `src/components/assessment/AssessmentCompleteDialog.tsx` (`handleSubmit`):
- เมื่อ outcome = `defective` จะ `insert` ลง `defective_returns` ทุกครั้งที่กด "บันทึก"
- ไม่มีการเช็คว่ามี DR ของ assessment นี้อยู่แล้วหรือยัง
- assessment ที่ `status='completed'` แล้วยังเปิด dialog แก้ไข + กดบันทึกซ้ำได้ → ทุกครั้งสร้าง DR ใบใหม่
- นอกจากนี้ปุ่ม submit ก็ไม่มี guard กันการกดซ้อนระหว่าง network call (double-click)

## แผนแก้

### 1. กันสร้าง DR ซ้ำจาก assessment เดียวกัน (idempotency)
ใน `handleSubmit` ก่อน `insert` ลง `defective_returns`:
- query หา DR ที่มี `assessment_log_id = log.id` อยู่แล้วและ `status != 'cancelled'`
- ถ้ามีอยู่แล้ว → ข้าม insert, ใช้ `document_no` เดิมแสดง toast แทน
- ใช้ logic เดียวกันกับ `claim` (เช็ค `claim_records` โดย `source_reference_id = log.id` + `source_type='assessment'`)

### 2. กันบันทึก assessment ซ้ำหลัง completed
- ถ้า `log.status === 'completed'` แล้ว → ปิดปุ่มบันทึก + แสดง banner "การประเมินนี้บันทึกผลแล้ว ไม่สามารถแก้ไข/บันทึกซ้ำได้"
- เปิด dialog ได้แบบ read-only เพื่อดูข้อมูล

### 3. ล้างข้อมูลซ้ำที่ค้างอยู่ในระบบ
ยกเลิก DR ซ้ำ 2 ใบจาก `ASM-20260601-0007` (เก็บใบแรกสุด `DR-20260601-0530` ที่เป็นต้นฉบับ ยกเลิก `-0723` และ `-7531`) โดย:
- ตั้ง `status='cancelled'` + `notes` ระบุเหตุผล "ระบบสร้างซ้ำจาก bug — รวมกับ DR-20260601-0530"
- สแกนหา assessment_log_id อื่น ๆ ที่มี DR ซ้ำ และ cancel ใบที่ไม่ใช่ใบแรกสุดด้วยวิธีเดียวกัน

### 4. (เสริม) กันกดปุ่มซ้อน
- ปุ่ม "บันทึก" ใน dialog ตั้ง `disabled={submitting}` (ปัจจุบันมี `setSubmitting(true)` แล้ว แต่ตรวจให้แน่ใจว่าปุ่ม disabled ตอน submitting)

## ไฟล์ที่กระทบ
- `src/components/assessment/AssessmentCompleteDialog.tsx` — เพิ่ม idempotency check + completed guard + submitting disabled
- migration (data fix) — cancel DR/claim ซ้ำใน production data

## ไม่กระทบ
- หน้า `/defective-return-entry` (รับเข้าคลังของเสีย) — logic เดิม
- หน้า `/disposal-approval` — logic เดิม
- schema `defective_returns` / `assessment_logs` — ไม่เปลี่ยน
