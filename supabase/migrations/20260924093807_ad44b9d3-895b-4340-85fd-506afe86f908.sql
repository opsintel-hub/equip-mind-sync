CREATE OR REPLACE FUNCTION public.adjust_equipment_quantity(_equipment_id uuid, _new_qty numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; _name text; _email text; _roles text[];
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'เฉพาะ Super Admin เท่านั้นที่ปรับจำนวนในคลังได้';
  END IF;
  IF _new_qty IS NULL OR _new_qty < 0 THEN RAISE EXCEPTION 'จำนวนต้องไม่ติดลบ'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลการปรับยอด'; END IF;
  SELECT * INTO e FROM equipment WHERE id = _equipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบอุปกรณ์'; END IF;
  IF e.quantity_in_stock = _new_qty THEN RETURN jsonb_build_object('changed', false); END IF;

  SELECT full_name INTO _name FROM profiles WHERE id = auth.uid();
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  SELECT coalesce(array_agg(role::text), '{}') INTO _roles FROM user_roles WHERE user_id = auth.uid();

  UPDATE equipment SET quantity_in_stock = _new_qty, updated_at = now() WHERE id = _equipment_id;

  INSERT INTO stock_movements(equipment_id, equipment_code, equipment_name, movement_type, quantity,
    stock_before, stock_after, reference_type, reference_document, location_id, notes, item_condition, created_by)
  VALUES (e.id, e.code, e.name, 'adjustment', abs(_new_qty - e.quantity_in_stock),
    e.quantity_in_stock, _new_qty, 'manual_adjustment', 'ADJ-' || to_char(now(),'YYYYMMDD-HH24MISS'),
    e.location_id, 'ปรับยอดโดย Super Admin: ' || _reason, e.item_condition, auth.uid());

  INSERT INTO activity_audit(module, entity_table, entity_id, doc_number, action, actor_id, actor_name, actor_email,
    actor_roles, is_super_admin_action, department, changed_fields, notes)
  VALUES ('stock_adjustment', 'equipment', e.id, e.code, 'updated', auth.uid(), _name, _email,
    _roles, true, e.department,
    jsonb_build_object('quantity_in_stock', jsonb_build_object('from', e.quantity_in_stock, 'to', _new_qty)),
    _reason);

  RETURN jsonb_build_object('changed', true, 'from', e.quantity_in_stock, 'to', _new_qty);
END $$;
REVOKE ALL ON FUNCTION public.adjust_equipment_quantity(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.adjust_equipment_quantity(uuid, numeric, text) TO authenticated;