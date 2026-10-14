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
    UPDATE public.gate_stations SET
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