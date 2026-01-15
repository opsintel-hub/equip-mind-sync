-- Create CMS types table
CREATE TABLE public.cms_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Enable RLS for cms_types
ALTER TABLE public.cms_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for cms_types
CREATE POLICY "All authenticated users can view cms_types"
ON public.cms_types FOR SELECT USING (true);

CREATE POLICY "Admins can manage cms_types"
ON public.cms_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default CMS types
INSERT INTO public.cms_types (name, description) VALUES
('BroadSign', 'BroadSign Digital Signage Platform'),
('Magic Sign', 'Magic Sign Display System'),
('LED Control', 'LED Control Software'),
('Clock', 'Clock Display System');

-- Create media_players table
CREATE TABLE public.media_players (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    cms_type_id UUID REFERENCES public.cms_types(id),
    specification TEXT,
    id_display TEXT,
    group_led TEXT,
    serial_number_1 TEXT,
    serial_number_2 TEXT,
    led_control TEXT,
    billboard_id UUID REFERENCES public.billboards(id),
    install_date DATE,
    company_id UUID REFERENCES public.companies(id),
    location_id UUID REFERENCES public.locations(id),
    department TEXT,
    brand TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'เครื่อง',
    unit_price NUMERIC DEFAULT 0,
    depreciation_months INTEGER,
    warranty_expiry_date DATE,
    is_asset BOOLEAN DEFAULT false,
    asset_code TEXT,
    equipment_id_code TEXT,
    waiting_asset_code BOOLEAN DEFAULT false,
    waiting_equipment_id BOOLEAN DEFAULT false,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Enable RLS for media_players
ALTER TABLE public.media_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for media_players
CREATE POLICY "All authenticated users can view media_players"
ON public.media_players FOR SELECT USING (true);

CREATE POLICY "Staff and admins can manage media_players"
ON public.media_players FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'warehouse_staff'::app_role) OR
    has_role(auth.uid(), 'receiver'::app_role)
);

-- Add asset-related columns to goods_receipt_pending
ALTER TABLE public.goods_receipt_pending
ADD COLUMN IF NOT EXISTS is_asset BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS asset_code TEXT,
ADD COLUMN IF NOT EXISTS equipment_id_code TEXT,
ADD COLUMN IF NOT EXISTS waiting_asset_code BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waiting_equipment_id BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS depreciation_months INTEGER,
ADD COLUMN IF NOT EXISTS is_media_player BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS media_player_id UUID REFERENCES public.media_players(id);

-- Add asset-related columns to equipment table
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS is_asset BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS asset_code TEXT,
ADD COLUMN IF NOT EXISTS equipment_id_code TEXT,
ADD COLUMN IF NOT EXISTS depreciation_months INTEGER;

-- Create index for pending asset codes
CREATE INDEX idx_goods_receipt_pending_waiting_codes 
ON public.goods_receipt_pending(waiting_asset_code, waiting_equipment_id) 
WHERE waiting_asset_code = true OR waiting_equipment_id = true;