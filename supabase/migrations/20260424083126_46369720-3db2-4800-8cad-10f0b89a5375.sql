-- Restrict billboard write operations to super_admin only
-- Drop existing write policies on billboards table if any
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'billboards'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.billboards', pol.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.billboards ENABLE ROW LEVEL SECURITY;

-- Only super_admin can insert/update/delete billboards
CREATE POLICY "Only super_admin can insert billboards"
ON public.billboards
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super_admin can update billboards"
ON public.billboards
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super_admin can delete billboards"
ON public.billboards
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));