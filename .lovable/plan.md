
## เป้าหมาย
เพิ่ม "มุมมองการ์ด (Gallery)" แบบภาพตัวอย่าง และ "มุมมองปฏิทิน (Calendar)" ใน 3 หน้าหลัก โดย **ตารางยังเป็นค่าเริ่มต้น** — ผู้ใช้กดสลับได้ (จำค่าไว้ใน localStorage) ไม่กระทบข้อมูล ไม่ต้องแก้ backend หนัก

## ขอบเขต (ตามที่ตกลง)

### A. มุมมองการ์ด (Gallery View)
เพิ่มให้ 3 หน้า:
1. **จัดการเครื่องมือ** (`/tools` — `ToolList.tsx`)
2. **Media Player / จอภาพ** (`/media-player-report` — `MediaPlayerReport.tsx`)
3. **รายงานคลัง / อะไหล่** (`/inventory-report` — `InventoryReport.tsx`)

รูปแบบการ์ด (อิงภาพที่ส่งมา):
- Grid responsive: 2 คอลัมน์ (mobile) → 3 (tablet) → 4-5 (desktop)
- แต่ละการ์ดแสดง: **รูปหลัก** (16:9 / square), **ชื่อ**, **รหัส**, **แถบเล็ก**บอก ประเภท/ยี่ห้อ/สถานะ, **badge จำนวนคงเหลือ** หรือ S/N
- คลิกการ์ด → เปิด Detail Dialog เดิมของหน้านั้น (reuse ไม่สร้างใหม่)
- ใช้ตัวกรอง/ค้นหา/pagination **ตัวเดียวกับตาราง** (แค่เปลี่ยน renderer) → ประหยัดเครดิต ไม่ duplicate logic

### B. มุมมองปฏิทิน (Calendar View)
เพิ่มให้ 2 จุด:
1. **ตาราง PM เครื่องมือ** (`/tool-pm-schedule`) — แสดงวันที่ครบกำหนด PM ราย tool
2. **หมดประกัน/หมดอายุการใช้งาน** — เพิ่มใน `MediaPlayerReport` และ `InventoryReport` (จุดสีบนวัน `warranty_expiry_date` + วันหมดอายุใช้งาน)

รูปแบบปฏิทิน:
- **Reuse `PlanningCalendarView` เป็นต้นแบบ** — copy โครง grid เดือน/legend มาปรับ props (มีอยู่แล้วในโปรเจกต์)
- แต่ละวันแสดงจุดสี + จำนวน แยกกลุ่ม: เลยกำหนด (แดง) / ภายใน 14 วัน (ส้ม) / 30 วัน (เหลือง) / ปกติ (เทา)
- คลิกวัน → dialog list รายการวันนั้น พร้อมลิงก์ไปหน้า detail
- Toggle เดือน ‹ › ปกติ

### C. รูปหลัก (Primary Image)
ในการ์ดจะแสดง **รูปแรก** เป็นหลัก + ปุ่ม "ตั้งเป็นรูปหลัก" ในหน้าจัดการรูปเดิม:
- เพิ่มคอลัมน์ `is_primary boolean default false` ใน 3 ตาราง: `tool_images`, `media_player_images`, `equipment_images`
- ปุ่มดาว ⭐ บนแต่ละรูป — กดแล้ว unset ตัวอื่น + set ตัวนี้เป็น primary
- Query การ์ด: `ORDER BY is_primary DESC, created_at ASC LIMIT 1` — ถ้าไม่มี primary ใช้รูปแรก, ถ้าไม่มีรูปเลยใช้ placeholder icon

### D. Toggle สลับมุมมอง
- Component ใหม่ตัวเดียวใช้ร่วม: `<ViewModeToggle value onChange />` (icon: Table / LayoutGrid / Calendar)
- เก็บค่าเลือกใน `localStorage` key `viewMode:{pageId}` — จำแยกต่อหน้า
- Default = `"table"` ทุกหน้า (ตามที่ผู้ใช้ระบุ)

## รายละเอียดเทคนิค (สำหรับผู้พัฒนา)

### ไฟล์ที่จะสร้างใหม่ (น้อยที่สุด เพื่อประหยัดเครดิต)
```
src/components/common/ViewModeToggle.tsx         // Toggle 3 ปุ่ม + hook localStorage
src/components/common/EntityCardGrid.tsx         // Grid การ์ด reusable รับ items + fields
src/components/common/EntityCalendarView.tsx     // Calendar reusable (fork PlanningCalendarView)
```

### ไฟล์ที่จะแก้
- `src/components/tools/ToolList.tsx` — เพิ่ม toggle + card/calendar render
- `src/pages/MediaPlayerReport.tsx` — เพิ่ม toggle + card/calendar (calendar = warranty)
- `src/pages/InventoryReport.tsx` — เพิ่ม toggle + card/calendar (calendar = warranty)
- `src/pages/ToolPMSchedule.tsx` — เพิ่มปุ่มปฏิทิน (นอกจากตารางเดิม)
- `src/components/tools/ToolImageManager.tsx` (หรือชื่อคล้าย) — ปุ่ม ⭐ ตั้งรูปหลัก
- `src/pages/MediaPlayerProfile.tsx` — ปุ่ม ⭐ ตั้งรูปหลัก
- `src/components/equipment/…ImageManager` — ปุ่ม ⭐ ตั้งรูปหลัก

### Migration (1 ครั้งเดียว)
```sql
ALTER TABLE public.tool_images        ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE public.media_player_images ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE public.equipment_images   ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
-- partial unique index: มี primary ได้แค่ 1 รูปต่อ entity
CREATE UNIQUE INDEX ... WHERE is_primary;
```

### แนวทางประหยัดเครดิต
1. **ใช้ query เดิม** ของแต่ละหน้า ไม่ยิง fetch เพิ่ม (การ์ด/ตาราง/ปฏิทินใช้ data ชุดเดียวกัน)
2. **Component reusable ตัวเดียว** สำหรับ 3 หน้า — ไม่เขียนซ้ำ
3. **ไม่ทำ virtual scroll / lazy image** ในรอบแรก — pagination เดิมเพียงพอ
4. **Calendar fork จาก `PlanningCalendarView`** ที่มีอยู่แล้ว — ปรับ props ให้ generic
5. **ไม่แก้ backend logic** ยกเว้น 1 migration เพิ่ม `is_primary`

## Layout ตัวอย่าง (การ์ด)
```text
┌─────────────────┐
│                 │
│   [ รูปหลัก ]   │  ← 16:9
│                 │
├─────────────────┤
│ ชื่อรายการ         │
│ CODE-001         │
│ [Type] [Brand]  │
│           คงเหลือ:5 │
└─────────────────┘
```

## สิ่งที่ **ไม่** ทำในรอบนี้
- ไม่ทำ drag-reorder รูป
- ไม่ทำ bulk edit จากการ์ด
- ไม่ทำ export จากมุมมองปฏิทิน (ใช้ export เดิมของตาราง)
- ไม่แตะสิทธิ์/RLS (การ์ด/ปฏิทินเห็นข้อมูลเท่าตารางเดิมทุกประการ)

กดยืนยันเพื่อเริ่มทำได้เลยครับ
