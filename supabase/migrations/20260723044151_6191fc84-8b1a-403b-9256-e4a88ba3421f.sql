CREATE POLICY "Public can view active departments for signup"
ON public.departments FOR SELECT
TO anon
USING (is_active = true);

GRANT SELECT ON public.departments TO anon;