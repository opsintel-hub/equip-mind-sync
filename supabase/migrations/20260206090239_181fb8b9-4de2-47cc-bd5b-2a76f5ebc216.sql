-- Add columns for storing temporary product info for new items not yet in the system
ALTER TABLE goods_receipt_pending
ADD COLUMN IF NOT EXISTS temp_category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS temp_subcategory_id UUID REFERENCES subcategories(id),
ADD COLUMN IF NOT EXISTS temp_product_images TEXT[];

-- Add index for faster lookups on temporary products
CREATE INDEX IF NOT EXISTS idx_goods_receipt_pending_temp_category 
ON goods_receipt_pending(temp_category_id) WHERE temp_category_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN goods_receipt_pending.temp_category_id IS 'Category ID for new products not yet in the equipment master';
COMMENT ON COLUMN goods_receipt_pending.temp_subcategory_id IS 'Subcategory ID for new products not yet in the equipment master';
COMMENT ON COLUMN goods_receipt_pending.temp_product_images IS 'Array of image URLs for new products to help warehouse staff identify the item';