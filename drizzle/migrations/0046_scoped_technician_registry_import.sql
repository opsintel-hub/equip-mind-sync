CREATE UNIQUE INDEX technicians_department_name_key ON public.technicians (department, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
GRANT SELECT, INSERT, UPDATE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;
DROP POLICY IF EXISTS "Approved users can view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Staff and admins can manage technicians" ON public.technicians;
CREATE POLICY "Scoped technician reads" ON public.technicians FOR SELECT TO authenticated USING (public.is_approved_user(auth.uid()) AND public.has_department_permission(auth.uid(), department, 'view'));
CREATE POLICY "Scoped technician creation" ON public.technicians FOR INSERT TO authenticated WITH CHECK (public.is_approved_user(auth.uid()) AND public.has_function_permission(auth.uid(), 'md_technicians') AND public.has_department_permission(auth.uid(), department, 'create'));
CREATE POLICY "Scoped technician edits" ON public.technicians FOR UPDATE TO authenticated USING (public.is_approved_user(auth.uid()) AND public.has_function_permission(auth.uid(), 'md_technicians') AND public.has_department_permission(auth.uid(), department, 'edit')) WITH CHECK (public.is_approved_user(auth.uid()) AND public.has_function_permission(auth.uid(), 'md_technicians') AND public.has_department_permission(auth.uid(), department, 'edit'));
CREATE OR REPLACE FUNCTION public.validate_technician_department() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.name := regexp_replace(btrim(NEW.name), '\s+', ' ', 'g');
 IF NEW.name = '' OR NOT EXISTS (SELECT 1 FROM public.departments WHERE name = NEW.department AND is_active) THEN RAISE EXCEPTION 'กรุณาระบุชื่อช่างและฝ่ายที่ใช้งานอยู่'; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_technician_department BEFORE INSERT OR UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.validate_technician_department();
CREATE OR REPLACE FUNCTION public.import_technician_roster(p_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r jsonb; existing public.technicians; n text; d text; c text; added integer := 0; updated integer := 0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_approved_user(auth.uid()) OR NOT public.has_function_permission(auth.uid(), 'md_technicians') THEN RAISE EXCEPTION 'ไม่มีสิทธิ์นำเข้ารายชื่อช่าง'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) > 5000 OR jsonb_array_length(p_rows) = 0 THEN RAISE EXCEPTION 'กรุณานำเข้า 1–5,000 รายชื่อ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('technician_roster_import'));
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  n := regexp_replace(btrim(r->>'name'), '\s+', ' ', 'g'); d := btrim(r->>'department'); c := nullif(btrim(r->>'code'), '');
  existing := NULL;
  IF c IS NOT NULL THEN SELECT * INTO existing FROM public.technicians WHERE code = c; END IF;
  IF existing.id IS NULL THEN SELECT * INTO existing FROM public.technicians WHERE department = d AND lower(name) = lower(n); END IF;
  IF existing.id IS NULL THEN
   INSERT INTO public.technicians(code,name,department,phone,notes,is_active,created_by) VALUES (coalesce(c, 'TECH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),n,d,nullif(r->>'phone',''),nullif(r->>'notes',''),coalesce((r->>'is_active')::boolean,true),auth.uid()); added := added + 1;
  ELSE
   UPDATE public.technicians SET name=n, department=d, phone=CASE WHEN r ? 'phone' THEN nullif(r->>'phone','') ELSE phone END, notes=CASE WHEN r ? 'notes' THEN nullif(r->>'notes','') ELSE notes END, is_active=CASE WHEN r ? 'is_active' THEN (r->>'is_active')::boolean ELSE is_active END WHERE id=existing.id;
   IF NOT FOUND THEN RAISE EXCEPTION 'ไม่มีสิทธิ์แก้ไขช่างรายนี้'; END IF;
   updated := updated + 1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('added',added,'updated',updated);
END;
$$;
REVOKE ALL ON FUNCTION public.import_technician_roster(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_technician_roster(jsonb) TO authenticated, service_role;