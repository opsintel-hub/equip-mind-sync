
# แผนปรับ Workflow ประเมิน + เพิ่มข้อมูลช่วยตัดสินใจ

## ภาพรวม
แยกการประเมินออกจากการนำเข้าคลังของเสีย และเสริมหน้าประเมินให้ช่างเห็นประวัติ/ประกัน/Supplier ครบก่อนเลือกผล เพื่อกันพลาดส่งของไปคลังของเสียทั้งที่ยังเคลมได้

---

## ส่วนที่ 1 — เปลี่ยน Workflow (ตามที่ตกลงกันก่อนหน้า)

### 1.1 สร้างคลัง/สถานะใหม่
- เพิ่ม Warehouse system: `WH-PENDING-ASSESS` (1 ตัวต่อ database, ไม่แยกตามแผนก เพื่อลดความซับซ้อน) + Location `LOC-PENDING-ASSESS`
- เพิ่ม S/N status enum ใหม่: `pending_assessment`, `under_repair`, `in_claim` (มีบางส่วนแล้ว — ตรวจซ้ำ)

### 1.2 ตอนถอด (Swap / Manual Uninstall)
- **เลิก auto-สร้าง DR** ใน `SwapWizardDialog.tsx`
- เปลี่ยนเป็น **auto-สร้าง Assessment Log (ASM)** พร้อม `source_type='swap'` + `source_reference_id=swap_request_id`
- ย้าย S/N ไป `WH-PENDING-ASSESS` + status `pending_assessment` (ไม่ใช่ defective)
- บันทึก stock_movement type=`pending_assessment_in`

### 1.3 ตอนประเมินเสร็จ (AssessmentCompleteDialog)
แต่ละ outcome เคลื่อนของและสร้างเอกสารตามนี้:

| Outcome | คลังปลายทาง | S/N status | เอกสารที่สร้าง |
|---|---|---|---|
| 1. ซ่อมไม่ได้ (defective) | ค้างที่ Pending จนกว่าคลังจะรับ → WH-DEFECT | `pending_warehouse_entry` → `defective` | DR (pending) → คลังกดยืนยันใน "นำของเสียเข้าระบบ" |
| 2. ส่งเคลม (claim) | WH-CLAIM (logical) | `in_claim` | CLM (submitted) |
| 3. ซ่อมเอง (self_repair) | WH-REPAIR (logical) | `under_repair` | บันทึก repair log → จบแล้วคืน in_stock + `is_refurbished=true` |
| 4. คืน Spare (return_refurb) | คลังเดิม/Spare | `in_stock` + `is_refurbished=true` | – |

> หมายเหตุ: คลัง claim/repair ใช้แบบ **logical** (S/N status) ไม่ต้องสร้างคลังกายภาพแยก เพื่อให้ implement เร็ว

### 1.4 ตั๋ว DR ค้าง 6 ใบเดิม
- เก็บไว้ ปล่อยให้ปิดงานตามเดิม (ไม่แตะของเก่า)
- Workflow ใหม่ใช้กับของที่ถอดหลัง deploy เท่านั้น

---

## ส่วนที่ 2 — เพิ่มข้อมูลช่วยตัดสินใจในหน้าประเมิน (จุดสำคัญ)

ปรับ `AssessmentCompleteDialog.tsx` เพิ่ม panel **"ข้อมูลเครื่อง & ประวัติ"** ก่อน section ฟอร์มประเมิน แสดง:

### 2.1 กล่องประกัน (Warranty Banner) — เด่นที่สุด
- **เขียว**: "ยังอยู่ในประกัน — เหลือ X วัน (หมด YYYY-MM-DD)" + ปุ่ม **"แนะนำ: ส่งเคลม"** (เลือก outcome=claim ให้อัตโนมัติ)
- **เหลือง**: เหลือ ≤ 30 วัน
- **แดง**: หมดประกันแล้ว X วัน
- **เทา**: ไม่มีข้อมูลประกัน
- ถ้ายังในประกันแล้วผู้ใช้พยายามเลือก outcome=defective → แสดง **confirm dialog**: "เครื่องนี้ยังอยู่ในประกัน ยืนยันไม่เคลมหรือไม่?" + บังคับกรอกเหตุผล

### 2.2 ข้อมูลเครื่อง (เก็บ + แสดง)
- รหัส / ชื่อ / Brand / Model / Spec
- S/N 1, S/N 2
- ราคา / ค่าเสื่อม / อายุใช้งาน (เดือน)
- **ผู้จัดจำหน่าย** (supplier name + เบอร์ติดต่อ ถ้ามี)
- วันที่รับเข้า + **อายุนับจากซื้อ** (เช่น "ใช้มาแล้ว 2 ปี 3 เดือน")
- ป้ายปัจจุบัน / แผนก

### 2.3 ประวัติการติดตั้ง (Installation History)
- จำนวนครั้งที่เคยติดตั้ง (เช่น "ติดตั้ง 4 ครั้ง")
- Timeline ย่อ: ป้าย → วันที่ติด → วันถอด → เหตุผลถอด
- ถ้าเคยถูกประเมินมาก่อน: แสดงผลประเมินครั้งก่อน + วันที่
- ถ้าเคยเคลม/ซ่อม: แสดงประวัติ (จาก `claim_records`, `assessment_logs` history)

### 2.4 ข้อมูลที่แจ้งตอนถอด (มีบางส่วนแล้ว — เสริมให้ครบ)
- ผู้แจ้ง / วันที่แจ้ง
- อาการที่แจ้ง (text + symptom_id)
- **รูปอาการเสีย** (จาก swap.photo_urls)
- รายละเอียดเพิ่มเติมจาก swap.description + symptom_other
- ป้ายต้นทาง

### 2.5 Quick Links
- ปุ่ม "เปิดโปรไฟล์เครื่อง" → `/media-player-profile/:id` (tab ใหม่)
- ปุ่ม "ดู Swap ต้นทาง" / "ดูใบเดิม"

---

## ส่วนที่ 3 — รายละเอียด Technical

### Files to edit
- `src/components/assessment/AssessmentCompleteDialog.tsx` — เพิ่ม WarrantyBanner + InstallationHistory + DeviceInfo panel; เปลี่ยน outcome handler ตามตาราง 1.3
- `src/components/swap/SwapWizardDialog.tsx` — ตัด auto-DR; เปลี่ยนเป็น auto-สร้าง ASM + ย้าย S/N ไป pending_assessment
- `src/pages/DefectiveReturnEntry.tsx` — รับเฉพาะ DR ที่มาจาก outcome=defective (มีอยู่แล้ว ไม่ต้องแก้มาก)
- `src/pages/AssessmentLog.tsx` — เพิ่ม filter "ค้างประเมิน" / "เสร็จแล้ว"

### Database migration
- เพิ่ม Warehouse + Location สำหรับ Pending Assessment (insert via tool)
- ขยาย enum สำหรับ S/N status (ถ้ายังไม่มี): `pending_assessment`, `under_repair`, `in_claim`
- เพิ่ม column `assessment_logs.installation_history_snapshot jsonb` (optional — เก็บ snapshot ตอนเปิดประเมิน เผื่อ audit ภายหลัง)

### Queries ใหม่ในหน้าประเมิน
1. `media_players` join `suppliers` + `companies` + `cms_types` + `billboard` (มีอยู่)
2. `billboard_installations` หรือ `media_player_installation_history` — นับจำนวนครั้ง + timeline
3. `assessment_logs` history สำหรับ MP/equipment เดียวกัน (status=completed)
4. `claim_records` history

---

## ส่วนที่ 4 — ข้อเสนอเพิ่มเติมจากผม

1. **Cost-of-repair guard**: ถ้า outcome=self_repair และค่าซ่อม > 50% ของราคาเครื่องที่เหลือ (หลังหักค่าเสื่อม) → เตือน "ค่าซ่อมสูงเทียบกับมูลค่าคงเหลือ — พิจารณาเปลี่ยนเครื่องใหม่"
2. **Repeat-failure flag**: ถ้าเครื่องนี้ถูกประเมินซ่อมไป **≥ 2 ครั้งใน 6 เดือน** → แสดง badge แดง "ปัญหาซ้ำซาก" แนะนำ outcome=defective หรือ claim เต็มเครื่อง
3. **Supplier contact shortcut**: ในกล่องประกัน ถ้ามีเบอร์ Supplier → แสดงปุ่มโทร/copy เบอร์ทันที (มือถือกดโทรได้)
4. **Audit trail**: บันทึกใน `assessment_logs.notes` อัตโนมัติว่าตอนประเมิน เครื่องอยู่ในประกัน/หมดประกันกี่วัน เพื่อ traceability ภายหลัง

---

## ขอ confirm 2 จุดก่อน implement

1. **คลัง claim/repair** — OK ใช้แบบ logical (เปลี่ยนแค่ S/N status, ของยังอยู่ในที่เดียวกัน) หรืออยากให้สร้าง warehouse กายภาพแยก?
2. **ข้อเสนอเพิ่มเติม #1-4** — อยากได้ทั้ง 4 ข้อ หรือเลือกเฉพาะข้อไหน?
