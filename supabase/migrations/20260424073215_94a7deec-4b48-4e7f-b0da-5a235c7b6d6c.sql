-- =====================================================
-- Security Hardening: Replace "true" RLS policies with auth check
-- =====================================================

-- assessment_logs
DROP POLICY IF EXISTS "Authenticated can insert assessment logs" ON public.assessment_logs;
CREATE POLICY "Authenticated can insert assessment logs" ON public.assessment_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update assessment logs" ON public.assessment_logs;
CREATE POLICY "Authenticated can update assessment logs" ON public.assessment_logs
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- billboard_package_items
DROP POLICY IF EXISTS "Authenticated users can insert billboard_package_items" ON public.billboard_package_items;
CREATE POLICY "Authenticated users can insert billboard_package_items" ON public.billboard_package_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete billboard_package_items" ON public.billboard_package_items;
CREATE POLICY "Authenticated users can delete billboard_package_items" ON public.billboard_package_items
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- billboard_packages
DROP POLICY IF EXISTS "Authenticated users can insert billboard_packages" ON public.billboard_packages;
CREATE POLICY "Authenticated users can insert billboard_packages" ON public.billboard_packages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update billboard_packages" ON public.billboard_packages;
CREATE POLICY "Authenticated users can update billboard_packages" ON public.billboard_packages
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete billboard_packages" ON public.billboard_packages;
CREATE POLICY "Authenticated users can delete billboard_packages" ON public.billboard_packages
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- billboard_pm_actions
DROP POLICY IF EXISTS "Authenticated users can insert billboard_pm_actions" ON public.billboard_pm_actions;
CREATE POLICY "Authenticated users can insert billboard_pm_actions" ON public.billboard_pm_actions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- billboard_pm_history
DROP POLICY IF EXISTS "Authenticated users can insert billboard_pm_history" ON public.billboard_pm_history;
CREATE POLICY "Authenticated users can insert billboard_pm_history" ON public.billboard_pm_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- brands
DROP POLICY IF EXISTS "Brands can be created by authenticated users" ON public.brands;
CREATE POLICY "Brands can be created by authenticated users" ON public.brands
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Brands can be updated by authenticated users" ON public.brands;
CREATE POLICY "Brands can be updated by authenticated users" ON public.brands
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Brands can be deleted by authenticated users" ON public.brands;
CREATE POLICY "Brands can be deleted by authenticated users" ON public.brands
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- claim_records
DROP POLICY IF EXISTS "Authenticated users can create claim records" ON public.claim_records;
CREATE POLICY "Authenticated users can create claim records" ON public.claim_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update claim records" ON public.claim_records;
CREATE POLICY "Authenticated users can update claim records" ON public.claim_records
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- contractors
DROP POLICY IF EXISTS "Allow authenticated users to insert contractors" ON public.contractors;
CREATE POLICY "Allow authenticated users to insert contractors" ON public.contractors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to update contractors" ON public.contractors;
CREATE POLICY "Allow authenticated users to update contractors" ON public.contractors
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to delete contractors" ON public.contractors;
CREATE POLICY "Allow authenticated users to delete contractors" ON public.contractors
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- delivery_confirmations
DROP POLICY IF EXISTS "Authenticated users can insert delivery confirmations" ON public.delivery_confirmations;
CREATE POLICY "Authenticated users can insert delivery confirmations" ON public.delivery_confirmations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update delivery confirmations" ON public.delivery_confirmations;
CREATE POLICY "Authenticated users can update delivery confirmations" ON public.delivery_confirmations
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- equipment_code_prefixes
DROP POLICY IF EXISTS "Allow authenticated users to insert equipment code prefixes" ON public.equipment_code_prefixes;
CREATE POLICY "Allow authenticated users to insert equipment code prefixes" ON public.equipment_code_prefixes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to update equipment code prefixes" ON public.equipment_code_prefixes;
CREATE POLICY "Allow authenticated users to update equipment code prefixes" ON public.equipment_code_prefixes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment code prefixes" ON public.equipment_code_prefixes;
CREATE POLICY "Allow authenticated users to delete equipment code prefixes" ON public.equipment_code_prefixes
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- equipment_images
DROP POLICY IF EXISTS "Authenticated users can insert equipment images" ON public.equipment_images;
CREATE POLICY "Authenticated users can insert equipment images" ON public.equipment_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update equipment images" ON public.equipment_images;
CREATE POLICY "Authenticated users can update equipment images" ON public.equipment_images
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete equipment images" ON public.equipment_images;
CREATE POLICY "Authenticated users can delete equipment images" ON public.equipment_images
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- equipment_pm_history
DROP POLICY IF EXISTS "Users can create equipment_pm_history" ON public.equipment_pm_history;
CREATE POLICY "Users can create equipment_pm_history" ON public.equipment_pm_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- equipment_pm_schedules
DROP POLICY IF EXISTS "Users can create equipment_pm_schedules" ON public.equipment_pm_schedules;
CREATE POLICY "Users can create equipment_pm_schedules" ON public.equipment_pm_schedules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update equipment_pm_schedules" ON public.equipment_pm_schedules;
CREATE POLICY "Users can update equipment_pm_schedules" ON public.equipment_pm_schedules
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete equipment_pm_schedules" ON public.equipment_pm_schedules;
CREATE POLICY "Users can delete equipment_pm_schedules" ON public.equipment_pm_schedules
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- equipment_pm_task_images
DROP POLICY IF EXISTS "Allow authenticated users to insert equipment_pm_task_images" ON public.equipment_pm_task_images;
CREATE POLICY "Allow authenticated users to insert equipment_pm_task_images" ON public.equipment_pm_task_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment_pm_task_images" ON public.equipment_pm_task_images;
CREATE POLICY "Allow authenticated users to delete equipment_pm_task_images" ON public.equipment_pm_task_images
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- equipment_pm_tasks
DROP POLICY IF EXISTS "Allow authenticated users to insert equipment_pm_tasks" ON public.equipment_pm_tasks;
CREATE POLICY "Allow authenticated users to insert equipment_pm_tasks" ON public.equipment_pm_tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to update equipment_pm_tasks" ON public.equipment_pm_tasks;
CREATE POLICY "Allow authenticated users to update equipment_pm_tasks" ON public.equipment_pm_tasks
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment_pm_tasks" ON public.equipment_pm_tasks;
CREATE POLICY "Allow authenticated users to delete equipment_pm_tasks" ON public.equipment_pm_tasks
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- equipment_serial_numbers
DROP POLICY IF EXISTS "Authenticated users can insert serial numbers" ON public.equipment_serial_numbers;
CREATE POLICY "Authenticated users can insert serial numbers" ON public.equipment_serial_numbers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update serial numbers" ON public.equipment_serial_numbers;
CREATE POLICY "Authenticated users can update serial numbers" ON public.equipment_serial_numbers
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- goods_issue_pending
DROP POLICY IF EXISTS "Authenticated users can create issue requests" ON public.goods_issue_pending;
CREATE POLICY "Authenticated users can create issue requests" ON public.goods_issue_pending
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- goods_receipt_pending
DROP POLICY IF EXISTS "Authenticated users can create pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Authenticated users can create pending receipts" ON public.goods_receipt_pending
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- media_player_billboard_history
DROP POLICY IF EXISTS "Authenticated users can insert media player billboard history" ON public.media_player_billboard_history;
CREATE POLICY "Authenticated users can insert media player billboard history" ON public.media_player_billboard_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- media_player_code_prefixes
DROP POLICY IF EXISTS "Allow authenticated users to insert media_player_code_prefixes" ON public.media_player_code_prefixes;
CREATE POLICY "Allow authenticated users to insert media_player_code_prefixes" ON public.media_player_code_prefixes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to update media_player_code_prefixes" ON public.media_player_code_prefixes;
CREATE POLICY "Allow authenticated users to update media_player_code_prefixes" ON public.media_player_code_prefixes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to delete media_player_code_prefixes" ON public.media_player_code_prefixes;
CREATE POLICY "Allow authenticated users to delete media_player_code_prefixes" ON public.media_player_code_prefixes
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- media_player_images
DROP POLICY IF EXISTS "Authenticated users can insert media player images" ON public.media_player_images;
CREATE POLICY "Authenticated users can insert media player images" ON public.media_player_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update media player images" ON public.media_player_images;
CREATE POLICY "Authenticated users can update media player images" ON public.media_player_images
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete media player images" ON public.media_player_images;
CREATE POLICY "Authenticated users can delete media player images" ON public.media_player_images
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- pm_history
DROP POLICY IF EXISTS "Users can create pm_history" ON public.pm_history;
CREATE POLICY "Users can create pm_history" ON public.pm_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- pm_schedules
DROP POLICY IF EXISTS "Users can create pm_schedules" ON public.pm_schedules;
CREATE POLICY "Users can create pm_schedules" ON public.pm_schedules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update pm_schedules" ON public.pm_schedules;
CREATE POLICY "Users can update pm_schedules" ON public.pm_schedules
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete pm_schedules" ON public.pm_schedules;
CREATE POLICY "Users can delete pm_schedules" ON public.pm_schedules
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- receipt_purposes
DROP POLICY IF EXISTS "Allow authenticated users to insert receipt_purposes" ON public.receipt_purposes;
CREATE POLICY "Allow authenticated users to insert receipt_purposes" ON public.receipt_purposes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to update receipt_purposes" ON public.receipt_purposes;
CREATE POLICY "Allow authenticated users to update receipt_purposes" ON public.receipt_purposes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Allow authenticated users to delete receipt_purposes" ON public.receipt_purposes;
CREATE POLICY "Allow authenticated users to delete receipt_purposes" ON public.receipt_purposes
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- tool_pm_history
DROP POLICY IF EXISTS "All authenticated users can create tool_pm_history" ON public.tool_pm_history;
CREATE POLICY "All authenticated users can create tool_pm_history" ON public.tool_pm_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- units
DROP POLICY IF EXISTS "Authenticated users can insert units" ON public.units;
CREATE POLICY "Authenticated users can insert units" ON public.units
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update units" ON public.units;
CREATE POLICY "Authenticated users can update units" ON public.units
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete units" ON public.units;
CREATE POLICY "Authenticated users can delete units" ON public.units
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Fix function search_path (2 functions)
-- =====================================================
ALTER FUNCTION public.create_next_tool_pm_task() SET search_path = public;
ALTER FUNCTION public.generate_tool_pm_task_number() SET search_path = public;