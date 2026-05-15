# แผนแก้ไข 2 ประเด็นในหน้าเบิก-จ่าย

## ปัญหาที่พบ
จาก GI-REQ-000069 (Media Player, จำนวน 2 เครื่อง):

1. **คำขอที่ "รออนุมัติ" ยังโผล่ไปหน้า "จ่ายสินค้า" ได้**
   - ปัจจุบัน `IssueRequest.tsx` ตั้ง `requires_approval=true` เฉพาะกรณีมีอุปกรณ์ที่เป็น `is_asset` เท่านั้น
   - คำขอที่มีแค่ Media Player จะได้ `requires_approval=false` + `status="pending"` ทำให้ผ่าน filter ของ `IssueGoods.tsx` ไปได้เลย แม้หน้า ManagerApproval จะแสดงเป็น "รออนุมัติ" (เพราะมี logic แยก override สำหรับ MP)
   - ผลคือผู้ใช้สับสน: หน้านึงบอก "รออนุมัติ" อีกหน้านึงบอก "จ่ายได้"

2. **Dialog จ่าย MP รองรับแค่ 1 เครื่อง / 1 S/N**
   - บังคับ `issuedQty===1` และเลือก S/N ได้ตัวเดียว
   - ป้ายโฆษณาก็มีช่องเดียว
   - ถ้าเบิกมา 2 เครื่อง ไม่มีทางใส่ S/N ตัวที่ 2 และป้ายตัวที่ 2 ได้

## สิ่งที่จะแก้

### 1. บังคับสถานะ "รออนุมัติ" ให้ถูกต้อง (`src/pages/IssueRequest.tsx`)
- ขยายเงื่อนไข `requiresApproval`: ถ้ารายการมี Media Player **หรือ** อุปกรณ์ที่เป็น `is_asset` → ต้องอนุมัติก่อน
- ผลลัพธ์: header record จะถูกตั้ง `status="pending_approval"`, `approval_status="pending"`, `requires_approval=true`
- หน้า IssueGoods (filter เดิม `!requires_approval || approval_status==="approved"`) จะกรองรายการนี้ออกอัตโนมัติ จนกว่า Manager จะกดอนุมัติ

### 2. กันชั้นที่สองใน `src/pages/IssueGoods.tsx`
- เพิ่มเงื่อนไข filter: ตัด record ที่ `status === "pending_approval"` ออกจากรายการที่จ่ายได้ (กันเคสข้อมูลเก่า/หลุด)
- แสดง badge สถานะ "รออนุมัติ" ใน mapping `getStatusBadge` ให้ครบ (มีอยู่แล้วใน IssueRequest, เช็คให้ตรงกัน)

### 3. รองรับเบิก Media Player หลายเครื่อง (`src/pages/IssueGoods.tsx` — dialog จ่าย MP)
ตามนโยบายเดิม: 1 record MP = 1 หน่วยจริง แต่หลาย record มี `code` เดียวกันได้ (memory: media-player-unit-individualization)

แนวทาง:
- เมื่อ `selectedItem.is_media_player` และ `issued_quantity > 1` ให้ render ตารางย่อย 1 แถว/เครื่อง เช่นเดียวกับฝั่ง equipment ปกติ
- แต่ละแถวมี:
  - **MediaPlayerUnitSelect** (dropdown S/N ที่ stock>0 ของ `code` เดียวกัน + ตำแหน่งคลังเดียวกับเครื่อง parent) — ใช้ query `media_players` filter by `code = selectedItem.equipment_code` AND `quantity > 0` AND `is_active = true`
  - **BillboardSelect** (optional — ไม่ระบุได้ ระบบจะส่งเข้า "รอระบุป้าย/รอคืน")
- State ใหม่: `mpUnitAssignments: Array<{ media_player_id, serial_number, billboard_id }>` ขยาย/หดอัตโนมัติตาม `issued_quantity`
- Validate: MP ID ห้ามซ้ำในตะกร้าเดียวกัน, ทุกแถวต้องเลือก S/N
- Mutation:
  - ลบเงื่อนไข `if (issuedQty !== 1)` สำหรับ MP
  - Loop assignments: update `media_players.quantity = 0` ของแต่ละ id (เพราะ 1 record = 1 unit), insert `billboard_equipment` + `media_player_billboard_history` ถ้ามี billboard, log stock_movement ต่อหน่วย
  - เก็บ S/N รวมใน `goods_issue_pending_items.serial_number` แบบขึ้นบรรทัดใหม่ (ตาม core memory)
  - `billboard_id` ใน item: ถ้าทุกแถวเป็น billboard เดียวกันใช้ id นั้น, ถ้าต่าง/ไม่ครบใช้ null → record จะตกเข้าหน้า "รอระบุป้าย/รอคืน" ตาม flow เดิม
- กรณี `issued_quantity = 1` คงรูปแบบ dialog เดิม (compact) ไม่กระทบ UX

### ไม่แตะ
- Database schema (ใช้คอลัมน์เดิม)
- หน้า ManagerApproval (logic เดิมยังคงถูก เพราะตอนนี้ `requires_approval` จะถูกตั้งให้ตรงกัน)
- หน้า "รอระบุป้าย/รอคืน" (record ที่ billboard_id เป็น null จะตกมาตามปกติ)

## ไฟล์ที่จะแก้
- `src/pages/IssueRequest.tsx` (เงื่อนไข requiresApproval)
- `src/pages/IssueGoods.tsx` (filter, MP multi-unit dialog + mutation)
