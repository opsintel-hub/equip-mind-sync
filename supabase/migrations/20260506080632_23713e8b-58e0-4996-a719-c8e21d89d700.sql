CREATE POLICY "Public can view media player stock movements for QR profile"
ON public.stock_movements
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.media_players mp
    WHERE mp.id = stock_movements.equipment_id
  )
);