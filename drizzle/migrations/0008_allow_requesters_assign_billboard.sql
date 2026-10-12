CREATE POLICY "Requesters and managers can record own billboard installs" ON public.billboard_equipment FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(), 'requester') OR public.has_role(auth.uid(), 'manager')));
CREATE POLICY "Requesters and managers can insert own mp billboard history" ON public.media_player_billboard_history FOR INSERT TO authenticated
  WITH CHECK (installed_by = auth.uid() AND (public.has_role(auth.uid(), 'requester') OR public.has_role(auth.uid(), 'manager')));