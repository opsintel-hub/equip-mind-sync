## Section A — หน้า "ขอเบิกสินค้า" > กล่อง "เพิ่มรายการสินค้า"

ปัญหาที่เจอ:
1. Dropdown "เลือกสินค้า (FIFO)" รวมทุกชนิด (MP / จอภาพ / อะไหล่) เยอะเกินไป
2. อะไหล่บางชิ้นผูกกับป้ายเฉพาะ — ปัจจุบันจะกรองเฉพาะ *หลังจากเลือกสินค้าไปแล้ว* (ผ่าน `compatMap`) ทำให้ผู้ใช้ยังเลือกอะไหล่ผิดป้ายได้อยู่
3. ต้องยืนยันว่ารายการที่ขึ้นมาถูก scope ตามฝ่ายที่ผู้ใช้มีสิทธิ์เห็นจริง

### สิ่งที่มีอยู่แล้ว (ไม่ต้องทำซ้ำ)
- Equipment & Media Player query กรองด้วย `.in("department", depts)` ตาม `useAllowedDepartments` แล้ว (IssueRequest.tsx บรรทัด 219, 245) → **การ scope ตามฝ่ายทำงานถูกต้องอยู่แล้ว** จะเพิ่มแค่ badge เตือนใต้ช่องเลือกว่า "แสดงเฉพาะฝ่ายที่คุณมีสิทธิ์: X, Y"
- `equipment_billboard_compatibility` + `compatMap` มีข้อมูลอยู่แล้ว → นำมาใช้กรอง Dropdown ตั้งแต่ต้นได้เลย

### แนวทาง (ประหยัด credit สุด — ปรับไฟล์เดียว)

แก้ไข `src/pages/IssueRequest.tsx` เฉพาะกล่อง "เพิ่มรายการสินค้า":

1. **เพิ่มปุ่ม Filter ประเภท** เหนือ Dropdown "เลือกสินค้า (FIFO)"
   - 4 ปุ่ม toggle: `ทั้งหมด | Media Player | จอภาพ | อะไหล่/วัสดุ`
   - state ใหม่ `itemTypeFilter: "all" | "media_player" | "monitor" | "spare"`
   - กรอง `filteredEquipmentByCategory` ต่ออีกชั้น:
     - `media_player`: `is_media_player && device_type !== "MONITOR"`
     - `monitor`: `is_media_player && device_type === "MONITOR"`
     - `spare`: `!is_media_player`

2. **สลับลำดับ: เลือกป้ายก่อน → กรองอะไหล่อัตโนมัติ (Billboard-first mode)**
   - เพิ่ม toggle เล็ก ๆ "🎯 กรองตามป้ายก่อน" (default: off เพื่อไม่กระทบ flow เดิม)
   - เมื่อเปิด + เลือกป้ายที่ช่อง "ป้ายโฆษณา (สำหรับรายการนี้)" ก่อน:
     - Dropdown สินค้าจะเหลือเฉพาะ MP ทั้งหมด + อะไหล่ที่ `unrestricted` + อะไหล่ที่ `compatMap` มีป้ายนั้น
     - แสดง hint สีเขียว "แสดงเฉพาะสินค้าที่เข้ากับป้าย XXX"
   - ใช้ `compatMap` ที่ query อยู่แล้ว → **ไม่ต้อง query เพิ่ม**

3. **Badge แสดง scope ฝ่าย** ใต้ Dropdown
   - `"แสดงเฉพาะฝ่ายที่คุณมีสิทธิ์: [Digital Media, IT, ...]"` อ่านจาก `useAllowedDepartments` (มีอยู่แล้ว)

4. **แสดง Badge ประเภทในแต่ละ option** (เดิมมีแค่ `[Media Player]` ใน description)
   - เพิ่ม prefix สี: 🎬 MP / 🖥️ จอภาพ / 🔧 อะไหล่ ให้เห็นชัดขึ้น

---

## Section B — หน้า "อนุมัติเบิกทรัพย์สิน" (ManagerApproval)

แก้ไข `src/pages/ManagerApproval.tsx` ทั้ง 2 ตาราง (รออนุมัติ + ประวัติ):

1. **เพิ่ม Column "ประเภท"** (ระหว่าง "รายการ" กับ "สถานะ")
   - Badge สี: 🎬 MP / 🖥️ จอภาพ / 🔧 อะไหล่ / 📦 ผสม (กรณีมีหลายประเภทในใบเดียว)
   - คำนวณจาก `getItemsForRequest(req.id)` → ตรวจ `is_media_player` + `device_type`

2. **เพิ่ม Column "ป้ายปลายทาง"**
   - แสดงชื่อป้ายจาก item (ถ้ามีหลายป้าย → "3 ป้าย" + tooltip list)
   - ช่วย approver ตัดสินใจได้เร็ว

3. **เพิ่ม Column "จำนวนรวม"** (text-right)
   - รวม `quantity` ของทุก item ในใบ

4. **Pagination**
   - ใช้ `useTablePagination` (มี hook อยู่แล้ว) ทั้ง 2 ตาราง — 10 แถว/หน้า
   - เพิ่ม `<TablePagination>` ท้ายตาราง

5. **Row expand (คงเดิม)** — แสดง detail item เต็มเมื่อกดไอคอน ▶ (มีอยู่แล้ว)

---

## สรุปไฟล์ที่แก้
- `src/pages/IssueRequest.tsx` — เพิ่ม filter ประเภท + billboard-first mode + badge scope
- `src/pages/ManagerApproval.tsx` — เพิ่ม 3 columns + pagination 2 ตาราง

ไม่มี migration, ไม่มี component ใหม่, ไม่มี query เพิ่ม → ประหยัด credit สุด
