
# แยก Flow "ซ่อมเอง" เป็น 2 ขั้นชัดเจน

## เป้าหมาย
ตัด checkbox "ซ่อมสำเร็จ → คืน Spare เข้าคลัง" ในหน้าบันทึกประเมินออก เพื่อไม่ให้ปนกันระหว่าง "ตัดสินใจว่าจะซ่อมเอง" กับ "ปิดงานซ่อมเสร็จ"

## Flow ใหม่

```text
[บันทึกประเมิน]                      [ปิดงานซ่อม]
outcome = self_repair                RepairCompleteDialog
     │                                    │
     ▼                                    ▼
เครื่อง → under_repair          ผู้ใช้เลือกผลลัพธ์:
qty = 0 (เบิกไม่ได้)             ✅ ซ่อมสำเร็จ → in_stock + refurbished
มาโผล่ที่ Tab "งานซ่อมเอง"        ❌ ซ่อมไม่ได้ → ส่งของเสีย
                                 🔁 ซ่อมไม่ได้ → เปลี่ยนเป็นเคลม
```

## รายละเอียดการแก้ไข

### 1. `src/components/assessment/AssessmentCompleteDialog.tsx`
- ลบ state `repairSuccess` และ checkbox block (บรรทัด ~1066-1072)
- ลบ Textarea "รายละเอียดการซ่อม" และหมายเหตุที่ผูกกับ `repairDescription` ในสาขา self_repair (เพราะจะกรอกตอนปิดงานที่ RepairCompleteDialog แทน — มีฟิลด์ครบกว่า: Hardware/Software, รายการซ่อม CRUD, ค่าใช้จ่าย)
- แก้ handleSubmit สาขา `self_repair` (บรรทัด ~726-735) ให้ทำแค่:
  - `flipStatus("under_repair", "under_repair", false, 0)` เท่านั้น
  - ไม่ต้องเช็ค `repairSuccess` อีกต่อไป
- อัปเดต card คำอธิบายบรรทัด ~1013 ให้ชัดว่า "จะเข้าสถานะกำลังซ่อม ไปกดปิดงานที่ Tab งานซ่อมเอง"
- ลบ validation ที่บังคับ `repairDescription` ในสาขา self_repair (บรรทัด ~434)

### 2. `src/pages/AssessmentLog.tsx` — Tab "งานซ่อมเอง"
- ตรวจสอบว่า Tab นี้แสดงเครื่องที่ `outcome=self_repair` + `repair_status != completed` (หรือ status=under_repair) และมีปุ่ม **"ปิดงานซ่อม"** เปิด `RepairCompleteDialog` อยู่แล้วหรือยัง
- ถ้ายัง — เพิ่มปุ่ม "ปิดงานซ่อม" ในการ์ดที่ยังไม่ปิด (เชื่อมกับ `RepairCompleteDialog` ที่มีอยู่)

### 3. `src/components/assessment/RepairCompleteDialog.tsx`
- ไม่ต้องแก้ — logic ครบอยู่แล้ว (3 ผลลัพธ์: repaired / failed_defective / failed_claim, Hardware/Software scope, รายการซ่อม CRUD, ค่าใช้จ่าย, คลังปลายทาง)

### 4. Data migration (ถ้ามีเครื่องค้าง)
- ตรวจว่ามีเครื่อง `outcome=self_repair` + `repair_status is null` + status ปน ๆ กันไหม
- ถ้ามี ให้ set status=`under_repair`, quantity=0 เพื่อให้ไปโผล่ที่ Tab ใหม่ให้ผู้ใช้ปิดงานต่อ

## ผลลัพธ์สำหรับผู้ใช้

- หน้าบันทึกประเมินสั้นลง เข้าใจง่าย: **แค่ตัดสินใจว่าจะซ่อมเอง/ส่งเคลม/เข้าของเสีย**
- ปิดงานซ่อมมีหน้าเฉพาะ กรอกรายละเอียดครบ (อะไหล่ ค่าซ่อม ฯลฯ) → รายงานซ่อมแม่นขึ้น
- ไม่มีเคสข้ามขั้น ไม่มีเครื่องหายไปในสถานะ "ประเมินแล้วแต่ยังไม่รู้ผล"
