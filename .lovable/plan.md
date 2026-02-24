

## แก้ไขส่วนที่ยังขาดอยู่

### ภาพรวม
จากการตรวจสอบพบว่าการ implement ส่วนหลักเสร็จสมบูรณ์แล้ว แต่มี 2 จุดที่ยังขาดอยู่:

### 1. เพิ่มช่อง "ผู้จัดจำหน่าย" ใน EquipmentEditForm
- ไฟล์ `src/components/equipment/EquipmentEditForm.tsx` มีการ import `SupplierSelect` และมี `supplier_id` ใน schema/data แล้ว แต่ยังไม่ได้แสดงช่องในฟอร์ม UI
- จะเพิ่ม FormField สำหรับ `supplier_id` ใต้ช่อง brand (แถวเดียวกับ department, company, brand)

### 2. Preload warehouseId ใน ToolEditForm
- ไฟล์ `src/components/tools/ToolEditForm.tsx` มี `WarehouseLocationSelect` แล้ว แต่เมื่อเปิดแก้ไข จะไม่ preload ค่า warehouse จาก location_id ที่มีอยู่ ทำให้ช่องคลังว่างเปล่า
- จะเพิ่ม useEffect เพื่อ fetch `warehouse_id` จากตาราง `locations` เมื่อเปิด dialog (เหมือนที่ทำใน EquipmentEditForm)

### รายละเอียดทางเทคนิค

#### ไฟล์ที่แก้ไข:
1. **`src/components/equipment/EquipmentEditForm.tsx`** - เพิ่ม FormField SupplierSelect ในส่วน UI
2. **`src/components/tools/ToolEditForm.tsx`** - เพิ่ม useEffect preload warehouseId จาก location_id

