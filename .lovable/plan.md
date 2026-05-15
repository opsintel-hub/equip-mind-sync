## สิ่งที่จะแก้

### 1. หน้า "ขอเบิกสินค้า" (IssueRequest.tsx) — ลบช่อง S/N
- ลบช่อง `ระบุ Serial Number เพื่อค้นหาสินค้าเฉพาะชิ้น` ออกจากฟอร์มเพิ่มรายการสินค้า (บรรทัด 1393-1410)
- ผู้ขอเบิกจะไม่ต้องระบุ S/N — เจ้าหน้าที่คลังจะเป็นผู้ระบุตอนจ่ายสินค้า
- ปรับ grid layout ให้ "เลือกสินค้า" กินเต็มแถวแทน

### 2. หน้า "จ่ายสินค้า" (IssueGoods.tsx) — รองรับ S/N + ป้ายโฆษณาหลายเครื่อง
เมื่อ `จำนวนที่จ่ายจริง > 1` (เฉพาะ Equipment ทั่วไป — Media Player ยังคงล็อกที่ 1 เครื่องตาม S/N เดิม):

- เพิ่ม state `unitAssignments: Array<{ serial_number, serial_number_source, billboard_id }>` ที่ resize ตาม `issued_quantity` อัตโนมัติ
- แทนที่ช่อง S/N + Billboard เดี่ยวด้วย **ตารางย่อย** N แถว (เครื่องที่ 1, 2, 3, …) แต่ละแถวมี SerialNumberSelect + BillboardSelect ของตัวเอง
- กรณี `issued_quantity = 1` UI ยังคล้ายเดิม (1 แถว)
- กรณี Media Player คง UI เดิม (เพราะ MP 1 record = 1 เครื่อง บังคับ qty=1)

**Logic การบันทึก (non-MP):**
- Validate S/N ทุกแถวต้องไม่ซ้ำ และอยู่ใน stock
- หัก stock equipment 1 ครั้งด้วยจำนวนรวม
- Loop unitAssignments: update `equipment_serial_numbers.status` ของแต่ละ S/N → `installed` ถ้ามี billboard, `issued` ถ้าไม่มี
- Loop: insert `billboard_equipment` แยกแต่ละเครื่องตาม billboard_id ที่กำหนด (qty=1 ต่อเครื่อง)
- เก็บ S/N ทั้งหมดใน `goods_issue_pending_items.serial_number` คั่นด้วย newline (ตาม memory standard)
- log stock_movement: 1 record สำหรับ `issue` รวม + per-billboard `install_to_billboard` ตามจำนวนป้ายที่ใช้งานจริง

### 3. หน้า "จ่ายสินค้า" — ตัดข้อความในวงเล็บ
- เปลี่ยน label จาก `Serial Number ที่จ่าย (ระบุมาจากผู้เบิก)` / `(เจ้าหน้าที่คลังระบุ)` เหลือแค่ `Serial Number ที่จ่าย`
- ลบ helper text `ผู้เบิกระบุ S/N: ...` ใต้ช่อง (บรรทัด 1084-1088) เพราะผู้เบิกไม่ระบุแล้ว

## ไฟล์ที่แก้
- `src/pages/IssueRequest.tsx`
- `src/pages/IssueGoods.tsx`

## ที่ไม่แตะ
- Schema database (ใช้คอลัมน์เดิม เก็บ S/N หลายค่าเป็น newline-separated string)
- หน้า MediaPlayer issuing (ยังคง 1 เครื่อง/ครั้ง)
- หน้าอื่น ๆ ที่อ่าน `serial_number` (รองรับ multi-line อยู่แล้วตาม serialSearch utility)