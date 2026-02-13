

# แผนผูกฝ่ายกับ Master Data และล็อค Dropdown ตามสิทธิ์

## ขั้นตอนที่ 1: แก้ไขข้อมูล departments ให้ตรงกับข้อมูลจริง

ปัจจุบันชื่อฝ่ายไม่ตรงกันข้ามตาราง ต้องแก้ให้ตรงกันก่อน:

| ตาราง departments (ปัจจุบัน) | ข้อมูลจริงที่ใช้ | การดำเนินการ |
|---|---|---|
| Airport | Airport Media (ใน billboards) | เปลี่ยนเป็น "Airport Media" |
| HR PlanB | ไม่มีใน data จริง | คงไว้ (อาจใช้ในอนาคต) |
| Production | ไม่มีใน data จริง | คงไว้ |
| Store Center | มีใน locations | คงไว้ |

พร้อมกัน ต้อง update ข้อมูลในตารางอื่นที่ใช้ "Airport" เป็น "Airport Media" ให้ตรงกัน:
- `equipment.department` = "Airport" -> "Airport Media"
- `user_departments.department` = "Airport" -> "Airport Media"

## ขั้นตอนที่ 2: ลบ Hardcode ALL_DEPARTMENTS

ลบ array ที่ hardcode ไว้ใน `useDepartmentPermissions.tsx` แล้วให้ `getViewableDepartments()` สำหรับ Admin ดึงจากตาราง `departments` แทน

## ขั้นตอนที่ 3: สร้าง Hook กลาง `useAllowedDepartments`

สร้าง hook ใหม่ที่:
- ดึงฝ่ายทั้งหมดจาก DB (`departments` table)
- กรองตามสิทธิ์ผู้ใช้ (จาก `user_departments`)
- Admin เห็นทุกฝ่าย / ผู้ใช้ทั่วไปเห็นเฉพาะฝ่ายตัวเอง
- ถ้ามีฝ่ายเดียว -> auto-select + ล็อค dropdown

## ขั้นตอนที่ 4: ปรับ Dropdown ทั้งระบบ

### ไฟล์ใหม่ (1 ไฟล์)

| ไฟล์ | คำอธิบาย |
|------|----------|
| `src/hooks/useAllowedDepartments.tsx` | Hook กลางดึงฝ่ายจาก DB + กรองตามสิทธิ์ |

### ไฟล์ที่ต้องแก้ไข (9 ไฟล์)

| # | ไฟล์ | การเปลี่ยนแปลง |
|---|------|---------------|
| 1 | `src/hooks/useDepartmentPermissions.tsx` | ลบ `ALL_DEPARTMENTS` hardcode, ให้ `getViewableDepartments` ดึงจาก DB |
| 2 | `src/components/equipment/SimpleDepartmentSelect.tsx` | ใช้ `useAllowedDepartments` แทนดึงทุกฝ่าย + auto-lock |
| 3 | `src/components/equipment/DepartmentSelect.tsx` | กรอง departments ตามสิทธิ์ |
| 4 | `src/components/DepartmentFilter.tsx` | ปรับ auto-select ถ้ามีฝ่ายเดียว |
| 5 | `src/pages/DeliveryEntry.tsx` | กรอง departments + auto-select |
| 6 | `src/components/billboard/BillboardFilters.tsx` | กรอง department filter ตามสิทธิ์ |
| 7 | `src/pages/EquipmentTrackingReport.tsx` | กรอง departments ตามสิทธิ์ |
| 8 | `src/pages/DeadStockReport.tsx` | กรอง departments ตามสิทธิ์ |
| 9 | `src/pages/ToolPMSchedule.tsx` | กรอง departments ตามสิทธิ์ |

### รายละเอียดทางเทคนิค

**useAllowedDepartments Hook:**
```text
Input: permission type (default: "view")
Output:
  - allowedDepartments: { id, name, description }[]
  - isAdmin: boolean
  - isSingleDepartment: boolean
  - loading: boolean
```

**Auto-lock Logic:**
- ถ้าผู้ใช้มีฝ่ายเดียว -> ตั้งค่าอัตโนมัติ + disabled dropdown
- ถ้ามีหลายฝ่าย -> แสดงเฉพาะฝ่ายที่มีสิทธิ์
- Admin -> เห็นทุกฝ่าย เลือกได้อิสระ

### ขั้นตอนดำเนินงาน

1. Update ข้อมูล: เปลี่ยน "Airport" เป็น "Airport Media" ในทุกตาราง
2. สร้าง `useAllowedDepartments.tsx`
3. แก้ `useDepartmentPermissions.tsx` ลบ hardcode
4. แก้ทุก component/page ที่มี department dropdown (8 ไฟล์)

ไม่ต้องทำ Database Migration (ไม่เปลี่ยน schema) -- แค่ update ข้อมูลและแก้โค้ด
