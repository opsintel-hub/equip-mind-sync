
DROP POLICY IF EXISTS "All authenticated users can view loans" ON public.equipment_loans;
CREATE POLICY "All authenticated users can view loans" ON public.equipment_loans
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view technicians" ON public.technicians;
CREATE POLICY "All authenticated users can view technicians" ON public.technicians
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view defective_returns" ON public.defective_returns;
CREATE POLICY "All authenticated users can view defective_returns" ON public.defective_returns
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.equipment_loans FROM anon;
REVOKE SELECT ON public.technicians FROM anon;
REVOKE SELECT ON public.defective_returns FROM anon;
