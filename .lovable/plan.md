
## ภาพรวม

สร้างกลุ่มเมนูใหม่บน Sidebar ชื่อ **"นำเข้าข้อมูลเริ่มต้น"** (สำหรับ Admin/Super Admin) มี 2 เมนูย่อย:
1. **Import อุปกรณ์** (`/setup/import-equipment`)
2. **Import Media Player** (`/setup/import-media-player`)

แต่ละหน้าทำงาน 2 ขั้นตอน:
- **ขั้นที่ 1:** ปุ่ม "ดาวน์โหลด Template" → สร้างไฟล์ Excel ที่มี Sheet ข้อมูล + Sheet อ้างอิง (Brand, Company, Location, Supplier, Model, CMS Type, ป้ายโฆษณา) พร้อม Data Validation Dropdown ในทุก Column ที่ต้องอ้างอิง
- **ขั้นที่ 2:** อัปโหลดไฟล์กลับ → ระบบ validate ทุกแถว → แสดง Preview (เขียว=ผ่าน / แดง=error พร้อมเหตุผลรายแถว) → ถ้ามี error reject ทั้งไฟล์ (ผู้ใช้ต้องแก้ใน Excel แล้วอัปโหลดใหม่)

หลัง Import สำเร็จต่อ 1 row จะเกิด **3 effects พร้อมกัน**:
1. สร้าง Master Data ใน `equipment` หรือ `media_players`
2. เพิ่ม Stock (`equipment.quantity_in_stock` / `media_players.quantity`) + บันทึก `stock_movements` (movement_type: `receipt`)
3. ถ้าระบุป้าย → สร้าง `billboard_equipment` หรือ update `media_players.billboard_id`, บันทึก `billboard_equipment_history` / `media_player_billboard_history`, ตัด stock (`stock_movements` movement_type: `install`)

ทั้ง 3 effects ทำใน RPC เดียว (transactional) — ถ้าขั้นใดล้มเหลว rollback ทั้ง row

---

## โครงสร้าง Template Excel

### A) อุปกรณ์ (`equipment_import_template.xlsx`)
Sheet หลัก: **`Equipment`**

| คอลัมน์ | จำเป็น | ประเภท | หมายเหตุ |
|---|---|---|---|
| code | ✅ | text | รหัสอุปกรณ์ (ต้องไม่ซ้ำ) |
| name | ✅ | text | ชื่อ |
| description | – | text | |
| category | ✅ | dropdown | จาก `categories` |
| subcategory | – | dropdown | จาก `subcategories` (เผื่อทำ cascade ภายหลัง) |
| unit | ✅ | dropdown | จาก `units` |
| brand | – | dropdown | จาก `brands` |
| supplier_code | – | dropdown | จาก `suppliers` (แสดง code - name) |
| company_code | – | dropdown | จาก `companies` |
| department | – | dropdown | จาก `departments` |
| location_code | ✅ | dropdown | คลังเริ่มต้น |
| quantity_in_stock | ✅ | number | จำนวนรับเข้าครั้งแรก |
| min_stock_level | – | number | |
| unit_price | ✅ | number | |
| item_condition | ✅ | dropdown | `new` / `used` / `refurbished` |
| warehouse_entry_date | ✅ | date | YYYY-MM-DD |
| warranty_expiry_date | – | date | |
| warranty_years | – | number | |
| serial_number | – | text | ถ้ามี S/N |
| asset_code | – | text | |
| equipment_id_code | – | text | |
| is_asset | – | dropdown | `Yes`/`No` |
| depreciation_months | – | number | |
| volt / amp / watt / lumen / lux | – | number | spec ไฟฟ้า/แสง |
| width_cm / height_cm / depth_cm | – | number | ขนาด |
| po_number / pr_number / invoice_number / po_item_no | – | text | เอกสาร |
| notes | – | text | |
| **install_billboard_old_code** | – | dropdown | ถ้ามีค่า = ติดตั้งบนป้ายนี้ทันที (เลือกจาก `billboards.old_code`) |
| install_date | – | date | จำเป็นถ้ามี billboard |
| install_quantity | – | number | จำเป็นถ้ามี billboard (default 1) |

Sheet อ้างอิง (ซ่อน/lock): `_ref_categories`, `_ref_subcategories`, `_ref_units`, `_ref_brands`, `_ref_suppliers`, `_ref_companies`, `_ref_departments`, `_ref_locations`, `_ref_billboards`

Sheet **`Instructions`**: คำอธิบายภาษาไทยทุก column + ตัวอย่าง 2-3 บรรทัด

### B) Media Player (`media_player_import_template.xlsx`)
Sheet หลัก: **`MediaPlayer`** (1 row = 1 เครื่อง)

| คอลัมน์ | จำเป็น | หมายเหตุ |
|---|---|---|
| code | ✅ | รหัส MP (ถ้าซ้ำ = clone unit ใหม่ใต้รหัสเดิม) |
| name | ✅ | |
| brand | – | dropdown |
| model | – | dropdown จาก `media_player_models` |
| cms_type | – | dropdown จาก `cms_types` |
| specification | – | |
| serial_number_1 | ✅ | |
| serial_number_2 | – | |
| asset_code | – | |
| equipment_id_code | – | |
| remote_name | – | |
| activate_windows | – | |
| company_code | – | dropdown |
| department | – | dropdown |
| location_code | ✅ | คลัง |
| supplier_code | – | dropdown |
| item_condition | ✅ | `new`/`used`/`refurbished` |
| unit_price | ✅ | |
| depreciation_months | – | default 60 |
| usage_lifespan_months | – | |
| date_of_receipt | ✅ | |
| warranty_expiry_date | – | |
| warranty_years | – | |
| po_number / pr_number / invoice_number / po_item_no | – | |
| order_for_project | – | |
| asset_caretaker | – | |
| planned_install_location | – | |
| notes | – | |
| **install_billboard_old_code** | – | ถ้ามี = ติดตั้งทันที |
| install_date | – | จำเป็นถ้ามี billboard |

Sheet อ้างอิงเหมือนกัน + `_ref_mp_models`, `_ref_cms_types`

---

## Backend (RPC แทน Edge Function)

สร้าง RPC 2 ตัวใน Postgres (`security definer`, จำกัดเฉพาะ role `admin`/`super_admin` ผ่าน `has_role`):

1. **`public.import_equipment_row(p jsonb)`** → return `jsonb { success, equipment_id, error }`
   - INSERT `equipment`, set `quantity_in_stock`
   - INSERT `stock_movements` (movement_type=`receipt`)
   - ถ้ามี billboard → INSERT `billboard_equipment` + `billboard_equipment_history` (action=`install`) + ลด stock + INSERT `stock_movements` (movement_type=`install`)

2. **`public.import_media_player_row(p jsonb)`** → return `jsonb { success, media_player_id, error }`
   - INSERT `media_players` (quantity=1)
   - INSERT `stock_movements` (receipt)
   - ถ้ามี billboard → update `media_players.billboard_id`+`install_date`+`status='installed'`, INSERT `media_player_billboard_history` + `billboard_equipment_history` (สำหรับ Public View) + `stock_movements` (install)

Frontend loop เรียก RPC ทีละ row → เก็บผลลัพธ์ → แสดงสรุป (สำเร็จกี่ row / ล้มเหลวกี่ row พร้อมเหตุผล)

---

## โครงไฟล์ที่จะสร้าง/แก้ไข

**สร้างใหม่:**
- `src/pages/setup/ImportEquipmentPage.tsx` — UI: ปุ่มดาวน์โหลด Template + Dropzone อัปโหลด + Preview table + ปุ่มยืนยัน Import
- `src/pages/setup/ImportMediaPlayerPage.tsx` — เหมือนกันแต่ของ MP
- `src/lib/importTemplates/equipmentTemplate.ts` — สร้าง xlsx ด้วย `xlsx` lib (มีอยู่แล้วในโปรเจกต์) + กำหนด Data Validation
- `src/lib/importTemplates/mediaPlayerTemplate.ts`
- `src/lib/importTemplates/parseImportFile.ts` — parse + validate rows ทั้งหมดก่อนเรียก RPC
- `supabase/migrations/<ts>_import_rpcs.sql` — สร้าง 2 RPC ด้านบน

**แก้ไข:**
- `src/components/AppSidebar.tsx` — เพิ่มกลุ่มใหม่ "นำเข้าข้อมูลเริ่มต้น" (icon: `Upload` หรือ `FileSpreadsheet`) มี 2 NavLink, แสดงเฉพาะ Admin/Super Admin
- `src/App.tsx` — เพิ่ม 2 route ใต้ `ProtectedRoute` พร้อม permission check

**Library:** ใช้ `xlsx` (มีอยู่แล้ว — ใช้ใน `BillboardImport`, `SupplierImport`, `ToolImport`)

---

## การยืนยัน Data Integrity (Reject + Dropdown)

ก่อนเรียก RPC ใน Frontend ตรวจทุก row:
- รหัสซ้ำในไฟล์เดียวกัน → reject
- รหัสซ้ำกับ DB → reject (พร้อมเสนอชื่อใหม่)
- ค่า dropdown ที่กรอกเอง (ผู้ใช้ลบ Validation ทิ้ง) ไม่ match master → reject
- จำเป็นต้องมีแต่ว่าง → reject
- ถ้ามี billboard แต่ไม่มี install_date → reject
- รูปแบบวันที่/ตัวเลขผิด → reject

ถ้า **มีแม้แต่ 1 row error** → ปุ่ม Import ถูก disable + แสดง error ทุกแถวที่เป็นปัญหาในตาราง (highlight สีแดง) — ผู้ใช้ต้องแก้ไฟล์แล้วอัปโหลดใหม่

---

## สิ่งที่ **จะไม่ทำ** ในแผนนี้ (เพื่อโฟกัส)

- ไม่รองรับการ Import ป้ายโฆษณา (`billboards`) เอง — ใช้หน้า `BillboardImport` เดิม
- ไม่รองรับการ Update Master Data ที่มีอยู่ (insert only — ถ้า code ซ้ำ → reject)
- ไม่รองรับการแนบรูปภาพใน Excel — เพิ่มภายหลังผ่าน UI Edit ปกติ
- ไม่ทำ multi-S/N ต่อ 1 อุปกรณ์ในแถวเดียว — ถ้าต้อง 3 ชิ้น 3 S/N ก็ใส่ 3 บรรทัด

---

## คำถามเพิ่มเติม (ถ้ามี ผู้ใช้ตอบหลังเห็นแผนได้)

- ต้องการให้รองรับ **Subcategory cascade** (เลือก Category → Subcategory แสดงเฉพาะของ Category นั้น) หรือเอาแบบ flat ก่อน? (แผนปัจจุบัน = flat — ผู้ใช้เห็น Subcategory ทั้งหมด)
- กรณี Import 1000+ row อยากให้แสดง progress bar รายแถวไหม? (แผนปัจจุบัน = แสดง)
