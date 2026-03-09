

## แผนออกแบบ Process "ของเสีย/ชำรุด" (Defective Items Management)

### สรุปปัญหา
ระบบปัจจุบันรองรับเฉพาะสินค้า "ของดี" เท่านั้น ไม่มี field สถานะการใช้งาน (usable/defective) ทำให้ไม่สามารถแยกของดี-ของเสียในคลังได้ และไม่มี process สำหรับนำของเสียจากป้ายโฆษณากลับเข้าคลัง

### Process ที่เสนอ (เรียบง่ายแต่ครอบคลุม)

```text
┌─────────────────────────────────────────────────────────────┐
│                   PROCESS ภาพรวม                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. นำของเสียเข้าระบบ (Defective Return Entry)              │
│     ├─ เลือกสินค้า → ข้อมูลเดิมขึ้นมาอัตโนมัติ              │
│     ├─ ระบุป้ายโฆษณา (ถ้ามาจากป้าย)                         │
│     │   └─ ระบบนำออกจาก billboard_equipment ทันที             │
│     ├─ เลือกสถานะ: เสีย/ชำรุด หรือ รอตรวจสอบ                │
│     └─ สถานะ → "รอนำเข้าคลัง"                               │
│                                                             │
│  2. หน้า "รอระบุป้าย/รอคืน/รอเข้าคลัง"                      │
│     └─ Tab ใหม่: "รอเข้าคลัง" แสดงรายการที่รอรับเข้า         │
│                                                             │
│  3. รับเข้าคลัง (Receive Goods - ปรับปรุง)                   │
│     ├─ เลือกสถานะการใช้งาน: ใช้งานปกติ / เสีย / รอตรวจสอบ   │
│     ├─ เลือกตำแหน่งจัดเก็บ                                   │
│     └─ อัปเดต stock + บันทึก stock_movement                  │
│                                                             │
│  4. สถานะการใช้งาน ติดตามได้ทุกที่                            │
│     └─ equipment / media_players มี field item_condition     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### รายละเอียดการปรับปรุง

---

#### 1. Database Migration

**เพิ่ม field ใหม่:**
- `equipment` table → `item_condition` (text, default `'normal'`, values: `normal`, `defective`, `pending_inspection`)
- `media_players` table → `item_condition` (text, default `'normal'`)
- `goods_receipt_pending` table → `item_condition` (text, default `'normal'`)
- `goods_issue_pending` table → `item_condition` (text, nullable)
- `goods_issue_pending_items` table → `item_condition` (text, nullable)
- `stock_movements` table → `item_condition` (text, nullable) — เพื่อบันทึกว่า movement นั้นเป็นของดีหรือของเสีย
- `billboard_equipment` table → `item_condition` (text, default `'normal'`)

**ตาราง defective_returns (ใหม่):**
- `id`, `document_no`, `equipment_id`, `media_player_id`, `is_media_player`
- `quantity`, `billboard_id` (ถ้ามาจากป้าย)
- `item_condition` (defective / pending_inspection)
- `reason` (เหตุผลที่เสีย/ชำรุด)
- `status` (pending_warehouse_entry → received → closed)
- `source_type` (billboard / warehouse / field)
- `created_by`, `created_at`, timestamps

---

#### 2. หน้าที่ต้องปรับปรุง/สร้างใหม่ (รวม 5 หน้า)

| # | หน้า | การเปลี่ยนแปลง |
|---|------|----------------|
| 1 | **DefectiveReturnEntry (ใหม่)** | ฟอร์มนำของเสียเข้าระบบ — ค้นหาสินค้าจาก equipment/media_players แล้ว auto-fill ข้อมูล, เลือกป้ายโฆษณา (ถ้ามี), ระบุสาเหตุ, สร้าง defective_return + นำออกจาก billboard_equipment ทันที |
| 2 | **IncompleteIssues (ปรับ)** | เพิ่ม Tab "รอเข้าคลัง" แสดง defective_returns ที่ status = pending_warehouse_entry |
| 3 | **ReceiveGoods (ปรับ)** | เพิ่มตัวเลือก "สถานะการใช้งาน" (ใช้งานปกติ/เสีย/รอตรวจสอบ) ในขั้นตอนรับเข้าคลัง, อัปเดต item_condition ใน equipment/media_players |
| 4 | **DeliveryEntry (ปรับเล็กน้อย)** | เพิ่ม field สถานะการใช้งานในตะกร้า (default = ใช้งานปกติ) |
| 5 | **AppSidebar (ปรับ)** | เปลี่ยนชื่อเมนูเป็น "รอระบุป้าย/รอคืน/รอเข้าคลัง", เพิ่มเมนู "นำของเสียเข้าระบบ" |

---

#### 3. วัตถุประสงค์การนำสินค้าเข้า (Receipt Purposes) — ใช้ซ้ำได้

ใช้ `receipt_purposes` ที่มีอยู่แล้ว โดยเพิ่มวัตถุประสงค์ใหม่ในหน้า Master Data:
- "นำเข้าของเสีย/ชำรุด" (purpose_type = `defective`)
- "นำเข้ารอตรวจสอบ" (purpose_type = `inspection`)

ระบบจะ auto-detect จาก purpose ว่าเป็นของเสียหรือไม่ และตั้ง item_condition ให้อัตโนมัติ

---

#### 4. Process Flow ของเสียจากป้ายโฆษณา

1. ผู้ใช้เปิดหน้า "นำของเสียเข้าระบบ"
2. เลือกสินค้า (พิมพ์รหัส/ชื่อ → auto-fill ทุก field จาก DB)
3. เลือก "มาจากป้ายโฆษณา" → เลือกป้าย → ระบบนำออกจาก `billboard_equipment` ทันที
4. เลือกสถานะ: เสีย/ชำรุด หรือ รอตรวจสอบ
5. ระบุเหตุผล + จำนวน
6. บันทึก → สร้าง `defective_returns` (status = `pending_warehouse_entry`)
7. รายการปรากฏใน Tab "รอเข้าคลัง" ของหน้า IncompleteIssues
8. เจ้าหน้าที่คลังรับเข้าคลังผ่านหน้า ReceiveGoods (หรือปุ่มในหน้า IncompleteIssues)
9. อัปเดต stock + item_condition + log stock_movement

---

#### 5. รายละเอียดทางเทคนิค

- **Auto-fill**: Query จาก `equipment` / `media_players` โดย code หรือ name แล้ว populate ทุก field (code, name, unit, category, brand, serial_number, location, billboard ที่ติดตั้งอยู่)
- **Billboard removal**: เมื่อเลือกป้ายโฆษณา ระบบ DELETE จาก `billboard_equipment` + INSERT เข้า `billboard_equipment_history` พร้อม uninstall_reason
- **Stock movement**: บันทึกเป็น movement_type = `return_from_billboard` (ถ้ามาจากป้าย) หรือ `receive` (ถ้ามาจากที่อื่น) พร้อม item_condition
- **IncompleteIssues Tab**: Query `defective_returns WHERE status = 'pending_warehouse_entry'` แสดงจำนวนใน Badge

