
-- 1) Fix RLS: allow authenticated users to UPDATE/DELETE media_player_billboard_history
CREATE POLICY "Authenticated users can update media player billboard history"
  ON public.media_player_billboard_history
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete media player billboard history"
  ON public.media_player_billboard_history
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 2) Backfill AAA001: close the still-open install history row from Swap SWP-20260630-0014
UPDATE public.media_player_billboard_history
SET uninstall_date = '2026-06-30',
    uninstall_reason = 'Swap SWP-20260630-0014 (backfill)',
    return_to_stock = true,
    return_location_id = '9fc77f62-cf79-4c26-bde9-1d8cacd7bb76'
WHERE id = 'e2046ccc-47ea-4106-b0c9-ef728fcfaac4'
  AND uninstall_date IS NULL;

-- 3) Backfill AAA001: restore location_id so inventory report shows it correctly
UPDATE public.media_players
SET location_id = '9fc77f62-cf79-4c26-bde9-1d8cacd7bb76'
WHERE id = '61e3c5d7-9189-4b39-87e5-949b1b3f2beb'
  AND location_id IS NULL
  AND status = 'active';

-- 4) Add the missing stock_movement for refurb-back-to-stock (self_repair success)
INSERT INTO public.stock_movements (
  equipment_id, equipment_code, equipment_name,
  movement_type, quantity, stock_before, stock_after,
  reference_type, reference_document,
  location_id, item_condition, notes
)
SELECT
  mp.id, mp.code, mp.name,
  'refurb_to_stock', 1, 0, 1,
  'assessment', 'ASM-20260630-0012',
  '9fc77f62-cf79-4c26-bde9-1d8cacd7bb76',
  'refurbished',
  'ซ่อมเองสำเร็จ — กลับเข้าคลังเป็น Refurbished (backfill)'
FROM public.media_players mp
WHERE mp.id = '61e3c5d7-9189-4b39-87e5-949b1b3f2beb'
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_movements sm
    WHERE sm.equipment_id = mp.id
      AND sm.movement_type = 'refurb_to_stock'
      AND sm.reference_document = 'ASM-20260630-0012'
  );
