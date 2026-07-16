# แผน: Section A + ปรับ Delivery Confirmation ให้เป็นขั้น "จ่าย → รอยืนยัน → ติดตั้งจริงที่ป้าย"

---

## Section A — Incomplete Issues Billboard Picker (แก้ตามที่ตกลง)

**ไฟล์:** `src/pages/IncompleteIssues.tsx`

1. เพิ่ม state `compatibleBbIds: string[] | null` + `compatMode: string | null`
2. ตอน `setBillboardDialogOpen(true)` ให้ prefetch จาก `equipment` (โดยใช้ `selectedItem.equipment_id || selectedIssue.equipment_id`):
   - `billboard_compatibility_mode`
   - ถ้าไม่ใช่ `unrestricted` → query `equipment_billboard_compatibility` เอา `billboard_id[]`
   - ใช้ helper `getCompatibleBillboardIdsForEquipment` จาก `src/lib/compatibility.ts` ที่มีอยู่แล้ว
3. เปลี่ยนบรรทัด 887:
   ```tsx
   <BillboardSelect
     value={billboardId}
     onChange={setBillboardId}
     department={selectedIssue?.department}
     allowedBillboardIds={compatMode === "unrestricted" ? undefined : compatibleBbIds}
     emptyLabel="อะไหล่นี้ยังไม่ระบุป้ายที่รองรับ"
   />
   ```
4. Media Player items: ไม่ส่ง `allowedBillboardIds` (คงพฤติกรรมเดิม เพราะ MP ไม่มี compat mode)

*ไม่กระทบ business logic อื่น — เฉพาะ dropdown*

---

## Section B — Delivery Confirmation: เลื่อนการ "ติดตั้งเข้าป้าย" มาที่ขั้นยืนยันรับ

### ปัจจุบัน (ตรวจแล้วใน `src/pages/IssueGoods.tsx`)

ตอนคลังกด "จ่าย":
- **MP** → INSERT `media_player_billboard_history` + update `media_players.current_billboard_id` ทันที
- **Equipment** → INSERT `billboard_equipment` ทันที
- Log `install_to_billboard` เข้า `stock_movements`

ปัญหา: ของยัง**ไม่ถึงมือผู้ขอ**แต่ระบบผูกเข้าป้ายแล้ว → หากส่งไม่ถึง / เสียหายระหว่างส่ง / รับผิดรุ่น จะเคลียร์ยาก

### ที่จะทำ

**หลักการ:** แยกเป็น 2 เฟส
- **จ่าย (Issue):** ตัดสต็อกจากคลัง → ย้ายของไปยัง "pending location" ของคำขอ, บันทึกเจตนา (`intended_billboard_id`) ไว้ที่ item, **ยังไม่** insert `billboard_equipment` / `media_player_billboard_history`
- **ยืนยันรับ (Confirm):** ผู้รับกด "ยืนยันรับ" → ระบบ commit การติดตั้งเข้าป้ายจริง

### การเปลี่ยนแปลง Database (Migration)

เพิ่มคอลัมน์เก็บ "เจตนาติดตั้ง" และสถานะ pending:

```sql
ALTER TABLE public.goods_issue_pending_items
  ADD COLUMN intended_billboard_id uuid REFERENCES public.billboards(id),
  ADD COLUMN install_status text DEFAULT 'not_required'
    CHECK (install_status IN ('not_required','pending_confirmation','installed','cancelled'));

-- ไม่ต้อง grant/RLS เพิ่ม เพราะเป็น ALTER
```

`install_status` ใช้ตัดสินขั้นตอน:
- `not_required` — ไม่ผูกป้าย (เบิกเข้าคลังปลายทาง)
- `pending_confirmation` — จ่ายแล้ว แต่รอผู้รับยืนยัน → จะติดตั้งเข้าป้าย
- `installed` — ยืนยันแล้ว, สร้าง billboard_equipment / MP history เรียบร้อย
- `cancelled` — ผู้รับแจ้งปัญหา / ปฏิเสธ → ไม่ติดตั้ง (ของยัง "ค้างระหว่างทาง" — Admin จัดการต่อ)

### `IssueGoods.tsx` — ตัดส่วน install ออกจากขั้นจ่าย

- แทนที่ block บรรทัด 494–528 (MP) และ 624–652 (Equipment):
  - **ไม่** insert `media_player_billboard_history` / `billboard_equipment` ที่นี่แล้ว
  - **ไม่** update `media_players.current_billboard_id` ตอนนี้
  - เปลี่ยนเป็น: update item row → `intended_billboard_id = a.billboard_id`, `install_status = 'pending_confirmation'`
- Stock movement ยังบันทึกอยู่ แต่ movement_type เป็น `"issue"` ธรรมดา (ไม่ใช่ `install_to_billboard`) พร้อม note `"รอผู้รับยืนยัน → ป้าย {label}"`

### `DeliveryConfirmation.tsx` — ตอนกด "ยืนยันรับ"

หลัง INSERT `delivery_confirmations` (status=`confirmed`) ให้ทำเพิ่ม:

1. Query items ของคำขอที่ `install_status = 'pending_confirmation'`
2. สำหรับแต่ละ item:
   - MP → INSERT `media_player_billboard_history` + UPDATE `media_players.current_billboard_id = intended_billboard_id` + log `install_to_billboard`
   - Equipment → INSERT `billboard_equipment` + log `install_to_billboard`
   - UPDATE item → `install_status = 'installed'`
3. ถ้ากด "แจ้งปัญหา" (`status = issue_reported`) → UPDATE items → `install_status = 'cancelled'` (ของค้างในระบบเป็น "รอ Admin จัดการ" — เข้าคิวใน Incomplete Issues)

### UI เพิ่มเติมที่แนะนำ

1. **หน้า DeliveryConfirmation**
   - เพิ่ม badge "🏷️ ติดตั้ง: {billboard_label}" ในการ์ดแต่ละใบ ให้ผู้ยืนยันเห็นชัดว่ากดยืนยันแล้วของจะไปติดตั้งที่ป้ายไหน
   - เพิ่มปุ่มย่อย "ยืนยัน (ติดตั้งเข้าป้าย)" กับ "ยืนยันแต่ยังไม่ติดตั้ง" (option) — สำหรับกรณีรับของถึงมือแล้ว แต่ยังไม่พร้อมติดตั้งที่ป้าย
   - Filter เพิ่ม pickup_type (`ทั้งหมด / รับที่คลัง / นัดรับ / ส่งถึงที่`)

2. **หน้า Incomplete Issues**
   - เพิ่ม tab "รอยืนยันรับ (จะติดตั้งเข้าป้าย)" — แสดง item ที่ `install_status = 'pending_confirmation'` เพื่อให้ Admin/ผู้ขอเห็นภาพรวมว่ายังค้างที่ขั้นไหน

3. **Stock Card / Movement**
   - แสดง 2 บรรทัดชัดเจน: (1) `issue` "จ่าย — รอยืนยัน" (2) `install_to_billboard` "ติดตั้งเข้าป้าย {label}" — Trace ง่าย

4. **wait_onsite (รับที่คลังทันที)**
   - แนะนำ: กรณี `pickup_type = wait_onsite` ให้ auto-confirm ตอนกดจ่ายเลย (ข้ามขั้นยืนยัน) เพราะผู้ขออยู่หน้าคลังอยู่แล้ว → ทำ install ทันทีเหมือนเดิม
   - เฉพาะ `scheduled` / `delivery` เท่านั้นที่เข้าคิวรอยืนยัน

5. **Permission**
   - ผู้ที่กดยืนยันได้ = requester ของคำขอ + Admin ของฝ่าย (กันคนอื่นกดแทน)

### QA

- เบิก MP ระบุป้าย → กดจ่าย → เช็คว่า `media_players.current_billboard_id` ยังเป็นค่าเดิม + `install_status = pending_confirmation`
- ไปหน้า DeliveryConfirmation → กดยืนยันรับ → เช็ค `current_billboard_id` เปลี่ยนเป็น intended + มี row ใหม่ใน `media_player_billboard_history`
- ทดสอบกด "แจ้งปัญหา" → ของไม่ถูกติดตั้ง + item เข้า Incomplete Issues
- ทดสอบ `wait_onsite` → auto-install เหมือนเดิม

---

## ลำดับการทำ

1. Section A (frontend เท่านั้น) — เสร็จเร็ว
2. Migration เพิ่ม 2 คอลัมน์
3. แก้ IssueGoods เลื่อน install
4. แก้ DeliveryConfirmation commit install ตอนยืนยัน
5. UI badges + Incomplete Issues tab ใหม่
