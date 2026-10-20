DO $migration$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.dispatch_warehouse_transfer(uuid,integer,jsonb,jsonb,text[],text,uuid)'::regprocedure);
 definition:=replace(definition,'e record; m record;', 'e public.equipment; m public.media_players;');
 definition:=replace(definition,'IF NOT v_has_ledger AND loc.id IS DISTINCT FROM', 'IF NOT v_has_ledger AND EXISTS(SELECT 1 FROM public.stock_location_allocations WHERE CASE WHEN v_mp IS NULL THEN equipment_id=e.id ELSE media_player_id=v_mp END) THEN RAISE EXCEPTION ''ไม่พบยอดช่องต้นทาง''; END IF;' || E'\n   IF NOT v_has_ledger AND loc.id IS DISTINCT FROM');
 definition:=replace(definition,'IF v_has_ledger AND v_balance>0 THEN', 'IF NOT v_has_ledger THEN INSERT INTO public.stock_location_allocations(equipment_id,media_player_id,location_id,warehouse_id,quantity,reference_type,created_by) VALUES(CASE WHEN v_mp IS NULL THEN e.id END,v_mp,loc.id,loc.warehouse_id,v_before,''legacy_transfer_opening'',auth.uid()); END IF;' || E'\n   IF v_has_ledger AND v_balance>0 THEN');
 definition:=replace(definition,'IF cardinality(v_serial_ids)>0 AND EXISTS(SELECT 1 FROM public.equipment_serial_numbers WHERE id=ANY(v_serial_ids) AND location_id IS DISTINCT FROM loc.id) AND jsonb_array_length(v_allocs)=1 THEN', 'IF cardinality(v_serial_ids)>0 AND (SELECT count(*) FROM public.equipment_serial_numbers WHERE id=ANY(v_serial_ids) AND location_id=loc.id)<>(a.x->>''quantity'')::integer THEN');
 EXECUTE definition;
END;
$migration$;