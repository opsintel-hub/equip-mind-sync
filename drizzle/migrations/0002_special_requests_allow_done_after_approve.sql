CREATE OR REPLACE FUNCTION public.mark_special_request_done(_id uuid, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'เฉพาะ Super Admin เท่านั้น'; END IF;
  SELECT COALESCE(full_name, display_name) INTO v_name FROM public.profiles WHERE id = auth.uid();
  UPDATE public.special_requests SET status='done', reviewed_by=auth.uid(), reviewer_name=v_name, reviewed_at=now(),
    review_notes=COALESCE(_notes, review_notes) WHERE id=_id AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'คำร้องไม่อยู่ในสถานะอนุมัติรอทำ'; END IF;
  RETURN jsonb_build_object('status','done');
END $$;
REVOKE ALL ON FUNCTION public.mark_special_request_done(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_special_request_done(uuid, text) TO authenticated;