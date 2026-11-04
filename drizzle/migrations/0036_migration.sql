CREATE OR REPLACE FUNCTION public.import_rows_batch(p_rpc text, p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_row jsonb;
  v_res jsonb;
BEGIN
  IF p_rpc NOT IN ('import_equipment_row','import_media_player_row','import_tool_row') THEN
    RAISE EXCEPTION 'invalid import function';
  END IF;
  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'batch too large';
  END IF;
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    BEGIN
      EXECUTE format('SELECT public.%I($1)', p_rpc) INTO v_res USING v_row;
    EXCEPTION WHEN OTHERS THEN
      v_res := jsonb_build_object('success', false, 'error', SQLERRM);
    END;
    v_out := v_out || jsonb_build_array(COALESCE(v_res, '{}'::jsonb));
  END LOOP;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.import_rows_batch(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_rows_batch(text, jsonb) TO authenticated;