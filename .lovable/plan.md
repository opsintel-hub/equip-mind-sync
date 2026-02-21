

# แผนปรับปรุงระบบเครื่องมือให้สมบูรณ์

---

## สรุปสถานะปัจจุบัน

จากการตรวจสอบระบบทั้งหมดพบว่า:
- ยังไม่มีข้อมูลเครื่องมือในระบบเลย (0 รายการ)
- Trigger Auto PM (`trigger_create_next_tool_pm_task`) มีและทำงานอยู่แล้ว
- ปุ่ม Edit ใน ToolList ไม่ทำงาน (เป็นแค่ icon เปล่า)
- รหัสเครื่องมือเป็น Free Text
- ไม่มีระบบช่าง/ผู้รับผิดชอบ
- ไม่มี field ทรัพย์สิน (is_asset, asset_code)
- ไม่บังคับแนบรูปก่อนปิดตั๋ว PM
- ToolImport มี Download Template แล้วแต่ยังไม่ครอบคลุม field ใหม่

---

## สิ่งที่แนะนำทำเพิ่มทั้งหมด (เรียงตามลำดับ)

### 1. Database Migration - เพิ่ม Field + ตารางใหม่

**เพิ่มคอลัมน์ในตาราง `tools`:**
- `is_asset` (boolean, default false) - เป็นทรัพย์สินหรือไม่
- `asset_code` (text) - เลขที่ทรัพย์สิน
- `responsible_person` (text) - ผู้รับผิดชอบ/ผู้ครอบครอง
- `is_personal_tool` (boolean, default false) - เครื่องมือประจำตัวช่าง

**สร้างตาราง `tool_code_prefixes`:**
- `id`, `prefix` (varchar, 1-7 ตัวอักษร), `description`, `next_number` (default 1), `is_active`, timestamps
- พร้อม Function `get_next_tool_code(p_prefix)` สำหรับสร้างรหัสอัตโนมัติ

**สร้างตาราง `technicians`:**
- `id`, `code`, `name`, `department`, `phone`, `notes`, `is_active`, timestamps

**สร้างตาราง `technician_tools`:**
- `id`, `technician_id` (FK -> technicians), `tool_id` (FK -> tools), `assigned_date`, `notes`, timestamps

**RLS Policies** สำหรับทุกตารางใหม่ (authenticated users)

---

### 2. ToolCodePrefixSelect - ระบบรหัสเครื่องมืออัตโนมัติ

**สร้างไฟล์ใหม่:** `src/components/tools/ToolCodePrefixSelect.tsx`
- Dropdown เลือก Prefix (1-7 ตัวอักษร)
- มีปุ่มจัดการ Prefix (เพิ่ม/แก้ไข/ลบ) ใน Dialog
- แสดง Preview รหัสที่จะได้ เช่น "TL 0001"
- มีคำอธิบาย: "Prefix สูงสุด 7 ตัวอักษร ระบบจะเติมเลขรัน 4 หลักให้อัตโนมัติ"
- ใช้รูปแบบเดียวกับ `EquipmentCodePrefixSelect` ที่มีอยู่แล้ว

---

### 3. ToolForm - เพิ่ม Field ใหม่

**แก้ไข:** `src/components/tools/ToolForm.tsx`
- เปลี่ยนช่อง `code` จาก Input -> `ToolCodePrefixSelect`
- เพิ่ม Checkbox "เป็นทรัพย์สินของบริษัท" -> แสดงช่อง "เลขที่ทรัพย์สิน"
- เพิ่มช่อง "ผู้รับผิดชอบ/ผู้ครอบครอง"
- เพิ่ม Checkbox "เครื่องมือประจำตัวช่าง"

---

### 4. ToolEditForm - สร้าง Form แก้ไข (ปุ่ม Edit ที่ไม่ทำงาน)

**สร้างไฟล์ใหม่:** `src/components/tools/ToolEditForm.tsx`
- เหมือน ToolForm แต่เป็น Edit mode (โหลดข้อมูลเดิมมาแสดง)
- รองรับ field ใหม่ทั้งหมด

**แก้ไข:** `src/components/tools/ToolList.tsx`
- เชื่อมปุ่ม Edit กับ ToolEditForm
- เพิ่มคอลัมน์แสดง: ฝ่าย, ผู้รับผิดชอบ, Badge "ทรัพย์สิน", เลขทรัพย์สิน

---

### 5. ToolImport - อัปเดต Template + Logic

**แก้ไข:** `src/components/tools/ToolImport.tsx`
- Template Excel ครอบคลุมทุก field ใหม่ (is_asset, asset_code, responsible_person, is_personal_tool)
- รองรับ Import ทั้งแบบ Full Template และแบบ 4 คอลัมน์ (ฝ่าย, ประเภท, ชื่อ, ความถี่ PM) จากไฟล์ที่ส่งมาก่อนหน้า

---

### 6. ระบบช่าง (Technician Management)

**สร้างไฟล์ใหม่:**
- `src/components/tools/TechnicianForm.tsx` - Form เพิ่ม/แก้ไขช่าง (รหัส, ชื่อ, ฝ่าย, เบอร์โทร)
- `src/components/tools/TechnicianList.tsx` - รายชื่อช่างทั้งหมด
- `src/components/tools/TechnicianToolsDialog.tsx` - Dialog จัดการเครื่องมือประจำตัวช่างแต่ละคน พร้อมสถานะ PM

**แก้ไข:** `src/pages/MasterData.tsx` - เพิ่ม Tab "ช่าง"

---

### 7. บังคับแนบรูปก่อนปิดตั๋ว PM (เครื่องมือประจำตัวช่าง)

**แก้ไข:** `src/components/tools/ToolPMTaskList.tsx`
- เพิ่ม validation: หากเป็น `is_personal_tool = true` ต้องแนบรูปอย่างน้อย 1 รูป
- ปุ่ม Submit disable จนกว่าจะมีรูป พร้อมข้อความเตือน
- Storage bucket `pm-images` มีอยู่แล้ว ไม่ต้องสร้างใหม่

---

### 8. Export รายการเครื่องมือเป็น Excel

**แก้ไข:** `src/components/tools/ToolList.tsx`
- เพิ่มปุ่ม Export Excel ส่งออกรายการเครื่องมือทั้งหมดพร้อม field ใหม่

---

## สรุปไฟล์ที่เกี่ยวข้อง

| ไฟล์ | การดำเนินการ |
|---|---|
| Migration SQL | สร้างตาราง + คอลัมน์ + Function + RLS |
| `ToolCodePrefixSelect.tsx` | สร้างใหม่ |
| `ToolEditForm.tsx` | สร้างใหม่ |
| `TechnicianForm.tsx` | สร้างใหม่ |
| `TechnicianList.tsx` | สร้างใหม่ |
| `TechnicianToolsDialog.tsx` | สร้างใหม่ |
| `ToolForm.tsx` | แก้ไข - ใช้ Prefix + field ใหม่ |
| `ToolList.tsx` | แก้ไข - แสดง field ใหม่ + Edit + Export |
| `ToolImport.tsx` | แก้ไข - Template + Logic ใหม่ |
| `ToolPMTaskList.tsx` | แก้ไข - บังคับรูป |
| `MasterData.tsx` | แก้ไข - เพิ่ม Tab ช่าง |

---

## สิ่งที่ไม่ต้องแก้ (ทำงานได้แล้ว)

| ส่วน | สถานะ |
|---|---|
| Trigger Auto PM | ใช้งานได้ - ทดสอบแล้วมี trigger อยู่ |
| ตาราง PM (ToolPMSchedule) | ใช้งานได้ |
| งาน PM (ToolPMTaskList) | ใช้งานได้ - แค่เพิ่ม validation รูป |
| ประวัติ PM (ToolPMHistoryList) | ใช้งานได้ |
| รายงาน PM (ToolPMReport) | ใช้งานได้ |
| Storage bucket `pm-images` | มีอยู่แล้ว |

