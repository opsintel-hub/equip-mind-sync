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
    'media_player_images','tool_images','tool_documents',
    'equipment','media_players','tools'
  ];
  target text[] := ARRAY[]::text[];
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

  FOREACH t IN ARRAY target LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        counts := counts || jsonb_build_object(t, n);
      END IF;
    END IF;
  END LOOP;

  SELECT string_agg(format('public.%I', x), ', ')
  INTO stmt
  FROM unnest(target) x
  WHERE to_regclass('public.' || quote_ident(x)) IS NOT NULL;

  IF stmt IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || stmt || ' RESTART IDENTITY CASCADE';
  END IF;

  RETURN jsonb_build_object('success', true, 'scopes', _scopes, 'deleted', counts);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_test_operational_data(text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.clear_test_operational_data(text[]) TO authenticated;