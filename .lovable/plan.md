## สรุปสถานะปัจจุบัน (Audit)

| Outcome | สถานะหลัง Assessment | มี Flow ปิดงาน/คืนคลังหรือยัง? |
|---|---|---|
| **1. claim (ส่งเคลม)** | `in_claim`, qty=0 | ❌ **ไม่ครบ** — `ClaimTracker` มี `submitted → returned → closed` แต่ตอน returned/closed **ไม่ได้** flip `media_players.status` กลับเป็น `in_stock` และไม่มี UI เลือก location + ไม่ set `quantity=1` / `is_refurbished` |
| **2. self_repair (ซ่อมเอง)** | `under_repair`, qty=0 | ❌ **ไม่มีเลย** — ไม่มีหน้า/ปุ่ม "ซ่อมเสร็จ → คืนคลัง" เครื่องค้างสถานะ `under_repair` ตลอดไป |
| **3. return_refurb** | `in_stock` + `is_refurbished=true`, qty=1 | ✅ **ครบแล้ว** — `AssessmentCompleteDialog` flip ครบทุก field, เครื่องพร้อมเบิกผ่าน `IssueGoods` ทันที |

ดังนั้นต้องเพิ่ม **2 ส่วน**: ปิดงาน Claim และ ปิดงาน Self-Repair

---

## Phase 1 — ปิด Loop "ส่งเคลม" (`claim_records`)

**เป้าหมาย:** เมื่อกดรับเคลมกลับ + ปิดงาน ในเมนู **ติดตามการเคลม (`/claims`)** ให้เครื่องกลับเข้าคลังพร้อมเบิก

**แก้ไข `src/pages/ClaimTracker.tsx`:**
- ขยาย Return Dialog (`handleReturnSubmit`) เพิ่ม field:
  - `return_location_id` (LocationSelect — ใช้ WarehouseLocationSelect บังคับเลือก)
  - `restock_decision` radio: `กลับคลังพร้อมใช้ (refurb)` / `เครื่องเสียถาวร (defective)` / `เปลี่ยนเครื่องใหม่จาก vendor (replacement S/N)`
  - ถ้าเลือก replacement → ให้กรอก S/N ใหม่ (อัปเดต `serial_number_1`)
- ตอน `closeRecord` (สถานะ `closed`) → ตามผล `claim_result`/decision flip `media_players`:
  - `refurb` → `status='in_stock'`, `quantity=1`, `location_id=<เลือก>`, `is_refurbished=true`, `refurbished_at=now()`
  - `defective` → คงสถานะ `defective` + auto-redirect ไป `/defective-return-entry` (สร้าง DR pending)
  - `replacement` → อัปเดต `serial_number_1`, `status='in_stock'`, `quantity=1`, `is_refurbished=false` (เครื่องใหม่จาก vendor)
- เขียน `stock_movements` `claim_return_in` (qty +1) เพื่อให้ Stock Card / Movement Report เห็น

**เมนูที่ผู้ใช้ต้องเข้า:**
```
/assessment (เลือก outcome=claim)
  → /claims (สถานะ pending → ส่งเคลม → ระบุ RMA → submitted)
  → vendor ซ่อม
  → /claims (กด "รับกลับ" → กรอกผล + location + decision)
  → /claims (กด "ปิดงาน" → เครื่องกลับคลัง)
  → /issue-goods (พร้อมเบิก)
```

---

## Phase 2 — สร้างหน้าใหม่/ขยายหน้าเดิม "ซ่อมเอง" (`self_repair`)

**ปัญหา:** ตอนนี้เครื่อง `under_repair` ไม่มีที่ติดตาม/ปิดงานเลย

**ทางเลือก (เสนอ A):**
- **A) ขยาย `/assessment` (Assessment Log)** — เพิ่มแท็บ "งานซ่อมเอง" รวบรวมทุกเครื่องสถานะ `under_repair` พร้อมปุ่ม "บันทึกผลซ่อม / คืนคลัง"
- B) แยกเมนูใหม่ `/self-repair` ใต้ "จัดการทรัพย์สิน"

**แนะนำ A** เพราะใช้ตาราง `assessment_logs` เดิม (เพิ่ม column `repair_result`, `repair_completed_at`, `repair_completed_by`, `repair_cost`, `return_location_id`) ไม่ต้องสร้างตารางใหม่

**ขั้นตอน Phase 2:**
1. **Migration:** เพิ่ม column ใน `assessment_logs` (repair_result, repair_completed_at, repair_completed_by, repair_cost, return_location_id) + `repair_status` enum (`in_progress`, `repaired`, `failed`)
2. **หน้า `/assessment` แท็บใหม่ "งานซ่อมเอง":**
   - List เครื่องที่ outcome=self_repair AND repair_status ≠ repaired/failed
   - แสดงอายุงาน (วันที่เริ่มซ่อม), ช่างผู้รับผิดชอบ, อาการ
   - ปุ่ม **"บันทึกผลซ่อม"** เปิด dialog:
     - ผล: `ซ่อมสำเร็จ — คืนคลัง` / `ซ่อมไม่ได้ — ส่งของเสีย` / `ซ่อมไม่ได้ — ส่งเคลม`
     - ค่าใช้จ่าย, รายละเอียด, รูป
     - ถ้าคืนคลัง → บังคับเลือก `return_location_id`
3. **Logic เมื่อบันทึก:**
   - `ซ่อมสำเร็จ` → `media_players.status='in_stock', quantity=1, location_id=<เลือก>, is_refurbished=true` + `stock_movements` (`repair_return_in`)
   - `ส่งของเสีย` → นำทางไป `/defective-return-entry` พร้อม prefill
   - `ส่งเคลม` → นำทางไป `/claims` พร้อม prefill

**เมนูที่ผู้ใช้ต้องเข้า:**
```
/assessment (outcome=self_repair → status=under_repair)
  → ช่างซ่อมเครื่อง
  → /assessment แท็บ "งานซ่อมเอง" (กด "บันทึกผลซ่อม" + เลือก location)
  → /issue-goods (พร้อมเบิก)
```

---

## Phase 3 — UI Polish & การมองเห็น

- **Dashboard / `PendingAssessmentAlerts`:** เพิ่มการ์ด "เคลมค้าง vendor" (in_claim > X วัน) และ "ซ่อมค้างช่าง" (under_repair > X วัน)
- **MediaPlayerProfile Timeline:** แสดง event `claim_return_in` และ `repair_return_in` พร้อมหมายเหตุ refurbished
- **DocumentSearch:** มีอยู่แล้ว — ยืนยันว่ากรอง claim_records ที่ closed และ assessment_logs ที่ repair_status=repaired ได้ครบ

---

## รายละเอียดทางเทคนิค

**ไฟล์ที่ต้องสร้าง/แก้:**
- `supabase/migrations/...add_claim_close_fields.sql` — เพิ่ม `claim_records.return_location_id, restock_decision, replacement_serial`
- `supabase/migrations/...add_self_repair_close.sql` — เพิ่ม `assessment_logs.repair_status, repair_result, repair_completed_at, repair_completed_by, repair_cost, return_location_id`
- `src/pages/ClaimTracker.tsx` — ขยาย Return Dialog + closeRecord side-effects + stock_movements insert
- `src/pages/AssessmentLog.tsx` — เพิ่มแท็บ "งานซ่อมเอง" + RepairCompleteDialog ใหม่
- `src/components/assessment/RepairCompleteDialog.tsx` (ใหม่)
- `src/components/PendingAssessmentAlerts.tsx` — เพิ่ม alert in_claim aging + under_repair aging
- Memory: เพิ่ม `mem://features/asset-close-loop` สรุปทั้ง 3 flow

**ไม่อยู่ในขอบเขต:**
- ไม่แตะ Swap Wizard
- ไม่แก้ defective return / return_refurb flow (ครบแล้ว)
- ไม่สร้างตารางใหม่
