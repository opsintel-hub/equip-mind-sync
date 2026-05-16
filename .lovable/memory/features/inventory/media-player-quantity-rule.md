---
name: Media Player Quantity Rule
description: media_players.quantity ต้องสะท้อนสถานะจริง — 1 เมื่อพร้อมใช้ในคลังเท่านั้น, 0 เมื่อติดตั้งบนป้าย/in transit/quarantined
type: feature
---

# Rule
`media_players.quantity` ต้องเท่ากับ:
- **1** เมื่อ: `billboard_id IS NULL` AND `location_id IS NOT NULL` AND `status IN ('active','in_stock')`
- **0** ในกรณีอื่นทั้งหมด (installed, in transit, pending_warehouse_return, pending_assessment, under_repair, in_claim, defective, claim)

# ทุกขั้นของ Swap flow ต้อง maintain quantity:
- Spare ติดตั้งบนป้าย → `quantity = 0`
- เครื่องเก่าถอด → `quantity = 0` (in transit)
- คลังรับเข้าเป็น `pending_assessment` → `quantity = 0` (quarantined, ยังไม่นับ stock)
- Assessment `return_refurb` → `status='active', quantity = 1` (กลับเข้าคลังพร้อมใช้)
- Assessment `claim` / `under_repair` → `quantity = 0`
- Assessment `defective` → `quantity = 0` (defective entry จัดการต่อ)

# Why
StockCard, InventoryReport, MediaPlayerReport, GlobalSearch ทั้งหมดอ่าน `media_players.quantity` เป็น single source of truth สำหรับยอดคงคลัง ถ้าไม่ maintain ตาม rule นี้ตัวเลขจะไม่ตรงกันข้ามหน้า
