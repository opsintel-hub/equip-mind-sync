ALTER TABLE public.issue_purposes ADD COLUMN IF NOT EXISTS is_transfer boolean NOT NULL DEFAULT false;
ALTER TABLE public.goods_issue_pending ADD COLUMN IF NOT EXISTS transfer_to_department text;
ALTER TABLE public.goods_issue_pending ADD COLUMN IF NOT EXISTS transfer_to_warehouse_id uuid REFERENCES public.warehouses(id);
ALTER TABLE public.goods_issue_pending_items ADD COLUMN IF NOT EXISTS transferred_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.goods_issue_pending_items ADD COLUMN IF NOT EXISTS transfer_to_location_id uuid REFERENCES public.locations(id);