
-- Drop overly-broad anon SELECT policies
DROP POLICY IF EXISTS "Public can view billboard_equipment_history for QR profile" ON public.billboard_equipment_history;
DROP POLICY IF EXISTS "Public can view media player stock movements for QR profile" ON public.stock_movements;

-- Limited-column RPC for QR profile: billboard equipment history for a media player
CREATE OR REPLACE FUNCTION public.public_get_mp_billboard_history(_media_player_id uuid)
RETURNS TABLE (
  billboard_id uuid,
  installation_date timestamptz,
  uninstall_date timestamptz,
  uninstall_reason text,
  quantity numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.billboard_id, h.installation_date, h.uninstall_date, h.uninstall_reason, h.quantity
  FROM public.billboard_equipment_history h
  WHERE h.equipment_id = _media_player_id
    AND EXISTS (SELECT 1 FROM public.media_players mp WHERE mp.id = _media_player_id);
$$;

GRANT EXECUTE ON FUNCTION public.public_get_mp_billboard_history(uuid) TO anon, authenticated;

-- Limited-column RPC for QR profile: stock movements for a media player
CREATE OR REPLACE FUNCTION public.public_get_mp_stock_movements(_media_player_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  movement_type text,
  quantity numeric,
  stock_before numeric,
  stock_after numeric,
  reference_document text,
  notes text,
  item_condition text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.created_at, s.movement_type, s.quantity, s.stock_before, s.stock_after,
         s.reference_document, s.notes, s.item_condition
  FROM public.stock_movements s
  WHERE s.equipment_id = _media_player_id
    AND EXISTS (SELECT 1 FROM public.media_players mp WHERE mp.id = _media_player_id)
  ORDER BY s.created_at DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_mp_stock_movements(uuid) TO anon, authenticated;
