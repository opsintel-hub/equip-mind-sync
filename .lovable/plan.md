
## เป้าหมาย
1. แสดงข้อมูล **"ป้ายที่รองรับ (Compatibility)"** เป็นคอลัมน์ในทุกหน้ารายงานที่มีอุปกรณ์/อะไหล่ (ปัจจุบันมีเฉพาะใน Inventory Report)
2. เพิ่มความสามารถค้นหาว่า **"ป้ายนี้มีอุปกรณ์อะไรพร้อมเบิกในคลังบ้าง กี่ชิ้น"**

---

## ส่วนที่ 1 — เพิ่มคอลัมน์ Compatibility ในรายงาน

เพิ่มคอลัมน์ "ป้ายที่รองรับ" (พร้อม Badge สี 🟢 ทุกป้าย / 🟡 หลายป้าย / 🔵 เฉพาะป้าย + tooltip แสดงจำนวนป้ายและหมายเหตุ) ในหน้าต่อไปนี้:

| หน้ารายงาน | จุดที่เพิ่ม |
|---|---|
| **Equipment Tracking Report** | คอลัมน์ใหม่หลัง "ชื่ออุปกรณ์" |
| **Dead Stock Report** | คอลัมน์ใหม่ในตารางหลัก |
| **Stock Card** (หัวการ์ดข้อมูลอุปกรณ์) | Badge ใต้ชื่ออุปกรณ์ที่เลือก |
| **Waiting Stock Requests** | คอลัมน์ใหม่ในตารางรายการรอเบิก |
| **Billboard Issue Report** | คอลัมน์ใหม่ต่อจากชื่ออุปกรณ์ |
| **Repair Report** | คอลัมน์ใหม่ในตารางอะไหล่ที่ซ่อม |
| **Inventory Report** (Excel Export) | เพิ่มคอลัมน์ "ป้ายที่รองรับ" และ "จำนวนป้ายรองรับ" ในไฟล์ Export ด้วย |

ทุกหน้าจะใช้ pattern เดียวกัน:
- Query `equipment.billboard_compatibility_mode`, `compatibility_notes`
- Query `equipment_billboard_compatibility` เพื่อนับจำนวนป้ายรองรับ (mode = `partial`/`specific`)
- ใช้ helper `getCompatibilityBadge()` เดียวกับ Inventory Report (จะย้ายเป็น shared util `src/lib/compatibilityBadge.tsx`)

**ยกเว้น** Media Player Report / Tool PM Report — เพราะ MP และเครื่องมือช่างไม่มี compatibility กับป้าย

---

## ส่วนที่ 2 — ค้นหา "ป้ายนี้มีอะไรพร้อมเบิกบ้าง"

เสนอ **2 จุดเข้าใช้งาน** ควบคู่กัน:

### 2.1 เพิ่ม Tab ใน **Billboard Detail** (`/billboards/:id`)
Tab ใหม่ชื่อ **"อะไหล่พร้อมเบิก"** แสดง:
- รายการ equipment ทั้งหมดที่ compatible กับป้ายนี้ (mode=`unrestricted` OR ป้ายอยู่ใน `equipment_billboard_compatibility` โดยตรง OR ผ่าน package ที่มีป้ายนี้)
- คอลัมน์: รหัส / ชื่อ / หมวดหมู่ / **จำนวนในคลัง (พร้อมเบิก)** / คลัง/Location / ปุ่ม "เบิกอะไหล่ชิ้นนี้"
- Filter: หมวดหมู่, เฉพาะที่มี stock > 0

### 2.2 เมนูใหม่ **"อะไหล่พร้อมเบิกตามป้าย"** (`/reports/billboard-parts-availability`)
รายงานแบบตารางไขว้ สำหรับค้นหาข้ามป้าย:
- **Filter บนสุด**: เลือกป้าย (SearchableSelect รหัส/Old Code/Location) + หมวดหมู่ + Compatibility mode
- **โหมด 1 — มุมมองรายป้าย**: เลือก 1 ป้าย → แสดง list อุปกรณ์ที่รองรับ + จำนวนพร้อมเบิก
- **โหมด 2 — มุมมองรายอุปกรณ์**: เลือก 1 อะไหล่ → แสดง list ป้ายที่รองรับ + จำนวนที่อะไหล่นี้พร้อมเบิก
- Export Excel
- เพิ่มลิงก์เมนูใน Sidebar หมวด "Reports"

---

## รายละเอียดเชิงเทคนิค

**Shared utility ใหม่** `src/lib/compatibility.ts`:
```ts
getCompatibleEquipmentIdsForBillboard(billboardId): string[]
getCompatibleBillboardIdsForEquipment(equipmentId): string[]
getCompatibilityBadge(mode, count): { icon, label, className }
```
รวมตรรกะเช็ค 3 mode + resolve ผ่าน `equipment_billboard_compatibility` และ `equipment_compatibility_packages → billboard_package_items`

**Query สต๊อกพร้อมเบิก**: ใช้ `equipment.quantity_in_stock` (ค่าที่ระบบ maintain ไว้แล้ว) — ไม่ต้องคำนวณจาก stock_movements

**Permission**: หน้ารายงานใหม่ใช้ function_permission ใหม่ `billboard_parts_availability` (default: อ่านได้ทุก role ที่มีสิทธิ์ Reports)

---

## Scope ที่ไม่รวม
- ไม่แก้ business logic การเบิก
- ไม่แก้ Master Data compatibility UI (มีอยู่แล้ว)
- ไม่แตะ Media Player / Tool reports
