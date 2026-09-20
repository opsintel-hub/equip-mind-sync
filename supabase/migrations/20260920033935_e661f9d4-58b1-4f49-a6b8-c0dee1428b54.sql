CREATE OR REPLACE FUNCTION public.sync_code_prefix_counters(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src text;
  v_tbl text;
  v_created int := 0;
  v_updated int := 0;
  v_exists boolean;
  v_rows int;
  r record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'warehouse_staff')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF _kind = 'equipment' THEN
    v_src := 'public.equipment'; v_tbl := 'public.equipment_code_prefixes';
  ELSIF _kind = 'tool' THEN
    v_src := 'public.tools'; v_tbl := 'public.tool_code_prefixes';
  ELSIF _kind = 'media_player' THEN
    v_src := 'public.media_players'; v_tbl := 'public.media_player_code_prefixes';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid kind');
  END IF;

  FOR r IN EXECUTE format($q$
    SELECT btrim((regexp_match(code, '^(.*?)[ -]?([0-9]{3,})$'))[1]) AS pfx,
           MAX(((regexp_match(code, '^(.*?)[ -]?([0-9]{3,})$'))[2])::bigint) AS maxnum
      FROM %s
     WHERE code ~ '^(.*?)[ -]?[0-9]{3,}$'
     GROUP BY 1
    $q$, v_src)
  LOOP
    CONTINUE WHEN r.pfx IS NULL OR r.pfx = '' OR length(r.pfx) > 7 OR r.maxnum IS NULL OR r.maxnum > 999999;

    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE prefix = $1)', v_tbl)
      INTO v_exists USING r.pfx;

    IF v_exists THEN
      EXECUTE format('UPDATE %s SET next_number = $2 WHERE prefix = $1 AND next_number < $2', v_tbl)
        USING r.pfx, (r.maxnum + 1)::int;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows > 0 THEN v_updated := v_updated + 1; END IF;
    ELSE
      EXECUTE format('INSERT INTO %s (prefix, description, next_number, is_active) VALUES ($1, $2, $3, true) ON CONFLICT (prefix) DO UPDATE SET next_number = GREATEST(%s.next_number, EXCLUDED.next_number), is_active = true', v_tbl, v_tbl)
        USING r.pfx, 'สร้างอัตโนมัติจากการนำเข้าข้อมูล', (r.maxnum + 1)::int;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows > 0 THEN v_created := v_created + 1; END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'kind', _kind, 'created', v_created, 'updated', v_updated);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_test_operational_data(_scopes text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx_tables text[] := ARRAY[
    'delivery_confirmations','goods_issue','goods_issue_pending_items','goods_issue_pending',
    'goods_receipt','goods_receipt_pending','direct_shipment_items','direct_shipments',
    'stock_movements','equipment_transfers','purchase_requests','low_stock_alerts',
    'defective_disposal_audit','defective_returns','swap_executions','swap_requests',
    'assessment_logs','claim_progress_logs','claim_records','equipment_loans',
    'media_player_billboard_history','media_player_serial_history',
    'billboard_equipment_history','billboard_equipment',
    'billboard_pm_history','billboard_pm_actions','billboard_sync_logs',
    'equipment_pm_task_images','equipment_pm_tasks','equipment_pm_history',
    'tool_pm_task_images','tool_pm_tasks','tool_pm_history',
    'pm_history','notification_dismissals','notifications','activity_audit'
  ];
  ads_tables text[] := ARRAY['ad_issue_requests','ad_versions','ad_target_billboards','advertisements'];
  item_tables text[] := ARRAY[
    'equipment_images','equipment_serial_numbers','equipment_billboard_compatibility',
    'equipment_compatibility_packages','equipment_pm_schedules','pm_schedules',
    'media_player_images','tool_images','tool_documents','stock_location_allocations',
    'equipment','media_players','tools'
  ];
  target text[] := ARRAY[]::text[];
  cascaded text[];
  t text;
  n bigint;
  counts jsonb := '{}'::jsonb;
  stmt text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  IF _scopes IS NULL OR array_length(_scopes, 1) IS NULL THEN
    RAISE EXCEPTION 'no scope selected';
  END IF;

  IF 'transactions' = ANY(_scopes) THEN target := target || tx_tables; END IF;
  IF 'ads' = ANY(_scopes) THEN target := target || ads_tables; END IF;
  IF 'items' = ANY(_scopes) THEN target := target || item_tables; END IF;

  IF array_length(target, 1) IS NULL THEN
    RAISE EXCEPTION 'no scope selected';
  END IF;

  -- keep only tables that actually exist
  SELECT coalesce(array_agg(DISTINCT x), ARRAY[]::text[]) INTO target
  FROM unnest(target) x
  WHERE to_regclass('public.' || quote_ident(x)) IS NOT NULL;

  -- find every table that TRUNCATE ... CASCADE would also wipe (transitive FK closure)
  WITH RECURSIVE dep AS (
    SELECT x AS tbl FROM unnest(target) x
    UNION
    SELECT c.relname::text
    FROM pg_constraint fk
    JOIN pg_class c ON c.oid = fk.conrelid
    JOIN pg_class p ON p.oid = fk.confrelid
    JOIN pg_namespace nc ON nc.oid = c.relnamespace AND nc.nspname = 'public'
    JOIN pg_namespace np ON np.oid = p.relnamespace AND np.nspname = 'public'
    JOIN dep d ON d.tbl = p.relname::text
    WHERE fk.contype = 'f' AND c.relname::text <> p.relname::text
  )
  SELECT coalesce(array_agg(DISTINCT tbl), ARRAY[]::text[]) INTO cascaded
  FROM dep
  WHERE NOT (tbl = ANY(target));

  IF array_length(cascaded, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'scope_incomplete: การลบตามตัวเลือกที่เลือกจะทำให้ตารางอื่นถูกลบตามไปด้วย (%) กรุณาเลือกกลุ่มข้อมูลธุรกรรม/ภาพโฆษณาเพิ่มให้ครบก่อน', array_to_string(cascaded, ', ');
  END IF;

  FOREACH t IN ARRAY target LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
    IF n > 0 THEN
      counts := counts || jsonb_build_object(t, n);
    END IF;
  END LOOP;

  SELECT string_agg(format('public.%I', x), ', ') INTO stmt FROM unnest(target) x;

  IF stmt IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || stmt || ' RESTART IDENTITY CASCADE';
  END IF;

  RETURN jsonb_build_object('success', true, 'scopes', _scopes, 'deleted', counts);
END;
$$;