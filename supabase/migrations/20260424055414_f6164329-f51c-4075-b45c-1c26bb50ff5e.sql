
-- Sequence for assessment doc number
CREATE SEQUENCE IF NOT EXISTS public.assessment_log_number_seq START WITH 1;

-- Generator function
CREATE OR REPLACE FUNCTION public.generate_assessment_log_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'ASM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('assessment_log_number_seq')::TEXT, 4, '0');
END;
$$;

-- Assessment logs table
CREATE TABLE public.assessment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT NOT NULL UNIQUE,
  -- Subject of assessment (one of two)
  media_player_id UUID REFERENCES public.media_players(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  serial_number TEXT,
  -- Source / linkage
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'swap' | 'defective_return' | 'manual'
  source_reference_id UUID,
  -- Assessment details
  symptom_id UUID REFERENCES public.mp_symptoms(id) ON DELETE SET NULL,
  symptom_description TEXT,
  assessment_result_id UUID REFERENCES public.mp_assessment_results(id) ON DELETE SET NULL,
  diagnosis_notes TEXT,
  recommended_action TEXT,
  -- Assessor info
  assessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assessor_name TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Status & lifecycle
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'cancelled'
  completed_at TIMESTAMPTZ,
  -- Attachments
  photo_urls TEXT[],
  document_urls TEXT[],
  -- Meta
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-set document number trigger
CREATE OR REPLACE FUNCTION public.set_assessment_log_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.document_no IS NULL OR NEW.document_no = '' THEN
    NEW.document_no := generate_assessment_log_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_assessment_log_number
BEFORE INSERT ON public.assessment_logs
FOR EACH ROW EXECUTE FUNCTION public.set_assessment_log_number();

-- Updated_at trigger
CREATE TRIGGER trg_assessment_logs_updated_at
BEFORE UPDATE ON public.assessment_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_assessment_logs_media_player ON public.assessment_logs(media_player_id);
CREATE INDEX idx_assessment_logs_equipment ON public.assessment_logs(equipment_id);
CREATE INDEX idx_assessment_logs_status ON public.assessment_logs(status);
CREATE INDEX idx_assessment_logs_assessed_at ON public.assessment_logs(assessed_at DESC);

-- Enable RLS
ALTER TABLE public.assessment_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view assessment logs"
ON public.assessment_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert assessment logs"
ON public.assessment_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update assessment logs"
ON public.assessment_logs FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete assessment logs"
ON public.assessment_logs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
