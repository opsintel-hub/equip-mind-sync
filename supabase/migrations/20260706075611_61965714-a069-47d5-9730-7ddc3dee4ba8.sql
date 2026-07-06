DROP POLICY IF EXISTS "Public can view billboard_equipment for QR profile" ON public.billboard_equipment;

CREATE OR REPLACE FUNCTION public.public_get_mp_billboard_equipment(_media_player_id uuid)
RETURNS TABLE(billboard_id uuid, installation_date timestamp with time zone, quantity numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT be.billboard_id, be.installation_date, be.quantity
  FROM public.billboard_equipment be
  WHERE be.equipment_id = _media_player_id
    AND EXISTS (SELECT 1 FROM public.media_players mp WHERE mp.id = _media_player_id);
$$;

GRANT EXECUTE ON FUNCTION public.public_get_mp_billboard_equipment(uuid) TO anon, authenticated;