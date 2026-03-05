ALTER TABLE public.goods_issue_pending 
ADD COLUMN pickup_date date DEFAULT NULL,
ADD COLUMN pickup_time text DEFAULT NULL;