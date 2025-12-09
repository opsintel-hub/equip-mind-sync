-- Create sequence for GI document numbers
CREATE SEQUENCE IF NOT EXISTS goods_issue_pending_doc_seq START WITH 1;

-- Create goods_issue_pending table for two-step goods issue workflow
CREATE TABLE public.goods_issue_pending (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_no TEXT NOT NULL DEFAULT ('GI-REQ-' || LPAD(nextval('goods_issue_pending_doc_seq')::TEXT, 6, '0')),
    equipment_id UUID REFERENCES public.equipment(id),
    equipment_code TEXT,
    equipment_name TEXT,
    quantity INTEGER NOT NULL,
    unit TEXT NOT NULL DEFAULT 'ชิ้น',
    purpose TEXT,
    destination TEXT,
    requester_name TEXT NOT NULL,
    requester_phone TEXT,
    requester_department TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    issued_quantity INTEGER,
    issued_at TIMESTAMP WITH TIME ZONE,
    issued_by UUID,
    issued_location_id UUID REFERENCES public.locations(id),
    reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goods_issue_pending ENABLE ROW LEVEL SECURITY;

-- Anyone can create issue requests (no login required)
CREATE POLICY "Anyone can create issue requests"
ON public.goods_issue_pending
FOR INSERT
WITH CHECK (true);

-- Anyone can view issue requests
CREATE POLICY "Anyone can view issue requests"
ON public.goods_issue_pending
FOR SELECT
USING (true);

-- Staff and admins can update issue requests
CREATE POLICY "Staff and admins can update issue requests"
ON public.goods_issue_pending
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse_staff'::app_role));

-- Admins can delete issue requests
CREATE POLICY "Admins can delete issue requests"
ON public.goods_issue_pending
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_goods_issue_pending_updated_at
    BEFORE UPDATE ON public.goods_issue_pending
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();