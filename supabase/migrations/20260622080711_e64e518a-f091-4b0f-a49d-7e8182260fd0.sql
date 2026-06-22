
-- 1. Drop anon SELECT policies
DROP POLICY IF EXISTS "anon_read_ad_target_billboards" ON public.ad_target_billboards;
DROP POLICY IF EXISTS "anon_read_ad_versions" ON public.ad_versions;
DROP POLICY IF EXISTS "Allow anon read direct_shipment_items for public view" ON public.direct_shipment_items;
DROP POLICY IF EXISTS "Allow anon read direct_shipments for public view" ON public.direct_shipments;
DROP POLICY IF EXISTS "Public can view suppliers for QR profile" ON public.suppliers;

-- 2. Explicit super-admin-only SELECT policy on external_db_connections (clarity / explicit)
DROP POLICY IF EXISTS "external_db_connections_super_admin_select" ON public.external_db_connections;
CREATE POLICY "external_db_connections_super_admin_select"
ON public.external_db_connections
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 3. RPC: public_get_ad_by_contractor_token (token + PIN gated)
CREATE OR REPLACE FUNCTION public.public_get_ad_by_contractor_token(_token text, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad RECORD;
  v_result jsonb;
BEGIN
  IF _token IS NULL OR coalesce(btrim(_token),'') = '' OR _pin IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_ad
  FROM public.advertisements
  WHERE contractor_access_token = _token
    AND contractor_access_pin = _pin
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', v_ad.id,
    'code', v_ad.code,
    'name', v_ad.name,
    'entry_type', v_ad.entry_type,
    'total_quantity', v_ad.total_quantity,
    'status', v_ad.status,
    'photo_urls', v_ad.photo_urls,
    'target_installation_date', v_ad.target_installation_date,
    'installation_details', v_ad.installation_details,
    'supporting_doc_url', v_ad.supporting_doc_url,
    'notes', v_ad.notes,
    'contact_name', v_ad.contact_name,
    'contact_phone', v_ad.contact_phone,
    'created_at', v_ad.created_at,
    'ad_size', (SELECT jsonb_build_object('name', s.name) FROM public.ad_sizes s WHERE s.id = v_ad.ad_size_id),
    'ad_media_type', (SELECT jsonb_build_object('name', m.name) FROM public.ad_media_types m WHERE m.id = v_ad.ad_media_type_id),
    'installation_team', (SELECT jsonb_build_object('code', c.code, 'name', c.name, 'contact_person', c.contact_person)
                          FROM public.contractors c WHERE c.id = v_ad.installation_team_id),
    'ad_versions', COALESCE((SELECT jsonb_agg(jsonb_build_object('version_name', v.version_name, 'quantity', v.quantity))
                             FROM public.ad_versions v WHERE v.advertisement_id = v_ad.id), '[]'::jsonb),
    'ad_target_billboards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'billboard_id', tb.billboard_id,
        'billboards', (SELECT jsonb_build_object(
          'equipment_id', b.equipment_id,
          'old_code', b.old_code,
          'location_name', b.location_name,
          'department', b.department,
          'size', b.size) FROM public.billboards b WHERE b.id = tb.billboard_id)
      )) FROM public.ad_target_billboards tb WHERE tb.advertisement_id = v_ad.id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_ad_by_contractor_token(text, text) TO anon, authenticated;

-- 4. RPC: public_get_direct_shipment (UUID-gated; same shape as before, no internal-only fields)
CREATE OR REPLACE FUNCTION public.public_get_direct_shipment(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_s RECORD;
  v_result jsonb;
BEGIN
  IF _id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_s FROM public.direct_shipments WHERE id = _id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', v_s.id,
    'document_no', v_s.document_no,
    'status', v_s.status,
    'created_at', v_s.created_at,
    'requester_name', v_s.requester_name,
    'department', v_s.department,
    'purpose', v_s.purpose,
    'expected_arrival_date', v_s.expected_arrival_date,
    'requested_items_description', v_s.requested_items_description,
    'notes', v_s.notes,
    'destination_description', v_s.destination_description,
    'receiver_name', v_s.receiver_name,
    'receiver_phone', v_s.receiver_phone,
    'destination_lat', v_s.destination_lat,
    'destination_lng', v_s.destination_lng,
    'supplier_name', v_s.supplier_name,
    'po_number', v_s.po_number,
    'pr_number', v_s.pr_number,
    'shipping_date', v_s.shipping_date,
    'delivery_person_name', v_s.delivery_person_name,
    'companies', (SELECT jsonb_build_object('name', c.name) FROM public.companies c WHERE c.id = v_s.company_id),
    'suppliers', (SELECT jsonb_build_object('name', sp.name) FROM public.suppliers sp WHERE sp.id = v_s.supplier_id),
    'direct_shipment_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'equipment_code', i.equipment_code,
        'equipment_name', i.equipment_name,
        'quantity', i.quantity,
        'unit', i.unit,
        'serial_number', i.serial_number,
        'serial_number_2', i.serial_number_2,
        'is_media_player', i.is_media_player,
        'lot_number', i.lot_number
      )) FROM public.direct_shipment_items i WHERE i.direct_shipment_id = v_s.id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_direct_shipment(uuid) TO anon, authenticated;

-- 5. RPC: public_get_supplier_name (safe column only, for QR pages)
CREATE OR REPLACE FUNCTION public.public_get_supplier_name(_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM public.suppliers WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_supplier_name(uuid) TO anon, authenticated;
