DROP POLICY IF EXISTS "Staff and admins can manage tool_code_prefixes" ON public.tool_code_prefixes;
CREATE POLICY "Staff and admins can manage tool_code_prefixes"
ON public.tool_code_prefixes
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'warehouse_staff'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'warehouse_staff'::app_role));

CREATE OR REPLACE FUNCTION public.sync_code_prefix_counters(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src text;
  v_tbl text;
  v_created int := 0;
  v_updated int := 0;
  r record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'warehouse_staff')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  IF _kind = 'equipment' THEN
    v_src := 'public.equipment'; v_tbl := 'public.equipment_code_prefixes';
  ELSIF _kind = 'tool' THEN
    v_src := 'public.tools'; v_tbl := 'public.tool_code_prefixes';
  ELSIF _kind = 'media_player' THEN
    v_src := 'public.media_players'; v_tbl := 'public.media_player_code_prefixes';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid kind');
  END IF;

  FOR r IN EXECUTE format($q$
    SELECT btrim((regexp_match(code, '^(.*?)[ -]?([0-9]{3,})$'))[1]) AS pfx,
           MAX(((regexp_match(code, '^(.*?)[ -]?([0-9]{3,})$'))[2])::bigint) AS maxnum
      FROM %s
     WHERE code ~ '^(.*?)[ -]?[0-9]{3,}$'
     GROUP BY 1
    $q$, v_src)
  LOOP
    CONTINUE WHEN r.pfx IS NULL OR r.pfx = '' OR length(r.pfx) > 7 OR r.maxnum IS NULL OR r.maxnum > 999999;

    EXECUTE format('SELECT 1 FROM %s WHERE prefix = $1', v_tbl) USING r.pfx;
    IF FOUND THEN
      EXECUTE format('UPDATE %s SET next_number = $2 WHERE prefix = $1 AND next_number <= $2 - 1', v_tbl)
        USING r.pfx, (r.maxnum + 1)::int;
      IF FOUND THEN v_updated := v_updated + 1; END IF;
    ELSE
      EXECUTE format('INSERT INTO %s (prefix, description, next_number, is_active) VALUES ($1, $2, $3, true) ON CONFLICT (prefix) DO NOTHING', v_tbl)
        USING r.pfx, 'สร้างอัตโนมัติจากการนำเข้าข้อมูล', (r.maxnum + 1)::int;
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'kind', _kind, 'created', v_created, 'updated', v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_code_prefix_counters(text) TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT btrim((regexp_match(code, '^(.*?)[ -]?([0-9]{3,})$'))[1]) AS pfx,
           MAX(((regexp_match(code, '^(.*?)[ -]?([0-9]{3,})$'))[2])::bigint) AS maxnum
      FROM public.equipment
     WHERE code ~ '^(.*?)[ -]?[0-9]{3,}$'
     GROUP BY 1
  LOOP
    CONTINUE WHEN r.pfx IS NULL OR r.pfx = '' OR length(r.pfx) > 7 OR r.maxnum > 999999;
    INSERT INTO public.equipment_code_prefixes (prefix, description, next_number, is_active)
    VALUES (r.pfx, 'สร้างอัตโนมัติจากการนำเข้าข้อมูล', (r.maxnum + 1)::int, true)
    ON CONFLICT (prefix) DO UPDATE
      SET next_number = GREATEST(public.equipment_code_prefixes.next_number, EXCLUDED.next_number);
  END LOOP;
END $$;