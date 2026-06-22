## Flow ตอนนี้ทำงานยังไง

```text
1. คลังกด Reject ใบ DR-xxxx
   → defective_returns: status='rejected_for_edit', rejection_reason=...
   → assessment_logs: status='pending' (กลับมาให้ช่างแก้)

2. ช่างเปิด ASM เดิม กด "บันทึกผลใหม่" → เลือก outcome='defective' อีกครั้ง
   AssessmentCompleteDialog (บรรทัด 467-499) เช็ค idempotency:
     SELECT FROM defective_returns
       WHERE assessment_log_id = log.id AND status != 'cancelled'
   → เจอใบเดิม (rejected_for_edit ≠ cancelled) → "reuse" document_no
   → ❌ ไม่ INSERT ใบใหม่
   → ❌ ไม่ UPDATE ใบเดิมกลับเป็น pending_warehouse_entry
   → ❌ ไม่อัปเดต reason/notes ตามผลประเมินใหม่
```

## ผลลัพธ์ที่ผิด

- ใบ DR ค้างที่ `rejected_for_edit` ตลอดไป
- หน้า "ตั๋วรอดำเนินการ" ของคลัง query `status='pending_warehouse_entry'` → **ใบนี้หายไป ไม่โผล่ให้คลังตรวจอีกเลย**
- assessment_log โดน flip กลับเป็น completed แต่ไม่มีใบ DR ที่ active → loop ตัน
- toast แจ้ง "สร้าง DR-xxxx แล้ว" ทั้งที่จริงๆ ไม่ได้สร้าง/รีเซ็ตอะไร

## สิ่งที่ควรเป็น

ตอนช่างประเมินใหม่แล้วเลือก `defective` อีกครั้ง ระบบควร **revive ใบ DR เดิม** (เลขเดิมเพื่อ audit trail ต่อเนื่อง) โดย:

1. UPDATE ใบ DR เดิม:
   - `status` → `pending_warehouse_entry`
   - `reason` → ผลประเมินใหม่ (overwrite)
   - `notes` → append "ประเมินใหม่หลัง Reject (เหตุผลเดิม: ...)"
   - `quantity`, `item_condition`, `equipment_id/media_player_id` → sync ตามผลใหม่ (เผื่อช่างแก้)
   - เคลียร์ field reject: `rejected_at=null`, `rejected_by=null`, `rejected_by_name=null`, `rejection_reason=null`
   - `updated_at=now()`
2. ถ้าผลใหม่ไม่ใช่ `defective` (เช่น เปลี่ยนเป็น `claim` / `self_repair` / `return_refurb`) → set ใบ DR เดิมเป็น `cancelled` พร้อม note "ยกเลิกหลังประเมินใหม่ → <outcome ใหม่>" แล้วทำ side-effect ของ outcome ใหม่ตามปกติ (กันสองทาง: ของเสีย + claim ซ้อนกัน)

## แก้ที่ไหน

ไฟล์เดียว: `src/components/assessment/AssessmentCompleteDialog.tsx`

### 1) Branch `outcome === "defective"` (บรรทัด ~467-499)
- เปลี่ยน query idempotency ให้ดึงทั้ง `id, document_no, status`
- ถ้าเจอใบเดิม:
  - status = `pending_warehouse_entry` หรือ `completed` → reuse เลขเดิม (พฤติกรรมเดิม)
  - status = `rejected_for_edit` → UPDATE revive ตามรายการข้างบน, log toast ว่า "ส่งใบ DR-xxxx กลับเข้าคลังอีกครั้ง"
  - status = `cancelled` → INSERT ใบใหม่ (เหมือนไม่มีใบเดิม)
- ถ้าไม่เจอใบเดิม → INSERT ตามเดิม

### 2) Branch อื่น (`claim` / `self_repair` / `return_refurb`)
- ก่อนทำ side-effect ของ outcome ใหม่ ให้เช็คว่ามีใบ DR `rejected_for_edit` ของ assessment นี้ค้างอยู่หรือไม่
- ถ้ามี → UPDATE เป็น `cancelled` + notes อธิบายเหตุ ก่อนสร้าง claim/flip status

### 3) Toast หลังบันทึก
- เพิ่มข้อความเฉพาะกรณี revive: "📦 ส่งใบ DR-xxxx กลับเข้าคลังของเสียอีกครั้ง (หลังแก้ผลประเมิน)"

## ไม่แตะ

- ไม่แก้ `DefectiveReturnEntry.tsx` (query `pending_warehouse_entry` ถูกต้องอยู่แล้ว — แค่ DR ฝั่งโน้นต้องถูก revive)
- ไม่แก้ schema เพิ่ม (ใช้ฟิลด์ที่ migration ก่อนหน้าเพิ่มไว้แล้ว: `rejected_at/by/by_name`, `rejection_reason`)
- ไม่แตะหน้า AssessmentLog (badge "Reject จาก DR-xxx" จะหายไปอัตโนมัติเมื่อใบ revive กลับเป็น `pending_warehouse_entry` เพราะ query กรอง `status='rejected_for_edit'`)
- ไม่แตะ Swap flow

## Flow ใหม่ (สรุปเป็น diagram)

```text
Reject ครั้งที่ 1               ประเมินใหม่ (outcome=defective)
─────────────────────           ──────────────────────────────
DR-001: pending_warehouse  →    DR-001: rejected_for_edit  →   DR-001: pending_warehouse
ASM-009: completed              ASM-009: pending                ASM-009: completed
                                                                (เลข DR เดิม, audit ต่อเนื่อง,
                                                                 reason/notes อัปเดต)

ประเมินใหม่ (outcome=claim แทน defective)
─────────────────────────────────────────
DR-001: rejected_for_edit  →   DR-001: cancelled
                               CLM-xxx: submitted (ใหม่)
                               MP/SN: in_claim
```
