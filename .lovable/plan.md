
## ตอบคำถาม 2 ข้อก่อน

### 1) ค้นหา S/N ของเครื่องเก่าจะไปอยู่ที่ไหน?

**ไปอยู่ที่ location = คลังปลายทางที่ช่างเลือกตอน Swap** (`return_location_id`) พร้อมสถานะที่บอกชัด:

| จุดค้นหา | จะเห็นเครื่องเก่าอย่างไร |
|---|---|
| **Media Player Report / Profile** | Badge สีเหลือง "พักรอประเมิน" • คลัง: [ที่ช่างเลือก] • Qty=0 (มองเห็นได้ ค้นเจอ แต่เบิกไม่ได้) |
| **Inventory Report / Stock Card** | สถานะ `pending_assessment` • location แสดงชัดเจน • มีแถว movement `pending_assessment_in` |
| **Document Search (S/N)** | เจอครบทั้ง swap_requests + stock_movements + assessment_logs (chain ต้นทาง) |
| **IssueRequest (เบิกของ)** | ❌ ไม่แสดง (เพราะ qty=0 + status ไม่ใช่ in_stock) — คนเบิกไม่รบกวน |
| **Swap Wizard (เลือก Spare)** | ❌ ไม่แสดง (filter ตัด `pending_assessment` ออกอยู่แล้ว) — ไม่ถูกดึงไปติดตั้งซ้ำ |
| **Assessment Log แท็บ "รอประเมิน"** | ✅ แสดงเป็นการ์ดพร้อม Timeline ต้นทาง (Swap → รอประเมิน) ให้ช่างกดประเมิน |

**สรุป:** ค้นหาเจอทุกที่ที่ควรเจอ + มีสถานะเหลืองเด่นชัด "พักรอประเมิน" + ไม่หลุดไปโผล่ในรายการเบิก/Spare

### 2) เครื่อง Spare ไปแทนที่ป้ายเหมือนเดิมใช่มั้ย?

**ใช่ ไม่เปลี่ยน** — Flow ของ Spare (เครื่องใหม่ที่ติดตั้งแทน) ยังเป็นแบบเดิมทุกอย่าง:
- Spare → `billboard_equipment` + `billboard_id` = ป้ายเดิม + `status='installed'`
- เขียน `media_player_billboard_history` (install_date = วันนี้)
- Inherit `department` + `sub_media_type` จากเครื่องเก่า (สำหรับ 7-Eleven Media)
- Stock movement: `install_to_billboard`

**สิ่งที่แก้มีเฉพาะฝั่งเครื่องเก่า** (ให้เข้า pending_assessment ตรงๆ แทนที่จะเป็น pending_warehouse_return แล้วรอกดยืนยัน)

---

## แผน (คงเดิม + เสริมจุดที่ยืนยันความชัดเจน)

### A. SwapWizardDialog — เครื่องเก่าเข้า pending_assessment ทันที
- บังคับเลือก `returnLocationId` ก่อนยืนยัน Swap สำเร็จ (ถ้าว่าง = block พร้อม toast)
- Media Player: `status='pending_assessment'`, `location_id=returnLocationId`, `quantity=0`, `billboard_id=null`, `install_date=null`
- Equipment S/N: `status='pending_assessment'`, `location_id=returnLocationId`
- Stock movement: `movement_type='pending_assessment_in'`, `location_id=returnLocationId`, `item_condition='pending_assessment'`, notes ระบุ "จาก Swap SWP-... รอประเมิน"
- **ฝั่ง Spare ไม่แตะ** — ยังติดตั้งที่ป้ายเดิม + history + inherit dept/sub_media_type เหมือนเดิมทุกประการ

### B. ลบไฟล์/แท็บ
- ลบ `src/components/swap/SwapWarehouseReceive.tsx`
- `src/pages/SwapWizard.tsx`: ตัด import + Tab "รอรับเข้าคลัง"
- KPI "กำลัง Swap" (นับ pending_warehouse_return): เปลี่ยนเป็นนับเครื่องที่มาจาก swap แล้วยัง pending_assessment (join swap_executions.result='approved') หรือลบการ์ดนี้

### C. Migration ล้างข้อมูลค้าง
- อ่าน `swap_executions` (result='approved') → หา old_media_player_id/old_equipment_id + return_location_id
- UPDATE เครื่องที่ยังค้าง `pending_warehouse_return` → `pending_assessment` + set `location_id=return_location_id`, `quantity=0`
- Insert stock_movements 1 แถว (`pending_assessment_in`) ต่อเครื่อง เพื่อ Stock Card ต่อเนื่อง
- ตรวจว่าเครื่องที่ย้ายไปแล้วโผล่ใน Assessment Log แท็บ "รอประเมิน" อัตโนมัติ

### D. UI/รายงานที่อ้าง pending_warehouse_return
คง mapping label ไว้ (label = "พักรอประเมิน") กัน log เก่าไม่พัง แต่ **ซ่อนจากตัวเลือกกรอง/การ์ด**:
- `MediaPlayerReport.tsx`: ลบ SelectItem "รอเข้าคลัง (Swap)" + SPECIAL entry
- `StockReconciliation.tsx`: ลบการ์ด `mp_transit`
- `PendingAssessmentAlerts.tsx`: ลบ query แยก (นับ pending_assessment ตัวเดียว)
- `InventoryReport.tsx`, `EquipmentTrackingReport.tsx`, `MediaPlayerStatusKPI.tsx`, `ItemTracer.tsx`: รวม label เข้ากับ "พักรอประเมิน"

### E. จุดกันเบิก/กัน Spare ซ้ำ (ยืนยันยังทำงาน)
- `SwapWizardDialog.tsx` filter Spare (line 166): ตัด `pending_warehouse_return` ออก เหลือ `pending_assessment, under_repair, in_claim, defective, claim` — เครื่องรอประเมิน **ไม่ถูกเลือกเป็น Spare**
- IssueRequest / SearchableSelect: อาศัย `quantity>0` — pending_assessment (qty=0) ถูกกันอัตโนมัติ

---

## Flow สรุปหลังแก้

```text
Swap Wizard สำเร็จ
   ├─► Spare  → billboard เดิม + installed + qty=1 (เหมือนเดิม 100%)
   └─► Old    → pending_assessment + location=[ที่เลือกไว้] + qty=0
                 │  (ค้นเจอ • มี badge เหลือง • เบิกไม่ได้ • Swap ซ้ำไม่ได้)
                 ▼
          Assessment Log
             ├─ self_repair  → in_stock, qty=1 (กลับเบิกได้)
             ├─ claim        → Vendor คืน → in_stock, qty=1 (กลับเบิกได้)
             ├─ return_refurb → ตีคืน supplier (ออกจากคลัง)
             └─ defective    → defective_returns → ทำลาย/ขายซาก (ออกจากคลัง)
```

พร้อมลงมือครับ ถ้าอนุมัติแผน → แก้จบใน 1 turn (code + migration + cleanup UI)
