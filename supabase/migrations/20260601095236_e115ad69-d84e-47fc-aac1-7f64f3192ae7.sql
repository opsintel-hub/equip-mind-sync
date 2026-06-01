-- Cancel duplicate defective_returns from same assessment (keep earliest)
UPDATE public.defective_returns
SET status = 'cancelled',
    notes = COALESCE(notes || E'\n', '') || '[Auto-cancelled] ระบบสร้างซ้ำจาก bug — รวมกับ DR-20260601-0530'
WHERE id IN (
  'fa951675-60fb-4fd4-8ee8-968a9c8ca991',
  'e20d1227-a26e-4cd2-ad6e-f7be97f5f8f2'
);