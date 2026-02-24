

## ปรับปรุงระบบ "คลัง > ตำแหน่ง" และ "ยี่ห้อแยกประเภท" ทั้งระบบ

### ภาพรวม
ปรับ 2 ระบบหลักให้ใช้ทั่วทั้งแอปพลิเคชัน:
1. ตำแหน่งจัดเก็บต้องเลือกฝ่าย > คลัง > ตำแหน่ง เสมอ
2. ยี่ห้อต้องแยกประเภท (อะไหล่/เครื่องมือ/Media Player)

---

### ส่วนที่ 1: ระบบ ฝ่าย > คลัง > ตำแหน่ง

**แนวคิด**: สร้าง component ใหม่ `WarehouseLocationSelect` ที่รวมการเลือกคลังและตำแหน่งไว้ด้วยกัน โดยรับ prop `department` เข้ามาเพื่อกรองคลังตามฝ่าย

**Component ใหม่**: `src/components/location/WarehouseLocationSelect.tsx`
- รับ props: `department`, `warehouseId`, `onWarehouseChange`, `locationId`, `onLocationChange`, `disabled`
- เมื่อ `department` ยังไม่ถูกเลือก: dropdown คลังจะ disabled
- เมื่อเลือกฝ่ายแล้ว: โหลดคลังจาก `warehouses` where `department = ฝ่ายที่เลือก` and `is_active = true`
- เมื่อเลือกคลังแล้ว: โหลดตำแหน่งจาก `locations` where `warehouse_id = คลังที่เลือก` and `is_active = true`
- เมื่อเปลี่ยนฝ่าย: reset คลังและตำแหน่ง
- เมื่อเปลี่ยนคลัง: reset ตำแหน่ง
- แสดงผลเป็น 2 dropdown (คลังสินค้า + ตำแหน่งจัดเก็บ) แบบ read-only (ไม่มีปุ่มจัดการ เพราะจัดการจากหน้า Master Data)

**ไฟล์ที่ต้องแก้ไข** (เปลี่ยนจาก LocationSelect/SimpleLocationSelect เป็น WarehouseLocationSelect):

| ไฟล์ | LocationSelect เดิม | หมายเหตุ |
|---|---|---|
| `EquipmentForm.tsx` | `SimpleLocationSelect` | มี department field อยู่แล้ว, เพิ่ม warehouse_id state |
| `EquipmentEditForm.tsx` | `equipment/LocationSelect` | มี department field อยู่แล้ว, เพิ่ม warehouse_id state |
| `ToolForm.tsx` | `location/LocationSelect` | มี department field อยู่แล้ว, เพิ่ม warehouse_id state |
| `ToolEditForm.tsx` | `location/LocationSelect` | มี department field อยู่แล้ว, เพิ่ม warehouse_id state |
| `MediaPlayerEntry.tsx` | `equipment/LocationSelect` | มี department field อยู่แล้ว, เพิ่ม warehouse_id state |
| `WaitingStockRequests.tsx` | `equipment/LocationSelect` | ต้องตรวจสอบว่ามี department context หรือไม่ |
| `BillboardDetail.tsx` | `equipment/LocationSelect` | ต้องตรวจสอบว่ามี department context หรือไม่ |
| `IncompleteIssues.tsx` | `equipment/LocationSelect` | ต้องตรวจสอบว่ามี department context หรือไม่ |
| `EquipmentTransferForm.tsx` | `location/LocationSelect` | ตำแหน่งปลายทาง อาจข้ามฝ่ายได้ |

**หมายเหตุ**: สำหรับ `EquipmentTransferForm`, `BillboardDetail`, `WaitingStockRequests`, `IncompleteIssues` ที่อาจไม่มี department context โดยตรง จะเพิ่ม department dropdown ก่อนคลัง/ตำแหน่ง หรือดึงจาก context ของ equipment ที่กำลังจัดการ

---

### ส่วนที่ 2: ยี่ห้อแยกประเภท + แยกผู้จัดจำหน่าย

**2.1 Database Migration**:
- เพิ่มคอลัมน์ `brand_type` (text, default 'equipment') ในตาราง `brands`
- ค่าที่รองรับ: `equipment`, `tool`, `media_player`

**2.2 แก้ไข `BrandSelect` component** (`src/components/equipment/BrandSelect.tsx`):
- เพิ่ม prop ใหม่: `brandType?: "equipment" | "tool" | "media_player"`
- กรองยี่ห้อตาม `brand_type` เมื่อแสดง dropdown (ถ้าไม่ระบุ brandType แสดงทั้งหมดเพื่อ backward compatibility)
- ในหน้าจัดการยี่ห้อ (Dialog): เพิ่ม dropdown เลือกประเภท (อะไหล่/เครื่องมือ/Media Player) ตอนสร้างและแก้ไข
- ยี่ห้อที่ยังไม่มี brand_type จะถูกถือว่าเป็น equipment (default)

**2.3 ปรับทุกไฟล์ที่ใช้ BrandSelect**:

| ไฟล์ | brandType ที่ส่ง |
|---|---|
| `EquipmentForm.tsx` | `brandType="equipment"` |
| `EquipmentEditForm.tsx` | `brandType="equipment"` |
| `ToolForm.tsx` | `brandType="tool"` |
| `ToolEditForm.tsx` | `brandType="tool"` |
| `MediaPlayerEntry.tsx` | `brandType="media_player"` |

**2.4 เพิ่มช่อง "ผู้จัดจำหน่าย" แยกจากยี่ห้อ**:
- ใช้ `SupplierSelect` ที่มีอยู่แล้ว (รองรับค้นหาชื่อ, ผู้ติดต่อ, รหัส Vendor)
- เพิ่ม `searchableText` ใน `SupplierSelect` เพื่อรวม vendor_code ในการค้นหา
- เพิ่มคอลัมน์ `supplier_id` (uuid) ในตาราง `media_players` (DB migration)
- เพิ่มช่อง "ผู้จัดจำหน่าย" ในหน้า Media Player, Equipment Form, Equipment Edit Form, Tool Form, Tool Edit Form โดยใช้ `SupplierSelect`
- เพิ่มคอลัมน์ `supplier_id` (uuid) ในตาราง `equipment` และ `tools` ด้วย (DB migration)

---

### รายละเอียดทางเทคนิค

#### Database Migration:
```text
1. ALTER TABLE brands ADD COLUMN brand_type text DEFAULT 'equipment';
2. ALTER TABLE media_players ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
3. ALTER TABLE equipment ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
4. ALTER TABLE tools ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
```

#### ไฟล์ที่สร้างใหม่:
- `src/components/location/WarehouseLocationSelect.tsx`

#### ไฟล์ที่แก้ไข:
- `src/components/equipment/BrandSelect.tsx` - เพิ่ม `brandType` prop, กรอง, เพิ่มช่องเลือกประเภทในหน้าจัดการ
- `src/components/supplier/SupplierSelect.tsx` - เพิ่ม `searchableText` (vendor_code) ในตัวเลือก
- `src/components/equipment/EquipmentForm.tsx` - ใช้ `WarehouseLocationSelect`, `brandType="equipment"`, เพิ่ม `SupplierSelect`
- `src/components/equipment/EquipmentEditForm.tsx` - ใช้ `WarehouseLocationSelect`, `brandType="equipment"`, เพิ่ม `SupplierSelect`
- `src/components/tools/ToolForm.tsx` - ใช้ `WarehouseLocationSelect`, `brandType="tool"`, เพิ่ม `SupplierSelect`
- `src/components/tools/ToolEditForm.tsx` - ใช้ `WarehouseLocationSelect`, `brandType="tool"`, เพิ่ม `SupplierSelect`
- `src/pages/MediaPlayerEntry.tsx` - ใช้ `WarehouseLocationSelect`, `brandType="media_player"`, เพิ่ม `SupplierSelect`
- `src/pages/WaitingStockRequests.tsx` - ใช้ `WarehouseLocationSelect`
- `src/pages/BillboardDetail.tsx` - ใช้ `WarehouseLocationSelect`
- `src/pages/IncompleteIssues.tsx` - ใช้ `WarehouseLocationSelect`
- `src/components/equipment/EquipmentTransferForm.tsx` - ใช้ `WarehouseLocationSelect`

#### ไฟล์ที่ไม่แก้ไข:
- `src/components/equipment/SimpleLocationSelect.tsx` - จะถูกแทนที่ด้วย `WarehouseLocationSelect`
- `src/components/equipment/LocationSelect.tsx` - จะถูกแทนที่ด้วย `WarehouseLocationSelect`
- `src/components/location/LocationSelect.tsx` - จะถูกแทนที่ด้วย `WarehouseLocationSelect`

