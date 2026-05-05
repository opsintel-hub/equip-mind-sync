# เพิ่ม "คลังพักรอประเมิน" และสถานะใหม่ในรายงานต่างๆ

## ที่มา
หลังเปลี่ยน workflow ใหม่ (Swap/Uninstall → `pending_assessment` แทน `defective` ทันที) จะมีสถานะ + คลัง logical ใหม่ที่หน้ารายงานยังไม่รู้จัก: `pending_assessment`, `under_repair`, `in_claim`, และ flag `is_refurbished`. ถ้าไม่อัปเดต รายงานจะนับของพวกนี้ผิด (หาย/ไปกอง "อื่นๆ") และผู้ใช้จะมองไม่เห็นว่ามีของค้างประเมินกี่ชิ้น

## ขอบเขตที่ต้องแก้

### 1. `MediaPlayerEntry.tsx` + `MediaPlayerDashboard.tsx` (Dashboard เครื่อง)
- เพิ่มการ์ดสรุปใหม่ **3 ใบ**: 
  - "พักรอประเมิน" (สีม่วง) — นับ `status='pending_assessment'`
  - "กำลังซ่อม" (สีฟ้าน้ำทะเล) — `status='under_repair'`
  - "รอเคลม" (สีแดงเข้ม) — `status='in_claim'`
- เพิ่ม badge "Refurbished" ในการ์ด Spare/Active สำหรับ `is_refurbished=true`
- เพิ่ม option ใน status filter dropdown ทั้ง 3 สถานะ
- กราฟ donut "สัดส่วนสถานะ" จะ pick up อัตโนมัติเพราะ loop จาก `statusMap`

### 2. `MediaPlayerReport.tsx` (รายงาน Media Player แบบตาราง)
- เพิ่ม logic `statusLabel`: ถ้า `status='pending_assessment'` → "พักรอประเมิน", `under_repair` → "กำลังซ่อม", `in_claim` → "รอเคลม" (ปัจจุบันเช็คแค่ `billboard_id` → "ติดตั้ง"/"ในคลัง")
- เพิ่ม option ใน `statusFilter` dropdown
- คอลัมน์ Excel export "สถานะ" จะใช้ label ใหม่อัตโนมัติ
- เพิ่มคอลัมน์ "Refurbished" (Yes/No) ใน export

### 3. `InventoryReport.tsx` (รายงานคลังรวม)
- บรรทัด 359/730: ปัจจุบันนับเฉพาะ `status='in_stock'` → ของที่ `pending_assessment/under_repair/in_claim` จะหายไปจากยอดคงคลัง
- เพิ่ม filter `issueStatus` 3 ตัวเลือกใหม่
- เพิ่มคอลัมน์ "พักประเมิน/ซ่อม/เคลม" แยกจาก "in_stock" เพื่อให้เห็นว่าของยังอยู่แต่ใช้ไม่ได้
- คลัง `WH-PENDING-ASSESS` จะปรากฏใน filter Warehouse อัตโนมัติเมื่อ master data ถูกสร้าง

### 4. `EquipmentTrackingReport.tsx`
- บรรทัด 572: `inStockSNs` filter `status='in_stock'` เท่านั้น → เพิ่ม group ใหม่ `pendingAssessSNs`, `repairSNs`, `claimSNs`
- เพิ่มคอลัมน์ S/N ที่พักประเมิน / ซ่อม / เคลม

### 5. `StockCard.tsx`
- เพิ่ม movement type ใหม่ในแผนภูมิ Visual Tracker: `pending_assessment_in`, `pending_assessment_out`, `repair_in`, `claim_in`, `refurb_back`
- Label ภาษาไทย + สี

### 6. `Dashboard.tsx` (หน้า /dashboard)
- ถ้ามี card "สต็อกตามสถานะ" → เพิ่ม pending assessment badge
- เพิ่ม alert card "มีของพักรอประเมิน N ชิ้น" คลิกไปหน้า `/assessment-log?filter=pending`

### 7. `KPI Reports`
- `MediaPlayerStatusKPI.tsx` — เพิ่ม slice ใหม่
- `InventoryValueKPI.tsx` — แยกมูลค่าของ "พักประเมิน/ซ่อม/เคลม" ออกจาก in_stock (ของยังเป็นทรัพย์สินอยู่ แต่ใช้งานไม่ได้)
- `DeadStockKPI.tsx` — exclude `pending_assessment` ออก ไม่ให้ถูกนับเป็น dead stock เพราะยังอยู่ใน flow

### 8. `MediaPlayerProfile.tsx` (โปรไฟล์เครื่อง)
- ProcessTracker เพิ่ม step "พักรอประเมิน" ระหว่าง "ถอด" และ "ผลประเมิน"
- แสดง Current Location เป็น "WH-PENDING-ASSESS / LOC-PENDING-ASSESS" เมื่อ status ตรง

### 9. `DeadStockReport.tsx`
- Exclude `pending_assessment/under_repair/in_claim` จากการนับอายุ dead stock (อายุนับใหม่หลัง outcome)

### 10. Search/Filter components
- `serialSearch.ts` / `EquipmentSNViewer` / `SerialNumberSelect`: เพิ่ม label สถานะใหม่ + สีแสดง
- `IssueGoods` / `Goods Issue`: ห้ามเลือก S/N ที่ status ∈ {pending_assessment, under_repair, in_claim} ไปจ่าย (ปัจจุบันอนุญาตเฉพาะ `in_stock` อยู่แล้ว — แค่ confirm)

## สิ่งที่ **ไม่** ต้องแก้
- `goods_issue_pending` / Cart logic — เลือกเฉพาะ `in_stock` อยู่แล้ว
- Stock movements table schema — ใช้ column เดิม แค่เพิ่ม `movement_type` value ใหม่

## อัปเดต Memory
- เพิ่ม memory `features/reports/pending-assessment-visibility` สรุป label/สีมาตรฐานของ 3 สถานะใหม่ + flag refurbished เพื่อให้ทุกหน้ารายงานในอนาคตใช้ตรงกัน

## คำถามก่อน implement
1. **ขอบเขต** — อยากให้ผมแก้**ทั้ง 10 จุด**เลย (ครบจบ) หรือเริ่มจากชุด priority ก่อน? แนะนำ priority:
   - **ชุด A (ต้องมี)**: #1 Dashboard เครื่อง, #2 รายงาน MP, #3 InventoryReport, #4 EquipmentTracking — กันยอดผิด
   - **ชุด B (ดีมี)**: #6 Dashboard, #7 KPI, #8 Profile — เพิ่ม visibility
   - **ชุด C (ละเอียด)**: #5 StockCard, #9 DeadStock, #10 Search labels
2. **สี/ป้ายชื่อ** — ใช้ตามที่ผมเสนอ (พักรอประเมิน=ม่วง, กำลังซ่อม=ฟ้าน้ำทะเล, รอเคลม=แดงเข้ม) หรืออยากกำหนดเอง?
