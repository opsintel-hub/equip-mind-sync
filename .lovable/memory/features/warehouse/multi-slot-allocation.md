---
name: Multi-slot storage allocation
description: รับเข้าคลังกระจายของลงหลายช่องจัดเก็บพร้อมจำนวนต่อช่อง หักความจุ m³ ตามสัดส่วน
type: feature
---
- ตาราง `stock_location_allocations` = ประวัติการกระจายของลงช่องจัดเก็บ (equipment_id / media_player_id / tool_id, location_id, quantity, volume_cm3, reference_type/id/document)
- UI ใช้ `LocationAllocationEditor` (src/components/location/) — เลือกได้หลายช่อง + ระบุจำนวนต่อช่อง + ต้องกระจายให้ครบเท่าจำนวนรับเข้า
- helper `src/lib/locationAllocations.ts`: allocationTotal / primaryLocationId (ช่องจำนวนมากสุด = ค่าที่เขียนลงฟิลด์ location_id เดิม) / splitVolume / saveLocationAllocations (insert + หัก used_volume_cm3 รายช่อง)
- ห้ามหัก used_volume_cm3 ซ้ำที่จุดอื่นในหน้ารับเข้า — หักที่ saveLocationAllocations จุดเดียว
- ใช้แล้วที่: หน้ารับเข้าคลัง (ReceiveGoods) ทั้งแบบรายการเดียวและหลายรายการ
