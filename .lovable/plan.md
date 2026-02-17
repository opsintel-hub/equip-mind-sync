

## ปรับปรุงส่วน "สิทธิ์ตามฝ่าย" ให้เป็นปัจจุบัน

### ปัญหาที่พบ

1. **รายชื่อฝ่าย Hardcode ไม่ตรงกับฐานข้อมูล** - ในโค้ดเขียนตายตัว 10 ฝ่าย (`Airport, Digital, Billboard, Static, Bus, 7 Eleven, Construction, HR, Account, ของขวัญปีใหม่`) แต่ฐานข้อมูลจริงมี 11 ฝ่ายและชื่อต่างกัน เช่น "Airport Media", "Digital Media", "HR PlanB", "Operation 7-Eleven", "Production", "Store Center"

2. **หัวข้อคอลัมน์ "ดู สร้าง แก้ไข ลบ" ไม่ชัดเจน** - ไม่อธิบายว่าแต่ละสิทธิ์หมายถึงอะไรในบริบทของระบบนี้

3. **"ลบรายการ" ควรล็อคเฉพาะ Admin** - ผู้ใช้ทั่วไปไม่ควรได้สิทธิ์ลบ ต้องซ่อน checkbox ของคอลัมน์ "ลบ" และแสดงข้อความแจ้งว่าสิทธิ์นี้สงวนสำหรับ Admin เท่านั้น

---

### สิ่งที่จะทำ

**ไฟล์: `src/components/admin/UserPermissionManager.tsx`**

#### 1. ดึงรายชื่อฝ่ายจากฐานข้อมูลแทน Hardcode
- ลบ `const DEPARTMENTS = [...]` (บรรทัด 38)
- เพิ่ม state `allDepartments` แล้ว fetch จากตาราง `departments` ใน `fetchUsers()`
- แก้ `fetchUserPermissions()` ให้ใช้ `allDepartments` แทน `DEPARTMENTS`

#### 2. ปรับหัวข้อคอลัมน์ให้ชัดเจนขึ้น พร้อม Tooltip อธิบาย

| เดิม | ใหม่ | Tooltip อธิบาย |
|------|------|---------------|
| ดู | ดูข้อมูล | เห็นรายการสินค้า, รายงาน, ประวัติของฝ่ายนั้น |
| สร้าง | สร้างรายการ | รับเข้า/ขอเบิก/สร้างคำขอสินค้าของฝ่ายนั้น |
| แก้ไข | แก้ไขข้อมูล | อัปเดตข้อมูลสินค้า, สถานะรายการของฝ่ายนั้น |
| ลบ | ลบรายการ | (สงวนสำหรับ Admin เท่านั้น) |

#### 3. ล็อคคอลัมน์ "ลบรายการ" สำหรับ Admin เท่านั้น
- ซ่อน checkbox ของคอลัมน์ "ลบ" ไม่ให้กดได้ (disabled + แสดงไอคอนล็อค)
- เพิ่มข้อความสีแดงเล็กๆ ใต้ตาราง: "สิทธิ์ลบรายการสงวนสำหรับ Admin เท่านั้น"
- เมื่อบันทึก จะไม่มีการบันทึก `can_delete = true` ให้ผู้ใช้ที่ไม่ใช่ Admin

#### 4. ปรับข้อความอธิบายในกล่องแนะนำ
- เปลี่ยนจาก "กำหนดว่าผู้ใช้สามารถดู/สร้าง/แก้ไข/ลบ..." เป็นรายละเอียดแต่ละข้อ

---

### รายละเอียดทางเทคนิค

**ไฟล์ที่แก้ไข:** `src/components/admin/UserPermissionManager.tsx`

- เพิ่ม `const [allDepartments, setAllDepartments] = useState<string[]>([])` 
- ใน `fetchUsers()` เพิ่ม query: `supabase.from("departments").select("name").eq("is_active", true).order("name")`
- แก้ `fetchUserPermissions()` ให้ map กับ `allDepartments` แทน `DEPARTMENTS`
- ในส่วน Table Header ของแท็บ "ฝ่าย" เพิ่ม `TooltipProvider` + `Tooltip` บนหัวคอลัมน์
- คอลัมน์ "ลบ" ใช้ `<Checkbox disabled />` พร้อมไอคอน Lock และ Tooltip อธิบาย
- ใน `handleSaveAll()` บังคับ `can_delete = false` สำหรับผู้ใช้ที่ไม่ใช่ Admin

