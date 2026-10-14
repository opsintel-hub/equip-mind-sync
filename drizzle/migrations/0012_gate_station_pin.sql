CREATE TABLE public.gate_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_used_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.gate_stations TO authenticated;
GRANT UPDATE (name, warehouse_id, is_active) ON public.gate_stations TO authenticated;
GRANT ALL ON public.gate_stations TO service_role;
ALTER TABLE public.gate_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gs manage view" ON public.gate_stations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_function_permission(auth.uid(),'site_access_manage'));
CREATE POLICY "gs manage update" ON public.gate_stations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.has_function_permission(auth.uid(),'site_access_manage'));
CREATE POLICY "gs manage delete" ON public.gate_stations FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.gate_station_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.gate_stations(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gate_station_sessions TO service_role;
ALTER TABLE public.gate_station_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.warehouse_access_tickets ADD COLUMN IF NOT EXISTS checkin_station_id uuid, ADD COLUMN IF NOT EXISTS checkout_station_id uuid;
ALTER TABLE public.warehouse_access_photos ADD COLUMN IF NOT EXISTS station_id uuid;

CREATE OR REPLACE FUNCTION public.gate_station_upsert(_id uuid, _code text, _name text, _warehouse_id uuid, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _new uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_function_permission(auth.uid(),'site_access_manage')) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดการจุดตรวจ';
  END IF;
  IF _pin IS NOT NULL AND _pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'PIN ต้องเป็นตัวเลข 6 หลัก'; END IF;
  IF _id IS NULL THEN
    IF _pin IS NULL THEN RAISE EXCEPTION 'ต้องกำหนด PIN'; END IF;
    INSERT INTO public.gate_stations(code, name, warehouse_id, pin_hash)
    VALUES (upper(trim(_code)), trim(_name), _warehouse_id, extensions.crypt(_pin, extensions.gen_salt('bf'))) RETURNING id INTO _new;
    RETURN _new;
  END IF;
  UPDATE public.gate_stations SET name = trim(_name), warehouse_id = _warehouse_id,
    pin_hash = COALESCE(extensions.crypt(_pin, extensions.gen_salt('bf')), pin_hash),
    failed_attempts = CASE WHEN _pin IS NULL THEN failed_attempts ELSE 0 END,
    locked_until = CASE WHEN _pin IS NULL THEN locked_until ELSE NULL END
  WHERE id = _id;
  IF _pin IS NOT NULL THEN DELETE FROM public.gate_station_sessions WHERE station_id = _id; END IF;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.gate_station_upsert(uuid,text,text,uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gate_station_upsert(uuid,text,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gate_station_verify(_code text, _pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE s public.gate_stations;
BEGIN
  SELECT * INTO s FROM public.gate_stations WHERE code = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT s.is_active THEN RETURN jsonb_build_object('ok', false, 'message', 'ไม่พบจุดตรวจหรือถูกปิดใช้งาน'); END IF;
  IF s.locked_until IS NOT NULL AND s.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'ใส่ PIN ผิดหลายครั้ง ระบบล็อกชั่วคราว 15 นาที');
  END IF;
  IF s.pin_hash <> extensions.crypt(_pin, s.pin_hash) THEN
    UPDATE public.gate_stations SET failed_attempts = failed_attempts + 1,
      locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
      failed_attempts = CASE WHEN failed_attempts + 1 >= 5 THEN 0 ELSE failed_attempts + 1 END
    WHERE id = s.id;
    RETURN jsonb_build_object('ok', false, 'message', 'PIN ไม่ถูกต้อง');
  END IF;
  UPDATE public.gate_stations SET failed_attempts = 0, locked_until = NULL, last_used_at = now() WHERE id = s.id;
  RETURN jsonb_build_object('ok', true, 'id', s.id, 'name', s.name, 'created_by', s.created_by);
END $$;
REVOKE ALL ON FUNCTION public.gate_station_verify(text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gate_station_verify(text,text) TO service_role;