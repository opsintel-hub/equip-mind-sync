CREATE POLICY "Public can view active permission templates for signup"
ON public.permission_templates
FOR SELECT
TO anon
USING (is_active = true);