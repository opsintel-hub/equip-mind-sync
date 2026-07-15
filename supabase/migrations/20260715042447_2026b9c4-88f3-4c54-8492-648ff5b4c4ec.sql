
INSERT INTO public.receipt_purposes (name, description, purpose_type, max_storage_days, requires_location) VALUES
('ซื้อ (สินทรัพย์/อะไหล่)', 'นำเข้าจากการสั่งซื้อ (ผูก Asset / PO)', 'purchase', NULL, true),
('นำเข้าปกติ', 'นำสินค้าเข้าคลังปกติ ต้องจัดเก็บตามตำแหน่ง', 'regular', NULL, true),
('นำเข้าจากการซื้อ', 'นำสินค้าเข้าจากการสั่งซื้อ', 'regular', NULL, true),
('ฝากเก็บ (ไม่เกิน 24 ชั่วโมง)', 'ฝากเก็บชั่วคราวไม่เกิน 24 ชั่วโมง', 'storage', 1, false),
('ฝากเก็บชั่วคราว (ไม่เกิน 7 วัน)', 'ฝากเก็บชั่วคราวไม่เกิน 7 วัน', 'storage', 7, false),
('ฝากเก็บชั่วคราว (ไม่เกิน 30 วัน)', 'ฝากเก็บชั่วคราวไม่เกิน 30 วัน', 'storage', 30, false),
('ฝากเก็บ (ของขวัญปีใหม่)', 'ฝากเก็บของขวัญปีใหม่', 'storage', NULL, false),
('นำเข้าของเสีย/ชำรุด', 'นำสินค้าที่เสียหรือชำรุดเข้าคลัง', 'defective', NULL, true),
('นำเข้ารอตรวจสอบ', 'นำสินค้าที่รอตรวจสอบสภาพเข้าคลัง', 'inspection', NULL, true)
ON CONFLICT DO NOTHING;
