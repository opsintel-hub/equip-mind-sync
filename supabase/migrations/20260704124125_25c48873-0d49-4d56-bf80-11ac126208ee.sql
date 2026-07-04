
-- Remove overly permissive anon SELECT policy on media_players
DROP POLICY IF EXISTS "Public can view media_players for QR profile" ON public.media_players;

-- Provide a safe, limited public view via SECURITY DEFINER RPC used by the QR public profile page
CREATE OR REPLACE FUNCTION public.public_get_media_player_profile(_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', mp.id,
    'code', mp.code,
    'name', mp.name,
    'description', mp.description,
    'serial_number_1', mp.serial_number_1,
    'serial_number_2', mp.serial_number_2,
    'brand', mp.brand,
    'specification', mp.specification,
    'status', mp.status,
    'item_condition', mp.item_condition,
    'department', mp.department,
    'sub_media_type', mp.sub_media_type,
    'billboard_id', mp.billboard_id,
    'install_date', mp.install_date,
    'date_of_receipt', mp.date_of_receipt,
    'remote_name', mp.remote_name,
    'activate_windows', mp.activate_windows,
    'order_for_project', mp.order_for_project,
    'planned_install_location', mp.planned_install_location,
    'notes', mp.notes,
    'cms_type_id', mp.cms_type_id,
    'company_id', mp.company_id,
    'model_id', mp.model_id,
    'location_id', mp.location_id,
    'device_type', mp.device_type,
    'created_at', mp.created_at,
    'image_url', mp.image_url,
    'usage_lifespan_months', mp.usage_lifespan_months,
    'asset_code', mp.asset_code,
    'equipment_id_code', mp.equipment_id_code,
    'supplier_id', mp.supplier_id,
    'billboard', CASE WHEN bb.id IS NOT NULL THEN jsonb_build_object(
        'id', bb.id, 'equipment_id', bb.equipment_id,
        'old_code', bb.old_code, 'location_name', bb.location_name
      ) ELSE NULL END,
    'companies', CASE WHEN co.name IS NOT NULL THEN jsonb_build_object('name', co.name) ELSE NULL END,
    'cms_types', CASE WHEN ct.name IS NOT NULL THEN jsonb_build_object('name', ct.name) ELSE NULL END,
    'locations', CASE WHEN lo.name IS NOT NULL THEN jsonb_build_object('name', lo.name) ELSE NULL END
  )
  FROM public.media_players mp
  LEFT JOIN public.billboards bb ON bb.id = mp.billboard_id
  LEFT JOIN public.companies co ON co.id = mp.company_id
  LEFT JOIN public.cms_types ct ON ct.id = mp.cms_type_id
  LEFT JOIN public.locations lo ON lo.id = mp.location_id
  WHERE mp.id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_media_player_profile(uuid) TO anon, authenticated;
