
-- Helper predicate reused inline: staff = admin/super_admin/warehouse_staff
-- Receiver added where receiver participates.

-- =====================================================================
-- Ad configuration tables
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage ad_target_billboards" ON public.ad_target_billboards;
CREATE POLICY "Staff can view ad_target_billboards" ON public.ad_target_billboards
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage ad_target_billboards" ON public.ad_target_billboards
  FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

DROP POLICY IF EXISTS "Authenticated users can manage ad_versions" ON public.ad_versions;
CREATE POLICY "Auth can view ad_versions" ON public.ad_versions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage ad_versions" ON public.ad_versions
  FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

DROP POLICY IF EXISTS "Authenticated users can manage ad_media_types" ON public.ad_media_types;
CREATE POLICY "Auth can view ad_media_types" ON public.ad_media_types
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage ad_media_types" ON public.ad_media_types
  FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Authenticated users can manage ad_sizes" ON public.ad_sizes;
CREATE POLICY "Auth can view ad_sizes" ON public.ad_sizes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage ad_sizes" ON public.ad_sizes
  FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- =====================================================================
-- Advertisements: split view (auth) from write (staff/receiver)
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage advertisements" ON public.advertisements;
CREATE POLICY "Auth can view advertisements" ON public.advertisements
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage advertisements" ON public.advertisements
  FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

-- =====================================================================
-- PM & billboard history inserts
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can insert billboard_pm_actions" ON public.billboard_pm_actions;
CREATE POLICY "Staff can insert billboard_pm_actions" ON public.billboard_pm_actions
  FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

DROP POLICY IF EXISTS "Authenticated users can insert billboard_pm_history" ON public.billboard_pm_history;
CREATE POLICY "Staff can insert billboard_pm_history" ON public.billboard_pm_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

DROP POLICY IF EXISTS "Authenticated users can insert media player billboard history" ON public.media_player_billboard_history;
DROP POLICY IF EXISTS "Authenticated users can update media player billboard history" ON public.media_player_billboard_history;
DROP POLICY IF EXISTS "Authenticated users can delete media player billboard history" ON public.media_player_billboard_history;
CREATE POLICY "Staff can insert mp billboard history" ON public.media_player_billboard_history
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));
CREATE POLICY "Staff can update mp billboard history" ON public.media_player_billboard_history
  FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));
CREATE POLICY "Admins can delete mp billboard history" ON public.media_player_billboard_history
  FOR DELETE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- =====================================================================
-- Generic reference/master-data tables: writes -> staff only
-- =====================================================================

-- units
DROP POLICY IF EXISTS "Authenticated users can insert units" ON public.units;
DROP POLICY IF EXISTS "Authenticated users can update units" ON public.units;
DROP POLICY IF EXISTS "Authenticated users can delete units" ON public.units;
CREATE POLICY "Staff can manage units" ON public.units
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- brands
DROP POLICY IF EXISTS "Brands can be created by authenticated users" ON public.brands;
DROP POLICY IF EXISTS "Brands can be updated by authenticated users" ON public.brands;
DROP POLICY IF EXISTS "Brands can be deleted by authenticated users" ON public.brands;
CREATE POLICY "Staff can manage brands" ON public.brands
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- equipment_images
DROP POLICY IF EXISTS "Authenticated users can insert equipment images" ON public.equipment_images;
DROP POLICY IF EXISTS "Authenticated users can update equipment images" ON public.equipment_images;
DROP POLICY IF EXISTS "Authenticated users can delete equipment images" ON public.equipment_images;
CREATE POLICY "Staff can manage equipment_images" ON public.equipment_images
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

-- equipment_code_prefixes
DROP POLICY IF EXISTS "Allow authenticated users to insert equipment code prefixes" ON public.equipment_code_prefixes;
DROP POLICY IF EXISTS "Allow authenticated users to update equipment code prefixes" ON public.equipment_code_prefixes;
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment code prefixes" ON public.equipment_code_prefixes;
CREATE POLICY "Staff can manage equipment_code_prefixes" ON public.equipment_code_prefixes
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- media_player_code_prefixes
DROP POLICY IF EXISTS "Allow authenticated users to insert media_player_code_prefixes" ON public.media_player_code_prefixes;
DROP POLICY IF EXISTS "Allow authenticated users to update media_player_code_prefixes" ON public.media_player_code_prefixes;
DROP POLICY IF EXISTS "Allow authenticated users to delete media_player_code_prefixes" ON public.media_player_code_prefixes;
CREATE POLICY "Staff can manage media_player_code_prefixes" ON public.media_player_code_prefixes
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- contractors
DROP POLICY IF EXISTS "Allow authenticated users to insert contractors" ON public.contractors;
DROP POLICY IF EXISTS "Allow authenticated users to update contractors" ON public.contractors;
DROP POLICY IF EXISTS "Allow authenticated users to delete contractors" ON public.contractors;
CREATE POLICY "Staff can manage contractors" ON public.contractors
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- receipt_purposes
DROP POLICY IF EXISTS "Allow authenticated users to insert receipt_purposes" ON public.receipt_purposes;
DROP POLICY IF EXISTS "Allow authenticated users to update receipt_purposes" ON public.receipt_purposes;
DROP POLICY IF EXISTS "Allow authenticated users to delete receipt_purposes" ON public.receipt_purposes;
CREATE POLICY "Staff can manage receipt_purposes" ON public.receipt_purposes
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- billboard_packages
DROP POLICY IF EXISTS "Authenticated users can insert billboard_packages" ON public.billboard_packages;
DROP POLICY IF EXISTS "Authenticated users can update billboard_packages" ON public.billboard_packages;
DROP POLICY IF EXISTS "Authenticated users can delete billboard_packages" ON public.billboard_packages;
CREATE POLICY "Staff can manage billboard_packages" ON public.billboard_packages
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- billboard_package_items
DROP POLICY IF EXISTS "Authenticated users can insert billboard_package_items" ON public.billboard_package_items;
DROP POLICY IF EXISTS "Authenticated users can delete billboard_package_items" ON public.billboard_package_items;
CREATE POLICY "Staff can manage billboard_package_items" ON public.billboard_package_items
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- equipment_serial_numbers
DROP POLICY IF EXISTS "Authenticated users can insert serial numbers" ON public.equipment_serial_numbers;
DROP POLICY IF EXISTS "Authenticated users can update serial numbers" ON public.equipment_serial_numbers;
CREATE POLICY "Staff can manage equipment_serial_numbers" ON public.equipment_serial_numbers
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

-- assessment_logs
DROP POLICY IF EXISTS "Authenticated can insert assessment logs" ON public.assessment_logs;
DROP POLICY IF EXISTS "Authenticated can update assessment logs" ON public.assessment_logs;
CREATE POLICY "Staff can insert assessment_logs" ON public.assessment_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));
CREATE POLICY "Staff can update assessment_logs" ON public.assessment_logs
  FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- claim_records
DROP POLICY IF EXISTS "Authenticated users can create claim records" ON public.claim_records;
DROP POLICY IF EXISTS "Authenticated users can update claim records" ON public.claim_records;
CREATE POLICY "Staff can insert claim_records" ON public.claim_records
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));
CREATE POLICY "Staff can update claim_records" ON public.claim_records
  FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- claim_progress_logs
DROP POLICY IF EXISTS "auth insert progress logs" ON public.claim_progress_logs;
CREATE POLICY "Staff can insert claim_progress_logs" ON public.claim_progress_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- media_player_serial_history
DROP POLICY IF EXISTS "auth insert serial history" ON public.media_player_serial_history;
CREATE POLICY "Staff can insert mp_serial_history" ON public.media_player_serial_history
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- delivery_confirmations
DROP POLICY IF EXISTS "Authenticated users can insert delivery confirmations" ON public.delivery_confirmations;
DROP POLICY IF EXISTS "Authenticated users can update delivery confirmations" ON public.delivery_confirmations;
CREATE POLICY "Staff can insert delivery_confirmations" ON public.delivery_confirmations
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));
CREATE POLICY "Staff can update delivery_confirmations" ON public.delivery_confirmations
  FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

-- goods_receipt_pending (INSERT only; UPDATE and DELETE already restricted)
DROP POLICY IF EXISTS "Authenticated users can create pending receipts" ON public.goods_receipt_pending;
CREATE POLICY "Staff can create pending receipts" ON public.goods_receipt_pending
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver'));

-- equipment_pm_schedules
DROP POLICY IF EXISTS "Users can create equipment_pm_schedules" ON public.equipment_pm_schedules;
DROP POLICY IF EXISTS "Users can update equipment_pm_schedules" ON public.equipment_pm_schedules;
DROP POLICY IF EXISTS "Users can delete equipment_pm_schedules" ON public.equipment_pm_schedules;
CREATE POLICY "Staff can manage equipment_pm_schedules" ON public.equipment_pm_schedules
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- equipment_pm_tasks
DROP POLICY IF EXISTS "Allow authenticated users to insert equipment_pm_tasks" ON public.equipment_pm_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update equipment_pm_tasks" ON public.equipment_pm_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment_pm_tasks" ON public.equipment_pm_tasks;
CREATE POLICY "Staff can manage equipment_pm_tasks" ON public.equipment_pm_tasks
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- equipment_pm_task_images
DROP POLICY IF EXISTS "Allow authenticated users to insert equipment_pm_task_images" ON public.equipment_pm_task_images;
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment_pm_task_images" ON public.equipment_pm_task_images;
CREATE POLICY "Staff can manage equipment_pm_task_images" ON public.equipment_pm_task_images
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- pm_schedules / pm_history
DROP POLICY IF EXISTS "Users can create pm_schedules" ON public.pm_schedules;
DROP POLICY IF EXISTS "Users can update pm_schedules" ON public.pm_schedules;
DROP POLICY IF EXISTS "Users can delete pm_schedules" ON public.pm_schedules;
CREATE POLICY "Staff can manage pm_schedules" ON public.pm_schedules
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

DROP POLICY IF EXISTS "Users can create pm_history" ON public.pm_history;
CREATE POLICY "Staff can create pm_history" ON public.pm_history
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- tool_pm_tasks / tool_pm_task_images / tool_pm_history
DROP POLICY IF EXISTS "Authenticated users can manage tool_pm_tasks" ON public.tool_pm_tasks;
CREATE POLICY "Staff can manage tool_pm_tasks" ON public.tool_pm_tasks
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

DROP POLICY IF EXISTS "Authenticated users can manage tool_pm_task_images" ON public.tool_pm_task_images;
CREATE POLICY "Staff can manage tool_pm_task_images" ON public.tool_pm_task_images
  FOR ALL USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

DROP POLICY IF EXISTS "All authenticated users can create tool_pm_history" ON public.tool_pm_history;
CREATE POLICY "Staff can create tool_pm_history" ON public.tool_pm_history
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- tool_code_prefixes already restricted to staff/admins — nothing to change

-- swap_requests / swap_executions INSERT restrict to staff
DROP POLICY IF EXISTS "Authenticated users can create swap_requests" ON public.swap_requests;
CREATE POLICY "Staff can create swap_requests" ON public.swap_requests
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

DROP POLICY IF EXISTS "Authenticated users can create swap_executions" ON public.swap_executions;
CREATE POLICY "Staff can create swap_executions" ON public.swap_executions
  FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff'));

-- =====================================================================
-- Profiles: restrict read to self + admins
-- =====================================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- =====================================================================
-- Storage: restrict update/delete to file owner or staff/admin
-- =====================================================================
-- media-player-documents
DROP POLICY IF EXISTS "Auth Update Docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Docs" ON storage.objects;
CREATE POLICY "Owner or staff can update media-player-documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-player-documents' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );
CREATE POLICY "Owner or staff can delete media-player-documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-player-documents' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );

-- media-player-images
DROP POLICY IF EXISTS "Auth Update Images" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media player images" ON storage.objects;
CREATE POLICY "Owner or staff can update media-player-images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media-player-images' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );
CREATE POLICY "Owner or staff can delete media-player-images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-player-images' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );

-- equipment-images
DROP POLICY IF EXISTS "Authenticated users can update equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete equipment images" ON storage.objects;
CREATE POLICY "Owner or staff can update equipment-images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'equipment-images' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );
CREATE POLICY "Owner or staff can delete equipment-images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'equipment-images' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );

-- delivery-confirmations
DROP POLICY IF EXISTS "Authenticated users can delete delivery confirmation files" ON storage.objects;
CREATE POLICY "Owner or staff can delete delivery-confirmations" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'delivery-confirmations' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );

-- delivery-documents
DROP POLICY IF EXISTS "Authenticated users can update delivery documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete delivery documents" ON storage.objects;
CREATE POLICY "Owner or staff can update delivery-documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'delivery-documents' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );
CREATE POLICY "Owner or staff can delete delivery-documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'delivery-documents' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff')
    )
  );

-- ad-files
DROP POLICY IF EXISTS "Authenticated users can update ad files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ad files" ON storage.objects;
CREATE POLICY "Owner or staff can update ad-files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ad-files' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver')
    )
  );
CREATE POLICY "Owner or staff can delete ad-files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ad-files' AND (
      owner = auth.uid()
      OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'warehouse_staff') OR has_role(auth.uid(),'receiver')
    )
  );
