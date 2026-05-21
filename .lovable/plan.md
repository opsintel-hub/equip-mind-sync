# OCR PO → ผูกข้อมูลรายเครื่อง → แสดงใน Media Player Profile

## สิ่งที่เจอจากไฟล์ PO จริง (PO26050184)

PO 1 ฉบับมี **17 บรรทัด** แต่ละบรรทัด = **1 เครื่อง** (Quantity 1) มีข้อมูลที่ AI อ่านได้แต่ "ระบบยังไม่เก็บ/ไม่แสดง":

| ฟิลด์จาก PO | ตัวอย่าง | สถานะปัจจุบัน |
|---|---|---|
| **Asset No (ต่อเครื่อง)** | `TE26176`, `TE26177` … | OCR อ่านได้ (`item.asset_no`) แต่ `handlePOImport` ไม่เอาไปใส่ cart |
| **รุ่น / Model** | `DS-086GB2601-T` | อยู่ในก้อน description รวม ไม่มีช่องเดี่ยว |
| **ระยะรับประกัน** | `รับประกันสินค้า 2 ปี` | ไม่ได้แปลงเป็น `warranty_expiry_date` |
| **ผู้ดูแลทรัพย์สิน** | `คุณกมล วังะยูนุช` | ไม่มีช่อง/ไม่มีคอลัมน์ DB |
| **Location (จุดติดตั้งตามแผน)** | `Centerpoint of Siam Square`, `แยกชิดลม` ฯลฯ | ไม่มีช่อง/ไม่มีคอลัมน์ DB (คนละตัวกับ `current_location`) |

## เป้าหมาย

1. ให้ตาราง preview ของหน้า OCR แสดงคอลัมน์ใหม่: Asset No, รุ่น, รับประกัน, ผู้ดูแล, Location ตามแผน (แก้ไขได้ทุกช่อง)
2. กด "นำเข้า" แล้ว auto-fill ลง cart ของหน้า **นำสินค้าเข้า** โดย **แตก 1 บรรทัด PO = 1 รายการ cart ต่อเครื่อง** (เพราะแต่ละเครื่องมี Asset No / Location ต่างกัน)
3. ตอนรับเข้า (Receive Goods) บันทึกค่าเหล่านี้ลง `media_players` ต่อเครื่อง
4. หน้า **Media Player Profile** (tab ข้อมูลทั่วไป) แสดงเพิ่ม: ผู้ดูแลทรัพย์สิน, Location ตามแผน PO

## ขอบเขตงาน

### 1) Database (1 migration)
เพิ่ม 2 คอลัมน์ใน `media_players`:
- `asset_caretaker text` — ผู้ดูแลทรัพย์สิน
- `planned_install_location text` — จุดติดตั้งตามแผน PO (แยกจาก `current_location`)

### 2) Edge function `ocr-purchase-order`
- ขยาย default schema/prompt ให้ดึง per-item: `model`, `warranty_years`, `asset_caretaker`, `planned_location` (parse จาก description "รุ่น …", "รับประกันสินค้า N ปี", "ผู้ดูแลทรัพย์สิน : …", "Location : …")

### 3) `POUploadOCR.tsx`
- เพิ่มฟิลด์ใน `POOCRItem` interface
- ตาราง preview เพิ่ม 5 คอลัมน์: Asset No, รุ่น, รับประกัน (ปี), ผู้ดูแล, Location ตามแผน — `Input` แก้ไขได้
- ส่งฟิลด์เหล่านี้ผ่าน `POImportResult.items`

### 4) `DeliveryEntry.tsx → handlePOImport`
- ถ้า `quantity > 1` ให้ **clone เป็นหลายบรรทัด cart** (1 บรรทัด/เครื่อง) เพื่อรองรับ Asset No รายเครื่อง
- Map ค่าเข้า cart item:
  - `asset_code` ← `asset_no` (Asset No เช่น TE26176)
  - `warranty_expiry_date` ← วันที่รับ + warranty_years
  - ใส่ `asset_caretaker`, `planned_install_location` ใน cart item (เพิ่มฟิลด์ใน type `DeliveryCartItem` + DeliveryCart UI โชว์เป็น chip/Input เล็ก)

### 5) Receive Goods → บันทึกลง `media_players`
- ตอน insert/update media_player ใส่ `asset_caretaker`, `planned_install_location`, `asset_code` ที่ได้จาก cart

### 6) `MediaPlayerProfile / GeneralInfoTab.tsx`
- เพิ่ม 2 `InfoRow`: "ผู้ดูแลทรัพย์สิน", "Location ตามแผน PO"
- อัปเดต `MediaPlayerRow` type

## ไม่อยู่ในขอบเขต
- ไม่แก้ logic การจับคู่ supplier / department / buyer company (ทำงานดีอยู่แล้ว)
- ไม่แตะ Equipment (non-media-player) — โฟกัสเฉพาะกรณี Media Player ตามไฟล์จริง
- ไม่ผูก `planned_install_location` กับตาราง `billboards` อัตโนมัติ (ให้คนเลือก/ติดตั้งเองภายหลัง)
