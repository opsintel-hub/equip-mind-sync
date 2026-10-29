CREATE OR REPLACE FUNCTION public.submit_issue_return_v2(_item_id uuid, _installed integer, _good integer, _issued_defective integer, _old_parts jsonb, _no_old integer, _no_old_reason text, _notes text, _good_photos text[], _defective_photos text[], _used_photos text[], _site_photos text[], _symptom_id uuid, _symptom_other text, _submission_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.goods_issue_pending_items; p public.goods_issue_pending; a jsonb; candidates jsonb; candidate jsonb; be public.billboard_equipment; mp public.media_players; row_good public.issue_good_returns; n integer; old_total integer:=0; old_def integer:=0; old_used integer:=0; prior_inst numeric; base_settled numeric; installed_open numeric; unused numeric; independent boolean; all_settled boolean; reason_text text; record_id uuid; result jsonb; remaining integer; take integer;
BEGIN
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 IF NOT FOUND OR NOT public.can_submit_issue_return(l.pending_id) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ส่งคืนใบเบิกนี้'; END IF;
 SELECT * INTO p FROM public.goods_issue_pending WHERE id=l.pending_id FOR UPDATE;
 PERFORM 1 FROM public.goods_issue_pending_items WHERE pending_id=p.id ORDER BY id FOR UPDATE;
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 IF _submission_key IS NULL THEN RAISE EXCEPTION 'ไม่พบรหัสการบันทึก'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(l.return_workflow_log) x WHERE x->>'submission_key'=_submission_key::text) THEN RETURN jsonb_build_object('already_saved',true); END IF;
 IF l.status IS DISTINCT FROM 'issued' THEN RAISE EXCEPTION 'รายการนี้ยังไม่ได้จ่ายสินค้า'; END IF;
 SELECT coalesce(requires_billboard AND requires_return,false) INTO independent FROM public.issue_purposes WHERE id=p.purpose_id;
 independent:=coalesce(independent,false);
 prior_inst:=coalesce(l.installed_qty,CASE WHEN l.billboard_id IS NOT NULL THEN coalesce(l.issued_quantity,l.quantity) ELSE 0 END);
 IF _installed IS NULL OR _installed<0 OR _installed>prior_inst OR (l.installed_qty IS NOT NULL AND _installed<>l.installed_qty) THEN RAISE EXCEPTION 'ยอดติดตั้งเปลี่ยนแปลง กรุณาเปิดรายการใหม่'; END IF;
 IF _installed<>prior_inst AND (l.media_player_id IS NOT NULL OR coalesce(l.serial_number,'')<>'') THEN RAISE EXCEPTION 'รายการมี S/N ต้องแก้การติดตั้งผ่านประวัติอุปกรณ์'; END IF;
 base_settled:=greatest(l.installation_return_settled_qty,coalesce(l.swap_returned_defective_qty,0));
 installed_open:=greatest(0,_installed-base_settled-coalesce(l.lost_replacement_qty,0));
 unused:=greatest(0,coalesce(l.issued_quantity,l.quantity,0)-_installed-coalesce(l.returned_good_qty,0)-greatest(0,coalesce(l.returned_defective_qty,0)-coalesce(l.swap_returned_defective_qty,0))-greatest(0,coalesce(l.written_off_qty,0)-coalesce(l.lost_replacement_qty,0))-coalesce(l.transferred_qty,0));
 IF _good IS NULL OR _issued_defective IS NULL OR _no_old IS NULL OR least(_good,_issued_defective,_no_old)<0 OR _good+_issued_defective>unused THEN RAISE EXCEPTION 'จำนวนคืนของที่เบิกเกินยอดเหลือ'; END IF;
 IF _old_parts IS NULL OR jsonb_typeof(_old_parts)<>'array' THEN RAISE EXCEPTION 'รายการของเก่าไม่ถูกต้อง'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_old_parts) x GROUP BY x->>'kind',x->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'เลือกของเก่าซ้ำ'; END IF;
 candidates:=public.issue_old_part_candidates(l.id);
 FOR a IN SELECT * FROM jsonb_array_elements(_old_parts) LOOP
 n:=(a->>'quantity')::integer;
 IF a->>'kind'='unregistered' THEN
 IF l.media_player_id IS NOT NULL OR coalesce(l.is_media_player,false) OR a->>'id' IS DISTINCT FROM l.equipment_id::text THEN RAISE EXCEPTION 'ของเก่าที่ไม่มีในระบบต้องเป็นรหัสเดียวกับที่เบิก'; END IF;
 candidate:=jsonb_build_object('id',l.equipment_id,'kind','unregistered','billboard_id',l.billboard_id,'code',l.equipment_code,'name',l.equipment_name,'serial_number',null,'quantity',installed_open);
 ELSE
 SELECT x INTO candidate FROM jsonb_array_elements(candidates) x WHERE x->>'id'=a->>'id' AND x->>'kind'=a->>'kind';
 END IF;
 IF candidate IS NULL OR n IS NULL OR n<=0 OR n>(candidate->>'quantity')::integer OR coalesce(a->>'condition','') NOT IN ('used','defective') THEN RAISE EXCEPTION 'ของเก่าหรือจำนวนไม่ตรงกับอุปกรณ์ที่ป้าย'; END IF;
 old_total:=old_total+n;
 IF a->>'condition'='used' THEN old_used:=old_used+n; ELSE old_def:=old_def+n; END IF;
 END LOOP;
 IF old_total+_no_old>installed_open OR (independent AND old_total+_no_old<>installed_open) THEN RAISE EXCEPTION 'ยอดของเก่าและไม่มีของคืนต้องตรงกับยอดติดตั้งที่ยังไม่สรุป'; END IF;
 IF _good+_issued_defective+old_total+_no_old<=0 THEN RAISE EXCEPTION 'กรุณาระบุรายการที่จะบันทึก'; END IF;
 IF coalesce(cardinality(_good_photos),0)>3 OR coalesce(cardinality(_used_photos),0)>3 OR coalesce(cardinality(_site_photos),0)>3 OR coalesce(cardinality(_defective_photos),0)>3 THEN RAISE EXCEPTION 'แนบรูปได้ไม่เกิน 3 รูปต่อประเภท'; END IF;
 IF _issued_defective+old_def>0 AND coalesce(cardinality(_defective_photos),0)<1 THEN RAISE EXCEPTION 'กรุณาแนบรูปของเสียอย่างน้อย 1 รูป'; END IF;
 IF _issued_defective+old_def>0 AND _symptom_id IS NULL AND coalesce(trim(_symptom_other),'')='' THEN RAISE EXCEPTION 'กรุณาระบุอาการเสีย'; END IF;
 IF _no_old>0 AND coalesce(trim(_no_old_reason),'')='' THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลที่ไม่มีของเดิมคืน'; END IF;
 PERFORM 1 FROM public.billboard_equipment WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(_old_parts) x WHERE x->>'kind'='equipment') ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.media_players WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(_old_parts) x WHERE x->>'kind'='media_player') ORDER BY id FOR UPDATE;
 SELECT name INTO reason_text FROM public.mp_symptoms WHERE id=_symptom_id;
 reason_text:=concat_ws(' - ',reason_text,nullif(trim(_symptom_other),''));
 IF _good>0 THEN
 INSERT INTO public.issue_good_returns(pending_id,pending_item_id,document_no,equipment_id,media_player_id,is_media_player,equipment_code,equipment_name,serial_number,quantity,unit,department,notes,submitted_by,submitted_by_name,photos,item_condition,return_source)
 VALUES(p.id,l.id,p.document_no,CASE WHEN l.media_player_id IS NULL THEN l.equipment_id END,l.media_player_id,coalesce(l.is_media_player,false),l.equipment_code,l.equipment_name,l.serial_number,_good,l.unit,p.requester_department,_notes,auth.uid(),p.requester_name,_good_photos,'new','issued');
 END IF;
 IF _issued_defective>0 THEN
 INSERT INTO public.defective_returns(equipment_id,media_player_id,is_media_player,quantity,reason,status,source_type,source_issue_item_id,source_document,reporter_name,reporter_department,return_photos,created_by,symptom_id,symptom_other,notes)
 VALUES(CASE WHEN l.media_player_id IS NULL THEN l.equipment_id END,l.media_player_id,coalesce(l.is_media_player,false),_issued_defective,reason_text,'pending_warehouse_entry','from_issue',l.id,p.document_no,p.requester_name,p.requester_department,_defective_photos,auth.uid(),_symptom_id,_symptom_other,'ของที่เบิกเสียก่อนใช้ | '||coalesce(_notes,''));
 END IF;
 FOR a IN SELECT * FROM jsonb_array_elements(_old_parts) LOOP
 n:=(a->>'quantity')::integer;
 IF a->>'kind'='unregistered' THEN
 candidate:=jsonb_build_object('id',l.equipment_id,'billboard_id',l.billboard_id,'code',l.equipment_code,'name',l.equipment_name,'serial_number',null);
 be.equipment_id:=l.equipment_id;
 ELSE
 SELECT x INTO candidate FROM jsonb_array_elements(candidates) x WHERE x->>'id'=a->>'id' AND x->>'kind'=a->>'kind';
 END IF;
 IF a->>'kind'='unregistered' THEN
 NULL;
 ELSIF a->>'kind'='equipment' THEN
 SELECT * INTO be FROM public.billboard_equipment WHERE id=(a->>'id')::uuid;
 IF NOT FOUND OR be.quantity<n THEN RAISE EXCEPTION 'ของเก่าถูกส่งคืนแล้ว กรุณาเปิดรายการใหม่'; END IF;
 IF coalesce(be.serial_number,'')<>'' AND n<>be.quantity THEN RAISE EXCEPTION 'อุปกรณ์มี S/N ต้องคืนทั้งรายการ'; END IF;
 INSERT INTO public.billboard_equipment_history(billboard_id,equipment_id,quantity,installation_date,installed_by,uninstalled_by,installation_notes,uninstall_reason,return_to_stock)
 VALUES(be.billboard_id,be.equipment_id,n,be.installation_date,be.created_by,auth.uid(),be.notes,'ถอดของเก่า '||(a->>'condition')||' จาก '||p.document_no,false);
 IF n=be.quantity THEN DELETE FROM public.billboard_equipment WHERE id=be.id; ELSE UPDATE public.billboard_equipment SET quantity=quantity-n WHERE id=be.id; END IF;
 ELSE
 SELECT * INTO mp FROM public.media_players WHERE id=(a->>'id')::uuid;
 IF NOT FOUND OR mp.status<>'installed' OR mp.billboard_id IS DISTINCT FROM (candidate->>'billboard_id')::uuid THEN RAISE EXCEPTION 'Media Player ถูกถอดไปแล้ว'; END IF;
 UPDATE public.media_player_billboard_history SET uninstall_date=current_date::text,uninstalled_by=auth.uid(),uninstall_reason='ถอดของเก่า '||(a->>'condition')||' จาก '||p.document_no,return_to_stock=false WHERE media_player_id=mp.id AND uninstall_date IS NULL;
 UPDATE public.media_players SET billboard_id=null,install_date=null,status=CASE WHEN a->>'condition'='used' THEN 'pending_assessment' ELSE 'defective' END,quantity=0 WHERE id=mp.id;
 END IF;
 IF a->>'condition'='used' THEN
 INSERT INTO public.issue_good_returns(pending_id,pending_item_id,document_no,equipment_id,media_player_id,is_media_player,equipment_code,equipment_name,serial_number,quantity,unit,department,notes,submitted_by,submitted_by_name,photos,item_condition,return_source)
 VALUES(p.id,l.id,p.document_no,CASE WHEN a->>'kind'<>'media_player' THEN be.equipment_id END,CASE WHEN a->>'kind'='media_player' THEN mp.id END,a->>'kind'='media_player',candidate->>'code',candidate->>'name',candidate->>'serial_number',n,l.unit,p.requester_department,CASE WHEN a->>'kind'='unregistered' THEN 'SPARE-USED | ของเดิมก่อนเริ่มใช้ระบบ | ' ELSE 'SPARE-USED | ' END||coalesce(_notes,''),auth.uid(),p.requester_name,_used_photos,'used','pm_old');
 ELSE
 INSERT INTO public.defective_returns(equipment_id,media_player_id,is_media_player,quantity,billboard_id,reason,status,source_type,source_issue_item_id,source_document,reporter_name,reporter_department,return_photos,created_by,symptom_id,symptom_other,notes)
 VALUES(CASE WHEN a->>'kind'<>'media_player' THEN be.equipment_id END,CASE WHEN a->>'kind'='media_player' THEN mp.id END,a->>'kind'='media_player',n,(candidate->>'billboard_id')::uuid,reason_text,'pending_warehouse_entry','billboard',l.id,p.document_no,p.requester_name,p.requester_department,_defective_photos,auth.uid(),_symptom_id,_symptom_other,CASE WHEN a->>'kind'='unregistered' THEN 'ของเดิมก่อนเริ่มใช้ระบบ ถอดจากป้าย ไม่หักยอดเบิก | ' ELSE 'ของเก่าถอดจากป้าย ไม่หักยอดเบิก | ' END||coalesce(_notes,''));
 END IF;
 END LOOP;
 IF _installed<>prior_inst THEN
 remaining:=(prior_inst-_installed)::integer;
 FOR be IN SELECT * FROM public.billboard_equipment WHERE equipment_id=l.equipment_id AND starts_with(notes,'จากเอกสาร '||p.document_no||' - ') AND (position('[issue-item:' IN notes)=0 OR position('[issue-item:'||l.id||']' IN notes)>0) ORDER BY id FOR UPDATE LOOP
 EXIT WHEN remaining=0; take:=least(remaining,be.quantity);
 IF take=be.quantity THEN DELETE FROM public.billboard_equipment WHERE id=be.id; ELSE UPDATE public.billboard_equipment SET quantity=quantity-take WHERE id=be.id; END IF;
 remaining:=remaining-take;
 END LOOP;
 END IF;
 UPDATE public.goods_issue_pending_items SET installed_qty=_installed,returned_good_qty=coalesce(returned_good_qty,0)+_good,returned_defective_qty=coalesce(returned_defective_qty,0)+_issued_defective+old_def,swap_returned_defective_qty=coalesce(swap_returned_defective_qty,0)+old_def,installation_return_settled_qty=base_settled+old_total+_no_old,returned_at=now(),returned_by=auth.uid(),return_workflow_log=return_workflow_log||jsonb_build_array(jsonb_build_object('submission_key',_submission_key,'installed',_installed,'previous_installed',prior_inst,'good',_good,'issued_defective',_issued_defective,'old_parts',_old_parts,'no_old',_no_old,'no_old_reason',_no_old_reason,'site_photos',_site_photos,'notes',_notes,'by',auth.uid(),'at',now())) WHERE id=l.id;
 SELECT bool_and(coalesce(returned_good_qty,0)+greatest(0,coalesce(returned_defective_qty,0)-coalesce(swap_returned_defective_qty,0))+coalesce(written_off_qty,0)+coalesce(transferred_qty,0)+CASE WHEN independent THEN installation_return_settled_qty ELSE coalesce(installed_qty,CASE WHEN billboard_id IS NOT NULL THEN coalesce(issued_quantity,quantity,0) ELSE 0 END) END>=coalesce(issued_quantity,quantity,0)) INTO all_settled FROM public.goods_issue_pending_items WHERE pending_id=p.id;
 UPDATE public.goods_issue_pending SET status=CASE WHEN all_settled THEN 'returned' ELSE 'partial_return' END,is_complete=all_settled,return_quantity=(SELECT sum(coalesce(returned_good_qty,0)+coalesce(returned_defective_qty,0)) FROM public.goods_issue_pending_items WHERE pending_id=p.id),returned_at=now(),returned_by=auth.uid() WHERE id=p.id;
 RETURN jsonb_build_object('unused_returned',_good+_issued_defective,'old_used',old_used,'old_defective',old_def,'complete',all_settled);
END; $function$;