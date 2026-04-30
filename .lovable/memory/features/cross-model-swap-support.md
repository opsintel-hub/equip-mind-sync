---
name: Cross-Model Swap Support
description: Swap Wizard อนุญาต Spare ข้ามรหัส/ข้ามรุ่นได้ พร้อมจัดเรียงตามความเข้ากัน + cross-model warning + ack checkbox
type: feature
---

# Cross-Model Swap (Swap ข้ามรหัส/ข้ามรุ่น)

## หลักการ
อุปกรณ์/Media Player สามารถ Swap ข้ามรหัส/ข้าม Model กันได้ หาก Spec ใช้แทนกันได้
ระบบไม่กรอง Spare ตามรหัสเครื่องเก่า — โหลด Spare ทุกตัวที่พร้อมใช้งานในคลัง

## UI/UX Logic ใน SwapWizardDialog
1. **เรียงลำดับ Spare** ตาม compatibility score:
   - 0 = ตรง equipment_id หรือ item_code (ขึ้นบนสุด)
   - 1 = ประเภทเดียวกัน (Media Player ↔ Media Player, Equipment ↔ Equipment)
   - 2 = ข้ามประเภท
2. **Badge แสดงระดับความเข้ากัน** บน selected spare card (Step 1):
   - "✓ ตรงรหัสกับเครื่องเก่า" (default)
   - "↻ ข้ามรุ่น/รหัส" (secondary)
   - "⚠ ข้ามประเภท" (destructive)
3. **Cross-model warning + ack checkbox** ใน Step 3 — ต้องเช็ค "ยืนยันว่า Spec ใช้ทดแทนได้" ก่อนกด Approve
4. **บันทึก flag** `[CROSS-MODEL SWAP] Spare: <code> ↔ Old: <code>` ใน `swap_executions.notes` เพื่อตรวจสอบย้อนหลัง

## isCrossModel logic
True เมื่อ:
- spare.type !== old.type, หรือ
- spare.equipment_id !== old.equipment_id (ทั้งคู่มีค่า), หรือ
- spare.item_code !== old.item_code (fallback)
