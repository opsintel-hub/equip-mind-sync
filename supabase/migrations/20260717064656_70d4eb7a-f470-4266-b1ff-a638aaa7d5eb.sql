INSERT INTO public.warehouses (code, name, description, storage_area, department, is_active)
VALUES ('WH-DEFECT', 'คลังของเสีย (Quarantine)', 'คลังพักของเสีย/ชำรุด รออนุมัติวิธีจัดการ — ห้ามเบิกออกตามปกติ', 'Indoor', NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  storage_area = EXCLUDED.storage_area,
  is_active = true;

INSERT INTO public.locations (code, name, description, is_active, warehouse_id, storage_area, used_volume_cm3)
SELECT 'LOC-DEFECT', 'พักของเสีย', 'พื้นที่พักของเสียทั้งหมด รออนุมัติจัดการ', true, w.id, 'Indoor', 0
FROM public.warehouses w
WHERE w.code = 'WH-DEFECT'
ON CONFLICT (warehouse_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  storage_area = EXCLUDED.storage_area,
  is_active = true;