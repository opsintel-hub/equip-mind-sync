DROP POLICY "Staff and admins can create loans" ON public.equipment_loans;

CREATE POLICY "Authenticated users can request loans"
ON public.equipment_loans
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());