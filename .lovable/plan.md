## ปัญหาที่พบ

ปุ่ม **ดำเนินการ** ในแท็บ **ตั๋วรอดำเนินการ** ปัจจุบันโยนผู้ใช้กลับไปแท็บ **สร้างใหม่** พร้อมข้อมูลเดิม ทำให้สับสนว่า "กำลังสร้างใบใหม่" แทนที่จะเป็น "ตรวจสอบและอนุมัติรับเข้าคลัง" และมีโอกาสกดบันทึกซ้ำ

## Flow ใหม่

```text
[แท็บ ตั๋วรอดำเนินการ]
        │  กด "ดำเนินการ"
        ▼
[Review Dialog]  (ไม่ย้ายแท็บ)
  ซ้าย: ข้อมูลตั๋ว (เลข DR, ที่มา ASM/Swap, ผู้แจ้ง, เหตุผล)
  ขวา: ข้อมูลสินค้า/MP, S/N, ป้าย, จำนวน, สภาพ, รูป (read-only)
       + แสดง "ผู้ตรวจสอบ" = ชื่อผู้ Login (auto, อ่านอย่างเดียว)
       + เลือก "คลังของเสียปลายทาง" (required ก่อนยืนยัน)
       + ช่องบันทึกเพิ่มเติม (optional)
  ปุ่ม: [ยืนยันรับเข้าคลังของเสีย]  [Reject กลับไปแก้ไข]  [ปิด]
        │                              │
        │ ยืนยัน                       │ Reject (กรอกเหตุผล)
        ▼                              ▼
  UPDATE defective_returns           UPDATE defective_returns
    status=completed                   status=rejected_for_edit
    stock_deducted_at=now              rejection_reason=<กรอก>
    confirmed_by, confirmed_at         rejected_by, rejected_at
  + ตัด stock + log stock_movement   + ถ้ามี assessment_log_id →
  ปิด dialog, refresh pending list     คืนสถานะ assessment เป็น pending
```

## รายละเอียดที่จะแก้ใน `src/pages/DefectiveReturnEntry.tsx`

1. **ปุ่ม "ดำเนินการ"**
   - ไม่ทำ `setActiveTab("new")` และไม่ prefill ฟอร์มสร้างใหม่อีก
   - เปิด `ReviewTicketDialog` ส่ง ticket object ที่ enrich แล้ว (equipment/MP/billboard/assessment)

2. **สร้าง `ReviewTicketDialog` ในไฟล์เดียวกัน** (read-only review)
   - Layout 2 คอลัมน์ (responsive)
   - **ซ้าย:** เลข DR, ที่มา (ASM-xxx / SWAP-xxx + ลิงก์), ผู้แจ้ง+ฝ่าย, วันที่สร้าง, เหตุผล, หมายเหตุ
   - **ขวา:** ประเภท, code+name+brand, S/N (รวม S/N2 ของ MP), ป้ายที่เกี่ยวข้อง, จำนวน, สภาพ, รูปแนบ
   - **ส่วนล่าง (action area):**
     - **ผู้ตรวจสอบ:** badge/field อ่านอย่างเดียว แสดง `profiles.full_name` ของผู้ Login (ดึงเหมือน `reporterName` ที่มีอยู่แล้ว) + email สำรองถ้าไม่มี full_name
     - Select **"คลังของเสียปลายทาง"** (required) — ใช้ `LocationSelect`
     - Textarea หมายเหตุเพิ่มเติม (optional, append เข้า `notes`)

3. **กดยืนยัน → `handleConfirmReceive(ticket)`**
   - `UPDATE defective_returns` ใบเดิม:
     - `quarantine_location_id`, `stock_deducted_at=now()`, `status='completed'`
     - `confirmed_by=auth.uid()`, `confirmed_at=now()`, `confirmed_by_name=<ชื่อผู้ Login>`
     - `notes` (append หมายเหตุเพิ่มเติม ถ้ามี)
   - ตัด stock equipment/MP ตามจำนวน → `INSERT stock_movements` (`movement_type='transfer_in'` ไปคลังของเสีย, `reference_type='defective_return'`, `reference_id=ticket.id`, `reference_document=ticket.document_no`)
   - Refresh pending list + toast สำเร็จ + ปิด dialog
   - **ห้ามสร้าง `defective_returns` ใบใหม่** เพื่อปิดทาง bug ซ้ำ

4. **กด Reject → `handleRejectTicket(ticket, reason)`**
   - บังคับกรอก `rejection_reason`
   - `UPDATE defective_returns`: `status='rejected_for_edit'`, `rejection_reason`, `rejected_by=auth.uid()`, `rejected_at=now()`, `rejected_by_name=<ชื่อผู้ Login>`
   - ถ้ามี `assessment_log_id` → `UPDATE assessment_logs` กลับเป็น `status='pending'` เพื่อให้หน้า Assessment เปิดแก้ไขส่งใหม่ได้
   - Refresh pending list + toast "ส่งคืนเพื่อแก้ไขแล้ว" + ปิด dialog

5. **แท็บ "สร้างใหม่" คงเดิม**
   - ใช้สำหรับเปิดเคสใหม่จากศูนย์เท่านั้น
   - ลบ logic `existingTicket` ที่เคยผูกแท็บสร้างใหม่กับตั๋วเดิมออก

## ดึงชื่อผู้ตรวจสอบ

- ใช้ `useAuth().user` + query `profiles.full_name` (มี pattern เดียวกันใน `useEffect` ที่ auto-fill `reporterName` อยู่แล้ว — บรรทัด 72-86)
- เก็บใน state `reviewerName` ที่ Dialog อ่านมาแสดงในฟิลด์ read-only
- ส่งค่านี้พร้อม `auth.uid()` ลงคอลัมน์ `confirmed_by_name` / `rejected_by_name`

## ตรวจสอบ Flow ปลายทาง

- **Assessment → Defective:** `AssessmentCompleteDialog` ยังสร้าง DR (`pending_warehouse_entry`) → คลังเปิด Review Dialog → ยืนยัน/Reject ตาม flow ใหม่ ตรงกับ memory `assessment-defective-handoff`
- **Swap → Defective:** Swap Wizard ปัจจุบันไม่สร้าง DR โดยตรง (สร้าง assessment_log) — flow ใหม่ไม่กระทบ
- **กันซ้ำ:** หลัง confirm ตั๋วจะมี `stock_deducted_at` ทำให้หลุดจาก query `pending_warehouse_entry + stock_deducted_at IS NULL`
- **Reject → resubmit:** ตั๋วเดิมคงอยู่ (status=`rejected_for_edit`) เพื่อ audit; การส่งใหม่จาก Assessment จะสร้าง DR ใบใหม่หลังแก้ผลแล้ว

## Schema เพิ่ม (migration เล็ก)

`defective_returns` เพิ่มคอลัมน์ (nullable):
- `confirmed_by uuid`, `confirmed_at timestamptz`, `confirmed_by_name text`
- `rejected_by uuid`, `rejected_at timestamptz`, `rejected_by_name text`, `rejection_reason text`
- เพิ่มค่า `'rejected_for_edit'` ให้คอลัมน์ `status` (ถ้าเป็น text ไม่ต้องทำ)

## ไม่แตะ

- ไม่แก้ `AssessmentCompleteDialog`, `SwapWizardDialog`, security findings อื่น
- ไม่เปลี่ยน schema ตาราง stock_movements
- ไม่ลบข้อมูลตั๋วเดิม
