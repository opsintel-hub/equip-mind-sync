
CREATE OR REPLACE FUNCTION public.get_public_schema_relations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super_admin only';
  END IF;

  SELECT COALESCE(jsonb_agg(rel ORDER BY (rel->>'source_table'), (rel->>'source_column')), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'constraint_name', tc.constraint_name,
      'source_table', tc.table_name,
      'source_column', kcu.column_name,
      'target_table', ccu.table_name,
      'target_column', ccu.column_name,
      'on_delete', rc.delete_rule,
      'on_update', rc.update_rule
    ) AS rel
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
  ) s;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_schema_relations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_schema_relations() TO authenticated;
