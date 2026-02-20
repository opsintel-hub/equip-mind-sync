
# แผนพัฒนา "แจ้ง PM ป้ายโฆษณา" + ปรับปรุง "ประวัติ PM ป้าย" ฉบับสมบูรณ์

---

## ข้อเสนอแนะเพิ่มเติมจากการวิเคราะห์ระบบ

จากการตรวจสอบฐานข้อมูลและโครงสร้างระบบปัจจุบัน พบสิ่งที่ควรเพิ่มเติมจากแผนเดิม:

**ข้อเสนอแนะที่ 1 - Dashboard สรุปบนหน้าหลัก**
เพิ่ม Widget การ์ดบน Dashboard หลัก (/dashboard) แสดงจำนวนป้ายที่รอ PM แบบ real-time เพื่อให้ผู้บริหารเห็นภาพรวมทันทีโดยไม่ต้องเข้าเมนู PM

**ข้อเสนอแนะที่ 2 - Notification อัตโนมัติ**
ต่อยอดจากระบบ Notification ที่มีอยู่แล้ว (check-expiring-equipment) ให้แจ้งเตือนป้ายที่ใกล้หมดอายุ/ประกันผ่านระบบ Bell ที่ header ได้เลย

**ข้อเสนอแนะที่ 3 - Export รายการ PM เป็น Excel/PDF**
หน้า "แจ้ง PM" ควรมีปุ่ม Export รายการป้ายที่รอดำเนินการออกมาเป็น Excel เพื่อส่งให้ทีมช่างได้เลย

**ข้อเสนอแนะที่ 4 - ระบบ Snooze แบบ Smart**
แทนที่จะซ่อนทั้งป้าย ควรซ่อนเป็นรายอะไหล่ เช่น ป้าย A มี Photo Switch หมดประกัน + Controller หมดอายุ ผู้ใช้อาจจะ Snooze แค่ Photo Switch แต่สร้างตั๋วสำหรับ Controller ก็ได้

ในแผนนี้จะรวมข้อเสนอ 1, 2, 3 เข้าไปด้วย (ข้อ 4 เป็น Phase ถัดไปเพราะซับซ้อนมาก)

---

## ส่วนที่ 1: ฐานข้อมูลใหม่ (3 ตาราง + Migration)

### ตาราง 1: `pm_action_types` - ตัวเลือก Action (Master Data)

```sql
CREATE TABLE pm_action_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  is_snooze boolean NOT NULL DEFAULT false,
  snooze_days integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed data เริ่มต้น
INSERT INTO pm_action_types (name, code, is_snooze, snooze_days, sort_order) VALUES
  ('นำไปสร้างตั๋วใหม่ในระบบติดตามงานซ่อม', 'create_ticket', false, null, 1),
  ('ซ่อนและกลับมาแสดงใหม่ใน 30 วัน', 'snooze_30', true, 30, 2),
  ('ซ่อนและกลับมาแสดงใหม่ใน 60 วัน', 'snooze_60', true, 60, 3),
  ('ซ่อนและกลับมาแสดงใหม่ใน 90 วัน', 'snooze_90', true, 90, 4);
```

### ตาราง 2: `billboard_pm_actions` - บันทึก Snooze/Ticket

```sql
CREATE TABLE billboard_pm_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id uuid NOT NULL REFERENCES billboards(id),
  action_type_id uuid REFERENCES pm_action_types(id),
  action_type text NOT NULL, -- 'ticket_created' | 'snoozed'
  pm_reason text NOT NULL, -- 'expiry' | 'warranty_expiry' | 'both'
  snooze_until date,
  equipment_snapshot jsonb, -- snapshot ของอะไหล่ที่เกี่ยวข้อง
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### ตาราง 3: `billboard_pm_history` - ประวัติถาวร

```sql
CREATE TABLE billboard_pm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id uuid NOT NULL REFERENCES billboards(id),
  action_type_id uuid REFERENCES pm_action_types(id),
  action_label text NOT NULL,
  pm_reason text NOT NULL,
  equipment_snapshot jsonb,
  billboard_snapshot jsonb,
  notes text,
  actioned_by uuid,
  actioned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: authenticated users อ่านได้ทั้งหมด, สร้าง/แก้ไขได้สำหรับผู้ที่ login

---

## ส่วนที่ 2: โครงสร้าง UI ทั้งหมด

### 2A. Sidebar - ปรับ Group "ป้ายโฆษณา"

```
ป้ายโฆษณา
├── จัดการป้ายโฆษณา  (/billboards)
└── PM ป้ายโฆษณา (Collapsible)
    ├── แจ้ง PM ป้ายโฆษณา  (/pm-billboard)   ← ใหม่
    ├── ตาราง PM ป้าย       (/pm-schedule)     ← เดิม
    └── ประวัติ PM ป้าย     (/pm-history)      ← ปรับปรุงใหม่
```

กลุ่มยังคงใช้ `functionName: "pm_schedule"` เหมือนเดิม

---

## ส่วนที่ 3: หน้า "แจ้ง PM ป้ายโฆษณา" (/pm-billboard)

### Layout ภาพรวม

```
┌──────────────────────────────────────────────────────────────┐
│  แจ้ง PM ป้ายโฆษณา                [🔄 รีเฟรช] [📥 Export]  │
│  พบป้ายที่ต้องดำเนินการ: 45 ป้าย  [👁 แสดงที่ซ่อนทั้งหมด]  │
├──────────────────────────────────────────────────────────────┤
│ FILTERS (แถว 1):                                             │
│ [เหตุผล PM ▼] [ระยะเวลา: หมดแล้ว/30/60/90วัน ▼] [ฝ่าย ▼]  │
│ [Media Type ▼] [Region ▼] [District ▼] [Territory ▼]        │
│ [Route PM ▼] [Route Monitoring ▼]                           │
├──────────────────────────────────────────────────────────────┤
│ ตะกร้า: เลือกแล้ว 3 ป้าย                                    │
│ [เลือก Action ▼ (จาก pm_action_types)]  [✓ ยืนยัน]         │
├──────────────────────────────────────────────────────────────┤
│ TABLE:                                                       │
│ [☐] OldCode | EqID | ฝ่าย | Media Type | Location          │
│     Region | District | Territory | Route PM | Route Mon    │
│     อะไหล่ที่ติดตั้ง | เหตุผล | วันหมดอายุ | วันหมดประกัน │
│     เหลืออีก (วัน) | สถานะ                                  │
└──────────────────────────────────────────────────────────────┘
```

### Logic คำนวณป้ายที่แสดง

Query หลัก: JOIN `billboards` + `billboard_equipment` + `equipment`

ป้ายแสดงถ้า:
1. มีอะไหล่ติดตั้ง (`billboard_equipment`) ที่ equipment มี `expiry_date` หรือ `warranty_expiry_date`
2. วันดังกล่าวอยู่ในช่วง filter ที่เลือก
3. **ไม่มี** แถวใน `billboard_pm_actions` ที่:
   - `action_type = 'snoozed'` และ `snooze_until >= today()`
   - หรือ `action_type = 'ticket_created'`

### Filter ระยะเวลา

| ตัวเลือก | เงื่อนไข |
|---------|---------|
| หมดไปแล้ว | วันหมดอายุ < วันนี้ |
| ภายใน 30 วัน | วันนี้ <= วันหมดอายุ <= วันนี้+30 |
| ภายใน 60 วัน | วันนี้ <= วันหมดอายุ <= วันนี้+60 |
| ภายใน 90 วัน | วันนี้ <= วันหมดอายุ <= วันนี้+90 |
| ทั้งหมด | รวมทุกกรณีข้างต้น (ค่าเริ่มต้น) |

### ระบบตะกร้า (Cart)

1. ผู้ใช้ติ๊ก Checkbox เลือกป้าย (หลายป้ายพร้อมกัน)
2. Badge แสดง "เลือกแล้ว N ป้าย" อัปเดต real-time
3. เลือก Action จาก Dropdown (ดึงจาก `pm_action_types` is_active=true)
4. กด "ยืนยัน" → Dialog ยืนยันรายการ
5. บันทึก:
   - **create_ticket** → insert `billboard_pm_history` (ถาวร) → ป้ายหายจากหน้าหลัก
   - **snooze_X** → insert `billboard_pm_actions` with `snooze_until = today + X days` → ป้ายซ่อนชั่วคราว

### ปุ่ม "แสดงที่ซ่อนทั้งหมด" (Admin/Manager)

- Toggle button แสดง/ซ่อน รายการที่ snooze
- ป้ายที่ซ่อนมี Badge สีเหลือง "ซ่อนจนถึง dd/mm/yy"
- Admin สามารถ "ยกเลิกการซ่อน" ป้ายแต่ละป้ายได้

### Export

ปุ่ม Export Excel ส่งออกรายการป้ายที่รอ PM ทั้งหมดพร้อมข้อมูลอะไหล่

---

## ส่วนที่ 4: ปรับปรุง "ประวัติ PM ป้าย" (/pm-history) ใหม่ทั้งหมด

### Layout ใหม่ - แบ่งเป็น 3 ส่วน

```
┌───────────────────────────────────────────────┐
│  Tab 1: ประวัติ PM ป้าย (Magic Ticket)       │
│  Tab 2: ประวัติ PM แบบ Recurring (เดิม)      │
└───────────────────────────────────────────────┘
```

### Tab 1: ประวัติ PM ป้าย (จาก billboard_pm_history)

**Slicers:**
- ช่วงวันที่ (Date Range Picker)
- ฝ่าย / Media Type / Region / District / Territory / Route PM
- เหตุผล PM (หมดอายุ / หมดประกัน)
- Action ที่ทำ (สร้างตั๋ว / Snooze)
- ป้ายเฉพาะ (Old Code / Equipment ID)

**แผงสถิติ:**
- Bar Chart รายเดือน: จำนวน PM ที่ดำเนินการแต่ละเดือน
- Bar Chart รายป้าย: 10 ป้ายที่ทำ PM บ่อยสุด
- Bar Chart รายอะไหล่: อะไหล่ที่ถูก PM บ่อยสุด (จาก equipment_snapshot)
- Summary Card: จำนวนทั้งหมด, สร้างตั๋ว, Snooze

**ตารางรายการ:**
คอลัมน์: วันที่, Old Code, EqID, ฝ่าย, Media Type, Location, เหตุผล, อะไหล่, Action, ผู้ดำเนินการ

Export: Excel + PDF

### Tab 2: ประวัติ PM Recurring (ของเดิม PMHistoryList)

คง PMHistoryList เดิมไว้ใน Tab นี้ ไม่กระทบ

---

## ส่วนที่ 5: Master Data - PM Action Types

เพิ่มแท็บใหม่ใน `MasterData.tsx` ชื่อ "ประเภท PM Action"
- List: แสดง Action ทั้งหมด พร้อมสถานะ Active/Inactive
- Form: สร้าง/แก้ไข Action
- ไม่สามารถลบ Action ที่มีประวัติการใช้งานแล้ว (ซ่อนได้)

---

## ส่วนที่ 6: Dashboard Widget (ข้อเสนอแนะเพิ่มเติม)

เพิ่ม Card ใน `Dashboard.tsx` แสดง:
- จำนวนป้ายที่หมดอายุแล้ว (แดง)
- จำนวนป้ายที่จะหมดใน 30 วัน (เหลือง)
- ลิงก์ "ดูทั้งหมด" → /pm-billboard

---

## ส่วนที่ 7: ไฟล์ที่ต้องสร้าง/แก้ไข

### สร้างใหม่:
1. `supabase/migrations/xxx_billboard_pm_system.sql` - ฐานข้อมูล
2. `src/pages/BillboardPMPage.tsx` - หน้าหลัก Magic Ticket
3. `src/components/pm/BillboardPMFilters.tsx` - Filter bar
4. `src/components/pm/BillboardPMTable.tsx` - ตารางพร้อม Checkbox
5. `src/components/pm/BillboardPMCart.tsx` - ตะกร้า + Batch action
6. `src/components/pm/BillboardPMHiddenView.tsx` - แสดงรายการที่ซ่อน (Admin)
7. `src/components/pm/PMHistoryStats.tsx` - กราฟสถิติ 4 มุมมอง
8. `src/components/pm/PMActionTypeForm.tsx` - Form จัดการ Action
9. `src/components/pm/PMActionTypeList.tsx` - List จัดการ Action

### แก้ไข:
1. `src/App.tsx` - เพิ่ม Route `/pm-billboard`
2. `src/components/AppSidebar.tsx` - เพิ่ม subItem "แจ้ง PM ป้ายโฆษณา"
3. `src/pages/PMHistory.tsx` - ปรับเป็น 2 Tabs
4. `src/pages/MasterData.tsx` - เพิ่ม Tab PM Action Types
5. `src/pages/Dashboard.tsx` - เพิ่ม Widget PM Alert

---

## ส่วนที่ 8: ลำดับการพัฒนา (เพื่อความต่อเนื่อง)

ขั้นที่ 1: สร้างฐานข้อมูล (Migration) + Seed pm_action_types
ขั้นที่ 2: หน้า BillboardPMPage พร้อม Filter + ตาราง
ขั้นที่ 3: ระบบตะกร้า + Confirm Dialog + บันทึก
ขั้นที่ 4: ปุ่มแสดงที่ซ่อน (Admin toggle)
ขั้นที่ 5: Export Excel
ขั้นที่ 6: ปรับ Sidebar + App.tsx routing
ขั้นที่ 7: ปรับ PMHistory.tsx เป็น 2 Tabs + Stats
ขั้นที่ 8: Master Data Tab PM Action Types
ขั้นที่ 9: Dashboard Widget

---

## ผลกระทบต่อเมนูอื่น

| เมนู | ผลกระทบ |
|------|---------|
| ตาราง PM ป้าย (/pm-schedule) | ไม่กระทบ ยังทำงานเหมือนเดิม |
| ประวัติ PM ป้าย (/pm-history) | ปรับใหม่เป็น 2 Tabs แต่ข้อมูลเดิมยังอยู่ |
| จัดการป้ายโฆษณา (/billboards) | ไม่กระทบ |
| ข้อมูลหลัก (/master-data) | เพิ่ม Tab ใหม่ ไม่กระทบ Tab เดิม |
| Dashboard | เพิ่ม Widget ใหม่ ไม่กระทบส่วนเดิม |
