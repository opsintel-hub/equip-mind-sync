---
name: Multi-slot storage allocation
description: กระจาย/หยิบของหลายช่องจัดเก็บพร้อมจำนวนต่อช่อง ใช้ทั้งรับเข้า เบิกจ่าย โอนย้าย และรายงาน
type: feature
---
- ตาราง `stock_location_allocations` = สมุดบัญชีช่องจัดเก็บ: จำนวนบวก = เข้า, จำนวนลบ = ออก (equipment_id / media_player_id / tool_id, location_id, quantity, volume_cm3, reference_type/id/document)
- helper `src/lib/locationAllocations.ts`: allocationTotal / primaryLocationId (ช่องจำนวนมากสุด = ค่าที่เขียนลงฟิลด์ location_id เดิม) / splitVolume / saveLocationAllocations (เข้า) / deductLocationAllocations (ออก, คืนพื้นที่) / fetchLocationBalances (ยอดคงเหลือรายช่อง)
- UI: `LocationAllocationEditor` (กระจายของเข้าหลายช่อง), `LocationPickEditor` (หยิบของออกจากหลายช่อง มีปุ่มเลือกอัตโนมัติ), `LocationBalanceCard` (แสดงว่าอยู่ช่องไหนกี่ชิ้น)
- ห้ามหัก/คืน used_volume_cm3 ซ้ำที่จุดอื่น — ทำใน saveLocationAllocations / deductLocationAllocations เท่านั้น
- ใช้แล้วที่: รับเข้าคลัง (เดี่ยว+หลายรายการ), จ่ายของ (IssueGoods), ย้ายอุปกรณ์ (ตัดต้นทาง + กระจายปลายทาง), Stock Card (LocationBalanceCard), หน้าคลัง&ตำแหน่ง (แถบพื้นที่ใช้ไป %)
