CREATE TABLE public.warehouse_transfer_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dispatch_key uuid NOT NULL, pending_id uuid NOT NULL REFERENCES public.goods_issue_pending(id), pending_item_id uuid NOT NULL REFERENCES public.goods_issue_pending_items(id), document_no text NOT NULL,
 equipment_id uuid REFERENCES public.equipment(id), media_player_id uuid REFERENCES public.media_players(id), equipment_code text, equipment_name text, unit text, quantity integer NOT NULL CHECK(quantity > 0),
 destination_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id), source_allocations jsonb NOT NULL DEFAULT '[]', serial_ids uuid[] NOT NULL DEFAULT '{}', serial_number text, volume_cm3 numeric NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'in_transit' CHECK(status IN ('in_transit','received')), dispatched_by uuid NOT NULL, dispatched_at timestamptz NOT NULL DEFAULT now(), received_by uuid, received_at timestamptz, destination_location_id uuid REFERENCES public.locations(id), notes text,
 CHECK ((equipment_id IS NULL) <> (media_player_id IS NULL))
);
GRANT SELECT ON public.warehouse_transfer_batches TO authenticated;
GRANT ALL ON public.warehouse_transfer_batches TO service_role;
ALTER TABLE public.warehouse_transfer_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped warehouse transfer batch reads" ON public.warehouse_transfer_batches FOR SELECT TO authenticated USING (
 public.has_role(auth.uid(),'super_admin') OR EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id=destination_warehouse_id AND EXISTS(SELECT 1 FROM unnest(CASE WHEN cardinality(w.departments)>0 THEN w.departments ELSE ARRAY[w.department] END) d WHERE public.has_department_permission(auth.uid(),d,'view')))
 OR EXISTS(SELECT 1 FROM public.goods_issue_pending p WHERE p.id=pending_id AND (p.created_by=auth.uid() OR public.has_department_permission(auth.uid(),p.requester_department,'view')))
);
CREATE UNIQUE INDEX warehouse_transfer_dispatch_identity ON public.warehouse_transfer_batches(dispatch_key, coalesce(equipment_id, media_player_id));
CREATE INDEX warehouse_transfer_receipt_queue ON public.warehouse_transfer_batches(destination_warehouse_id,dispatched_at DESC) WHERE status='in_transit';
CREATE TRIGGER audit_warehouse_transfer_batches AFTER INSERT OR UPDATE ON public.warehouse_transfer_batches FOR EACH ROW EXECUTE FUNCTION public.log_activity('warehouse_transfer');

CREATE OR REPLACE FUNCTION public.transfer_warehouse_allowed(_warehouse_id uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.warehouses w WHERE w.id=_warehouse_id AND w.is_active AND (public.has_role(auth.uid(),'super_admin') OR EXISTS(SELECT 1 FROM unnest(CASE WHEN cardinality(w.departments)>0 THEN w.departments ELSE ARRAY[w.department] END) d WHERE public.has_department_permission(auth.uid(),d,_permission))));
$$;
REVOKE ALL ON FUNCTION public.transfer_warehouse_allowed(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_warehouse_allowed(uuid,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.dispatch_warehouse_transfer(_item_id uuid, _quantity integer, _allocations jsonb, _units jsonb, _serials text[], _notes text, _dispatch_key uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.goods_issue_pending_items; p public.goods_issue_pending; e record; m record; a record; u record; loc record; v_qty integer; v_before integer; v_balance numeric; v_volume numeric; v_total_volume numeric; v_batch uuid; v_allocs jsonb; v_source jsonb; v_serial_ids uuid[]; v_serial text; v_mp uuid; v_remaining integer; v_line_id uuid; v_first boolean:=true; v_ids uuid[]:='{}'; v_has_ledger boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_function_permission(auth.uid(),'goods_issue') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์จ่ายสินค้า'; END IF;
 IF _quantity IS NULL OR _quantity<1 OR _dispatch_key IS NULL THEN RAISE EXCEPTION 'จำนวนหรือรหัสการจ่ายไม่ถูกต้อง'; END IF;
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายการเบิก'; END IF;
 SELECT * INTO p FROM public.goods_issue_pending WHERE id=l.pending_id FOR UPDATE;
 SELECT * INTO l FROM public.goods_issue_pending_items WHERE id=_item_id FOR UPDATE;
 IF NOT public.has_department_permission(auth.uid(),p.requester_department,'edit') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์ฝ่ายของใบเบิก'; END IF;
 IF EXISTS(SELECT 1 FROM public.warehouse_transfer_batches WHERE dispatch_key=_dispatch_key AND pending_item_id=_item_id) THEN RETURN jsonb_build_object('ok',true,'replayed',true); END IF;
 IF p.transfer_to_warehouse_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.issue_purposes WHERE id=p.purpose_id AND is_transfer) THEN RAISE EXCEPTION 'ใบนี้ไม่ใช่โอนย้ายคลัง'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=p.transfer_to_warehouse_id AND is_active) THEN RAISE EXCEPTION 'คลังปลายทางไม่พร้อมใช้งาน'; END IF;
 IF p.status NOT IN ('pending','approved','waiting_stock','partial','partially_issued') OR (p.requires_approval AND p.approval_status IS DISTINCT FROM 'approved') OR l.status IN ('issued','completed','rejected','cancelled') OR _quantity>l.quantity-coalesce(l.issued_quantity,0) THEN RAISE EXCEPTION 'รายการไม่พร้อมจ่ายหรือจำนวนเกินยอดค้าง'; END IF;
 IF coalesce(l.is_media_player,false) OR l.media_player_id IS NOT NULL THEN
  IF jsonb_array_length(coalesce(_units,'[]'))<>_quantity OR (SELECT count(DISTINCT x->>'media_player_id') FROM jsonb_array_elements(_units) x)<>_quantity THEN RAISE EXCEPTION 'กรุณาเลือก Media Player ไม่ซ้ำให้ครบจำนวน'; END IF;
 ELSE
  SELECT * INTO e FROM public.equipment WHERE id=l.equipment_id FOR UPDATE;
  IF NOT FOUND OR NOT e.is_active OR e.quantity_in_stock<_quantity OR NOT public.has_department_permission(auth.uid(),e.department,'edit') THEN RAISE EXCEPTION 'สต็อกไม่พอหรือไม่มีสิทธิ์สินค้า'; END IF;
 END IF;
 FOR u IN SELECT x FROM jsonb_array_elements(CASE WHEN coalesce(l.is_media_player,false) OR l.media_player_id IS NOT NULL THEN _units ELSE jsonb_build_array(jsonb_build_object('equipment_id',l.equipment_id)) END) x ORDER BY x->>'media_player_id' LOOP
  v_mp:=NULL; v_total_volume:=0; v_source:='[]'; v_serial_ids:='{}'; v_serial:=NULL;
  IF coalesce(l.is_media_player,false) OR l.media_player_id IS NOT NULL THEN
   v_mp:=(u.x->>'media_player_id')::uuid; v_qty:=1;
   SELECT * INTO m FROM public.media_players WHERE id=v_mp FOR UPDATE;
   IF NOT FOUND OR NOT m.is_active OR m.code IS DISTINCT FROM l.equipment_code OR m.quantity<1 OR m.billboard_id IS NOT NULL OR NOT public.has_department_permission(auth.uid(),m.department,'edit') THEN RAISE EXCEPTION 'Media Player ไม่พร้อมจ่ายหรือไม่มีสิทธิ์'; END IF;
   v_serial:=u.x->>'serial_number';
   IF v_serial IS NULL OR (v_serial IS DISTINCT FROM m.serial_number_1 AND v_serial IS DISTINCT FROM m.serial_number_2) THEN RAISE EXCEPTION 'S/N ไม่ตรงกับ Media Player'; END IF;
   v_before:=m.quantity; v_allocs:=jsonb_build_array(jsonb_build_object('locationId',m.location_id,'quantity',1));
  ELSE
   v_qty:=_quantity; v_before:=e.quantity_in_stock; v_allocs:=coalesce(_allocations,'[]');
   IF jsonb_array_length(v_allocs)=0 THEN v_allocs:=jsonb_build_array(jsonb_build_object('locationId',e.location_id,'quantity',v_qty)); END IF;
   IF (SELECT count(*) FROM unnest(coalesce(_serials,'{}')) s)<>(SELECT count(DISTINCT s) FROM unnest(coalesce(_serials,'{}')) s) THEN RAISE EXCEPTION 'S/N ซ้ำ'; END IF;
   IF cardinality(coalesce(_serials,'{}'))>0 THEN
    IF cardinality(_serials)<>v_qty THEN RAISE EXCEPTION 'S/N ต้องครบจำนวนที่จ่าย'; END IF;
    PERFORM 1 FROM public.equipment_serial_numbers WHERE equipment_id=e.id AND serial_number=ANY(_serials) ORDER BY id FOR UPDATE;
    SELECT array_agg(id) INTO v_serial_ids FROM public.equipment_serial_numbers WHERE equipment_id=e.id AND serial_number=ANY(_serials) AND status='in_stock';
    IF coalesce(cardinality(v_serial_ids),0)<>v_qty THEN RAISE EXCEPTION 'S/N ไม่อยู่ในคลังหรือถูกจ่ายแล้ว'; END IF;
    v_serial:=array_to_string(_serials,E'\n');
   ELSIF EXISTS(SELECT 1 FROM public.equipment_serial_numbers WHERE equipment_id=e.id AND status='in_stock') THEN RAISE EXCEPTION 'สินค้านี้ต้องเลือก S/N ให้ครบ';
   END IF;
  END IF;
  IF (SELECT coalesce(sum((x->>'quantity')::numeric),0) FROM jsonb_array_elements(v_allocs) x)<>v_qty OR (SELECT count(*) FROM jsonb_array_elements(v_allocs))<>(SELECT count(DISTINCT x->>'locationId') FROM jsonb_array_elements(v_allocs) x) THEN RAISE EXCEPTION 'จำนวนช่องต้นทางไม่ครบหรือซ้ำ'; END IF;
  FOR a IN SELECT x FROM jsonb_array_elements(v_allocs) x ORDER BY x->>'locationId' LOOP
   SELECT * INTO loc FROM public.locations WHERE id=(a.x->>'locationId')::uuid FOR UPDATE;
   IF NOT FOUND OR NOT loc.is_active OR loc.warehouse_id=p.transfer_to_warehouse_id OR NOT public.transfer_warehouse_allowed(loc.warehouse_id,'edit') OR (a.x->>'quantity')::numeric<=0 OR (a.x->>'quantity')::numeric<>trunc((a.x->>'quantity')::numeric) THEN RAISE EXCEPTION 'ช่องต้นทางไม่ถูกต้องหรือไม่มีสิทธิ์'; END IF;
   SELECT count(*)>0,coalesce(sum(quantity),0),coalesce(sum(volume_cm3),0) INTO v_has_ledger,v_balance,v_volume FROM public.stock_location_allocations WHERE location_id=loc.id AND (CASE WHEN v_mp IS NULL THEN equipment_id=e.id ELSE media_player_id=v_mp END);
   IF v_has_ledger AND v_balance<(a.x->>'quantity')::numeric THEN RAISE EXCEPTION 'ยอดช่องต้นทางไม่พอ'; END IF;
   IF NOT v_has_ledger AND loc.id IS DISTINCT FROM (CASE WHEN v_mp IS NULL THEN e.location_id ELSE m.location_id END) THEN RAISE EXCEPTION 'ไม่พบยอดช่องต้นทาง'; END IF;
   IF v_has_ledger AND v_balance>0 THEN v_volume:=greatest(v_volume,0)*(a.x->>'quantity')::numeric/v_balance; ELSE v_volume:=0; END IF;
   v_total_volume:=v_total_volume+v_volume;
   v_source:=v_source||jsonb_build_array(jsonb_build_object('locationId',loc.id,'quantity',(a.x->>'quantity')::integer,'volume_cm3',v_volume));
   IF cardinality(v_serial_ids)>0 AND EXISTS(SELECT 1 FROM public.equipment_serial_numbers WHERE id=ANY(v_serial_ids) AND location_id IS DISTINCT FROM loc.id) AND jsonb_array_length(v_allocs)=1 THEN RAISE EXCEPTION 'S/N ไม่ตรงช่องต้นทาง'; END IF;
   INSERT INTO public.stock_location_allocations(equipment_id,media_player_id,location_id,warehouse_id,quantity,volume_cm3,reference_type,reference_id,reference_document,created_by) VALUES(CASE WHEN v_mp IS NULL THEN e.id END,v_mp,loc.id,loc.warehouse_id,-(a.x->>'quantity')::integer,-v_volume,'warehouse_transfer_out',_item_id,p.document_no,auth.uid());
   UPDATE public.locations SET used_volume_cm3=greatest(0,coalesce(used_volume_cm3,0)-v_volume) WHERE id=loc.id;
  END LOOP;
  IF v_mp IS NOT NULL THEN
   UPDATE public.media_players SET quantity=quantity-1,status='issued',location_id=NULL,updated_at=now() WHERE id=v_mp;
   IF v_first THEN
    v_line_id:=l.id;
    UPDATE public.goods_issue_pending_items SET quantity=1,issued_quantity=1,remaining_quantity=0,status='issued',media_player_id=v_mp,is_media_player=true,serial_number=v_serial,transferred_qty=1,needs_return=false,billboard_id=NULL,intended_billboard_id=NULL,install_status='not_required' WHERE id=l.id;
    v_first:=false;
   ELSE
    INSERT INTO public.goods_issue_pending_items(pending_id,media_player_id,is_media_player,equipment_code,equipment_name,unit,quantity,issued_quantity,remaining_quantity,status,serial_number,transferred_qty,needs_return,install_status) VALUES(p.id,v_mp,true,l.equipment_code,l.equipment_name,l.unit,1,1,0,'issued',v_serial,1,false,'not_required') RETURNING id INTO v_line_id;
   END IF;
  ELSE
   v_line_id:=l.id;
   UPDATE public.equipment SET quantity_in_stock=quantity_in_stock-v_qty,updated_at=now() WHERE id=e.id;
   UPDATE public.equipment_serial_numbers SET status='issued',location_id=NULL,issue_document_no=p.document_no,issued_at=now() WHERE id=ANY(v_serial_ids);
   UPDATE public.goods_issue_pending_items SET issued_quantity=coalesce(issued_quantity,0)+v_qty,remaining_quantity=quantity-coalesce(issued_quantity,0)-v_qty,status=CASE WHEN quantity-coalesce(issued_quantity,0)-v_qty=0 THEN 'issued' ELSE 'waiting_stock' END,transferred_qty=coalesce(transferred_qty,0)+v_qty,needs_return=false,billboard_id=NULL,intended_billboard_id=NULL,install_status='not_required',serial_number=coalesce(v_serial,serial_number) WHERE id=l.id;
  END IF;
  INSERT INTO public.warehouse_transfer_batches(dispatch_key,pending_id,pending_item_id,document_no,equipment_id,media_player_id,equipment_code,equipment_name,unit,quantity,destination_warehouse_id,source_allocations,serial_ids,serial_number,volume_cm3,dispatched_by,notes) VALUES(_dispatch_key,p.id,v_line_id,p.document_no,CASE WHEN v_mp IS NULL THEN e.id END,v_mp,l.equipment_code,l.equipment_name,l.unit,v_qty,p.transfer_to_warehouse_id,v_source,v_serial_ids,v_serial,v_total_volume,auth.uid(),_notes) RETURNING id INTO v_batch;
  v_ids:=array_append(v_ids,v_batch);
  INSERT INTO public.stock_movements(equipment_id,equipment_code,equipment_name,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reference_document,location_id,notes,created_by) VALUES(coalesce(v_mp,e.id),l.equipment_code,l.equipment_name,'transfer_out',v_qty,v_before,v_before-v_qty,'warehouse_transfer',v_batch,p.document_no,(v_source->0->>'locationId')::uuid,'ส่งโอน รอคลังปลายทางรับเข้า',auth.uid());
 END LOOP;
 IF coalesce(l.is_media_player,false) OR l.media_player_id IS NOT NULL THEN
  v_remaining:=l.quantity-coalesce(l.issued_quantity,0)-_quantity;
  IF v_remaining>0 THEN INSERT INTO public.goods_issue_pending_items(pending_id,is_media_player,equipment_code,equipment_name,unit,quantity,issued_quantity,remaining_quantity,status,needs_return) VALUES(p.id,true,l.equipment_code,l.equipment_name,l.unit,v_remaining,0,v_remaining,'waiting_stock',false); END IF;
 END IF;
 UPDATE public.goods_issue_pending SET quantity=t.q,issued_quantity=t.i,remaining_quantity=t.q-t.i,total_items=t.n,status=CASE WHEN t.q=t.i THEN 'issued' ELSE 'waiting_stock' END,issued_at=now(),issued_by=auth.uid() FROM (SELECT sum(quantity)::integer q,sum(coalesce(issued_quantity,0))::integer i,count(*)::integer n FROM public.goods_issue_pending_items WHERE pending_id=p.id) t WHERE id=p.id;
 RETURN jsonb_build_object('ok',true,'batch_ids',v_ids);
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_warehouse_transfer(uuid,integer,jsonb,jsonb,text[],text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dispatch_warehouse_transfer(uuid,integer,jsonb,jsonb,text[],text,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.receive_warehouse_transfer(_batch_id uuid,_location_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.warehouse_transfer_batches; loc public.locations; w public.warehouses; v_before integer; v_dept text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_function_permission(auth.uid(),'goods_issue') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์รับโอน'; END IF;
 SELECT * INTO b FROM public.warehouse_transfer_batches WHERE id=_batch_id FOR UPDATE;
 IF NOT FOUND OR NOT public.transfer_warehouse_allowed(b.destination_warehouse_id,'edit') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์คลังปลายทาง'; END IF;
 IF b.status='received' THEN RETURN jsonb_build_object('ok',true,'replayed',true); END IF;
 SELECT * INTO loc FROM public.locations WHERE id=_location_id FOR UPDATE;
 IF NOT FOUND OR NOT loc.is_active OR loc.warehouse_id IS DISTINCT FROM b.destination_warehouse_id THEN RAISE EXCEPTION 'กรุณาเลือกช่องในคลังปลายทาง'; END IF;
 IF coalesce(loc.volume_cm3,0)>0 AND coalesce(loc.used_volume_cm3,0)+b.volume_cm3>loc.volume_cm3 THEN RAISE EXCEPTION 'พื้นที่ช่องจัดเก็บไม่พอ'; END IF;
 SELECT * INTO w FROM public.warehouses WHERE id=b.destination_warehouse_id;
 SELECT d INTO v_dept FROM unnest(CASE WHEN cardinality(w.departments)>0 THEN w.departments ELSE ARRAY[w.department] END) d WHERE public.has_department_permission(auth.uid(),d,'edit') ORDER BY d LIMIT 1;
 IF b.media_player_id IS NOT NULL THEN
  SELECT quantity INTO v_before FROM public.media_players WHERE id=b.media_player_id FOR UPDATE;
  UPDATE public.media_players SET quantity=quantity+b.quantity,status='in_stock',location_id=loc.id,department=v_dept,updated_at=now() WHERE id=b.media_player_id;
 ELSE
  SELECT quantity_in_stock INTO v_before FROM public.equipment WHERE id=b.equipment_id FOR UPDATE;
  UPDATE public.equipment SET quantity_in_stock=quantity_in_stock+b.quantity,location_id=CASE WHEN quantity_in_stock=0 THEN loc.id ELSE location_id END,updated_at=now() WHERE id=b.equipment_id;
  UPDATE public.equipment_serial_numbers SET status='in_stock',location_id=loc.id,updated_at=now() WHERE id=ANY(b.serial_ids);
 END IF;
 INSERT INTO public.stock_location_allocations(equipment_id,media_player_id,location_id,warehouse_id,quantity,volume_cm3,reference_type,reference_id,reference_document,created_by) VALUES(b.equipment_id,b.media_player_id,loc.id,loc.warehouse_id,b.quantity,b.volume_cm3,'warehouse_transfer_in',b.id,b.document_no,auth.uid());
 UPDATE public.locations SET used_volume_cm3=coalesce(used_volume_cm3,0)+b.volume_cm3 WHERE id=loc.id;
 INSERT INTO public.stock_movements(equipment_id,equipment_code,equipment_name,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reference_document,location_id,notes,created_by) VALUES(coalesce(b.media_player_id,b.equipment_id),b.equipment_code,b.equipment_name,'transfer_in',b.quantity,v_before,v_before+b.quantity,'warehouse_transfer',b.id,b.document_no,loc.id,'คลังปลายทางยืนยันรับโอน',auth.uid());
 UPDATE public.warehouse_transfer_batches SET status='received',received_by=auth.uid(),received_at=now(),destination_location_id=loc.id WHERE id=b.id;
 UPDATE public.goods_issue_pending_items SET transfer_to_location_id=loc.id WHERE id=b.pending_item_id;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.receive_warehouse_transfer(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_warehouse_transfer(uuid,uuid) TO authenticated,service_role;