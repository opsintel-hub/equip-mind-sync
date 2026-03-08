
-- Add Media Player support and cancel status to direct shipping
ALTER TABLE public.direct_shipment_items ADD COLUMN is_media_player BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.direct_shipment_items ADD COLUMN media_player_id UUID REFERENCES public.media_players(id);
ALTER TABLE public.direct_shipment_items ADD COLUMN serial_number_2 TEXT;

ALTER TABLE public.direct_shipments ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE public.direct_shipments ADD COLUMN cancelled_by UUID;
ALTER TABLE public.direct_shipments ADD COLUMN cancel_reason TEXT;
