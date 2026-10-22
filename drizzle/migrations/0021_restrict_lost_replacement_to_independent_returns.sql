CREATE OR REPLACE FUNCTION public.record_lost_replacement(_item_id uuid, _quantity integer, _reason text, _photos text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.goods_issue_pending_items; p public.goods_issue_pending; independent boolean; inst numeric; outstanding numeric; all_settled boolean; total integer;
BEGIN
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 IF NOT FOUND OR NOT public.can_submit_issue_return(l.pending_id) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ส่งคืนใบเบิกนี้'; END IF;
 SELECT * INTO p FROM public.goods_issue_pending WHERE id=l.pending_id FOR UPDATE;
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id FOR UPDATE;
 IF l.media_player_id IS NOT NULL OR COALESCE(l.is_media_player,false) THEN RAISE EXCEPTION 'Media Player ต้องใช้ขั้นตอนของเสีย/Swap ตามปกติ'; END IF;
 IF _quantity IS NULL OR _quantity<=0 THEN RAISE EXCEPTION 'กรุณาระบุจำนวนติดตั้งทดแทน'; END IF;
 IF COALESCE(trim(_reason),'')='' THEN RAISE EXCEPTION 'กรุณาระบุเหตุที่ของเดิมสูญหาย/ถูกขโมย'; END IF;
 IF COALESCE(cardinality(_photos),0) NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'กรุณาแนบรูปหน้างาน 1–3 รูป'; END IF;
 inst := COALESCE(l.installed_qty, CASE WHEN l.billboard_id IS NOT NULL THEN COALESCE(l.issued_quantity,l.quantity) ELSE 0 END);
 IF inst<=0 THEN RAISE EXCEPTION 'ต้องระบุป้ายที่ติดตั้งก่อน'; END IF;
 IF _quantity > inst - COALESCE(l.lost_replacement_qty,0) THEN RAISE EXCEPTION 'จำนวนติดตั้งทดแทนเกินยอดที่ติดตั้งกับป้าย'; END IF;
 SELECT COALESCE(requires_billboard AND requires_return,false) INTO independent FROM public.issue_purposes WHERE id=p.purpose_id;
 independent := COALESCE(independent,false);
 IF NOT independent THEN RAISE EXCEPTION 'วัตถุประสงค์นี้หักยอดติดตั้งแล้ว ไม่สามารถปิดยอดทดแทนซ้ำจากสินค้าที่เหลือคืน'; END IF;
 outstanding := greatest(0, COALESCE(l.issued_quantity,l.quantity,0)-COALESCE(l.returned_good_qty,0)-COALESCE(l.returned_defective_qty,0)
  -CASE WHEN independent THEN 0 ELSE inst END-COALESCE(l.written_off_qty,0)-COALESCE(l.transferred_qty,0));
 IF _quantity>outstanding THEN RAISE EXCEPTION 'จำนวนติดตั้งทดแทนเกินยอดค้าง'; END IF;
 UPDATE public.goods_issue_pending_items SET
  written_off_qty=COALESCE(written_off_qty,0)+_quantity,
  lost_replacement_qty=COALESCE(lost_replacement_qty,0)+_quantity,
  lost_replacement_log=COALESCE(lost_replacement_log,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
   'quantity',_quantity,'reason',trim(_reason),'photos',to_jsonb(_photos),'by',auth.uid(),'at',now())),
  notes=COALESCE(notes,'') || ' | ติดตั้งทดแทนของเดิมสูญหาย ' || _quantity || ': ' || trim(_reason)
 WHERE id=l.id;
 SELECT sum(COALESCE(returned_good_qty,0)+COALESCE(returned_defective_qty,0)),
  bool_and(COALESCE(returned_good_qty,0)+COALESCE(returned_defective_qty,0)+COALESCE(written_off_qty,0)+COALESCE(transferred_qty,0)
  +CASE WHEN independent THEN 0 ELSE COALESCE(installed_qty,CASE WHEN billboard_id IS NOT NULL THEN COALESCE(issued_quantity,quantity,0) ELSE 0 END) END>=COALESCE(issued_quantity,quantity,0))
 INTO total,all_settled FROM public.goods_issue_pending_items WHERE pending_id=p.id;
 UPDATE public.goods_issue_pending SET status=CASE WHEN all_settled THEN 'returned' ELSE 'partial_return' END,is_complete=all_settled WHERE id=p.id;
 RETURN jsonb_build_object('lost_replacement_qty',_quantity);
END; $$;
REVOKE ALL ON FUNCTION public.record_lost_replacement(uuid,integer,text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lost_replacement(uuid,integer,text,text[]) TO authenticated;