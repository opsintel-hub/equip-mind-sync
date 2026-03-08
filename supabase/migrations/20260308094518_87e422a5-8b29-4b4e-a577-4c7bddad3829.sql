
ALTER TABLE public.delivery_confirmations ADD COLUMN direct_shipment_id UUID REFERENCES public.direct_shipments(id);
ALTER TABLE public.delivery_confirmations ALTER COLUMN goods_issue_pending_id DROP NOT NULL;
