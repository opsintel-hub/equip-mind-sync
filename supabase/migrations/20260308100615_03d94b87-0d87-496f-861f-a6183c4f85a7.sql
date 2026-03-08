
-- Add request workflow fields to direct_shipments
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS requester_name text;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS requester_phone text;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS requested_items_description text;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS processed_by uuid;
ALTER TABLE direct_shipments ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Add document_urls and actual_quantity to delivery_confirmations for DS enhancement
ALTER TABLE delivery_confirmations ADD COLUMN IF NOT EXISTS document_urls text[];
ALTER TABLE delivery_confirmations ADD COLUMN IF NOT EXISTS actual_quantity integer;
