-- 1. Create dedicated warehouse "คลังของเสีย" (Defective Quarantine)
INSERT INTO public.warehouses (code, name, description, is_active)
VALUES ('WH-DEFECT', 'คลังของเสีย (Quarantine)', 'คลังพักของเสีย/ชำรุด รออนุมัติวิธีจัดการ — ห้ามเบิกออกตามปกติ', true)
ON CONFLICT DO NOTHING;

-- 2. Create one location inside it
INSERT INTO public.locations (code, name, description, is_active, warehouse_id, storage_area)
SELECT 'LOC-DEFECT', 'พักของเสีย', 'พื้นที่พักของเสียทั้งหมด รออนุมัติจัดการ', true, w.id, 'Quarantine'
FROM public.warehouses w
WHERE w.code = 'WH-DEFECT'
ON CONFLICT DO NOTHING;

-- 3. Add column to track where the defective item is currently held
ALTER TABLE public.defective_returns
  ADD COLUMN IF NOT EXISTS quarantine_location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS stock_deducted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS stock_disposed_at timestamp with time zone;

-- 4. Add index for finding the quarantine location quickly
CREATE INDEX IF NOT EXISTS idx_defective_returns_quarantine_loc ON public.defective_returns(quarantine_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON public.locations(code);
