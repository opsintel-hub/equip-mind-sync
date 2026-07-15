
-- Full data reset. Truncates all operational and master data.
-- Preserves: auth.users, profiles, user_roles, user_departments, user_function_permissions, permission_templates,
--            billboards, billboard_packages, billboard_package_items, billboard_pm_*, billboard_sync_logs,
--            ad_*, advertisements, admin_guide_entries, system_settings, notification_settings, external_db_connections

TRUNCATE TABLE
  -- transactional
  public.stock_movements,
  public.low_stock_alerts,
  public.purchase_requests,
  public.goods_receipt,
  public.goods_receipt_pending,
  public.goods_issue,
  public.goods_issue_pending_items,
  public.goods_issue_pending,
  public.delivery_confirmations,
  public.direct_shipment_items,
  public.direct_shipments,
  public.defective_returns,
  public.claim_progress_logs,
  public.claim_records,
  public.assessment_logs,
  public.swap_executions,
  public.swap_requests,
  public.billboard_equipment,
  public.billboard_equipment_history,
  public.notifications,
  public.notification_dismissals,
  -- equipment
  public.equipment_serial_numbers,
  public.equipment_images,
  public.equipment_billboard_compatibility,
  public.equipment_compatibility_packages,
  public.equipment_transfers,
  public.equipment_loans,
  public.equipment_pm_task_images,
  public.equipment_pm_tasks,
  public.equipment_pm_schedules,
  public.equipment_pm_history,
  public.equipment,
  -- tools
  public.technician_tools,
  public.tool_pm_task_images,
  public.tool_pm_tasks,
  public.tool_pm_history,
  public.tools,
  -- media players
  public.media_player_images,
  public.media_player_billboard_history,
  public.media_player_serial_history,
  public.media_players,
  -- master data
  public.categories,
  public.subcategories,
  public.brands,
  public.suppliers,
  public.companies,
  public.departments,
  public.locations,
  public.warehouses,
  public.sections,
  public.storage_slots,
  public.sub_storage_slots,
  public.units,
  public.contractors,
  public.technicians,
  public.equipment_code_prefixes,
  public.tool_code_prefixes,
  public.media_player_code_prefixes,
  public.media_player_models,
  public.media_player_names,
  public.media_player_specifications,
  public.media_player_statuses,
  public.cms_types,
  public.issue_purpose_categories,
  public.issue_purposes,
  public.receipt_purposes,
  public.tool_categories,
  public.tool_pm_types,
  public.pm_types,
  public.pm_action_types,
  public.pm_results,
  public.pm_schedules,
  public.pm_history,
  public.repair_actions,
  public.mp_symptoms,
  public.mp_assessment_results,
  public.mp_claim_results,
  public.mp_swap_reject_reasons
RESTART IDENTITY CASCADE;

-- Reset document number sequences
DO $$
DECLARE
  s text;
BEGIN
  FOR s IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I RESTART WITH 1', s);
  END LOOP;
END $$;
