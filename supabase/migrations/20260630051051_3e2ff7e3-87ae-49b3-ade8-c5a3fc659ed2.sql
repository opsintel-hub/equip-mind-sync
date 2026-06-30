
-- 1. Available stock per equipment / media_player (aggregated)
CREATE OR REPLACE FUNCTION public.get_pending_reservations()
RETURNS TABLE(equipment_id uuid, media_player_id uuid, reserved numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.equipment_id,
    i.media_player_id,
    SUM(GREATEST(COALESCE(i.quantity,0) - COALESCE(i.issued_quantity,0), 0))::numeric AS reserved
  FROM public.goods_issue_pending_items i
  JOIN public.goods_issue_pending p ON p.id = i.pending_id
  WHERE p.status IN ('pending','pending_approval','approved','partial','waiting_stock')
    AND COALESCE(i.status,'pending') NOT IN ('rejected','cancelled','issued','completed')
  GROUP BY i.equipment_id, i.media_player_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_reservations() TO authenticated;

-- 2. Create PR from shortage
CREATE OR REPLACE FUNCTION public.create_pr_from_shortage(
  _equipment_id uuid,
  _is_media_player boolean,
  _equipment_code text,
  _equipment_name text,
  _requested_qty integer,
  _available_qty integer,
  _requester_name text,
  _unit text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_min int := 0;
  v_existing record;
  v_shortage int := GREATEST(_requested_qty - GREATEST(_available_qty,0), 1);
  v_suggested int;
  v_pr_id uuid;
  v_pr_number text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF NOT _is_media_player AND _equipment_id IS NOT NULL THEN
    SELECT COALESCE(min_stock_level, 0) INTO v_min FROM public.equipment WHERE id = _equipment_id;
  END IF;

  v_suggested := v_shortage + COALESCE(v_min, 0);

  -- Check existing pending PR for same equipment_id
  IF _equipment_id IS NOT NULL THEN
    SELECT id, pr_number, suggested_quantity INTO v_existing
    FROM public.purchase_requests
    WHERE equipment_id = _equipment_id AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.purchase_requests
      SET suggested_quantity = GREATEST(v_existing.suggested_quantity, v_suggested),
          reason = COALESCE(reason,'') || E'\n[' || to_char(now(),'DD/MM HH24:MI') || '] +คำขอจาก ' || COALESCE(_requester_name,'-') || ' (ขอ ' || _requested_qty || ' มี ' || _available_qty || ')',
          updated_at = now()
      WHERE id = v_existing.id;
      RETURN jsonb_build_object('success', true, 'pr_id', v_existing.id, 'pr_number', v_existing.pr_number, 'updated', true);
    END IF;
  END IF;

  INSERT INTO public.purchase_requests (
    equipment_id, equipment_code, equipment_name,
    current_stock, min_stock_level, suggested_quantity, unit,
    reason, status
  ) VALUES (
    CASE WHEN _is_media_player THEN NULL ELSE _equipment_id END,
    _equipment_code,
    _equipment_name,
    GREATEST(_available_qty, 0),
    v_min,
    v_suggested,
    COALESCE(NULLIF(_unit,''), 'ชิ้น'),
    'คำขอเบิกของ ' || COALESCE(_requester_name,'-') || ' เกินสต็อก (ขอ ' || _requested_qty || ' มี ' || _available_qty || ')'
      || CASE WHEN _is_media_player THEN ' [Media Player]' ELSE '' END,
    'pending'
  )
  RETURNING id, pr_number INTO v_pr_id, v_pr_number;

  RETURN jsonb_build_object('success', true, 'pr_id', v_pr_id, 'pr_number', v_pr_number, 'updated', false);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pr_from_shortage(uuid, boolean, text, text, integer, integer, text, text) TO authenticated;

-- 3. Auto-create PR when a pending request becomes waiting_stock
CREATE OR REPLACE FUNCTION public.auto_pr_on_waiting_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_avail int;
  v_existing_id uuid;
BEGIN
  IF NEW.status = 'waiting_stock' AND (OLD.status IS NULL OR OLD.status <> 'waiting_stock') THEN
    FOR v_item IN
      SELECT i.equipment_id, i.media_player_id, i.equipment_code, i.equipment_name,
             i.quantity, i.issued_quantity, i.unit, i.is_media_player
      FROM public.goods_issue_pending_items i
      WHERE i.pending_id = NEW.id
    LOOP
      -- skip Media Player (one-off asset) — keep behavior simple
      IF v_item.is_media_player OR v_item.media_player_id IS NOT NULL THEN
        CONTINUE;
      END IF;

      IF v_item.equipment_id IS NULL THEN CONTINUE; END IF;

      SELECT id INTO v_existing_id
      FROM public.purchase_requests
      WHERE equipment_id = v_item.equipment_id AND status = 'pending'
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN CONTINUE; END IF;

      SELECT COALESCE(quantity_in_stock, 0) INTO v_avail FROM public.equipment WHERE id = v_item.equipment_id;

      PERFORM public.create_pr_from_shortage(
        v_item.equipment_id, false,
        v_item.equipment_code, v_item.equipment_name,
        COALESCE(v_item.quantity,0)::int,
        COALESCE(v_avail,0)::int,
        NEW.requester_name,
        v_item.unit
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_pr_on_waiting_stock ON public.goods_issue_pending;
CREATE TRIGGER trg_auto_pr_on_waiting_stock
AFTER UPDATE OF status ON public.goods_issue_pending
FOR EACH ROW
EXECUTE FUNCTION public.auto_pr_on_waiting_stock();
