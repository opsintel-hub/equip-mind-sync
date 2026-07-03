## สรุปสถานะปัจจุบัน — Assessment > ซ่อมเอง

Flow บันทึกผลซ่อม 3 ทางเลือกใน `RepairCompleteDialog.tsx` ทำงานครบแล้ว:
- **ซ่อมสำเร็จ** → update `assessment_logs` + flip MP/Monitor เป็น `in_stock`, `is_refurbished=true`, ตั้ง location + log `stock_movements` (`repair_return_in`)
- **ซ่อมไม่ได้ → ส่งเข้าของเสีย** → update + navigate `/defective-return-entry` พร้อม prefill
- **ซ่อมไม่ได้ → เปลี่ยนเป็นส่งเคลม** → update + navigate `/claims` พร้อม prefill

ครอบคลุมทั้ง Media Player และ Monitor อยู่แล้ว (`device_type` ใช้ตารางเดียวกัน) — ส่วนที่ต้องเพิ่มคือฟิลด์รายละเอียดการซ่อม + เมนูสถิติ

## สิ่งที่จะทำ

### 1. Master Data ใหม่: `repair_actions` (รายการงานซ่อม CRUD)
Migration:
- Table `repair_actions` — `name`, `scope` (`hardware`|`software`), `applies_to_device` (`media_player`|`monitor`|`both`, default `both`), `is_active`, `sort_order`
- GRANT + RLS: authenticated อ่านได้ / admin จัดการได้
- Seed เริ่มต้น (ครอบคลุมทั้ง MP + จอภาพ):
  - Software: ลง Windows ใหม่, ตั้งค่า CMS ใหม่, อัปเดต Firmware, Reset การตั้งค่า
  - Hardware (MP): เปลี่ยน HDD/SSD, เปลี่ยน RAM, เปลี่ยน Adaptor, เปลี่ยน Mainboard
  - Hardware (Monitor): เปลี่ยน Panel, เปลี่ยน T-CON board, เปลี่ยน Power board, เปลี่ยน Backlight, เปลี่ยนสาย LVDS

เพิ่ม 3 columns ใน `assessment_logs`:
- `repair_scope text[]`, `repair_action_ids uuid[]`, `repair_actions_snapshot jsonb` (กันข้อมูลหายถ้า master ถูกลบ)

### 2. Master Data UI
- สร้าง `RepairActionsManager.tsx` (pattern เดียวกับ `SimpleListManager` แต่มี dropdown scope + applies_to_device ต่อรายการ)
- เพิ่มเข้า `MasterData.tsx` tab "ตัวเลือกระบบ Workflow" เป็นข้อ ⑤

### 3. ปรับ `RepairCompleteDialog.tsx` (ใช้กับทั้ง MP + Monitor)
เพิ่มก่อนช่อง "รายละเอียดการซ่อม":
```text
┌─ ประเภทงานซ่อม * (multi) ─────────────────────┐
│  ☐ Hardware   ☐ Software                       │
└────────────────────────────────────────────────┘
┌─ รายการที่ซ่อม/เปลี่ยน * (Multi-select) ─────┐
│  [ค้นหา + เลือก จาก repair_actions]           │
│   • filter ตาม scope ที่ tick + device_type   │
│     ของเครื่อง (MP เห็นของ MP+both,           │
│      Monitor เห็นของ Monitor+both)            │
│   • ปุ่ม "+ เพิ่มรายการใหม่" inline          │
│     → mini dialog สร้างเข้า master + auto pick│
│  Chips: [เปลี่ยน Panel ×] [ลง Windows ใหม่ ×] │
└────────────────────────────────────────────────┘
```
Validation: ต้องเลือก scope ≥ 1 และรายการซ่อม ≥ 1

บันทึก: `repair_scope`, `repair_action_ids`, `repair_actions_snapshot` + append ชื่อรายการซ่อมเข้า notes ของ assessment_log และ stock_movements

### 4. เมนูใหม่: **รายงานงานซ่อมเอง (Self-Repair Report)**
เส้นทาง: `/repair-report` — เพิ่มใน sidebar กลุ่มรายงาน (icon `Wrench`)  
ครอบคลุม **ทั้ง Media Player + Monitor** ในหน้าเดียว (มี Tab/Filter สลับ)

**Layout**
- **Summary Cards** (4 ใบ):
  1. งานซ่อมทั้งหมด (ในช่วง)
  2. ซ่อมสำเร็จ + %success rate
  3. ซ่อมไม่ได้ → ของเสีย
  4. ซ่อมไม่ได้ → ส่งเคลม
- **Filters**: ช่วงวันที่ · device_type (MP/Monitor/All) · ฝ่าย · ยี่ห้อ/โมเดล · ผู้ซ่อม · scope (HW/SW)
- **Charts**:
  - Bar: จำนวนงานซ่อมต่อเดือน (แยกสี success/defective/claim)
  - Pie: สัดส่วน scope (Hardware vs Software)
  - Top 10 รายการที่ซ่อมบ่อยที่สุด (จาก `repair_action_ids`)
  - Top 10 เครื่อง/รุ่นที่ซ่อมซ้ำบ่อย (repeat-failure signal)
- **ตาราง**: 1 บรรทัด/งาน — เลข ASM, วันที่, device_type, code+name, S/N, ป้ายเดิม, scope, รายการซ่อม, ผู้ซ่อม, ค่าใช้จ่าย, ผล
- **Export Excel** ตามฟิลเตอร์ (ใช้ pattern เดิมของโปรเจกต์ — คำไทยตรง UI: 'ผลการซ่อม', 'ประเภท', ฯลฯ)
- **Pagination** ค่าเริ่มต้น 10/20/50/100
- **Search 2 ช่อง**: (1) S/N หรือ Asset code, (2) General (code/name/รายการซ่อม/ผู้ซ่อม)

### 5. แสดงผลย้อนหลัง (การ์ดเดิม)
- `AssessmentLog.tsx` การ์ด tab "ซ่อมเอง" + "ประเมินแล้ว": เพิ่มบรรทัด **ประเภท:** `[Hardware][Software]` · **รายการซ่อม:** เปลี่ยน HDD, ลง Windows ใหม่
- **Media Player Profile** และ **Monitor Profile** (หน้าเดียวกัน) → History section แสดงประวัติงานซ่อมพร้อมรายการที่ซ่อม

## ไฟล์ที่จะแก้/สร้าง
- **Migration**: `repair_actions` (+ GRANT/RLS/seed) + 3 cols ใน `assessment_logs`
- **สร้าง**: `src/components/master-data/RepairActionsManager.tsx`
- **สร้าง**: `src/pages/RepairReport.tsx` (+ route ใน `App.tsx` + link ใน `AppSidebar.tsx`)
- **แก้**: `src/pages/MasterData.tsx` (เพิ่ม manager ข้อ ⑤)
- **แก้**: `src/components/assessment/RepairCompleteDialog.tsx` (scope + multi-select + inline create, filter ตาม device_type)
- **แก้**: `src/pages/AssessmentLog.tsx` (แสดง scope + รายการซ่อมในการ์ด)
- **แก้**: `src/components/media-player/profile/` (เพิ่ม history block ในโปรไฟล์ MP/Monitor)

## จุดที่ขอยืนยันก่อนลงมือ
1. เมนูสถิติชื่อ **"รายงานงานซ่อมเอง"** วางในกลุ่ม *รายงาน* — โอเคมั้ย หรืออยากได้ชื่อ/ตำแหน่งอื่น?
2. สิทธิ์เข้าถึงเมนูใหม่: ใช้ function permission เดียวกับ Assessment (`assessment_log`) หรือแยกเป็น `repair_report` ใหม่?
3. `repair_actions` seed: ใช้ชุดตัวอย่างด้านบน หรือส่งรายการของทีมมาเลย?
