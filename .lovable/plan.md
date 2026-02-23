

## ปรับปรุงหน้าจัดการ Media Player เป็นแบบ Tab

### ภาพรวม
เปลี่ยนหน้า Media Player Entry จากรูปแบบ Dialog/ปุ่ม เป็นรูปแบบ Tab โดยคงคุณสมบัติเดิมทั้งหมดไว้ (รอรหัสทรัพย์สิน, Install/Uninstall ป้าย ฯลฯ) และเพิ่มระบบรหัสอัตโนมัติแบบ Prefix + เลขรัน 4 หลัก

---

### Tab 1: "เพิ่ม Media Player ใหม่"
ย้าย Form จาก Dialog มาเป็นหน้าเต็ม จัดเป็น Card sections ตามภาพอ้างอิง

**ข้อมูลทั่วไป:**
- ฝ่าย - `SimpleDepartmentSelect` (dropdown จากระบบ)
- บริษัทที่สั่งซื้อ - `CompanySelect` (dropdown จากระบบ)
- ตำแหน่งจัดเก็บ - `LocationSelect` (dropdown จากระบบ)
- รหัส - ใช้ระบบ Prefix + Auto Run 4 หลัก (สร้าง `MediaPlayerCodePrefixSelect` ใหม่ ใช้ pattern เดียวกับ `EquipmentCodePrefixSelect` / `ToolCodePrefixSelect`)
- ชื่อสินค้า
- ยี่ห้อ/ผู้จัดจำหน่าย - `BrandSelect` (dropdown จากระบบ)

**ประเภทของสินค้า:**
- ประเภท CMS - `SearchableSelect` พร้อม CRUD ในตัว (แทนปุ่ม "จัดการประเภท CMS" แยก) สามารถเพิ่ม/แก้ไข/ลบได้จาก dropdown เลย
- Specification

**ข้อมูลเฉพาะ Media Player (กรอบสี):**
- Model (CMS Type dropdown เดิม)
- S/N 1, S/N 2
- Activate Windows (text field ใหม่)
- Note
- Upload รูปภาพ

**ข้อมูลเพิ่มเติม:**
- Status dropdown: Active, Spare Office Bamed, Spare Office Planto Tw, Fix or Break, Claim, Spare Ow, Spare Online พร้อมใช้งาน
- Name, Remote (text fields ใหม่)
- ID Display, Group Led, Led Control (คงเดิม)

**ผูกกับป้ายโฆษณา (กรอบสี):**
- ป้ายโฆษณา - `BillboardSelect` (dropdown จากระบบ)
- วันที่ติดตั้ง

**ราคาและค่าเสื่อม:**
- ราคาต่อหน่วย
- ระยะเวลาค่าเสื่อม (เดือน) *
- วันสิ้นสุดการรับประกัน

**ทรัพย์สิน (คงเดิมทั้งหมด):**
- Switch เป็นทรัพย์สิน
- รหัสทรัพย์สิน + Checkbox "รอรหัสทรัพย์สิน"
- Equipment ID + Checkbox "รอ Equipment ID"

**PO/PR (fields ใหม่):**
- เลข PO, เลข PR, Invoice No.
- วันที่รับสินค้า
- Order For Project

**หมายเหตุ**

---

### Tab 2: "Dashboard"
- แสดง `MediaPlayerDashboard` component (คงเดิม)
- ด้านล่างแสดงตารางรายการ Media Player พร้อม search + filters (บริษัท, สถานะ, ประเภท CMS)
- ปุ่ม Import Excel อยู่ใน tab นี้
- ปุ่ม Install/Uninstall ป้ายโฆษณาในตาราง (คงเดิม)

---

### สิ่งที่ลบออก
- ปุ่ม "ซ่อน Dashboard" / "แสดง Dashboard"
- ปุ่ม "เพิ่ม Media Player" (ย้ายเป็น Tab)
- ปุ่ม "จัดการประเภท CMS" (รวมเข้าใน dropdown CMS Type)

---

### สิ่งที่คงไว้ (ไม่เปลี่ยน)
- ระบบรอรหัสทรัพย์สิน / รอ Equipment ID พร้อม validation
- ระบบ Install/Uninstall ป้ายโฆษณา
- Dashboard charts และ alerts ทั้งหมด
- Import Excel
- ฟิลด์เฉพาะ Media Player (ID Display, Group Led, Led Control, S/N 1, S/N 2)

---

### รายละเอียดทางเทคนิค

#### 1. Database Migration
**สร้างตาราง `media_player_code_prefixes`:**
- `id` (uuid, PK), `prefix` (varchar 7, unique), `description` (text), `next_number` (int, default 1), `is_active` (boolean, default true), `created_at`, `updated_at`, `created_by`
- RLS policies สำหรับ authenticated users

**สร้าง Function `get_next_media_player_code(p_prefix)`:**
- ใช้ pattern เดียวกับ `get_next_equipment_code` และ `get_next_tool_code`
- Update `next_number + 1` แล้ว return `PREFIX XXXX` (เช่น "MP 0001")

**เพิ่มคอลัมน์ในตาราง `media_players`:**
- `status` (text, default 'active')
- `remote_name` (text)
- `activate_windows` (text)
- `po_number` (text)
- `pr_number` (text)
- `invoice_number` (text)
- `date_of_receipt` (date)
- `order_for_project` (text)
- `image_url` (text)

#### 2. สร้าง Component ใหม่
- `src/components/media-player/MediaPlayerCodePrefixSelect.tsx` - Prefix dropdown พร้อม CRUD (clone จาก EquipmentCodePrefixSelect ปรับใช้ตาราง `media_player_code_prefixes`)
- `src/components/media-player/CMSTypeSelect.tsx` - CMS Type dropdown พร้อม CRUD ในตัว (pattern เดียวกับ `ToolCategorySelect`)

#### 3. แก้ไขไฟล์หลัก
- `src/pages/MediaPlayerEntry.tsx` - Rewrite เป็น Tab layout, ย้าย form เป็น inline, เพิ่ม fields ใหม่, ใช้ Prefix select แทน free text code
- `src/components/media-player/MediaPlayerDashboard.tsx` - เพิ่ม status-based stats จาก field `status` ใหม่

#### 4. ไฟล์ที่ไม่แก้ไข
- `src/components/media-player/MediaPlayerImport.tsx` (คงเดิม)
- `src/components/media-player/MediaPlayerDashboard.tsx` (ปรับเล็กน้อยถ้ามี status field)
- ทุก dropdown ที่ใช้อยู่ (`CompanySelect`, `LocationSelect`, `BillboardSelect`, `BrandSelect`, `SimpleDepartmentSelect`)

