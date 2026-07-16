
## เป้าหมาย
1. ลบระบบ "ช่องจัดเก็บ / ช่องย่อยจัดเก็บ" ออกทั้งหมด (ทั้งฐานข้อมูล + UI)
2. เพิ่มระบบ "โซน (Zone)" เป็น CRUD ใต้คลังสินค้า และให้ตำแหน่งจัดเก็บ (Location) เป็นลูกของโซน — โครงสร้างใหม่: `คลัง → โซน → ตำแหน่ง (A01, A02, ...)`

## โครงสร้างใหม่
```text
PB-01 คลังพระราม9 (warehouse)
 └─ A  โซนซ้าย (zone)
     ├─ A01  (location)
     ├─ A02  (location)
     ├─ A03  (location)
     └─ A04  (location)
 └─ B  โซนขวา (zone)
     ├─ B01
     └─ B02
```

## งานฝั่งฐานข้อมูล (migration)
1. **สร้างตาราง `zones`** — คอลัมน์: `warehouse_id` (FK), `code` (เช่น A), `name`, `description`, `is_active`, มาตรฐาน timestamps + trigger updated_at
   - GRANT: `authenticated` + `service_role`; RLS: อ่านได้ทุก authenticated, จัดการโดย admin/super_admin/warehouse ตาม pattern เดิมของ warehouses
   - Unique: `(warehouse_id, code)`
2. **เพิ่มคอลัมน์ `zone_id uuid` ใน `locations`** (nullable, FK → zones)
3. **ลบตาราง `sub_storage_slots` และ `storage_slots`** (DROP CASCADE)
4. เพิ่ม index บน `locations.zone_id`

## งานฝั่ง UI
1. **ลบไฟล์:** `src/components/location/StorageSlotSelect.tsx`, `SubStorageSlotSelect.tsx`
2. **`LocationForm.tsx`** — ลบ 2 ฟิลด์ Label/ช่องจัดเก็บ + ช่องย่อย, เพิ่ม dropdown "โซน" (กรองตาม warehouse ที่เลือก) + ปุ่ม ⚙ เปิด dialog จัดการโซน (CRUD) และปุ่ม + สร้างโซนใหม่ inline
3. **สร้าง `ZoneSelect.tsx`** ใหม่ — dropdown + management dialog (add/edit/delete zone) คล้าย pattern เดิมของ StorageSlotSelect แต่ผูกกับ `warehouses` แทน `locations`
4. **`WarehouseLocationAccordion.tsx`** — เปลี่ยนโครงสร้างเป็น 3 ชั้น: warehouse → zone → locations (group locations ตาม zone_id, unassigned แสดงในกลุ่ม "ไม่มีโซน"), เพิ่มปุ่ม "+ เพิ่มโซน" ใต้ warehouse header, ปุ่ม "+ เพิ่มตำแหน่งในโซน" ใต้แต่ละโซน (auto-pass zone_id)
5. **`LocationList.tsx`** — ลบคอลัมน์ "ช่องจัดเก็บ / ช่องย่อยจัดเก็บ", เพิ่มคอลัมน์ "โซน", ปรับ Excel export ให้ใช้โซนแทน
6. **`LocationImport.tsx`** — เพิ่มคอลัมน์ `zone_code` (optional) ใน template และ mapping ตอน import
7. ตรวจไฟล์อื่นที่ query `storage_slots`/`sub_storage_slots` แล้วเอา reference ออก (จะ grep ตอน implement)

## หมายเหตุสำคัญ
- **ไม่ auto-generate A01-A04** — user สร้าง zone A ก่อน แล้วเพิ่ม location A01, A02... ทีละอันตามปกติ (ตาม option "Other" ที่เลือก) ผู้ใช้เป็นคนพิมพ์ code เอง
- Location เดิมที่ไม่มี zone จะยังใช้ได้ปกติ (zone_id nullable) — ค่อยผูกโซนภายหลัง
- ไม่แตะ business logic อื่น (stock, movements) — เพียงเพิ่ม zone เป็น grouping layer

## ลำดับดำเนินการ
1. รัน migration (สร้าง zones + เพิ่ม zone_id + drop slots) 
2. อัปเดต UI ตามรายการด้านบน
3. ทดสอบ CRUD zone และการมองเห็นใน accordion
