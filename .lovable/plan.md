## ปัญหา 2 จุดที่จะแก้

### 1. การเช็คประกันก่อนเลือก "เข้าของเสีย" (Write-off) ใน `AssessmentCompleteDialog`

**สถานะปัจจุบัน:**
- มีการคำนวณ `warrantyState` (active / ending / expired / unknown) อยู่แล้ว
- ปัจจุบันบล็อก "เข้าของเสีย" เมื่อ warranty = active หรือ ending ✅
- **แต่ปล่อยให้กดได้เมื่อ warranty = unknown (ไม่พบข้อมูล)** ⚠️ → ตามภาพที่ 1 จึงเลือก Write-off ได้ทั้งที่ยังไม่ได้ตรวจสอบประกัน

**สิ่งที่จะปรับ:**
- เปลี่ยน `warrantyAllowsDefective` จาก `expired || unknown` → **`expired` เท่านั้น**
- เมื่อ warranty = `unknown` หรือ `active/ending`:
  - ปุ่ม "เข้าของเสีย" จะถูก disable
  - แสดงข้อความเตือนใน box เหตุผลการ disable ให้ชัด เช่น
    - active/ending → "เครื่องยังอยู่ในประกัน — ไม่อนุญาตให้ Write-off ต้องเลือก 'ส่งเคลม'"
    - unknown → "ไม่พบข้อมูลประกัน — กรุณาตรวจสอบและกรอกวันหมดประกันที่โปรไฟล์เครื่องก่อน จึงจะเลือก 'เข้าของเสีย' ได้"
- เพิ่ม "Override" สำหรับ super admin (optional): ติ๊กยอมรับ + กรอกเหตุผล (ใช้ `defectiveAck` mechanism เดิม) — เฉพาะกรณี `unknown` เท่านั้น ไม่ใช่ตอน active/ending

> หมายเหตุ: ส่วน `claim` (ส่งเคลม) คงเดิม — อนุญาตเมื่อ active/ending/unknown

### 2. ตัด Popup auto-navigate ไป /defective-return หลังบันทึก outcome=defective

**สถานะปัจจุบัน** (`AssessmentCompleteDialog.tsx` บรรทัด 603–627):
- หลังบันทึก outcome=defective → toast + `setTimeout(() => navigate("/defective-return", { state: { fromAssessment }}), 400)`
- หน้า `DefectiveReturnEntry` รับ state แล้วเปิด Review Dialog อัตโนมัติ (บรรทัด 230–268)

**สิ่งที่จะปรับ:**
- ลบทั้ง `setTimeout + navigate` block ออกจาก `AssessmentCompleteDialog`
- คง toast แต่เปลี่ยนข้อความเป็นกลาง ๆ:
  - "บันทึกการประเมินเสร็จ — ใบของเสีย DR-xxxx ถูกส่งไปยังฝ่ายคลังแล้ว (ฝ่ายคลังจะดำเนินการตรวจรับเอง)"
- ปิด dialog ผ่าน `onCompleted()` แล้วอยู่หน้า Assessment Log เหมือนเดิม
- ลบ `import { useNavigate }` ที่ไม่ได้ใช้แล้ว (และ `navigate` declaration)
- หน้า `DefectiveReturnEntry` ไม่ต้องแก้ — auto-open via routerLocation.state จะถูก trigger เฉพาะเมื่อ user เดินไปเอง (จะไม่มี state ส่งมาเพราะตัด navigate แล้ว) → ทำงานปกติเป็นเมนูแยกของฝ่ายคลัง

## ไฟล์ที่จะแก้
- `src/components/assessment/AssessmentCompleteDialog.tsx`
  - ปรับ `warrantyAllowsDefective` logic + ข้อความ disable
  - ลบ `navigate`/`setTimeout` block หลัง outcome=defective
  - ปรับข้อความ toast

ไม่มีการแตะ DB / RPC / RLS — เป็น UI/flow ล้วน ๆ
