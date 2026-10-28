ALTER TABLE public.goods_issue_pending_items ADD COLUMN IF NOT EXISTS swap_returned_defective_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.magic_ticket_events ADD COLUMN IF NOT EXISTS swap_return_qty numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.goods_issue_pending_items.swap_returned_defective_qty IS 'Subset of returned_defective_qty: old parts removed during Magic Ticket Swap, not newly issued units.';
COMMENT ON COLUMN public.magic_ticket_events.swap_return_qty IS 'Immutable quantity classification for accurate Swap accounting and revert.';
UPDATE public.magic_ticket_events r SET swap_return_qty = r.quantity
WHERE r.event_type='return_defective' AND r.status='applied' AND r.reverted_at IS NULL AND r.serial_number IS NULL
AND r.billboard_id IS NOT NULL AND r.payload->>'return_source' IS DISTINCT FROM 'issued'
AND EXISTS (SELECT 1 FROM public.magic_ticket_events e WHERE e.pending_item_id=r.pending_item_id AND e.ticket_code=r.ticket_code AND e.billboard_id=r.billboard_id AND e.event_type='install' AND e.status='applied' AND e.reverted_at IS NULL AND e.created_at<=r.created_at)
AND (SELECT coalesce(sum(x.quantity),0) FROM public.magic_ticket_events x WHERE x.pending_item_id=r.pending_item_id AND x.ticket_code=r.ticket_code AND x.billboard_id=r.billboard_id AND x.event_type='return_defective' AND x.status='applied' AND x.reverted_at IS NULL AND x.serial_number IS NULL AND x.created_at<=r.created_at)
<= (SELECT coalesce(sum(e.quantity),0) FROM public.magic_ticket_events e WHERE e.pending_item_id=r.pending_item_id AND e.ticket_code=r.ticket_code AND e.billboard_id=r.billboard_id AND e.event_type='install' AND e.status='applied' AND e.reverted_at IS NULL AND e.created_at<=r.created_at);
UPDATE public.goods_issue_pending_items i SET swap_returned_defective_qty=least(coalesce(i.returned_defective_qty,0),(SELECT coalesce(sum(e.swap_return_qty),0) FROM public.magic_ticket_events e WHERE e.pending_item_id=i.id AND e.status='applied' AND e.reverted_at IS NULL)) WHERE EXISTS (SELECT 1 FROM public.magic_ticket_events e WHERE e.pending_item_id=i.id AND e.swap_return_qty>0);
CREATE OR REPLACE FUNCTION public.magic_ticket_unused_quantity(issued numeric, installed numeric, good numeric, defective numeric, swap_old numeric, written_off numeric, transferred numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT greatest(0,coalesce(issued,0)-coalesce(installed,0)-coalesce(good,0)-greatest(0,coalesce(defective,0)-coalesce(swap_old,0))-coalesce(written_off,0)-coalesce(transferred,0)) $$;
REVOKE ALL ON FUNCTION public.magic_ticket_unused_quantity(numeric,numeric,numeric,numeric,numeric,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_unused_quantity(numeric,numeric,numeric,numeric,numeric,numeric,numeric) TO service_role;
DO $migration$
DECLARE fn text;
BEGIN
fn := pg_get_functiondef('public.magic_ticket_line_json(uuid)'::regprocedure);
fn := replace(fn, '''unused_qty'', greatest(0, q.issued - q.installed - coalesce(i.returned_good_qty,0) - coalesce(i.returned_defective_qty,0)
                  - coalesce(i.written_off_qty,0) - coalesce(i.transferred_qty,0)),', '''swap_returned_defective_qty'', i.swap_returned_defective_qty,
    ''issued_returned_defective_qty'', greatest(0,coalesce(i.returned_defective_qty,0)-i.swap_returned_defective_qty),
    ''unused_qty'', public.magic_ticket_unused_quantity(q.issued,q.installed,i.returned_good_qty,i.returned_defective_qty,i.swap_returned_defective_qty,i.written_off_qty,i.transferred_qty),');
IF position('''issued_returned_defective_qty''' IN fn)=0 THEN RAISE EXCEPTION 'Unexpected line_json definition'; END IF;
EXECUTE fn;
fn := pg_get_functiondef('public.magic_ticket_work_log(jsonb,uuid)'::regprocedure);
fn := replace(fn,'v_serials text[]; v_issued numeric; v_installed numeric; v_left numeric;', 'v_serials text[]; v_issued numeric; v_installed numeric; v_left numeric; v_swap numeric := 0; v_swap_capacity numeric := 0;');
fn := replace(fn,'v_existing.response || jsonb_build_object(''duplicate'', true)', 'v_existing.response || jsonb_build_object(''duplicate'', true, ''item'', public.magic_ticket_line_json(v_existing.pending_item_id))');
fn := replace(fn,'- coalesce(i.returned_good_qty,0) - coalesce(i.returned_defective_qty,0) - coalesce(i.written_off_qty,0)', '- coalesce(i.returned_good_qty,0) - greatest(0,coalesce(i.returned_defective_qty,0)-i.swap_returned_defective_qty) - coalesce(i.written_off_qty,0)');
fn := replace(fn,'v_left := greatest(0, v_issued - v_installed - coalesce(l.returned_good_qty,0) - coalesce(l.returned_defective_qty,0)
              - coalesce(l.written_off_qty,0) - coalesce(l.transferred_qty,0));', 'v_left := public.magic_ticket_unused_quantity(v_issued,v_installed,l.returned_good_qty,l.returned_defective_qty,l.swap_returned_defective_qty,l.written_off_qty,l.transferred_qty);
    IF v_type = ''return_defective'' AND v_old IS NOT NULL AND cardinality(v_serials)=0 AND coalesce(p->>''return_source'',''swap_old'')=''swap_old'' THEN
      SELECT greatest(0,coalesce(sum(CASE WHEN e.event_type=''install'' THEN e.quantity ELSE -e.swap_return_qty END),0)) INTO v_swap_capacity FROM public.magic_ticket_events e WHERE e.pending_item_id=l.id AND e.ticket_code=v_ticket AND e.billboard_old_code=v_old AND e.status=''applied'' AND e.reverted_at IS NULL;
      IF v_swap_capacity>0 THEN v_swap:=v_qty; END IF;
    END IF;
    IF p ? ''return_source'' AND (v_type<>''return_defective'' OR p->>''return_source'' NOT IN (''issued'',''swap_old'') OR p->>''return_source'' IS NULL) THEN
      v_http:=400; v_code:=''VALIDATION_ERROR''; v_msg:=''return_source ต้องเป็น issued หรือ swap_old สำหรับคืนของเสีย'';
    ELSIF v_type=''return_defective'' AND p->>''return_source''=''swap_old'' AND v_swap=0 THEN
      v_http:=409; v_code:=''SWAP_RETURN_EXCEEDS_INSTALLED''; v_msg:=''ไม่พบยอดติดตั้ง Swap ที่คืนของเก่าได้ กรุณาตรวจป้ายและ Ticket'';
    ELSIF v_swap>0 AND v_qty>v_swap_capacity THEN
      v_http:=409; v_code:=''SWAP_RETURN_EXCEEDS_INSTALLED''; v_msg:=''จำนวนของเก่าคืนเกินยอด Swap ที่ยังไม่คืน'';
    END IF;');
fn := replace(fn,'IF cardinality(v_serials) > 0 AND v_sn IS NULL THEN','IF v_http<>200 THEN NULL;
    ELSIF cardinality(v_serials) > 0 AND v_sn IS NULL THEN');
fn := replace(fn,'ELSIF v_qty > v_left THEN','ELSIF v_swap=0 AND v_qty > v_left THEN');
fn := replace(fn,'returned_defective_qty = coalesce(returned_defective_qty,0) + v_qty, returned_at = now(),','returned_defective_qty = coalesce(returned_defective_qty,0) + v_qty, swap_returned_defective_qty=swap_returned_defective_qty+v_swap, returned_at = now(),');
fn := replace(fn,'bool_and(coalesce(returned_good_qty,0) + coalesce(returned_defective_qty,0) + coalesce(written_off_qty,0)', 'bool_and(coalesce(returned_good_qty,0) + greatest(0,coalesce(returned_defective_qty,0)-swap_returned_defective_qty) + coalesce(written_off_qty,0)');
fn := replace(fn,'is_complete = CASE WHEN v_settled THEN true ELSE is_complete END','is_complete = v_settled');
fn := replace(fn,'api_key_id, payload, response)', 'api_key_id, payload, response, swap_return_qty)');
fn := replace(fn,'p_api_key_id, coalesce(p, ''{}''::jsonb), v_resp);','p_api_key_id, coalesce(p, ''{}''::jsonb), v_resp, CASE WHEN v_http=200 THEN v_swap ELSE 0 END);');
IF position('v_left := public.magic_ticket_unused_quantity' IN fn)=0 OR position('v_resp, CASE WHEN v_http=200 THEN v_swap' IN fn)=0 THEN RAISE EXCEPTION 'Unexpected work_log definition'; END IF;
EXECUTE fn;
fn := pg_get_functiondef('public.magic_ticket_revert_event(jsonb,uuid)'::regprocedure);
fn := replace(fn,'IF ev.event_type = ''install'' THEN', 'IF ev.event_type = ''install'' AND EXISTS (SELECT 1 FROM public.magic_ticket_events r WHERE r.pending_item_id=ev.pending_item_id AND r.ticket_code=ev.ticket_code AND r.billboard_id=ev.billboard_id AND r.swap_return_qty>0 AND r.status=''applied'' AND r.reverted_at IS NULL) THEN
    RETURN jsonb_build_object(''http_status'',409,''body'',jsonb_build_object(''success'',false,''code'',''SWAP_RETURN_DEPENDENCY'',''message'',''กรุณายกเลิกคืนของเก่าจาก Swap ก่อนยกเลิกติดตั้ง''));
  END IF;
  IF ev.event_type = ''install'' THEN');
fn := replace(fn,'returned_defective_qty = greatest(0, returned_defective_qty - ev.quantity),','returned_defective_qty = greatest(0, returned_defective_qty - ev.quantity), swap_returned_defective_qty=greatest(0,swap_returned_defective_qty-ev.swap_return_qty),');
IF position('swap_returned_defective_qty-ev.swap_return_qty' IN fn)=0 THEN RAISE EXCEPTION 'Unexpected revert definition'; END IF;
EXECUTE fn;
END $migration$;
REVOKE ALL ON FUNCTION public.magic_ticket_line_json(uuid), public.magic_ticket_work_log(jsonb,uuid), public.magic_ticket_revert_event(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.magic_ticket_line_json(uuid), public.magic_ticket_work_log(jsonb,uuid), public.magic_ticket_revert_event(jsonb,uuid) TO service_role;