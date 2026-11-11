-- Each nested block rolls back its fixture, including stock and audit writes.
DO $$
DECLARE a uuid:=gen_random_uuid(); s uuid; h uuid; result jsonb; v_stock int; before_count int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','638c4ef6-18e2-4d3e-bac5-ed85eedf4d8b',true);
  BEGIN
    INSERT INTO public.equipment(id,code,name,category,unit,quantity_in_stock) VALUES(a,'VERIFY-MT-ISOLATED','Isolated regression fixture','test','ชิ้น',100);
    s:=public.mt_test_create('Isolated rollback regression',now(),now()+interval '2 hours',ARRAY['VERIFY-MT-ISOLATED-TICKET'],ARRAY[a]);
    INSERT INTO public.goods_issue_pending(document_no,quantity,requester_name,status,requester_department) VALUES('VERIFY-MT-ISOLATED-DOC',10,'Regression','issued','Digital Media') RETURNING id INTO h;
    INSERT INTO public.goods_issue_pending_items(pending_id,equipment_id,equipment_code,equipment_name,quantity,issued_quantity,status) VALUES(h,a,'VERIFY-MT-ISOLATED','Isolated regression fixture',10,10,'issued');
    INSERT INTO public.magic_ticket_ticket_map(ticket_code,gi_document_no,pending_id) VALUES('VERIFY-MT-ISOLATED-TICKET','VERIFY-MT-ISOLATED-DOC',h);
    IF NOT EXISTS(SELECT 1 FROM public.magic_ticket_test_documents WHERE pending_id=h AND session_id=s) THEN RAISE EXCEPTION 'capture failed'; END IF;
    UPDATE public.equipment SET quantity_in_stock=90 WHERE id=a;
    INSERT INTO public.stock_movements(equipment_id,equipment_code,equipment_name,movement_type,quantity,stock_before,stock_after,reference_document) VALUES(a,'VERIFY-MT-ISOLATED','Isolated regression fixture','issue',10,100,90,'VERIFY-MT-ISOLATED-DOC');
    PERFORM public.mt_test_end(s);
    BEGIN
      UPDATE public.equipment SET quantity_in_stock=89 WHERE id=a;
      RAISE EXCEPTION 'freeze failed';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM='freeze failed' THEN RAISE; END IF;
    END;
    BEGIN
      PERFORM public.mt_test_rollback(s,false);
      RAISE EXCEPTION 'confirmation failed';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM='confirmation failed' THEN RAISE; END IF;
    END;
    result:=public.mt_test_rollback(s,true);
    SELECT quantity_in_stock INTO v_stock FROM public.equipment WHERE id=a;
    IF v_stock<>100 OR result->>'duplicate'<>'false' THEN RAISE EXCEPTION 'restore failed % %',v_stock,result; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.goods_issue_pending WHERE id=h AND is_complete AND status='cancelled') THEN RAISE EXCEPTION 'close failed'; END IF;
    SELECT count(*) INTO before_count FROM public.stock_movements WHERE equipment_id=a;
    result:=public.mt_test_rollback(s,true);
    IF result->>'duplicate'<>'true' OR (SELECT count(*) FROM public.stock_movements WHERE equipment_id=a)<>before_count THEN RAISE EXCEPTION 'duplicate rollback changed stock'; END IF;
    RAISE EXCEPTION 'FIXTURE_SUCCESS_ROLLBACK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'FIXTURE_SUCCESS_ROLLBACK' THEN RAISE; END IF;
  END;
  IF EXISTS(SELECT 1 FROM public.equipment WHERE id=a) THEN RAISE EXCEPTION 'fixture leaked'; END IF;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
  BEGIN
    PERFORM public.mt_test_end(gen_random_uuid());
    RAISE EXCEPTION 'permission failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='permission failed' THEN RAISE; END IF;
  END;
END $$;