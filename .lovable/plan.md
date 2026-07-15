
# รวม Tab "คลังสินค้า" + "ตำแหน่ง" เป็น Tab เดียว (Accordion Tree)

## เป้าหมาย
ยุบ 2 tab (คลังสินค้า, ตำแหน่ง) ให้เหลือ **tab เดียว** ชื่อ **"คลัง & ตำแหน่งจัดเก็บ"** โดยแสดงเป็น Accordion tree เหมือน tab หมวดหมู่ — เห็นคลัง (parent) และตำแหน่งจัดเก็บ (child) ที่อยู่ในคลังนั้นในหน้าจอเดียว

## สิ่งที่ตรวจสอบแล้ว

**ความสัมพันธ์ DB (ไม่ต้องแก้ schema):**
- `warehouses` (parent) ← `locations.warehouse_id` (child) — มี FK อยู่แล้ว
- ทั้งคู่มี soft-delete ผ่าน `is_active`
- ไม่ต้องสร้าง migration ใดๆ

**ความแตกต่างจากหมวดหมู่:**
- คลัง/ตำแหน่ง มีฟิลด์เยอะกว่า (code, department, storage_area, dimensions, volume, storage_slot, sub_storage_slot) → ใช้ **dialog เดิม** (`WarehouseForm`, `LocationForm`) ไม่สร้าง form ใหม่
- Location มีปุ่ม **Import Excel** เพิ่มเติม → ต้องคงไว้

**Permissions:**
- ปัจจุบันแยก `md_warehouses` และ `md_locations`
- แผน: tab merged จะแสดงถ้ามีสิทธิ์ **อย่างใดอย่างหนึ่ง**; ปุ่มเพิ่ม/แก้/ลบระดับคลังจะ hide ถ้าไม่มี `md_warehouses`; ปุ่มเพิ่ม/แก้/ลบระดับตำแหน่งจะ hide ถ้าไม่มี `md_locations`
- Function permission keys เดิมทั้ง 2 คงอยู่ (ไม่ทำลาย config เดิมของผู้ใช้)

## หน้าตาที่จะได้

```text
[+ เพิ่มคลังสินค้า]  [📥 Import ตำแหน่ง]     [ขยายทั้งหมด] [ยุบทั้งหมด]
                                              [🔍 ค้นหา รหัส/ชื่อ/ฝ่าย]

▼ 🏭 WH-01 · คลังกลาง กทม.               [ฝ่ายคลัง] [Indoor]
   [12 ตำแหน่ง] [ปริมาตร 850/1,000 m³] [เหลือ 150 m³]     [✏️] [🗑️]
   ├─ 📍 LOC-A01 · ชั้น 1 โซน A · slot A · 200/300 m³   [✏️] [🗑️]
   ├─ 📍 LOC-A02 · ชั้น 1 โซน B · slot A · 150/200 m³   [✏️] [🗑️]
   ├─ 📍 LOC-B01 · ชั้น 2 โซน A · slot B · 500/500 m³   [✏️] [🗑️]
   └─ [+ เพิ่มตำแหน่งจัดเก็บในคลังนี้]

▶ 🏭 WH-02 · คลังต่างจังหวัด          [ฝ่ายภูมิภาค] [Outdoor]
   [5 ตำแหน่ง] [ปริมาตร 120/500 m³]                     [✏️] [🗑️]
```

## พฤติกรรมหลัก

1. **Accordion หลายกลุ่ม** — ขยายพร้อมกันได้หลายคลัง
2. **หัวคลัง** แสดง: รหัส, ชื่อ, ฝ่าย, ประเภทพื้นที่ (badge สี), จำนวนตำแหน่ง, ปริมาตรใช้/รวม (m³), ปริมาตรคงเหลือ (สีแดงเมื่อติดลบ)
3. **แถวตำแหน่ง** แสดง: รหัส, ชื่อ, slot/sub-slot, ปริมาตรใช้/รวม (m³)
4. **ปุ่ม "+ เพิ่มตำแหน่งในคลังนี้" inline** — เปิด `LocationForm` แบบ **pre-fill warehouse_id** อัตโนมัติ
5. **ปุ่มเพิ่มคลัง** ที่หัวหน้า → เปิด `WarehouseForm` ตัวเดิม
6. **ปุ่ม Import** คงไว้ (ใช้ `LocationImport` เดิม)
7. **ปุ่ม ขยายทั้งหมด / ยุบทั้งหมด** + จำสถานะใน localStorage
8. **ช่องค้นหา** — filter ทั้งคลังและตำแหน่ง; ถ้า match ตำแหน่ง จะ auto-expand คลังนั้น
9. **ป้องกันลบคลัง** ถ้ายังมีตำแหน่งที่ active อยู่ (แสดง toast แนะนำให้ย้าย/ลบตำแหน่งก่อน)
10. **Edit dialog** ใช้ตัวเดิมทั้งหมด ไม่แตะ business logic

## รายละเอียดทางเทคนิค

**Component ใหม่:**
- `src/components/warehouse/WarehouseLocationAccordion.tsx` — hierarchical view รวม CRUD ทั้ง 2 ระดับ
  - Query: fetch `warehouses` + `locations` (พร้อม storage_slot/sub_storage_slot join) พร้อมกัน แล้ว group client-side
  - Reuse `WarehouseForm` (มี `editData` prop อยู่แล้ว) และ `LocationForm` (มี `location` prop และรับ `warehouse_id` ผ่าน form default values)
  - เพิ่ม prop `defaultWarehouseId` ให้ `LocationForm` (ถ้ายังไม่มี) เพื่อ pre-fill warehouse dropdown

**แก้ไข:**
- `src/pages/MasterData.tsx`:
  - รวม tab `warehouses` และ `locations` เป็น tab เดียวชื่อ `warehouses_locations` (หรือคง `warehouses` ไว้เพื่อ backward compat)
  - เงื่อนไขแสดง: `can("md_warehouses") || can("md_locations")`
  - เอา `TabsTrigger` และ `TabsContent` ของ locations ออก
  - เนื้อหา tab เดียวใช้ `<WarehouseLocationAccordion />` พร้อมส่ง flag permissions
- `src/components/location/LocationForm.tsx`:
  - เพิ่ม optional prop `defaultWarehouseId` — set ใน `defaultValues` ของ `useForm`

**ไฟล์เดิมที่คงไว้ (deprecate เงียบๆ):**
- `WarehouseList.tsx` และ `LocationList.tsx` ยังอยู่ (อาจถูกอ้างจากที่อื่น) แต่ไม่ใช้ใน MasterData แล้ว

**Route/Navigation:**
- ถ้ามี URL/link ที่ชี้ไปยัง tab `locations` โดยตรง จะ redirect ไป tab ใหม่ (ถ้ามี — จะตรวจ `?tab=locations` ในการ implement)

## สิ่งที่ไม่ทำ (out of scope)
- ไม่แตะ storage_slots / sub_storage_slots (ยังจัดการที่เดิม)
- ไม่ทำ drag-drop ย้ายตำแหน่งข้ามคลัง (แก้ผ่าน edit dialog ได้)
- ไม่รวม tab อื่น (ฝ่าย, แผนก, ผู้จัดจำหน่าย ฯลฯ)
- ไม่แก้ schema DB
