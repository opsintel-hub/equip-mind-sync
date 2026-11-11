ALTER POLICY "All authenticated users can view equipment" ON public.equipment USING(public.security_asset_read(equipment.id,NULL::uuid,NULL::uuid));
ALTER POLICY security_selected_read_boundary ON public.equipment USING(public.security_asset_read(equipment.id,NULL::uuid,NULL::uuid));
ALTER POLICY "All authenticated users can view media_players" ON public.media_players USING(public.security_asset_read(NULL::uuid,media_players.id,NULL::uuid));
ALTER POLICY security_selected_read_boundary ON public.media_players USING(public.security_asset_read(NULL::uuid,media_players.id,NULL::uuid));