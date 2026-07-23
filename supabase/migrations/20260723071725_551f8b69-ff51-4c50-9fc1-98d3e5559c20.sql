DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.goods_issue_pending; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.goods_issue_pending_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_confirmations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.goods_issue_pending REPLICA IDENTITY FULL;
ALTER TABLE public.goods_issue_pending_items REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_confirmations REPLICA IDENTITY FULL;