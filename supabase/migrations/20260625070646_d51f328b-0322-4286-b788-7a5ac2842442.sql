
-- 1. media_players.device_type
ALTER TABLE public.media_players
  ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'MEDIA_PLAYER';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_players_device_type_check'
  ) THEN
    ALTER TABLE public.media_players
      ADD CONSTRAINT media_players_device_type_check
      CHECK (device_type IN ('MEDIA_PLAYER','MONITOR'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_media_players_device_type ON public.media_players(device_type);

-- 2. goods_receipt_pending.device_type
ALTER TABLE public.goods_receipt_pending
  ADD COLUMN IF NOT EXISTS device_type TEXT;

-- 3. Update import_media_player_row RPC to accept device_type
CREATE OR REPLACE FUNCTION public.import_media_player_row(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_mp_id uuid;
  v_code text := nullif(btrim(p->>'code'), '');
  v_name text := nullif(btrim(p->>'name'), '');
  v_sn1 text := nullif(btrim(p->>'serial_number_1'), '');
  v_billboard_id uuid := NULLIF(p->>'billboard_id','')::uuid;
  v_install_date date := NULLIF(p->>'install_date','')::date;
  v_status text;
  v_dept text := NULLIF(p->>'department','');
  v_sub text := NULLIF(p->>'sub_media_type','');
  v_device text := COALESCE(NULLIF(upper(btrim(p->>'device_type')),''), 'MEDIA_PLAYER');
BEGIN
  IF NOT (public.has_role(v_user,'admin') OR public.has_role(v_user,'super_admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF v_code IS NULL OR v_name IS NULL OR v_sn1 IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'code, name and serial_number_1 are required');
  END IF;

  IF v_device NOT IN ('MEDIA_PLAYER','MONITOR') THEN
    RETURN jsonb_build_object('success', false, 'error', 'device_type ต้องเป็น MEDIA_PLAYER หรือ MONITOR');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.media_players
    WHERE serial_number_1 = v_sn1
       OR (serial_number_2 IS NOT NULL AND serial_number_2 = v_sn1)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', format('S/N %s มีอยู่แล้วในระบบ', v_sn1));
  END IF;

  IF v_dept IS NOT NULL AND lower(btrim(v_dept)) = lower('7-Eleven Media') THEN
    IF v_sub IS NULL OR NOT (v_sub = ANY(ARRAY['TOPSHELF_1','TOPSHELF_2','TOPSHELF_3','SPECIAL_1','SPECIAL_2','OVERVAULT_1','OVERVAULT_2','OPENTYPE_1','OPENTYPE_2'])) THEN
      RETURN jsonb_build_object('success', false, 'error', 'ฝ่าย 7-Eleven Media ต้องระบุ sub_media_type (TOPSHELF_1..OPENTYPE_2)');
    END IF;
  ELSE
    v_sub := NULL;
  END IF;

  v_status := CASE WHEN v_billboard_id IS NOT NULL THEN 'installed' ELSE 'in_stock' END;

  INSERT INTO public.media_players (
    code, name, description, brand, specification,
    serial_number_1, serial_number_2, model_id, cms_type_id,
    company_id, supplier_id, department, location_id,
    quantity, unit_price, item_condition,
    date_of_receipt, warranty_expiry_date, warranty_years,
    depreciation_months, usage_lifespan_months,
    asset_code, equipment_id_code, remote_name, activate_windows,
    po_number, pr_number, invoice_number, po_item_no,
    order_for_project, asset_caretaker, planned_install_location, notes,
    billboard_id, install_date, status, sub_media_type, device_type,
    created_by, is_active
  ) VALUES (
    v_code, v_name,
    NULLIF(p->>'description',''),
    NULLIF(p->>'brand',''),
    NULLIF(p->>'specification',''),
    v_sn1,
    NULLIF(p->>'serial_number_2',''),
    NULLIF(p->>'model_id','')::uuid,
    NULLIF(p->>'cms_type_id','')::uuid,
    NULLIF(p->>'company_id','')::uuid,
    NULLIF(p->>'supplier_id','')::uuid,
    v_dept,
    CASE WHEN v_billboard_id IS NOT NULL THEN NULL ELSE NULLIF(p->>'location_id','')::uuid END,
    1,
    COALESCE((p->>'unit_price')::numeric, 0),
    COALESCE(NULLIF(p->>'item_condition',''), 'new'),
    COALESCE(NULLIF(p->>'date_of_receipt','')::date, CURRENT_DATE),
    NULLIF(p->>'warranty_expiry_date','')::date,
    NULLIF(p->>'warranty_years','')::numeric,
    COALESCE(NULLIF(p->>'depreciation_months','')::int, 60),
    NULLIF(p->>'usage_lifespan_months','')::int,
    NULLIF(p->>'asset_code',''),
    NULLIF(p->>'equipment_id_code',''),
    NULLIF(p->>'remote_name',''),
    NULLIF(p->>'activate_windows',''),
    NULLIF(p->>'po_number',''),
    NULLIF(p->>'pr_number',''),
    NULLIF(p->>'invoice_number',''),
    NULLIF(p->>'po_item_no',''),
    NULLIF(p->>'order_for_project',''),
    NULLIF(p->>'asset_caretaker',''),
    NULLIF(p->>'planned_install_location',''),
    NULLIF(p->>'notes',''),
    v_billboard_id,
    v_install_date,
    v_status,
    v_sub,
    v_device,
    v_user,
    true
  ) RETURNING id INTO v_mp_id;

  INSERT INTO public.stock_movements (
    equipment_id, equipment_code, equipment_name,
    movement_type, quantity, stock_before, stock_after,
    reference_type, reference_document, location_id,
    company_id, item_condition, created_by, notes
  ) VALUES (
    v_mp_id, v_code, v_name,
    'receive', 1, 0, 1,
    'initial_import', 'INITIAL-IMPORT', NULLIF(p->>'location_id','')::uuid,
    NULLIF(p->>'company_id','')::uuid,
    COALESCE(NULLIF(p->>'item_condition',''), 'new'),
    v_user, 'นำเข้าข้อมูลเริ่มต้น Media Player ผ่าน Import Template'
  );

  IF v_billboard_id IS NOT NULL THEN
    INSERT INTO public.stock_movements (
      equipment_id, equipment_code, equipment_name,
      movement_type, quantity, stock_before, stock_after,
      reference_type, reference_id, reference_document, location_id,
      company_id, item_condition, created_by, notes
    ) VALUES (
      v_mp_id, v_code, v_name,
      'install_to_billboard', 1, 1, 0,
      'billboard', v_billboard_id, 'INITIAL-INSTALL', NULLIF(p->>'location_id','')::uuid,
      NULLIF(p->>'company_id','')::uuid,
      COALESCE(NULLIF(p->>'item_condition',''), 'normal'),
      v_user, 'ติดตั้ง Media Player บนป้ายผ่าน Import Template'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'media_player_id', v_mp_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
