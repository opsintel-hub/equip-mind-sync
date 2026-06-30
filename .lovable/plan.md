# ป้องกันการขอเบิกเกินสต็อก + Auto PR

## ปัญหา
- หน้า "ขอเบิก" กรองแค่ `quantity > 0` ตอน **โหลด** หน้า (snapshot) ไม่ได้ re-check ตอนกด "เพิ่มลงตะกร้า" หรือตอน "ส่งคำขอ"
- ไม่ได้หัก pending requests ของคนอื่นที่ค้างอยู่ → 2 คนเลือกตัวเดียวกันได้
- คำขอเก่าค้างนาน (เช่น GI-REQ-000027 จาก 12/02) ของอาจหมดไปแล้วก่อนถึงคิวอนุมัติ

## แนวทาง (ตามที่ผู้ใช้เลือก)
1. **Block ที่หน้าขอเบิก** ถ้าของไม่พอ (Available = Stock − Σ pending requests)
2. **สร้าง PR อัตโนมัติ** เมื่อเกิดสถานะรอสต็อก

---

## 1. RPC คำนวณ Available Stock (server-side, ป้องกัน race)

สร้าง `get_available_stock(equipment_id, is_media_player)`:
- อ่าน `stock` จาก `equipment.quantity_in_stock` หรือ `media_players.quantity`
- หัก `SUM(quantity - issued_quantity)` ของ `goods_issue_pending_items` ที่ pending_id ยัง active (status ∈ pending/pending_approval/approved/partial/waiting_stock)
- คืน `{ stock, reserved, available }`

## 2. Block ที่หน้า IssueRequest

ใน `src/pages/IssueRequest.tsx`:
- เปลี่ยน `getSelectableStock()` ให้เรียก RPC ใหม่ (หรือ pre-fetch pending reservations map ครั้งเดียว)
- แสดงคอลัมน์ "คงเหลือใช้ได้" (Available) แทน Stock ดิบ ใน dropdown/searchable select
- ตอนกด "เพิ่มลงตะกร้า" → block + toast `"สต็อกไม่พอ (คงเหลือ X, ขอ Y) — กรุณาลดจำนวน หรือใช้ปุ่ม 'แจ้งขอซื้อ'"`
- ตอนกด "ส่งคำขอ" → re-validate ทุก item อีกครั้ง (กันคนอื่นแทรกระหว่างกรอกฟอร์ม)

## 3. ปุ่ม "แจ้งขอซื้อ" (เมื่อ available < ขอ)

ในกล่อง error stock-insufficient แสดงปุ่ม "📋 สร้างใบขอซื้อ (PR)":
- เรียก RPC ใหม่ `create_pr_from_shortage(equipment_id, requested_qty, available, requester_name, reason)`
- สร้าง record ใน `purchase_requests` (ใช้ `generate_pr_number()` ที่มีอยู่)
- `reason` = `"คำขอเบิกของ {requester} เกินสต็อก ({requested}/{available})"`
- `suggested_quantity` = ขอ − available + min_stock_level
- กันสร้างซ้ำ: ถ้ามี PR pending ของ equipment เดิมอยู่แล้ว → อัปเดต `suggested_quantity` แทน
- Toast: `"สร้างใบขอซื้อ PR-XXX สำเร็จ — รอจัดซื้อดำเนินการ"`

## 4. Block ที่หน้า ManagerApproval (กันเคสค้างนาน)

ใน `src/pages/ManagerApproval.tsx` (ที่เพิ่ง refactor):
- คอลัมน์ "สต็อกคงเหลือ" ที่แสดงสีแดง ⚠️ ไม่พอเบิก → **disable ปุ่ม "อนุมัติ"** ถ้ามี item ใดสต็อก < ขอ
- แสดง alert ในแถว: `"⚠️ ไม่สามารถอนุมัติได้ — สต็อกไม่พอ กรุณาให้ผู้ขอแก้ไขคำขอ หรือกด 'แจ้งขอซื้อ'"`
- เพิ่มปุ่ม "📋 สร้างใบขอซื้อ" ใน expand row (เรียก RPC เดียวกับข้อ 3)

## 5. เคสที่เปลี่ยนเป็น waiting_stock อยู่แล้ว (ตอนคลังจ่าย)

Trigger เดิม `check_and_create_pr` ทำงานเฉพาะตอน `stock <= min_stock_level` — เพิ่ม:
- Trigger ใหม่บน `goods_issue_pending.status` เมื่อเปลี่ยนเป็น `waiting_stock` → auto-create PR ถ้ายังไม่มี (เหมือนข้อ 3 แต่ trigger ฝั่ง DB)

---

## รายละเอียดเทคนิค

**ไฟล์ที่แก้:**
- `src/pages/IssueRequest.tsx` — re-validate + ปุ่มสร้าง PR
- `src/pages/ManagerApproval.tsx` — disable approve + ปุ่ม PR
- Migration: RPC `get_available_stock`, RPC `create_pr_from_shortage`, Trigger `auto_pr_on_waiting_stock`

**ผลลัพธ์:**
- ผู้ใช้สร้างคำขอเกินสต็อกไม่ได้ → ระบบบังคับกด "แจ้งขอซื้อ" แทน
- ผู้อนุมัติเห็นชัดว่าคำขอไหนของหมด → กด PR ได้ทันที ไม่ต้องเปิดหน้าอื่น
- จัดซื้อรู้ทันทีผ่าน `purchase_requests` (มีหน้า /purchase-requests อยู่แล้ว)
