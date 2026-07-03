## เป้าหมาย
1. แก้ปุ่ม **Export Excel** ในหน้า `RepairReport` ให้ล้อกับ "รายการงานซ่อม" ที่กรองแล้ว (รวมตัวกรอง Repair Frequency bucket + คอลัมน์ใหม่ทั้งหมด)
2. เพิ่มฟีเจอร์ **Column Chooser (Show/Hide Columns)** เฉพาะตาราง "รายการงานซ่อม" ในหน้านี้ก่อน

---

## 1) ฟีเจอร์นี้เรียกว่าอะไร
เรียกกันหลายชื่อ ความหมายเดียวกัน:
- **Column Chooser** (ชื่อที่นิยมสุด — Excel/Power BI ใช้)
- **Column Visibility / Column Toggle** (DataTables, TanStack Table)
- **Column Manager / Field Picker** (Salesforce, Airtable)

UI มาตรฐาน: ปุ่ม **"คอลัมน์"** พร้อมไอคอน `Columns` (lucide) เปิด **DropdownMenu** ที่มี Checkbox ต่อแต่ละคอลัมน์ + ปุ่ม "เลือกทั้งหมด / ล้าง / ค่าเริ่มต้น" และจำค่าไว้ใน `localStorage` ต่อผู้ใช้ต่อหน้า

---

## 2) การแก้ไข (เฉพาะ `src/pages/RepairReport.tsx`)

### A. Fix Export Excel
- สร้าง `exportRows` จาก `filteredRows` (ชุดเดียวกับที่ตารางแสดง หลังผ่านตัวกรองทั้งหมด รวม bucket 1-2/3-4/5-6/>6)
- คอลัมน์ export ให้ตรงกับตารางปัจจุบัน: วันที่ซ่อม, รหัส MP, ชื่อ, S/N, ฝ่าย, Brand, Model, Remote, Sub-media, ครั้งที่ซ่อม, Repair Scope, Repair Actions (join comma), รายละเอียด, ผู้บันทึก, ประวัติป้าย 4 ครั้งล่าสุด (สรุปเป็นข้อความ "ป้าย X — dd/mm/yy → dd/mm/yy (ระยะเวลา) เหตุถอด")
- เคารพ **Column Chooser** ด้วย: คอลัมน์ที่ซ่อนอยู่จะไม่ถูก export (default) — เพิ่มตัวเลือก "Export ทุกคอลัมน์" ในเมนู export ไว้เป็นทางเลือก
- ตั้งชื่อไฟล์: `repair-report_YYYY-MM-DD.xlsx`

### B. Column Chooser
- นิยาม `COLUMN_DEFS: { key, label, defaultVisible }[]` ครอบทุกคอลัมน์ของตาราง
- state `visibleCols: string[]` เก็บ/โหลดจาก `localStorage` key = `repair-report.visible-cols.v1`
- ปุ่ม **"คอลัมน์"** (icon `Columns`) วางข้างปุ่ม Export
  - Dropdown: Checkbox ต่อคอลัมน์ + ปุ่ม "เลือกทั้งหมด", "ล้าง", "ค่าเริ่มต้น"
- Render `<TableHead>` และ `<TableCell>` ด้วย `.filter(c => visibleCols.includes(c.key))` ทั้ง header และแต่ละ row
- คอลัมน์ที่ล็อกไว้ตลอด (ไม่ให้ซ่อน): วันที่ซ่อม, รหัส MP (เพื่อไม่ให้ผู้ใช้ซ่อนจนแถวไม่มีความหมาย)

---

## รายละเอียดทางเทคนิค
- ใช้ `xlsx` (มีอยู่แล้วในโปรเจกต์) แบบเดียวกับ `ContractorList.tsx`
- ใช้ `DropdownMenu` + `DropdownMenuCheckboxItem` จาก shadcn (มีอยู่แล้ว)
- ไม่แตะ backend / RLS / ตาราง
- ไม่กระทบหน้าตารางอื่น (ผู้ใช้เลือก "ทำเฉพาะ RepairReport ก่อน")

---

## Out of scope
- ยังไม่สร้าง `<ColumnChooser/>` reusable component และยังไม่ rollout หน้าตารางอื่น (จะทำภายหลังตามที่ผู้ใช้ระบุ)
