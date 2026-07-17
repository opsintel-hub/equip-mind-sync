
-- billboards
DROP POLICY IF EXISTS "All authenticated users can view billboards" ON public.billboards;
CREATE POLICY "Authenticated users can view billboards" ON public.billboards FOR SELECT TO authenticated USING (true);

-- equipment_loans
DROP POLICY IF EXISTS "All authenticated users can view loans" ON public.equipment_loans;
CREATE POLICY "Authenticated users can view loans" ON public.equipment_loans FOR SELECT TO authenticated USING (true);

-- goods_issue_pending_items
DROP POLICY IF EXISTS "All authenticated users can view goods_issue_pending_items" ON public.goods_issue_pending_items;
CREATE POLICY "Authenticated users can view goods_issue_pending_items" ON public.goods_issue_pending_items FOR SELECT TO authenticated USING (true);

-- goods_issue_pending
DROP POLICY IF EXISTS "Authenticated users can view issue requests" ON public.goods_issue_pending;
CREATE POLICY "Authenticated users can view issue requests" ON public.goods_issue_pending FOR SELECT TO authenticated USING (true);

-- purchase_requests
DROP POLICY IF EXISTS "All authenticated users can view purchase requests" ON public.purchase_requests;
CREATE POLICY "Authenticated users can view purchase requests" ON public.purchase_requests FOR SELECT TO authenticated USING (true);

-- stock_movements
DROP POLICY IF EXISTS "All authenticated users can view stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);

-- master data tables
DROP POLICY IF EXISTS "All authenticated users can view companies" ON public.companies;
CREATE POLICY "Authenticated users can view companies" ON public.companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view departments" ON public.departments;
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view tools" ON public.tools;
CREATE POLICY "Authenticated users can view tools" ON public.tools FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view tool_categories" ON public.tool_categories;
CREATE POLICY "Authenticated users can view tool_categories" ON public.tool_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read units" ON public.units;
CREATE POLICY "Authenticated users can view units" ON public.units FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view warehouses" ON public.warehouses;
CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view subcategories" ON public.subcategories;
CREATE POLICY "Authenticated users can view subcategories" ON public.subcategories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view sections" ON public.sections;
CREATE POLICY "Authenticated users can view sections" ON public.sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view pm_types" ON public.pm_types;
CREATE POLICY "Authenticated users can view pm_types" ON public.pm_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view pm_results" ON public.pm_results;
CREATE POLICY "Authenticated users can view pm_results" ON public.pm_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view billboard_pm_history" ON public.billboard_pm_history;
CREATE POLICY "Authenticated users can view billboard_pm_history" ON public.billboard_pm_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view billboard_pm_actions" ON public.billboard_pm_actions;
CREATE POLICY "Authenticated users can view billboard_pm_actions" ON public.billboard_pm_actions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view equipment history" ON public.billboard_equipment_history;
CREATE POLICY "Authenticated users can view equipment history" ON public.billboard_equipment_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view transfers" ON public.equipment_transfers;
CREATE POLICY "Authenticated users can view transfers" ON public.equipment_transfers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view technician_tools" ON public.technician_tools;
CREATE POLICY "Authenticated users can view technician_tools" ON public.technician_tools FOR SELECT TO authenticated USING (true);
