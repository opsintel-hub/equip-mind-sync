-- 1. Add columns to equipment
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS billboard_compatibility_mode text NOT NULL DEFAULT 'unrestricted',
  ADD COLUMN IF NOT EXISTS compatibility_notes text;

ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_billboard_compatibility_mode_check;
ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_billboard_compatibility_mode_check
  CHECK (billboard_compatibility_mode IN ('unrestricted','multi_partial','specific'));

-- 2. Compatibility resolved table (billboards that equipment supports)
CREATE TABLE IF NOT EXISTS public.equipment_billboard_compatibility (
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  billboard_id uuid NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  source_package_id uuid REFERENCES public.billboard_packages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipment_id, billboard_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_billboard_compatibility TO authenticated;
GRANT ALL ON public.equipment_billboard_compatibility TO service_role;

ALTER TABLE public.equipment_billboard_compatibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read compat" ON public.equipment_billboard_compatibility;
CREATE POLICY "auth read compat" ON public.equipment_billboard_compatibility
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "warehouse/admin write compat" ON public.equipment_billboard_compatibility;
CREATE POLICY "warehouse/admin write compat" ON public.equipment_billboard_compatibility
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'));

CREATE INDEX IF NOT EXISTS idx_ebc_billboard ON public.equipment_billboard_compatibility(billboard_id);
CREATE INDEX IF NOT EXISTS idx_ebc_source_pkg ON public.equipment_billboard_compatibility(source_package_id);

-- 3. Selected packages
CREATE TABLE IF NOT EXISTS public.equipment_compatibility_packages (
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.billboard_packages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipment_id, package_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_compatibility_packages TO authenticated;
GRANT ALL ON public.equipment_compatibility_packages TO service_role;

ALTER TABLE public.equipment_compatibility_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read compat pkg" ON public.equipment_compatibility_packages;
CREATE POLICY "auth read compat pkg" ON public.equipment_compatibility_packages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "warehouse/admin write compat pkg" ON public.equipment_compatibility_packages;
CREATE POLICY "warehouse/admin write compat pkg" ON public.equipment_compatibility_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_function_permission(auth.uid(),'goods_receipt'));

CREATE INDEX IF NOT EXISTS idx_ecp_pkg ON public.equipment_compatibility_packages(package_id);

-- 4. Save function
CREATE OR REPLACE FUNCTION public.save_equipment_compatibility(
  _equipment_id uuid,
  _mode text,
  _package_ids uuid[],
  _billboard_ids uuid[],
  _notes text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count int;
BEGIN
  IF NOT (public.has_role(v_user,'admin') OR public.has_function_permission(v_user,'goods_receipt')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF _mode NOT IN ('unrestricted','multi_partial','specific') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_mode');
  END IF;

  UPDATE public.equipment
     SET billboard_compatibility_mode = _mode,
         compatibility_notes = NULLIF(btrim(coalesce(_notes,'')), ''),
         updated_at = now()
   WHERE id = _equipment_id;

  DELETE FROM public.equipment_compatibility_packages WHERE equipment_id = _equipment_id;
  DELETE FROM public.equipment_billboard_compatibility WHERE equipment_id = _equipment_id;

  IF _mode = 'unrestricted' THEN
    RETURN jsonb_build_object('success', true, 'resolved_count', 0);
  END IF;

  IF _package_ids IS NOT NULL AND array_length(_package_ids, 1) > 0 THEN
    INSERT INTO public.equipment_compatibility_packages (equipment_id, package_id)
    SELECT _equipment_id, unnest(_package_ids)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.equipment_billboard_compatibility (equipment_id, billboard_id, source, source_package_id)
    SELECT DISTINCT _equipment_id, bpi.billboard_id, 'package', bpi.package_id
      FROM public.billboard_package_items bpi
     WHERE bpi.package_id = ANY(_package_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  IF _billboard_ids IS NOT NULL AND array_length(_billboard_ids, 1) > 0 THEN
    INSERT INTO public.equipment_billboard_compatibility (equipment_id, billboard_id, source, source_package_id)
    SELECT _equipment_id, unnest(_billboard_ids), 'manual', NULL
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.equipment_billboard_compatibility
   WHERE equipment_id = _equipment_id;

  RETURN jsonb_build_object('success', true, 'resolved_count', v_count);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Trigger: keep compat set in sync when billboard_package_items changes
CREATE OR REPLACE FUNCTION public.sync_equipment_compatibility_on_pkg_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg_id uuid;
  v_bb_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_pkg_id := NEW.package_id;
    v_bb_id := NEW.billboard_id;
    -- Add this billboard to every equipment that links to this package
    INSERT INTO public.equipment_billboard_compatibility (equipment_id, billboard_id, source, source_package_id)
    SELECT ecp.equipment_id, v_bb_id, 'package', v_pkg_id
      FROM public.equipment_compatibility_packages ecp
     WHERE ecp.package_id = v_pkg_id
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_pkg_id := OLD.package_id;
    v_bb_id := OLD.billboard_id;
    -- Remove only rows sourced from THIS package. If equipment also selected the billboard manually or via another package, keep them.
    DELETE FROM public.equipment_billboard_compatibility ebc
     WHERE ebc.billboard_id = v_bb_id
       AND ebc.source = 'package'
       AND ebc.source_package_id = v_pkg_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_compat_on_pkg_items ON public.billboard_package_items;
CREATE TRIGGER trg_sync_compat_on_pkg_items
AFTER INSERT OR DELETE ON public.billboard_package_items
FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_compatibility_on_pkg_change();

-- 6. Update import_equipment_row RPC to accept compatibility params
CREATE OR REPLACE FUNCTION public.import_equipment_row(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_equipment_id uuid;
  v_code text := nullif(btrim(p->>'code'), '');
  v_name text := nullif(btrim(p->>'name'), '');
  v_qty int := COALESCE((p->>'quantity_in_stock')::int, 0);
  v_billboard_id uuid := NULLIF(p->>'billboard_id','')::uuid;
  v_install_qty int := COALESCE((p->>'install_quantity')::int, 0);
  v_install_date date := NULLIF(p->>'install_date','')::date;
  v_compat_mode text := COALESCE(NULLIF(p->>'compatibility_mode',''), 'unrestricted');
  v_compat_pkg_ids uuid[];
  v_compat_bb_ids uuid[];
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

  IF v_compat_mode NOT IN ('unrestricted','multi_partial','specific') THEN
    v_compat_mode := 'unrestricted';
  END IF;

  IF p ? 'compatible_package_ids' THEN
    SELECT array_agg((x)::uuid) INTO v_compat_pkg_ids
      FROM jsonb_array_elements_text(p->'compatible_package_ids') x
     WHERE x IS NOT NULL AND btrim(x) <> '';
  END IF;
  IF p ? 'compatible_billboard_ids' THEN
    SELECT array_agg((x)::uuid) INTO v_compat_bb_ids
      FROM jsonb_array_elements_text(p->'compatible_billboard_ids') x
     WHERE x IS NOT NULL AND btrim(x) <> '';
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
    notes, created_by, is_active,
    billboard_compatibility_mode, compatibility_notes
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
    true,
    v_compat_mode,
    NULLIF(p->>'compatibility_notes','')
  ) RETURNING id INTO v_equipment_id;

  -- Save compatibility if applicable
  IF v_compat_mode <> 'unrestricted' THEN
    PERFORM public.save_equipment_compatibility(
      v_equipment_id,
      v_compat_mode,
      COALESCE(v_compat_pkg_ids, ARRAY[]::uuid[]),
      COALESCE(v_compat_bb_ids, ARRAY[]::uuid[]),
      NULLIF(p->>'compatibility_notes','')
    );
  END IF;

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
$function$;