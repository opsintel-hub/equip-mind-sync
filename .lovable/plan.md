
## เป้าหมาย
ฝ่าย **7-Eleven Media** มีคุณสมบัติพิเศษคือ `sub_media_type` (TOPSHELF_1/2/3, SPECIAL_1/2, OVERVAULT_1/2, OPENTYPE_1/2) ปัจจุบันแสดงและกรอกไม่ครบ flow ต้องทำให้:
1. แสดงทุกหน้าที่เห็น MP/Monitor (ทั้ง `media_player` และ `monitor`)
2. กรอก/แก้ไขได้ทุกขั้นตอนของ flow (ไม่ล็อค — เพราะหน้างานอาจเปลี่ยนตำแหน่งติดตั้งเมื่อไหร่ก็ได้)
3. ค่าไหลต่อกันเป็น flow — ขั้นถัดไป default จากขั้นก่อนหน้า แต่แก้ได้

## Flow การกรอก/แก้ไข (สำคัญสุด — ส่วนที่ขาด)

```text
Master MP Entry → Receive Goods → Issue Request (เบิก) → Manager Approval (อนุมัติ) → Issue Goods (จ่าย) → Billboard Detail (ติดตั้ง) → Swap/Defective/Assessment
   [กรอกได้]        [กรอกได้]         [กรอกได้★ใหม่]        [แก้ไขได้★ใหม่]         [แก้ไขได้]          [แก้ไขได้★ใหม่]        [แสดง+แก้ไขได้★ใหม่]
```

### จุดที่จะเพิ่มการ "กรอก/แก้ไข" (ไม่ใช่แค่แสดง)
- **`src/pages/IssueRequest.tsx` (เบิก)** — ในรายการสินค้า MP/Monitor ฝ่าย 7-Eleven ใส่ `SubMediaTypeSelect` ให้ผู้เบิกเลือกตำแหน่งที่ตั้งใจติดตั้ง (default จาก master ถ้ามี) บันทึกลง `goods_issue_pending_items.sub_media_type`
- **`src/pages/ManagerApproval.tsx` (อนุมัติ)** — ใน expanded row แสดงค่าที่ผู้เบิกระบุ + **แก้ไขได้ inline** ก่อนกดอนุมัติ
- **`src/pages/IssueGoods.tsx` (จ่าย)** — มี select แล้ว แต่ปรับให้ default มาจากค่าที่ผ่านการอนุมัติ (ไม่ใช่จาก master เดิม) และ**ไม่บังคับ block** หากเครื่องไม่มีค่า (เปลี่ยนจาก required เป็น warning) เพื่อให้แก้หน้างานได้
- **`src/pages/BillboardDetail.tsx`** — ในรายการ MP ที่ติดตั้งบนป้าย เพิ่มปุ่มดินสอเล็ก inline แก้ `sub_media_type` ได้ (กรณีย้ายตำแหน่งบนป้ายเดียวกัน)
- **`src/components/swap/SwapWizardDialog.tsx`** — ตอนเลือกเครื่องใหม่ ให้ default จากเครื่องเดิม + แก้ไขได้
- **`src/pages/DefectiveReturnEntry.tsx` / `AssessmentLog.tsx`** — แสดง badge + ปุ่มแก้ไข inline (กรณีเครื่องกลับมาแล้วต้องเปลี่ยนตำแหน่งใหม่)

### Schema ที่ต้องเพิ่มคอลัมน์ (Migration)
- `goods_issue_pending_items` — เพิ่ม `sub_media_type text null` (ปัจจุบันยังไม่มี — ทำให้ flow ขาดช่วงระหว่างเบิก→อนุมัติ)
- ทุกที่ที่อ่าน/เขียน goods_issue_pending_items ปรับให้รวมคอลัมน์นี้

## สิ่งที่จะทำ (รวม)

### 1. Migration
เพิ่มคอลัมน์ `sub_media_type` ใน `goods_issue_pending_items` เพื่อให้ flow เบิก→อนุมัติ→จ่าย ส่งต่อค่าได้

### 2. Component กลาง `SubMediaTypeBadge`
- ไฟล์ใหม่ `src/components/media-player/SubMediaTypeBadge.tsx`
- Props: `department`, `subMediaType`, `size`, `onEdit?` (ถ้ามี → แสดงไอคอนดินสอเล็ก คลิกเปิด popover เลือกค่าใหม่)
- คืน `null` ถ้าไม่ใช่ฝ่าย 7-Eleven Media
- สี Brand 7-Eleven (เขียว/แดง/ส้ม) เด่นชัด

### 3. เพิ่ม "แสดง" ในจุดที่ขาด
โปรไฟล์: `MediaPlayerProfile.tsx`, `GeneralInfoTab.tsx`, `MediaPlayerPublicView.tsx`
รายงาน: `EquipmentTrackingReport.tsx` (ทั้ง 2 Tab + Excel export), `InventoryReport.tsx` (+ Excel), `StockCard.tsx`
ค้นหา: `GlobalSearch.tsx`, `ProfileSearch.tsx`
Workflow: `IncompleteIssues.tsx`, `PendingAssetCodes.tsx`, `DeliveryDetailDialog.tsx`, `DeliveryConfirmation.tsx`, `SwapWarehouseReceive.tsx`, `SwapWizard.tsx` (ทั้ง 3 Tab), `DisposalApproval.tsx`, `ClaimTracker.tsx`
Notifications: `NotificationCenter.tsx`, `PendingAssessmentAlerts.tsx`
ปรับ `BillboardDetail.tsx` ที่มีอยู่แล้วให้ใช้ component กลาง

### 4. เพิ่ม "กรอก/แก้ไข" inline ตาม Flow ด้านบน (IssueRequest / ManagerApproval / IssueGoods / BillboardDetail / SwapWizardDialog / DefectiveReturnEntry / AssessmentLog)

### 5. ตรวจ Query Selects
ทุก query ที่เพิ่ม badge/edit ต้อง select `sub_media_type` และ `department` มาด้วย

## สิ่งที่จะ**ไม่**ทำ
- ไม่ "บังคับ/ล็อค" ค่า — แก้ได้ทุกขั้นแม้กระทั่งหลังติดตั้งบนป้าย
- ไม่เปลี่ยน workflow business logic อื่น
- ไม่แตะ schema ตารางหลัก `media_players` (มี column อยู่แล้ว) นอกจาก `goods_issue_pending_items`

## ผลลัพธ์
ผู้ใช้เห็น sub_media_type ของฝ่าย 7-Eleven ตลอดทั้ง flow ตั้งแต่ master → เบิก → อนุมัติ → จ่าย → ติดตั้ง → swap/claim และสามารถแก้ไขได้ทุกจุดเพื่อรองรับการเปลี่ยนตำแหน่งหน้างาน
