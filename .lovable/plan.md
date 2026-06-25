
# เพิ่มการจัดการ "จอภาพ (Monitor)" — ใช้ Workflow ร่วมกับ Media Player

## หลักการ
ใช้ตาราง `media_players` เดิม + เพิ่ม column `device_type` ('MEDIA_PLAYER' / 'MONITOR') ทุก workflow (รับเข้า, ติดตั้งป้าย, Swap, Assessment, Claim, Defective Return, รายงาน, Public QR) ใช้โค้ดและตารางชุดเดิม — เพิ่ม filter/badge/lock ตาม device_type เท่านั้น

## การตั้งชื่อ (ตามที่ตกลง)
- **คำเรียกกลาง:** "MP / จอภาพ"
- **Sidebar menu:** "Media Player / จอภาพ", "ตั้งค่า MP / จอภาพ", "รายงาน MP / จอภาพ", "นำเข้า MP / จอภาพ"
- **Tabs ทุกหน้า list/report:** `[ ทั้งหมด ] [ Media Player ] [ จอภาพ ]` — default = **ทั้งหมด**
- **Field label:** "ประเภทอุปกรณ์" — ตัวเลือก `Media Player` / `จอภาพ (Monitor)`
- **คอลัมน์ตาราง/Excel:** "ประเภท"
- **Badge:** 🔵 Media Player / 🟣 จอภาพ
- **Error Swap:** "ไม่สามารถสลับข้ามประเภทอุปกรณ์ได้ (Media Player ↔ จอภาพ)"

## 1. Database Migration
- เพิ่ม `media_players.device_type TEXT NOT NULL DEFAULT 'MEDIA_PLAYER'` + CHECK ใน `('MEDIA_PLAYER','MONITOR')`
- เพิ่ม `goods_receipt_pending.device_type TEXT` (propagate ผ่าน Delivery → Receive)
- Backfill ข้อมูลเดิม = `MEDIA_PLAYER`
- อัปเดต RPC `import_media_player_row` รับ `device_type`
- อัปเดต RPC `public_get_mp_*` ส่ง `device_type` ออกไปด้วย
- Trigger `validate_mp_sub_media_type` เดิม **ไม่ต้องแก้** (เช็ค department อย่างเดียว → คุม 7-Eleven ของทั้งสอง device_type อัตโนมัติ)

## 2. Shared Constants & Components
**สร้างใหม่:**
- `src/lib/deviceTypes.ts` — `DEVICE_TYPES`, label TH, helpers `isMonitor()`, `deviceLabel(t)`, default prefix
- `src/components/media-player/DeviceTypeTabs.tsx` — Tabs `[ทั้งหมด][Media Player][จอภาพ]` reusable + URL query sync
- `src/components/media-player/DeviceTypeBadge.tsx` — badge สี (MP=blue, Monitor=purple)
- `src/components/media-player/DeviceTypeSelect.tsx` — dropdown ใช้ใน Form/Delivery/Issue/Import

## 3. UI Refactoring (Tabs + Shared Components)

### `MediaPlayerEntry.tsx` (ตั้งค่า MP / จอภาพ)
- Header เพิ่ม `DeviceTypeTabs` control filter `device_type`
- Form Create/Edit เพิ่ม `DeviceTypeSelect` — **lock ค่า** ตาม Tab ปัจจุบัน (ถ้า Tab = ทั้งหมด ให้เลือกเอง)
- ตาราง List แสดงคอลัมน์ "ประเภท" (badge)
- Excel export มีคอลัมน์ "ประเภทอุปกรณ์"

### `MediaPlayerReport.tsx` (รายงาน MP / จอภาพ)
- `DeviceTypeTabs` + filter + คอลัมน์ "ประเภท" + Excel export

### Profile — `MediaPlayerProfile.tsx`, `MediaPlayerInfoEditDialog.tsx`, `GeneralInfoTab.tsx`
- แสดง badge device_type ใน header
- field device_type ใน edit dialog (**readonly** หลังสร้าง — ป้องกัน integrity swap/history)

### Public View — `MediaPlayerPublicView.tsx`
- แสดง badge device_type, wording ปรับเป็น "อุปกรณ์"

## 4. Workflow Integration

| Workflow | การแก้ |
|---|---|
| Delivery Entry | เพิ่ม `DeviceTypeSelect` ต่ออุปกรณ์ (lock=MP ถ้ากดจาก tab MP), บันทึก `goods_receipt_pending.device_type` |
| Receive Goods | propagate `device_type` จาก pending → `media_players` ตอน clone row ต่อ unit |
| Issue Goods / Delivery Confirmation | แสดง badge — ไม่แก้ logic |
| Billboard Detail | แสดง badge ในตาราง MP ติดตั้ง + group หัวข้อย่อย |
| Swap Wizard | **บังคับ same device_type** — กรอง spare list, guard error ก่อน submit, ปรับ compatibility score |
| Assessment / Claim / Defective Return | ใช้โค้ดเดิม — เพิ่ม badge |
| Document Search | เพิ่ม badge device_type ในผล MP |
| Stock Card / Inventory Report / EquipmentTrackingReport | เพิ่ม filter + คอลัมน์ device_type |

## 5. 7-Eleven Media Sub Media Type
Trigger เดิมคุมอัตโนมัติ — `SubMediaTypeSelect` ทำงานทั้ง MP และ Monitor เมื่อ department = 7-Eleven Media (required)

## 6. Import Template
- `mediaPlayerTemplate.ts` + RPC: เพิ่มคอลัมน์ `device_type` (default `MEDIA_PLAYER`, validation 2 ค่า) + sheet `_ref_device_types`
- `ImportMediaPlayerPage.tsx` → "นำเข้า MP / จอภาพ"

## 7. Sidebar
- เปลี่ยน label เมนู Media Player → **"Media Player / จอภาพ"** (และเมนูย่อยที่ระบุข้างบน)
- ไม่เพิ่มเมนูใหม่

## รายละเอียดทางเทคนิค (สำหรับ Dev)

**Migration:** `add_device_type_to_media_players.sql` + update RPCs

**ไฟล์ใหม่:** `src/lib/deviceTypes.ts`, `components/media-player/DeviceTypeTabs.tsx`, `DeviceTypeBadge.tsx`, `DeviceTypeSelect.tsx`

**ไฟล์ที่แก้:**
- MP core: `MediaPlayerEntry.tsx`, `MediaPlayerReport.tsx`, `MediaPlayerProfile.tsx`, `MediaPlayerPublicView.tsx`, `MediaPlayerInfoEditDialog.tsx`, `GeneralInfoTab.tsx`, `profile/types.ts`
- Swap: `SwapWizardDialog.tsx` (filter + validation), `SwapWarehouseReceive.tsx` (badge)
- Goods flow: `DeliveryEntry.tsx`, `ReceiveGoods.tsx`, `IssueGoods.tsx`, `DeliveryConfirmation.tsx`
- Workflow: `DefectiveReturnEntry.tsx`, `AssessmentLog.tsx`, `ClaimTracker.tsx`, `AssessmentCompleteDialog.tsx`
- Reports/Search: `BillboardDetail.tsx`, `DocumentSearch.tsx`, `InventoryReport.tsx`, `StockCard.tsx`, `EquipmentTrackingReport.tsx`
- Import: `importTemplates/mediaPlayerTemplate.ts`, `validators.ts`, `setup/ImportMediaPlayerPage.tsx`
- Nav: `AppSidebar.tsx`

## นอกขอบเขต
- ไม่แยกตารางใหม่ / ไม่สร้างหน้าเมนูใหม่
- ไม่แก้ Equipment table
- ไม่แตะ Ad Management / Billboard PM
