ALTER TABLE public.goods_issue_pending_items ADD COLUMN installation_return_settled_qty numeric NOT NULL DEFAULT 0, ADD COLUMN return_workflow_log jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.issue_good_returns ADD COLUMN item_condition text NOT NULL DEFAULT 'new', ADD COLUMN return_source text NOT NULL DEFAULT 'issued';
ALTER TABLE public.locations ADD COLUMN stock_condition text;
COMMENT ON COLUMN public.goods_issue_pending_items.installation_return_settled_qty IS 'Installation outcomes reconciled separately from unused issued returns; never counts as stock receipt.';
COMMENT ON COLUMN public.locations.stock_condition IS 'used marks a dedicated SPARE-USED storage location; item codes remain unchanged.';
CREATE OR REPLACE FUNCTION public.issue_old_part_candidates(_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.goods_issue_pending_items; p public.goods_issue_pending; result jsonb;
BEGIN
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 IF NOT FOUND OR NOT public.can_submit_issue_return(l.pending_id) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ส่งคืนใบเบิกนี้'; END IF;
 SELECT * INTO p FROM public.goods_issue_pending WHERE id=l.pending_id;
 SELECT coalesce(jsonb_agg(x ORDER BY x->>'billboard_label', x->>'code'),'[]') INTO result FROM (
 SELECT jsonb_build_object('id',be.id,'kind','equipment','billboard_id',be.billboard_id,'billboard_label',concat_ws(' - ',b.old_code,b.location_name),'code',e.code,'name',e.name,'serial_number',be.serial_number,'quantity',be.quantity) x
 FROM public.billboard_equipment be JOIN public.billboards b ON b.id=be.billboard_id JOIN public.equipment e ON e.id=be.equipment_id
 WHERE be.quantity>0 AND be.billboard_id IN (SELECT id FROM public.issue_return_billboards(l.id))
 AND NOT coalesce(starts_with(be.notes,'จากเอกสาร '||p.document_no),false)
 UNION ALL
 SELECT jsonb_build_object('id',m.id,'kind','media_player','billboard_id',m.billboard_id,'billboard_label',concat_ws(' - ',b.old_code,b.location_name),'code',m.code,'name',m.name,'serial_number',m.serial_number,'quantity',1) x
 FROM public.media_players m JOIN public.billboards b ON b.id=m.billboard_id
 WHERE m.status='installed' AND m.id IS DISTINCT FROM l.media_player_id AND m.billboard_id IN (SELECT id FROM public.issue_return_billboards(l.id))
 ) q;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.issue_old_part_candidates(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_old_part_candidates(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.submit_issue_return_v2(_item_id uuid,_installed integer,_good integer,_issued_defective integer,_old_parts jsonb,_no_old integer,_no_old_reason text,_notes text,_good_photos text[],_defective_photos text[],_used_photos text[],_site_photos text[],_symptom_id uuid,_symptom_other text,_submission_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 SELECT x INTO candidate FROM jsonb_array_elements(candidates) x WHERE x->>'id'=a->>'id' AND x->>'kind'=a->>'kind';
 IF candidate IS NULL OR n IS NULL OR n<=0 OR n>(candidate->>'quantity')::integer OR coalesce(a->>'condition','') NOT IN ('used','defective') THEN RAISE EXCEPTION 'ของเก่าหรือจำนวนไม่ตรงกับอุปกรณ์ที่ป้าย'; END IF;
 old_total:=old_total+n;
 IF a->>'condition'='used' THEN old_used:=old_used+n; ELSE old_def:=old_def+n; END IF;
 END LOOP;
 IF old_total+_no_old>installed_open OR (independent AND old_total+_no_old<>installed_open) THEN RAISE EXCEPTION 'ยอดของเก่าและไม่มีของคืนต้องตรงกับยอดติดตั้งที่ยังไม่สรุป'; END IF;
 IF _good+_issued_defective+old_total+_no_old<=0 THEN RAISE EXCEPTION 'กรุณาระบุรายการที่จะบันทึก'; END IF;
 IF (_good>0 AND coalesce(cardinality(_good_photos),0) NOT BETWEEN 1 AND 3) OR (old_used>0 AND coalesce(cardinality(_used_photos),0) NOT BETWEEN 1 AND 3) OR (_issued_defective+old_def>0 AND coalesce(cardinality(_defective_photos),0) NOT BETWEEN 1 AND 3) THEN RAISE EXCEPTION 'กรุณาแนบรูปของแต่ละประเภท 1–3 รูป'; END IF;
 IF _issued_defective+old_def>0 AND _symptom_id IS NULL AND coalesce(trim(_symptom_other),'')='' THEN RAISE EXCEPTION 'กรุณาระบุอาการเสีย'; END IF;
 IF _no_old>0 AND coalesce(trim(_no_old_reason),'')='' THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลที่ไม่มีของเดิมคืน'; END IF;
 IF _no_old>0 AND _no_old_reason<>'ติดตั้งใหม่ ไม่มีอุปกรณ์เดิม' AND coalesce(cardinality(_site_photos),0) NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'กรุณาแนบรูปหน้างาน 1–3 รูป'; END IF;
 -- Resolve old assets under row locks. Never remove the newly installed issue units.
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
 SELECT x INTO candidate FROM jsonb_array_elements(candidates) x WHERE x->>'id'=a->>'id' AND x->>'kind'=a->>'kind';
 IF a->>'kind'='equipment' THEN
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
 VALUES(p.id,l.id,p.document_no,CASE WHEN a->>'kind'='equipment' THEN be.equipment_id END,CASE WHEN a->>'kind'='media_player' THEN mp.id END,a->>'kind'='media_player',candidate->>'code',candidate->>'name',candidate->>'serial_number',n,l.unit,p.requester_department,'SPARE-USED | '||coalesce(_notes,''),auth.uid(),p.requester_name,_used_photos,'used','pm_old');
 ELSE
 INSERT INTO public.defective_returns(equipment_id,media_player_id,is_media_player,quantity,billboard_id,reason,status,source_type,source_issue_item_id,source_document,reporter_name,reporter_department,return_photos,created_by,symptom_id,symptom_other,notes)
 VALUES(CASE WHEN a->>'kind'='equipment' THEN be.equipment_id END,CASE WHEN a->>'kind'='media_player' THEN mp.id END,a->>'kind'='media_player',n,(candidate->>'billboard_id')::uuid,reason_text,'pending_warehouse_entry','billboard',l.id,p.document_no,p.requester_name,p.requester_department,_defective_photos,auth.uid(),_symptom_id,_symptom_other,'ของเก่าถอดจากป้าย ไม่หักยอดเบิก | '||coalesce(_notes,''));
 END IF;
 END LOOP;
 -- Correct only legacy inferred installation amounts; keep explicit/SN installation records immutable here.
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
END; $$;
REVOKE ALL ON FUNCTION public.submit_issue_return_v2(uuid,integer,integer,integer,jsonb,integer,text,text,text[],text[],text[],text[],uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_issue_return_v2(uuid,integer,integer,integer,jsonb,integer,text,text,text[],text[],text[],text[],uuid,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.receive_issue_good_return_v2(_return_id uuid,_location_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.issue_good_returns; loc public.locations; wh public.warehouses; before_qty integer; after_qty integer;
BEGIN
 SELECT * INTO r FROM public.issue_good_returns WHERE id=_return_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'super_admin') OR ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'warehouse_staff')) AND public.has_department_permission(auth.uid(),r.department,'edit'))) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์รับคืนฝ่ายนี้'; END IF;
 IF r.status='received' THEN RETURN jsonb_build_object('already_received',true); END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'สถานะรายการไม่พร้อมรับเข้า'; END IF;
 SELECT * INTO loc FROM public.locations WHERE id=_location_id FOR UPDATE;
 SELECT * INTO wh FROM public.warehouses WHERE id=loc.warehouse_id;
 IF loc.id IS NULL OR NOT coalesce(loc.is_active,false) OR wh.id IS NULL OR NOT coalesce(wh.is_active,false) OR NOT(public.has_role(auth.uid(),'super_admin') OR public.has_department_permission(auth.uid(),coalesce(wh.department,loc.department),'edit')) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ใช้ตำแหน่งจัดเก็บนี้'; END IF;
 IF r.item_condition='used' THEN
 IF coalesce(loc.stock_condition,'')<>'used' AND (EXISTS(SELECT 1 FROM public.stock_location_allocations WHERE location_id=loc.id GROUP BY equipment_id,media_player_id,tool_id HAVING sum(quantity)>0) OR EXISTS(SELECT 1 FROM public.equipment WHERE location_id=loc.id AND quantity_in_stock>0) OR EXISTS(SELECT 1 FROM public.media_players WHERE location_id=loc.id AND quantity>0)) THEN RAISE EXCEPTION 'SPARE-USED ต้องแยกช่องจากของใหม่ กรุณาเลือกช่องว่างหรือช่อง SPARE-USED'; END IF;
 UPDATE public.locations SET stock_condition='used' WHERE id=loc.id;
 ELSIF loc.stock_condition='used' THEN RAISE EXCEPTION 'ช่องนี้สำหรับ SPARE-USED กรุณาเลือกช่องของใหม่'; END IF;
 IF r.media_player_id IS NOT NULL THEN
 SELECT coalesce(quantity,0) INTO before_qty FROM public.media_players WHERE id=r.media_player_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบอุปกรณ์'; END IF;
 IF before_qty>0 THEN RAISE EXCEPTION 'อุปกรณ์นี้มีอยู่ในสต็อกแล้ว'; END IF;
 after_qty:=1;
 UPDATE public.media_players SET quantity=1,status='active',billboard_id=null,location_id=loc.id WHERE id=r.media_player_id;
 ELSE
 SELECT coalesce(quantity_in_stock,0) INTO before_qty FROM public.equipment WHERE id=r.equipment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบสินค้า'; END IF;
 after_qty:=before_qty+r.quantity;
 UPDATE public.equipment SET quantity_in_stock=after_qty WHERE id=r.equipment_id;
 UPDATE public.equipment_serial_numbers SET status='in_stock',billboard_id=null,location_id=loc.id,notes=coalesce(notes,'')||CASE WHEN r.item_condition='used' THEN ' | SPARE-USED' ELSE ' | คืนของเหลือ' END WHERE equipment_id=r.equipment_id AND serial_number=ANY(regexp_split_to_array(coalesce(r.serial_number,''),E'[\n\r]+')) AND status<>'in_stock';
 END IF;
 INSERT INTO public.stock_location_allocations(equipment_id,media_player_id,location_id,warehouse_id,quantity,reference_type,reference_id,reference_document,notes,created_by)
 VALUES(r.equipment_id,r.media_player_id,loc.id,wh.id,r.quantity,CASE WHEN r.item_condition='used' THEN 'pm_return' ELSE 'route_return' END,r.id,r.document_no,r.item_condition,auth.uid());
 INSERT INTO public.stock_movements(equipment_id,equipment_code,equipment_name,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reference_document,location_id,notes,item_condition,created_by)
 VALUES(coalesce(r.media_player_id,r.equipment_id),r.equipment_code,r.equipment_name,'receive',r.quantity,before_qty,after_qty,'route_return',r.id,r.document_no,loc.id,r.notes,r.item_condition,auth.uid());
 UPDATE public.issue_good_returns SET status='received',received_by=auth.uid(),received_at=now(),warehouse_id=wh.id,location_id=loc.id WHERE id=r.id;
 UPDATE public.goods_issue_pending_items SET return_location_id=loc.id WHERE id=r.pending_item_id;
 RETURN jsonb_build_object('received',r.quantity,'condition',r.item_condition);
END; $$;
REVOKE ALL ON FUNCTION public.receive_issue_good_return_v2(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_issue_good_return_v2(uuid,uuid) TO authenticated;
-- Keep older callers under the same reconciled installation capacity and completion rule.
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.submit_issue_return(uuid,integer,integer,jsonb,uuid,text,text,text[],text[])'::regprocedure) INTO d;
 d:=replace(d,'-CASE WHEN independent THEN 0 ELSE inst END','-CASE WHEN independent THEN l.installation_return_settled_qty ELSE inst END');
 d:=replace(d,'+CASE WHEN independent THEN 0 ELSE COALESCE(installed_qty','+CASE WHEN independent THEN installation_return_settled_qty ELSE COALESCE(installed_qty');
 EXECUTE d;
 SELECT pg_get_functiondef('public.record_lost_replacement(uuid,integer,text,text[])'::regprocedure) INTO d;
 d:=replace(d,'-CASE WHEN independent THEN 0 ELSE inst END','-CASE WHEN independent THEN l.installation_return_settled_qty ELSE inst END');
 d:=replace(d,'+CASE WHEN independent THEN 0 ELSE COALESCE(installed_qty','+CASE WHEN independent THEN installation_return_settled_qty ELSE COALESCE(installed_qty');
 EXECUTE d;
END; $$;