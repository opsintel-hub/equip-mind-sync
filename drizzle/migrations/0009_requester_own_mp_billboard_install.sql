CREATE POLICY "Owners can record installs on own issued items" ON public.goods_issue_pending_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.goods_issue_pending p WHERE p.id = goods_issue_pending_items.pending_id AND p.created_by = auth.uid()
    AND p.status IN ('issued','partially_issued','partial_return')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.goods_issue_pending p WHERE p.id = goods_issue_pending_items.pending_id AND p.created_by = auth.uid()));

CREATE POLICY "Requesters can install media players from own issues" ON public.media_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.goods_issue_pending_items i JOIN public.goods_issue_pending p ON p.id = i.pending_id
    WHERE i.media_player_id = media_players.id AND p.created_by = auth.uid() AND p.status IN ('issued','partially_issued','partial_return')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.goods_issue_pending_items i JOIN public.goods_issue_pending p ON p.id = i.pending_id
    WHERE i.media_player_id = media_players.id AND p.created_by = auth.uid()));

CREATE POLICY "Requesters can log install movements for own issues" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND movement_type = 'install_to_billboard'
    AND EXISTS (SELECT 1 FROM public.goods_issue_pending_items i JOIN public.goods_issue_pending p ON p.id = i.pending_id
      WHERE p.document_no = stock_movements.reference_document AND p.created_by = auth.uid()
        AND (i.media_player_id = stock_movements.equipment_id OR i.equipment_id = stock_movements.equipment_id)));