CREATE OR REPLACE FUNCTION public.mt_rollback_issue_document(p_document_no text, p_confirm boolean, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE h public.goods_issue_pending; l public.goods_issue_pending_items; v_asset uuid; v_qty int; v_recv int; v_loc uuid; v_wh uuid; v_before int; v_after int; v_lines int:=0; v_units int:=0; v_note text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'เฉพาะ Super Admin'; END IF;
 IF p_confirm IS DISTINCT FROM true THEN RAISE EXCEPTION 'กรุณายืนยันว่าของจริงกลับเข้า Store ครบแล้ว'; END IF;
 SELECT * INTO h FROM public.goods_issue_pending WHERE document_no=upper(trim(p_document_no)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบเลขที่ใบเบิก %',p_document_no; END IF;
 IF h.status='cancelled' THEN RETURN jsonb_build_object('duplicate',true); END IF;
 IF EXISTS(SELECT 1 FROM public.defective_returns d JOIN public.goods_issue_pending_items i ON i.id=d.pending_item_id WHERE i.pending_id=h.id AND d.status<>'cancelled') THEN
  RAISE EXCEPTION 'ใบเบิกนี้มีรายการของเสีย/ของเก่าที่ส่งคืนแล้ว ต้องตรวจสอบเอง ไม่คืนอัตโนมัติ'; END IF;
 v_note:='คืนของทดสอบทั้งใบโดย Super Admin'||coalesce(': '||nullif(trim(p_reason),''),'');
 UPDATE public.issue_good_returns SET status='cancelled' WHERE pending_item_id IN (SELECT id FROM public.goods_issue_pending_items WHERE pending_id=h.id) AND status='pending';
 FOR l IN SELECT * FROM public.goods_issue_pending_items WHERE pending_id=h.id FOR UPDATE LOOP
  v_asset:=coalesce(l.media_player_id,l.equipment_id);
  SELECT coalesce(sum(quantity),0) INTO v_recv FROM public.issue_good_returns WHERE pending_item_id=l.id AND status='received';
  v_qty:=CASE WHEN l.status='issued' THEN greatest(0,coalesce(l.issued_quantity,0)-v_recv-coalesce(l.transferred_qty,0)-coalesce(l.written_off_qty,0)) ELSE 0 END;
  DELETE FROM public.billboard_equipment WHERE notes LIKE '%[issue-item:'||l.id||']%' OR (equipment_id=v_asset AND notes LIKE '%'||h.document_no||'%');
  IF v_qty>0 THEN
   SELECT location_id INTO v_loc FROM public.stock_movements WHERE reference_document=h.document_no AND equipment_id=v_asset AND movement_type='issue' AND location_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;
   IF l.media_player_id IS NOT NULL THEN
    SELECT coalesce(quantity,0), coalesce(v_loc,location_id) INTO v_before, v_loc FROM public.media_players WHERE id=l.media_player_id FOR UPDATE;
    v_qty:=1; v_after:=1;
    UPDATE public.media_players SET quantity=1,status='active',billboard_id=NULL,location_id=v_loc WHERE id=l.media_player_id;
   ELSE
    SELECT coalesce(quantity_in_stock,0), coalesce(v_loc,location_id) INTO v_before, v_loc FROM public.equipment WHERE id=l.equipment_id FOR UPDATE;
    v_after:=v_before+v_qty;
    UPDATE public.equipment SET quantity_in_stock=v_after WHERE id=l.equipment_id;
    UPDATE public.equipment_serial_numbers SET status='in_stock',billboard_id=NULL,location_id=v_loc WHERE equipment_id=l.equipment_id AND coalesce(l.serial_number,'')<>'' AND serial_number=ANY(regexp_split_to_array(l.serial_number,E'[\n\r]+'));
   END IF;
   SELECT warehouse_id INTO v_wh FROM public.locations WHERE id=v_loc;
   IF v_loc IS NOT NULL THEN
    INSERT INTO public.stock_location_allocations(equipment_id,media_player_id,location_id,warehouse_id,quantity,reference_type,reference_id,reference_document,notes,created_by)
    VALUES(l.equipment_id,l.media_player_id,v_loc,v_wh,v_qty,'test_rollback',l.id,h.document_no,v_note,auth.uid());
   END IF;
   INSERT INTO public.stock_movements(equipment_id,equipment_code,equipment_name,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reference_document,location_id,notes,created_by)
   VALUES(v_asset,l.equipment_code,l.equipment_name,'test_rollback',v_qty,v_before,v_after,'test_rollback',l.id,h.document_no,v_loc,v_note,auth.uid());
   v_units:=v_units+v_qty;
  END IF;
  UPDATE public.goods_issue_pending_items SET status='rejected',remaining_quantity=0,installed_qty=0,returned_good_qty=0,returned_defective_qty=0,swap_returned_defective_qty=0,billboard_id=NULL,intended_billboard_id=NULL,needs_return=false,install_status='cancelled',written_off_qty=coalesce(issued_quantity,0),notes=concat_ws(' | ',nullif(notes,''),v_note) WHERE id=l.id;
  v_lines:=v_lines+1;
 END LOOP;
 UPDATE public.magic_ticket_events SET reverted_at=coalesce(reverted_at,now()),reverted_reason=v_note,reverted_serial_number=coalesce(reverted_serial_number,serial_number),serial_number=NULL WHERE pending_id=h.id AND status='applied' AND reverted_at IS NULL;
 UPDATE public.goods_issue_pending SET status='cancelled',is_complete=true,remaining_quantity=0,notes=concat_ws(' | ',nullif(notes,''),v_note) WHERE id=h.id;
 RETURN jsonb_build_object('duplicate',false,'lines',v_lines,'units',v_units);
END $$;
REVOKE ALL ON FUNCTION public.mt_rollback_issue_document(text,boolean,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mt_rollback_issue_document(text,boolean,text) TO authenticated;