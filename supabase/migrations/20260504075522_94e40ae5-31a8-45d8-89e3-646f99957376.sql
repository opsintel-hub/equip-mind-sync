ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS remote_name text,
ADD COLUMN IF NOT EXISTS usage_lifespan_months integer;