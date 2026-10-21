CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;
REVOKE EXECUTE ON FUNCTION public.is_approved_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_approved_user(uuid) TO authenticated, service_role;

-- Permission templates: non-admins see only active templates
DROP POLICY IF EXISTS "Authenticated can view templates" ON public.permission_templates;
CREATE POLICY "Authenticated can view active templates" ON public.permission_templates
FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Section scopes: admins, or members of that section
DROP POLICY IF EXISTS "Authenticated can view section scopes" ON public.section_scopes;
CREATE POLICY "Admins or section members view section scopes" ON public.section_scopes
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.user_has_section(auth.uid(), section_id));

-- Contact data: only approved users (with an assigned role)
DROP POLICY IF EXISTS "All authenticated users can view technicians" ON public.technicians;
CREATE POLICY "Approved users can view technicians" ON public.technicians
FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Allow authenticated users to view contractors" ON public.contractors;
CREATE POLICY "Approved users can view contractors" ON public.contractors
FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view assessment logs" ON public.assessment_logs;
CREATE POLICY "Approved users can view assessment logs" ON public.assessment_logs
FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "All authenticated users can view direct_shipments" ON public.direct_shipments;
CREATE POLICY "Approved users can view direct_shipments" ON public.direct_shipments
FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view issue requests" ON public.goods_issue_pending;
CREATE POLICY "Approved users or owner can view issue requests" ON public.goods_issue_pending
FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view loans" ON public.equipment_loans;
CREATE POLICY "Approved users or owner can view loans" ON public.equipment_loans
FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.is_approved_user(auth.uid()));