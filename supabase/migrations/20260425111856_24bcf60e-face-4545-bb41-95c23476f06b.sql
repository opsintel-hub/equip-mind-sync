
CREATE OR REPLACE FUNCTION public.get_public_schema_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only super_admin can run this
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin only';
  END IF;

  WITH tbls AS (
    SELECT
      c.relname AS table_name,
      COALESCE(s.n_live_tup, 0)::bigint AS row_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s
      ON s.schemaname = n.nspname AND s.relname = c.relname
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  ),
  cols AS (
    SELECT
      table_name,
      jsonb_agg(
        jsonb_build_object(
          'name', column_name,
          'type', data_type,
          'nullable', is_nullable = 'YES',
          'default', column_default
        )
        ORDER BY ordinal_position
      ) AS columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', t.table_name,
      'row_count', t.row_count,
      'columns', COALESCE(c.columns, '[]'::jsonb)
    )
    ORDER BY t.table_name
  )
  INTO result
  FROM tbls t
  LEFT JOIN cols c ON c.table_name = t.table_name;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_schema_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_schema_info() TO authenticated;
