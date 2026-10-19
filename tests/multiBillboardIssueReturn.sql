-- Integration assertions use a transaction that is always rolled back: no stock changes persist.
BEGIN;
SELECT set_config('request.jwt.claim.sub','638c4ef6-18e2-4d3e-bac5-ed85eedf4d8b',true);
DO $$
DECLARE l uuid := '60ce568a-8027-4b17-8a98-9d634a16adb8'; a uuid; b uuid; before_a bigint; before_b bigint;
 result jsonb; invalid boolean := false; count_tickets integer; count_histories integer;
BEGIN
 SELECT id,qty INTO a,before_a FROM public.issue_return_billboards(l) ORDER BY id LIMIT 1;
 SELECT id,qty INTO b,before_b FROM public.issue_return_billboards(l) ORDER BY id OFFSET 1 LIMIT 1;
 IF a IS NULL OR b IS NULL THEN RAISE EXCEPTION 'Test requires two existing issue billboards'; END IF;
 BEGIN
 PERFORM public.submit_issue_return(l,0,2,jsonb_build_array(jsonb_build_object('billboard_id',a,'quantity',2)),null,'test',null,'{}',ARRAY['test-photo']);
 EXCEPTION WHEN OTHERS THEN
 IF SQLERRM NOT LIKE '%เกินยอดติดตั้ง%' THEN RAISE; END IF;
 invalid := true;
 END;
 IF NOT invalid THEN RAISE EXCEPTION 'Per-billboard over-return was accepted'; END IF;
 result := public.submit_issue_return(l,0,2,jsonb_build_array(jsonb_build_object('billboard_id',a,'quantity',1),jsonb_build_object('billboard_id',b,'quantity',1)),null,'transaction rollback test',null,'{}',ARRAY['test-photo']);
 SELECT count(*) INTO count_tickets FROM public.defective_returns WHERE id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(result->'defective_return_ids')) AND source_issue_item_id=l AND quantity=1;
 IF count_tickets<>2 THEN RAISE EXCEPTION 'Expected two separate defective tickets'; END IF;
 SELECT count(*) INTO count_histories FROM public.billboard_equipment_history WHERE uninstall_reason LIKE '%transaction rollback test%' AND billboard_id IN (a,b) AND quantity=1;
 IF count_histories<>2 THEN RAISE EXCEPTION 'Expected two separate uninstall histories'; END IF;
 IF COALESCE((SELECT qty FROM public.issue_return_billboards(l) WHERE id=a),0)<>before_a-1 OR COALESCE((SELECT qty FROM public.issue_return_billboards(l) WHERE id=b),0)<>before_b-1 THEN RAISE EXCEPTION 'Remaining installation quantities incorrect'; END IF;
 RAISE NOTICE 'PASS: per-billboard limits, two return tickets, two histories, remaining installations';
END $$;
ROLLBACK;
