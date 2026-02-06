ALTER TABLE goods_receipt_pending
ADD COLUMN IF NOT EXISTS temp_min_stock_level INTEGER DEFAULT 0;