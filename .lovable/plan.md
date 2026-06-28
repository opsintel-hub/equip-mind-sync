## แก้ไข UI/UX หน้าบันทึกการประเมินทรัพย์สิน

### ปัญหาที่แก้
1. ผู้ใช้งงระหว่าง 2 แท็บหลัก เพราะชื่อและคำอธิบายไม่ชัดว่าเป็น "Entry point คนละจุด แต่ Flow เดียวกัน"
2. ใช้คำสลับกันไปมา: แท็บเขียน "Vendor" แต่ในฟอร์ม/การ์ดยังใช้ "Supplier" / "ผู้จัดจำหน่าย"

### ขอบเขต
จำกัดเฉพาะ `src/pages/AssessmentLog.tsx` และ `src/components/assessment/AssessmentCompleteDialog.tsx` (UI/UX + labels เท่านั้น ไม่แตะ schema/RLS/RPC)

### รายละเอียดการแก้ไข

#### 1. ปรับชื่อและคำอธิบายแท็บให้สะท้อนว่าเป็น Flow เดียวกัน
- **แท็บ "รายการประเมิน"** → เปลี่ยนเป็น **"รายการรอประเมิน (จาก Swap/ของเสีย)"**
- **แท็บ "บันทึกการประเมินใหม่"** → เปลี่ยนเป็น **"บันทึกประเมินใหม่ (ป้อนเอง)"**
- ใต้แท็บ "บันทึกประเมินใหม่" เพิ่ม Alert/Description สั้น ๆ:
  > "รายการที่บันทึกจากแท็บนี้จะเข้าร่วม Flow เดียวกับรายการจาก Swap — กด 'ประเมิน' ที่แท็บแรกเพื่อปิดงาน"
- ในรายการ (List) เพิ่ม badge แสดงที่มา (source_type):
  - `swap` → "จาก Swap"
  - `manual` → "ป้อนเอง"
  - `defective` → "จากของเสีย"

#### 2. มาตรฐานคำว่า "Vendor" ทั้งหมด
เปลี่ยนทุก user-facing label จาก Supplier/ผู้จัดจำหน่าย เป็น **Vendor** ในทั้ง 2 ไฟล์:
- แท็บ "ส่งเคลมประกัน Vendor" → คงไว้ แต่ให้เป็นมาตรฐานเดียว
- ฟอร์ม "ส่งซ่อมกับ Supplier" → "ส่งเคลม Vendor"
- Label "ผู้จัดจำหน่ายล่าสุด" → "Vendor ล่าสุด"
- ใน AssessmentCompleteDialog ทุกที่ที่ขึ้น "Supplier" / "ผู้จัดจำหน่าย" → เปลี่ยนเป็น "Vendor"
- หัวข้อ "ประวัติการซื้อ" และข้อมูลที่เกี่ยวข้องให้ใช้ "Vendor" สม่ำเสมอ

#### 3. ลบปุ่ม "ผลการตัดสินใจ (เลือก 1 ใน 4)" ซ้ำซ้อนในหน้า New Entry
ปัจจุบันแท็บ "บันทึกการประเมินใหม่" ยังมีบล็อกปุ่ม 4 ปุ่ม (เข้าของเสีย / ส่งเคลม / ซ่อมเอง / คืน Spare) ซ้ำกับ Dropdown "ผลการประเมิน" ด้านบน ทำให้ผู้ใช้ต้องเลือก 2 ครั้ง
- ลบบล็อกปุ่มนี้ออก
- ให้ `outcome` ถูก derived จากชื่อผลการประเมินที่เลือกใน Dropdown (เหมือนกับ AssessmentCompleteDialog)
- แสดง inline badge ใต้ Dropdown อธิบาย action ที่จะเกิด (Write-off / เคลม Vendor / ซ่อมเอง / รอประเมินเพิ่ม)
- ถ้ามี warranty conflict → แสดง Alert ใต้ dropdown และ disable ปุ่มบันทึก

#### 4. ปรับปรุงรูปแบบการ์ดและ filter labels
- ให้การ์ดในแท็บ "รายการรอประเมิน" แสดง source badge ชัดเจน
- ปรับ description ของ stats cards และ filter ให้ใช้คำสอดคล้องกับแท็บใหม่

### ไฟล์ที่แก้ไข
- `src/pages/AssessmentLog.tsx`
- `src/components/assessment/AssessmentCompleteDialog.tsx`

### ไม่แก้ไข
- Schema / RLS / RPC / Edge functions
- Master data `mp_assessment_results` (ชื่อตัวเลือกยังให้ผู้ใช้จัดการเอง)
- ตรรกะ outcome side-effects (DR, claim, self_repair) คงเดิม

### วิธีตรวจสอบหลังแก้
1. เปิดหน้า `/assessment` ตรวจแท็บและ badge ที่มา
2. ตรวจว่าคำ "Supplier" หายจาก UI ทั้งหมด
3. ทดสอบบันทึก New Entry โดยเลือกผลการประเมินเพียงครั้งเดียว และ outcome ถูกต้อง
4. ทดสอบ Warranty conflict ว่า disable ปุ่มบันทึกและแสดง Alert