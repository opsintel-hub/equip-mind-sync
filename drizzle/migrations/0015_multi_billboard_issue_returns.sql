-- One transaction owns validation, return tickets, and uninstall history.
CREATE OR REPLACE FUNCTION public.can_submit_issue_return(_pending_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.goods_issue_pending p WHERE p.id = _pending_id AND (
 p.created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR
 ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse_staff'))
 AND public.has_department_permission(auth.uid(), p.requester_department, 'edit'))));
$$;
REVOKE ALL ON FUNCTION public.can_submit_issue_return(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_submit_issue_return(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_return_billboards(_item_id uuid)
RETURNS TABLE(id uuid, old_code text, location_name text, equipment_code text, qty bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.goods_issue_pending_items; p public.goods_issue_pending;
BEGIN
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE goods_issue_pending_items.id = _item_id;
 IF NOT FOUND OR NOT public.can_submit_issue_return(l.pending_id) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ส่งคืนใบเบิกนี้'; END IF;
 SELECT * INTO p FROM public.goods_issue_pending WHERE goods_issue_pending.id = l.pending_id;
 IF l.media_player_id IS NOT NULL THEN
 RETURN QUERY SELECT b.id, b.old_code::text, b.location_name::text, b.equipment_id::text, 1::bigint
 FROM public.billboards b WHERE b.id = l.billboard_id AND EXISTS (
 SELECT 1 FROM public.media_player_billboard_history h WHERE h.media_player_id = l.media_player_id
 AND h.billboard_id = b.id AND h.uninstall_date IS NULL
 AND (h.installation_notes = 'จากเอกสาร ' || p.document_no OR h.installation_notes LIKE 'จากเอกสาร ' || p.document_no || ' - %'));
 ELSE
 RETURN QUERY SELECT b.id,b.old_code::text,b.location_name::text,b.equipment_id::text,sum(be.quantity)::bigint
 FROM public.billboard_equipment be JOIN public.billboards b ON b.id=be.billboard_id
 WHERE be.equipment_id=l.equipment_id AND be.quantity>0
 AND starts_with(be.notes, 'จากเอกสาร ' || p.document_no || ' - ')
 AND (position('[issue-item:' IN be.notes)=0 OR position('[issue-item:' || l.id || ']' IN be.notes)>0)
 GROUP BY b.id,b.old_code,b.location_name,b.equipment_id;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.issue_return_billboards(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_return_billboards(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_issue_return(_item_id uuid, _good integer, _defective integer,
 _allocations jsonb, _symptom_id uuid, _symptom_other text, _notes text, _good_photos text[], _defective_photos text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.goods_issue_pending_items; p public.goods_issue_pending; a jsonb; be public.billboard_equipment;
 bb uuid; n integer; remaining integer; available bigint; total integer; inst numeric; outstanding numeric;
 reason_text text; ticket_ids jsonb := '[]'; ticket_id uuid; independent boolean; all_settled boolean;
BEGIN
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 IF NOT FOUND OR NOT public.can_submit_issue_return(l.pending_id) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ส่งคืนใบเบิกนี้'; END IF;
 SELECT * INTO p FROM public.goods_issue_pending WHERE id=l.pending_id FOR UPDATE;
 PERFORM 1 FROM public.goods_issue_pending_items WHERE pending_id=p.id ORDER BY id FOR UPDATE;
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 SELECT COALESCE(requires_billboard AND requires_return,false) INTO independent FROM public.issue_purposes WHERE id=p.purpose_id;
 independent := COALESCE(independent,false);
 inst := COALESCE(l.installed_qty, CASE WHEN l.billboard_id IS NOT NULL THEN COALESCE(l.issued_quantity,l.quantity) ELSE 0 END);
 outstanding := greatest(0, COALESCE(l.issued_quantity,l.quantity,0)-COALESCE(l.returned_good_qty,0)-COALESCE(l.returned_defective_qty,0)
 -CASE WHEN independent THEN 0 ELSE inst END-COALESCE(l.written_off_qty,0)-COALESCE(l.transferred_qty,0));
 IF _good IS NULL OR _defective IS NULL OR _good<0 OR _defective<0 OR _good+_defective<=0 OR _good+_defective>outstanding THEN
 RAISE EXCEPTION 'จำนวนส่งคืนเกินยอดค้างหรือไม่ถูกต้อง'; END IF;
 IF (_good>0 AND COALESCE(cardinality(_good_photos),0) NOT BETWEEN 1 AND 3)
 OR (_defective>0 AND COALESCE(cardinality(_defective_photos),0) NOT BETWEEN 1 AND 3) THEN RAISE EXCEPTION 'กรุณาแนบรูป 1–3 รูป'; END IF;
 IF _defective>0 AND _symptom_id IS NULL AND COALESCE(trim(_symptom_other),'')='' THEN RAISE EXCEPTION 'กรุณาระบุอาการเสีย'; END IF;
 IF _allocations IS NULL OR jsonb_typeof(_allocations)<>'array' THEN RAISE EXCEPTION 'รายการป้ายไม่ถูกต้อง'; END IF;
 SELECT COALESCE(sum((x->>'quantity')::integer),0) INTO total FROM jsonb_array_elements(_allocations) x;
 IF jsonb_array_length(_allocations)>0 AND total<>_defective THEN RAISE EXCEPTION 'ยอดแยกป้ายต้องเท่ากับจำนวนของเสีย'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(_allocations) x GROUP BY x->>'billboard_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'เลือกป้ายซ้ำ'; END IF;
 IF _defective>0 AND jsonb_array_length(_allocations)=0 AND EXISTS (SELECT 1 FROM public.issue_return_billboards(l.id)) THEN RAISE EXCEPTION 'กรุณาระบุป้ายและจำนวนของเสีย'; END IF;
 -- Lock every matching installation before checking current capacity.
 PERFORM 1 FROM public.billboard_equipment WHERE equipment_id=l.equipment_id ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.media_player_billboard_history WHERE media_player_id=l.media_player_id ORDER BY id FOR UPDATE;
 FOR a IN SELECT * FROM jsonb_array_elements(_allocations) LOOP
 bb := (a->>'billboard_id')::uuid; n := (a->>'quantity')::integer;
 SELECT qty INTO available FROM public.issue_return_billboards(l.id) WHERE id=bb;
 IF n IS NULL OR n<=0 OR available IS NULL OR n>available THEN RAISE EXCEPTION 'จำนวนของเสียเกินยอดติดตั้งคงเหลือของป้าย'; END IF;
 END LOOP;
 SELECT name INTO reason_text FROM public.mp_symptoms WHERE id=_symptom_id;
 reason_text := concat_ws(' - ',reason_text,NULLIF(trim(_symptom_other),''));
 IF _good>0 THEN
 INSERT INTO public.issue_good_returns(pending_id,pending_item_id,document_no,equipment_id,media_player_id,is_media_player,
 equipment_code,equipment_name,serial_number,quantity,unit,department,notes,submitted_by,submitted_by_name,photos)
 VALUES(p.id,l.id,p.document_no,CASE WHEN l.media_player_id IS NULL THEN l.equipment_id END,l.media_player_id,
 COALESCE(l.is_media_player,false) OR l.media_player_id IS NOT NULL,l.equipment_code,l.equipment_name,l.serial_number,
 _good,l.unit,p.requester_department,NULLIF(trim(_notes),''),auth.uid(),p.requester_name,_good_photos);
 END IF;
 -- Unassigned issue returns remain valid; no invented billboard or uninstall history.
 IF _defective>0 THEN
 FOR a IN SELECT * FROM jsonb_array_elements(CASE WHEN jsonb_array_length(_allocations)=0
 THEN jsonb_build_array(jsonb_build_object('billboard_id',null,'quantity',_defective)) ELSE _allocations END) LOOP
 bb := (a->>'billboard_id')::uuid; n := (a->>'quantity')::integer;
 INSERT INTO public.defective_returns(equipment_id,media_player_id,is_media_player,quantity,billboard_id,reason,
 status,source_type,symptom_id,symptom_other,source_issue_item_id,source_document,dispose_status,reporter_name,
 reporter_department,notes,return_photos,created_by)
 VALUES(CASE WHEN l.media_player_id IS NULL THEN l.equipment_id END,l.media_player_id,
 COALESCE(l.is_media_player,false) OR l.media_player_id IS NOT NULL,n,bb,
 '[คืนจากหน้างาน] ' || reason_text || CASE WHEN l.serial_number IS NOT NULL THEN E'\nS/N: ' || l.serial_number ELSE '' END,
 'pending_warehouse_entry','from_issue',_symptom_id,NULLIF(trim(_symptom_other),''),l.id,p.document_no,
 'pending_disposal_review',p.requester_name,p.requester_department,NULLIF(trim(_notes),''),_defective_photos,auth.uid()) RETURNING id INTO ticket_id;
 ticket_ids := ticket_ids || jsonb_build_array(ticket_id);
 IF bb IS NOT NULL AND l.media_player_id IS NULL THEN
 remaining := n;
 FOR be IN SELECT * FROM public.billboard_equipment WHERE equipment_id=l.equipment_id AND billboard_id=bb
 AND starts_with(notes,'จากเอกสาร ' || p.document_no || ' - ')
 AND (position('[issue-item:' IN notes)=0 OR position('[issue-item:' || l.id || ']' IN notes)>0)
 ORDER BY created_at,id LOOP
 EXIT WHEN remaining=0;
 total := least(remaining,be.quantity);
 INSERT INTO public.billboard_equipment_history(billboard_id,equipment_id,quantity,installation_date,installed_by,
 uninstalled_by,installation_notes,uninstall_reason,return_to_stock)
 VALUES(bb,l.equipment_id,total,be.installation_date,be.created_by,auth.uid(),be.notes,
 'คืนของเสียจาก ' || p.document_no || ' | ' || ticket_id || ' | ' || reason_text,false);
 IF total=be.quantity THEN DELETE FROM public.billboard_equipment WHERE id=be.id;
 ELSE UPDATE public.billboard_equipment SET quantity=quantity-total WHERE id=be.id; END IF;
 remaining := remaining-total;
 END LOOP;
 ELSIF bb IS NOT NULL THEN
 UPDATE public.media_player_billboard_history SET uninstall_date=current_date::text,uninstalled_by=auth.uid(),
 uninstall_reason='คืนของเสียจาก ' || p.document_no || ' | ' || ticket_id || ' | ' || reason_text,return_to_stock=false
 WHERE media_player_id=l.media_player_id AND billboard_id=bb AND uninstall_date IS NULL
 AND (installation_notes='จากเอกสาร ' || p.document_no OR installation_notes LIKE 'จากเอกสาร ' || p.document_no || ' - %');
 UPDATE public.media_players SET billboard_id=null,install_date=null WHERE id=l.media_player_id AND billboard_id=bb;
 END IF;
 END LOOP;
 END IF;
 -- installed_qty remains the historical assignment milestone, independent from physical remaining installations.
 UPDATE public.goods_issue_pending_items SET returned_good_qty=COALESCE(returned_good_qty,0)+_good,
 returned_defective_qty=COALESCE(returned_defective_qty,0)+_defective,returned_at=now(),returned_by=auth.uid(),
 notes=COALESCE(notes,'') || ' | ส่งคืน ดี ' || _good || ' / เสีย ' || _defective WHERE id=l.id;
 SELECT sum(COALESCE(returned_good_qty,0)+COALESCE(returned_defective_qty,0)),
 bool_and(COALESCE(returned_good_qty,0)+COALESCE(returned_defective_qty,0)+COALESCE(written_off_qty,0)+COALESCE(transferred_qty,0)
 +CASE WHEN independent THEN 0 ELSE COALESCE(installed_qty,CASE WHEN billboard_id IS NOT NULL THEN COALESCE(issued_quantity,quantity,0) ELSE 0 END) END>=COALESCE(issued_quantity,quantity,0))
 INTO total,all_settled FROM public.goods_issue_pending_items WHERE pending_id=p.id;
 UPDATE public.goods_issue_pending SET return_quantity=total,returned_at=now(),returned_by=auth.uid(),
 status=CASE WHEN all_settled THEN 'returned' ELSE 'partial_return' END,is_complete=all_settled WHERE id=p.id;
 RETURN jsonb_build_object('defective_return_ids',ticket_ids);
END; $$;
REVOKE ALL ON FUNCTION public.submit_issue_return(uuid,integer,integer,jsonb,uuid,text,text,text[],text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_issue_return(uuid,integer,integer,jsonb,uuid,text,text,text[],text[]) TO authenticated;
