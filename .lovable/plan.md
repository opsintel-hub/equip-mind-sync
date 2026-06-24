
## ปัญหาที่พบ

Loop ปัจจุบัน (เมนู "นำของเสียเข้าระบบ" → ประเมิน → Reject → กลับมาประเมินใหม่) มีจุดขาดดังนี้:

1. ตอน Reject ที่ `DefectiveReturnEntry.handleRejectTicket` ใบ DR ถูกตั้งสถานะ `rejected_for_edit` และ `assessment_logs.status` ถูกย้อนเป็น `pending` แล้ว ✓
2. ตอนประเมินใหม่ที่ `AssessmentCompleteDialog` ถ้าผลออกมาเป็น `defective` โค้ดจะ **revive ใบ DR เดิม** กลับเป็น `pending_warehouse_entry` (ไม่สร้างเลขใหม่) ✓
3. หลังบันทึก → navigate ไป `/defective-return` พร้อม `routerLocation.state.fromAssessment` (prefill รหัส/SN/เหตุผล)
4. **จุดที่ขาด:** `useEffect` ที่อ่าน prefill (บรรทัด 228-255) จะกระโดดไปที่ **แท็บ "สร้างตั๋วใหม่"** เสมอ โดยไม่เช็คว่าใบ DR ของ assessment นั้นมีอยู่แล้วในสถานะ `pending_warehouse_entry` (ใบที่เพิ่ง revive) ผลคือ:
   - ผู้ใช้กรอก/กดบันทึก → โค้ดจะ **INSERT ใบ DR ใหม่อีกใบ** (เพราะ `existingTicket` ไม่ถูก set) → ได้ DR ซ้ำสองใบ
   - หรือถ้าผู้ใช้ไม่กดอะไรเลย ก็ไม่รู้ว่าใบ revive อยู่ในแท็บ "รอดำเนินการ" → ไม่กด Confirm → stock ไม่ถูกตัด

## สิ่งที่จะแก้ (Frontend อย่างเดียว — ไม่มี migration)

### `src/pages/DefectiveReturnEntry.tsx` — prefill handler

แก้ `useEffect` ที่บรรทัด 228-255 ให้:

1. เมื่อ `fromAssessment` มาถึง ให้ query `defective_returns` หา
   ```
   assessment_log_id = fa.assessmentLogId
   status = 'pending_warehouse_entry'
   stock_deducted_at IS NULL
   ```
   เลือกใบล่าสุด
2. **ถ้าเจอ** (กรณี revive จาก Reject loop) →
   - ไม่ prefill ฟอร์มสร้างใหม่
   - `setActiveTab("pending")` แล้วเรียก `fetchPendingTickets()`
   - หา ticket นั้นใน `pendingTickets` (อาจรอ refetch) แล้วเปิด `handleProcessTicket(ticket)` ทันที (Review Dialog เด้งขึ้น พร้อม Confirm เพื่อตัด Stock)
   - Toast: `"ใบ {docNo} ถูกส่งกลับเข้าคลังของเสียอีกครั้งหลังประเมินใหม่ — โปรดยืนยันเพื่อตัด Stock"`
3. **ถ้าไม่เจอ** → ทำงานเดิม (prefill ฟอร์มสร้างใหม่) ตามเดิมทุกประการ

### `handleCreateDefective` (submit สร้างใหม่) — กันซ้ำเชิงป้องกัน

ก่อน insert ที่บรรทัด 660 และ 751 ถ้า `fromAssessmentInfo` มีค่า ให้เช็คอีกครั้งว่าไม่มี DR แบบ `pending_warehouse_entry`/`completed` ของ `assessment_log_id` นี้อยู่ในระบบแล้ว ถ้ามีให้ block + toast แนะนำให้ไปแท็บ "รอดำเนินการ" (กันเคส race / ผู้ใช้กดสร้างซ้ำ)

### `AssessmentCompleteDialog.tsx` — เคลียร์ field กันสับสน

ใน revival path (บรรทัด 503-519) เพิ่ม `stock_deducted_at: null`, `confirmed_at: null`, `confirmed_by: null`, `confirmed_by_name: null` ใน update payload เพื่อให้ใบที่ revive สะอาด (เผื่อเคสในอนาคตที่ฟิลด์เหล่านี้อาจถูก set ผิดจังหวะ)

## ผลที่คาดหวัง

- กด Reject ใน "นำของเสียเข้าระบบ" → ใบ DR กลับเข้า `rejected_for_edit`, ตั๋วประเมินกลับเป็น `pending` (เหมือนเดิม)
- ผู้ประเมินกลับมาประเมินใหม่ผลเป็น `defective` → ใบ DR เดิมถูก revive (เลขเดิม)
- หน้า `/defective-return` เปิดแท็บ "รอดำเนินการ" + เด้ง Review Dialog ของใบนั้นทันที
- คลังกด "ยืนยันรับเข้าคลังของเสีย" → ตัด Stock + log stock_movements + ตั้ง `status=completed`, `stock_deducted_at=now` → จบ Loop
- ไม่มี DR ซ้ำสองใบในระบบ

## สิ่งที่ไม่แตะ

- Schema ฐานข้อมูล
- Logic ตัด Stock เดิม (`handleConfirmReceive`) — ยังคงตัดเหมือนเดิม
- Logic outcome อื่นๆ (claim / self_repair / return_refurb)
- RLS policies
