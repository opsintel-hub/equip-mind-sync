CREATE POLICY "Swap managers can manage billboard equipment" ON public.billboard_equipment FOR ALL TO authenticated
  USING (public.has_function_permission(auth.uid(), 'swap_request_manage'))
  WITH CHECK (public.has_function_permission(auth.uid(), 'swap_request_manage'));