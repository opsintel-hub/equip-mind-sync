-- Step 1: Create goods_issue_pending_items table
CREATE TABLE public.goods_issue_pending_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_id UUID NOT NULL,
    equipment_id UUID REFERENCES public.equipment(id),
    equipment_code TEXT,
    equipment_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'ชิ้น',
    serial_number TEXT,
    billboard_id UUID,
    issued_quantity INTEGER DEFAULT 0,
    remaining_quantity INTEGER,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Add foreign key constraint after table creation
ALTER TABLE public.goods_issue_pending_items 
ADD CONSTRAINT fk_pending_id FOREIGN KEY (pending_id) 
REFERENCES public.goods_issue_pending(id) ON DELETE CASCADE;

-- Step 3: Enable RLS
ALTER TABLE public.goods_issue_pending_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "All authenticated users can view goods_issue_pending_items"
ON public.goods_issue_pending_items
FOR SELECT
USING (true);

CREATE POLICY "Staff and admins can create goods_issue_pending_items"
ON public.goods_issue_pending_items
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'warehouse_staff'::app_role) OR
    has_role(auth.uid(), 'requester'::app_role)
);

CREATE POLICY "Staff and admins can update goods_issue_pending_items"
ON public.goods_issue_pending_items
FOR UPDATE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'warehouse_staff'::app_role)
);

CREATE POLICY "Only admins can delete goods_issue_pending_items"
ON public.goods_issue_pending_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 5: Add total_items column to goods_issue_pending header
ALTER TABLE public.goods_issue_pending 
ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 1;

-- Step 6: Create indexes for better query performance
CREATE INDEX idx_goods_issue_pending_items_pending_id 
ON public.goods_issue_pending_items(pending_id);

CREATE INDEX idx_goods_issue_pending_items_equipment_id 
ON public.goods_issue_pending_items(equipment_id);

CREATE INDEX idx_goods_issue_pending_items_billboard_id 
ON public.goods_issue_pending_items(billboard_id);

CREATE INDEX idx_goods_issue_pending_items_status 
ON public.goods_issue_pending_items(status);