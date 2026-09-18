CREATE OR REPLACE FUNCTION public.validate_goods_issue_quantity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.quantity IS NULL OR NEW.quantity < 1) THEN
    RAISE EXCEPTION 'จำนวนที่ขอเบิกต้องมากกว่า 0';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_gip_quantity ON public.goods_issue_pending;
CREATE TRIGGER validate_gip_quantity
BEFORE INSERT ON public.goods_issue_pending
FOR EACH ROW EXECUTE FUNCTION public.validate_goods_issue_quantity();

DROP TRIGGER IF EXISTS validate_gip_items_quantity ON public.goods_issue_pending_items;
CREATE TRIGGER validate_gip_items_quantity
BEFORE INSERT ON public.goods_issue_pending_items
FOR EACH ROW EXECUTE FUNCTION public.validate_goods_issue_quantity();