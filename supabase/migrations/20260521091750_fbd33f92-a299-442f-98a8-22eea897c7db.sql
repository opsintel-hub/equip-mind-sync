ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS asset_caretaker text,
ADD COLUMN IF NOT EXISTS planned_install_location text;