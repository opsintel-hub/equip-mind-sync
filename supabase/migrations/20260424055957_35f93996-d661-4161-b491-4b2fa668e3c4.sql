-- Create sequence for claim record numbers
CREATE SEQUENCE IF NOT EXISTS claim_record_number_seq START 1;

-- Function to generate claim record number
CREATE OR REPLACE FUNCTION public.generate_claim_record_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('claim_record_number_seq')::TEXT, 4, '0');
END;
$$;

-- Create claim_records table
CREATE TABLE public.claim_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT NOT NULL UNIQUE,
  
  -- Subject (what's being claimed)
  subject_type TEXT NOT NULL DEFAULT 'media_player', -- 'media_player' | 'equipment'
  media_player_id UUID REFERENCES public.media_players(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  serial_number TEXT,
  
  -- Source linking (optional)
  source_type TEXT, -- 'assessment' | 'defective_return' | 'manual'
  source_reference_id UUID,
  
  -- Vendor / Supplier info
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  manufacturer TEXT,
  
  -- Warranty info
  warranty_expiry_date DATE,
  is_under_warranty BOOLEAN DEFAULT true,
  warranty_notes TEXT,
  
  -- Submit info
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID,
  submitter_name TEXT,
  claim_ticket_no TEXT, -- vendor's RMA / ticket number
  symptom_id UUID REFERENCES public.mp_symptoms(id) ON DELETE SET NULL,
  symptom_description TEXT,
  
  -- Return info
  returned_at TIMESTAMP WITH TIME ZONE,
  returned_by UUID,
  receiver_name TEXT,
  claim_result_id UUID REFERENCES public.mp_claim_results(id) ON DELETE SET NULL,
  result_notes TEXT,
  cost_amount NUMERIC(12, 2) DEFAULT 0,
  
  -- Files
  photo_urls TEXT[] DEFAULT '{}',
  document_urls TEXT[] DEFAULT '{}',
  
  -- Status & meta
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'submitted' | 'returned' | 'closed' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger: auto document_no
CREATE OR REPLACE FUNCTION public.set_claim_record_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.document_no IS NULL OR NEW.document_no = '' THEN
    NEW.document_no := generate_claim_record_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_claim_record_number
BEFORE INSERT ON public.claim_records
FOR EACH ROW
EXECUTE FUNCTION public.set_claim_record_number();

-- Trigger: updated_at
CREATE TRIGGER trg_claim_records_updated_at
BEFORE UPDATE ON public.claim_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.claim_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view claim records"
ON public.claim_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create claim records"
ON public.claim_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update claim records"
ON public.claim_records FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete claim records"
ON public.claim_records FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_claim_records_status ON public.claim_records(status);
CREATE INDEX idx_claim_records_subject_type ON public.claim_records(subject_type);
CREATE INDEX idx_claim_records_created_at ON public.claim_records(created_at DESC);