DO $test$
DECLARE l uuid := '3f8f2da4-ec8a-4812-a6d0-ebdf44fbaa34'; r jsonb; payload jsonb; before_count bigint;
BEGIN
IF (public.magic_ticket_line_json(l)->>'unused_qty')::numeric<>3 THEN RAISE EXCEPTION 'GI-REQ-000205 unused must be 3'; END IF;
IF public.magic_ticket_unused_quantity(5,1,1,1,0,0,0)<>2 THEN RAISE EXCEPTION 'Issued defective must reduce stock'; END IF;
SELECT p.payload INTO payload FROM public.magic_ticket_events p WHERE event_id='be27f245-95d3-4c72-8c06-c857f4f88fcb';
SELECT count(*) INTO before_count FROM public.magic_ticket_events;
r:=public.magic_ticket_work_log(payload,NULL);
IF r->'body'->>'duplicate'<>'true' OR (r->'body'->'item'->>'unused_qty')::numeric<>3 OR (SELECT count(*) FROM public.magic_ticket_events)<>before_count THEN RAISE EXCEPTION 'Duplicate must return current balance without writes'; END IF;
BEGIN
r:=public.magic_ticket_work_log(jsonb_build_object('event_id','swap-balance-verify-over','event_type','install','gi_document_no','GI-REQ-000205','item_code','DGT0024','ticket_code','DGT202610000175','employee_code','automated-test','billboard_old_code','DGT216','quantity',4),NULL);
IF r->'body'->>'code'<>'QUANTITY_EXCEEDS_UNUSED' THEN RAISE EXCEPTION 'Install 4 must reject'; END IF;
r:=public.magic_ticket_work_log(jsonb_build_object('event_id','swap-balance-verify-cap','event_type','return_defective','return_source','swap_old','gi_document_no','GI-REQ-000205','item_code','DGT0024','ticket_code','DGT202610000175','employee_code','automated-test','billboard_old_code','DGT216','quantity',1),NULL);
IF r->'body'->>'code'<>'SWAP_RETURN_EXCEEDS_INSTALLED' THEN RAISE EXCEPTION 'Duplicate old return must reject'; END IF;
r:=public.magic_ticket_revert_event(jsonb_build_object('event_id','be27f245-95d3-4c72-8c06-c857f4f88fcb','reason','isolated test'),NULL);
IF (r->'body'->'item'->>'unused_qty')::numeric<>3 OR r->>'http_status'<>'200' THEN RAISE EXCEPTION 'Revert old return must keep 3 unused'; END IF;
r:=public.magic_ticket_work_log(jsonb_build_object('event_id','swap-balance-verify-old','event_type','return_defective','return_source','swap_old','gi_document_no','GI-REQ-000205','item_code','DGT0024','ticket_code','DGT202610000175','employee_code','automated-test','billboard_old_code','DGT216','quantity',1),NULL);
IF r->>'http_status'<>'200' OR (r->'body'->'item'->>'unused_qty')::numeric<>3 THEN RAISE EXCEPTION 'Old return must not consume new stock'; END IF;
r:=public.magic_ticket_work_log(jsonb_build_object('event_id','swap-balance-verify-install','event_type','install','gi_document_no','GI-REQ-000205','item_code','DGT0024','ticket_code','DGT202610000175','employee_code','automated-test','billboard_old_code','DGT216','quantity',3),NULL);
IF r->>'http_status'<>'200' OR (r->'body'->'item'->>'unused_qty')::numeric<>0 THEN RAISE EXCEPTION 'All 3 remaining must install'; END IF;
r:=public.magic_ticket_revert_event(jsonb_build_object('event_id','swap-balance-verify-install','reason','isolated test'),NULL);
IF r->'body'->>'code'<>'SWAP_RETURN_DEPENDENCY' THEN RAISE EXCEPTION 'Dependent install revert must reject'; END IF;
RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='rollback successful test writes';
EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
END;
IF (public.magic_ticket_line_json(l)->>'unused_qty')::numeric<>3 OR (SELECT count(*) FROM public.magic_ticket_events)<>before_count THEN RAISE EXCEPTION 'Test must leave live records unchanged'; END IF;
END $test$;