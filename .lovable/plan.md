

## แผนสร้างหน้า Media Player Profile

### สิ่งที่จะสร้าง
หน้าใหม่ `/media-player/:id` ที่รวมข้อมูล Media Player ทั้งหมดไว้ในที่เดียว — ค้นหาด้วย S/N, รหัส, หรือชื่อ แล้วดูประวัติติดตั้ง, อายุใช้งาน, สถานะประกัน, Stock Card ได้ทันที

### โครงสร้างหน้า

```text
┌───────────────────────────────────────────────────┐
│  Search Bar: ค้นหาด้วย S/N / รหัส / ชื่อ          │
├───────────────────────────────────────────────────┤
│  Header: รหัส + ชื่อ + รูปภาพ + Status Badge      │
├───────────────────────────────────────────────────┤
│  Summary Cards (4):                               │
│  [อายุใช้งาน] [สถานะประกัน] [ป้ายปัจจุบัน] [สภาพ]  │
├───────────────────────────────────────────────────┤
│  ProcessTracker: รับเข้า → จัดเก็บ → ติดตั้ง → ถอด  │
├───────────────────────────────────────────────────┤
│  Tabs:                                            │
│  [ข้อมูลทั่วไป] [ประวัติติดตั้ง] [Stock Movement]   │
│                                                   │
│  Tab 1: S/N 1&2, Model, Brand, CMS Type, Spec,   │
│         ฝ่าย, บริษัท, PO/PR/Invoice, Warranty     │
│                                                   │
│  Tab 2: ตาราง Billboard Journey                    │
│         (ป้าย, วันติดตั้ง, วันถอด, จำนวนวัน)       │
│         + Pie Chart (วันในคลัง vs วันติดตั้ง)      │
│                                                   │
│  Tab 3: Timeline table + ProcessTracker           │
│         (เหมือน StockCard แต่เฉพาะตัวนี้)          │
└───────────────────────────────────────────────────┘
```

### ไฟล์ที่ต้องดำเนินการ (3 ไฟล์)

**1. สร้างใหม่: `src/pages/MediaPlayerProfile.tsx`**
- Search bar ค้นหาจาก `media_players` (match `code`, `name`, `serial_number_1`, `serial_number_2`)
- รับ URL param `/media-player/:id` หรือเลือกจาก search
- ดึงข้อมูลจาก:
  - `media_players` — ข้อมูลหลัก + join `billboards`, `companies`, `suppliers`
  - `billboard_equipment` — ป้ายที่ติดตั้งอยู่ปัจจุบัน
  - `billboard_equipment_history` — ประวัติติดตั้ง/ถอด
  - `stock_movements` — ความเคลื่อนไหวคลัง (query by `equipment_code`)
- คำนวณ: อายุใช้งาน (จาก `date_of_receipt`), สถานะประกัน (จาก `warranty_expiry_date`), จำนวนวันติดตั้ง vs ในคลัง
- ใช้ `ProcessTracker` แสดง lifecycle
- 3 Tabs: ข้อมูลทั่วไป, ประวัติติดตั้ง (+ pie chart), Stock Movement (timeline table)

**2. แก้ไข: `src/App.tsx`**
- เพิ่ม route `/media-player/:id` → `MediaPlayerProfile`

**3. แก้ไข: `src/pages/MediaPlayerEntry.tsx`**
- เพิ่มปุ่ม "ดูรายละเอียด" ในแต่ละแถวของ Dashboard table → navigate ไป `/media-player/{id}`

### ไม่ต้องแก้ Database
ข้อมูลทั้งหมดมีอยู่แล้วในตารางปัจจุบัน

