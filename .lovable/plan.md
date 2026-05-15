# แก้ปัญหา: GI-REQ-000069 ยังกด "จ่าย" ได้ทั้งที่ยังไม่อนุมัติ

## สาเหตุ

ตรวจ DB แล้วพบว่า GI-REQ-000069 มีค่า:
- `requires_approval = false`
- `approval_status = not_required`
- `status = pending`

ทั้งที่ในตะกร้ามี Media Player (MP-711 0001 จำนวน 2 เครื่อง)

เหตุที่เป็นแบบนี้คือ **คำขอนี้ถูกสร้างก่อนที่จะเพิ่ม logic บังคับอนุมัติสำหรับ Media Player** ใน `IssueRequest.tsx` (รอบที่แล้ว) จึงไม่ได้ถูกตั้ง flag ให้รออนุมัติ ส่งผลให้ผ่าน filter ของ `IssueGoods.tsx` และยังเห็นปุ่ม "จ่าย" อยู่

คำขอใหม่ที่สร้างหลังจากนี้จะถูกบังคับอนุมัติถูกต้องแล้ว — แต่คำขอเก่าๆ ที่ค้างใน DB ยังไม่ถูกแก้

## แผนแก้

### 1. Backfill ข้อมูลเก่าใน DB (migration)
อัปเดตทุกแถวใน `goods_issue_pending` ที่:
- `status = 'pending'` หรือ `status = 'partial'`
- `requires_approval = false`
- มี item ที่ `is_media_player = true` (join กับ `goods_issue_pending_items`)

ให้กลายเป็น:
- `requires_approval = true`
- `approval_status = 'pending'`
- `status = 'pending_approval'`

เพื่อให้คำขอ MP เก่าทั้งหมด (รวม GI-REQ-000069) เข้าคิวรออนุมัติเหมือนคำขอใหม่

### 2. เพิ่ม defense-in-depth ใน `src/pages/IssueGoods.tsx`
ปัจจุบัน filter ใช้แค่ `status !== 'pending_approval'` ถ้าข้อมูลในอนาคตหลุดมาอีก (เช่นสร้างจากช่องทางอื่น) ก็จะหลุดอีก เพิ่มเงื่อนไข:
- ถ้า record มี item ที่ `is_media_player = true` → ต้องมี `approval_status = 'approved'` เท่านั้นถึงจะแสดงปุ่มจ่าย
- มิฉะนั้นแสดง badge "รออนุมัติ" และซ่อน/disable ปุ่ม "จ่าย"

### 3. ปรับ badge สถานะใน sub-table รายการสินค้า
ใน sub-row ของ MP-711 0001 ตอนนี้แสดง "รอดำเนินการ" ทั้งที่หัวคำขอควรเป็น "รออนุมัติ" — ให้ derive badge ของ item จาก `parent.approval_status` ด้วย เพื่อไม่ให้ผู้ใช้สับสน

## ไฟล์ที่จะแก้
- migration ใหม่ (backfill `goods_issue_pending`)
- `src/pages/IssueGoods.tsx` (เพิ่ม guard + ปรับ badge)

ไม่แตะ `IssueRequest.tsx` (logic ใหม่ถูกต้องแล้ว) และไม่แตะ schema
