
-- ============================================================
-- import_equipment_row: create equipment + stock + optional install
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_equipment_row(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_equipment_id uuid;
  v_code text := nullif(btrim(p->>'code'), '');
  v_name text := nullif(btrim(p->>'name'), '');
  v_qty int := COALESCE((p->>'quantity_in_stock')::int, 0);
  v_billboard_id uuid := NULLIF(p->>'billboard_id','')::uuid;
  v_install_qty int := COALESCE((p->>'install_quantity')::int, 0);
  v_install_date date := NULLIF(p->>'install_date','')::date;
BEGIN
  IF NOT (public.has_role(v_user,'admin') OR public.has_role(v_user,'super_admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF v_code IS NULL OR v_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'code and name are required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.equipment WHERE code = v_code) THEN
    RETURN jsonb_build_object('success', false, 'error', format('รหัส %s มีอยู่แล้วในระบบ', v_code));
  END IF;

  INSERT INTO public.equipment (
    code, name, description, category, subcategory_id, unit,
    brand, supplier_id, company_id, department, location_id,
    quantity_in_stock, min_stock_level, unit_price, item_condition,
    warehouse_entry_date, warranty_expiry_date, warranty_years,
    serial_number, asset_code, equipment_id_code, is_asset, depreciation_months,
    volt, amp, watt, lumen, lux,
    width_cm, height_cm, depth_cm,
    po_number, pr_number, invoice_number, po_item_no,
    notes, created_by, is_active
  ) VALUES (
    v_code,
    v_name,
    NULLIF(p->>'description',''),
    COALESCE(NULLIF(p->>'category',''), 'อื่นๆ'),
    NULLIF(p->>'subcategory_id','')::uuid,
    COALESCE(NULLIF(p->>'unit',''), 'ชิ้น'),
    NULLIF(p->>'brand',''),
    NULLIF(p->>'supplier_id','')::uuid,
    NULLIF(p->>'company_id','')::uuid,
    NULLIF(p->>'department',''),
    NULLIF(p->>'location_id','')::uuid,
    v_qty,
    NULLIF(p->>'min_stock_level','')::int,
    COALESCE((p->>'unit_price')::numeric, 0),
    COALESCE(NULLIF(p->>'item_condition',''), 'new'),
    COALESCE(NULLIF(p->>'warehouse_entry_date','')::date, CURRENT_DATE),
    NULLIF(p->>'warranty_expiry_date','')::date,
    NULLIF(p->>'warranty_years','')::numeric,
    NULLIF(p->>'serial_number',''),
    NULLIF(p->>'asset_code',''),
    NULLIF(p->>'equipment_id_code',''),
    COALESCE((p->>'is_asset')::boolean, false),
    NULLIF(p->>'depreciation_months','')::int,
    NULLIF(p->>'volt','')::numeric,
    NULLIF(p->>'amp','')::numeric,
    NULLIF(p->>'watt','')::numeric,
    NULLIF(p->>'lumen','')::numeric,
    NULLIF(p->>'lux','')::numeric,
    NULLIF(p->>'width_cm','')::numeric,
    NULLIF(p->>'height_cm','')::numeric,
    NULLIF(p->>'depth_cm','')::numeric,
    NULLIF(p->>'po_number',''),
    NULLIF(p->>'pr_number',''),
    NULLIF(p->>'invoice_number',''),
    NULLIF(p->>'po_item_no',''),
    NULLIF(p->>'notes',''),
    v_user,
    true
  ) RETURNING id INTO v_equipment_id;

  -- Stock receive movement
  IF v_qty > 0 THEN
    INSERT INTO public.stock_movements (
      equipment_id, equipment_code, equipment_name,
      movement_type, quantity, stock_before, stock_after,
      reference_type, reference_document, location_id,
      company_id, item_condition, created_by, notes
    ) VALUES (
      v_equipment_id, v_code, v_name,
      'receive', v_qty, 0, v_qty,
      'initial_import', 'INITIAL-IMPORT', NULLIF(p->>'location_id','')::uuid,
      NULLIF(p->>'company_id','')::uuid,
      COALESCE(NULLIF(p->>'item_condition',''), 'new'),
      v_user, 'นำเข้าข้อมูลเริ่มต้นผ่าน Import Template'
    );
  END IF;

  -- Optional install on billboard
  IF v_billboard_id IS NOT NULL AND v_install_qty > 0 THEN
    IF v_install_qty > v_qty THEN
      RETURN jsonb_build_object('success', false, 'error', 'install_quantity เกินกว่า quantity_in_stock');
    END IF;

    INSERT INTO public.billboard_equipment (
      billboard_id, equipment_id, quantity, installation_date,
      serial_number, item_condition, created_by, notes
    ) VALUES (
      v_billboard_id, v_equipment_id, v_install_qty, COALESCE(v_install_date, CURRENT_DATE),
      NULLIF(p->>'serial_number',''),
      COALESCE(NULLIF(p->>'item_condition',''), 'normal'),
      v_user, 'นำเข้าและติดตั้งครั้งแรกผ่าน Import Template'
    );

    UPDATE public.equipment
      SET quantity_in_stock = quantity_in_stock - v_install_qty
      WHERE id = v_equipment_id;

    INSERT INTO public.stock_movements (
      equipment_id, equipment_code, equipment_name,
      movement_type, quantity, stock_before, stock_after,
      reference_type, reference_id, reference_document, location_id,
      company_id, item_condition, created_by, notes
    ) VALUES (
      v_equipment_id, v_code, v_name,
      'install_to_billboard', v_install_qty, v_qty, v_qty - v_install_qty,
      'billboard', v_billboard_id, 'INITIAL-INSTALL', NULLIF(p->>'location_id','')::uuid,
      NULLIF(p->>'company_id','')::uuid,
      COALESCE(NULLIF(p->>'item_condition',''), 'normal'),
      v_user, 'ติดตั้งบนป้ายผ่าน Import Template'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'equipment_id', v_equipment_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_equipment_row(jsonb) TO authenticated;

-- ============================================================
-- import_media_player_row: create MP + stock + optional install
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_media_player_row(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_mp_id uuid;
  v_code text := nullif(btrim(p->>'code'), '');
  v_name text := nullif(btrim(p->>'name'), '');
  v_sn1 text := nullif(btrim(p->>'serial_number_1'), '');
  v_billboard_id uuid := NULLIF(p->>'billboard_id','')::uuid;
  v_install_date date := NULLIF(p->>'install_date','')::date;
  v_status text;
BEGIN
  IF NOT (public.has_role(v_user,'admin') OR public.has_role(v_user,'super_admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF v_code IS NULL OR v_name IS NULL OR v_sn1 IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'code, name and serial_number_1 are required');
  END IF;

  -- Duplicate S/N check (across all MPs)
  IF EXISTS (
    SELECT 1 FROM public.media_players
    WHERE serial_number_1 = v_sn1
       OR (serial_number_2 IS NOT NULL AND serial_number_2 = v_sn1)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', format('S/N %s มีอยู่แล้วในระบบ', v_sn1));
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
    billboard_id, install_date, status,
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
    NULLIF(p->>'department',''),
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
    v_user,
    true
  ) RETURNING id INTO v_mp_id;

  -- Stock receive movement
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

  -- Optional install
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
$$;

GRANT EXECUTE ON FUNCTION public.import_media_player_row(jsonb) TO authenticated;
