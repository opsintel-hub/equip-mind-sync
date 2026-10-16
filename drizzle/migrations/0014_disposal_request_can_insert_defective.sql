CREATE POLICY "Disposal requesters can insert defective_returns" ON public.defective_returns FOR INSERT TO authenticated
WITH CHECK (public.has_function_permission(auth.uid(), 'disposal_request') AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "Disposal requesters can insert equipment history" ON public.billboard_equipment_history FOR INSERT TO authenticated
WITH CHECK (public.has_function_permission(auth.uid(), 'disposal_request'));