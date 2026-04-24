-- ============================
-- Phase 1: Swap Wizard Tables
-- ============================

-- 1. swap_requests: ช่างแจ้งปัญหา
CREATE TABLE public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT NOT NULL UNIQUE,
  billboard_id UUID REFERENCES public.billboards(id) ON DELETE SET NULL,
  symptom_id UUID REFERENCES public.mp_symptoms(id) ON DELETE SET NULL,
  symptom_other TEXT,
  description TEXT,
  technician_name TEXT,
  technician_phone TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_swap_requests_status ON public.swap_requests(status);
CREATE INDEX idx_swap_requests_billboard ON public.swap_requests(billboard_id);
CREATE INDEX idx_swap_requests_created_at ON public.swap_requests(created_at DESC);

-- 2. swap_executions: บันทึกการ swap จริง
CREATE TABLE public.swap_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_request_id UUID NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  
  -- Spare ที่นำเข้าใช้
  spare_type TEXT NOT NULL CHECK (spare_type IN ('media_player', 'equipment')),
  spare_media_player_id UUID REFERENCES public.media_players(id) ON DELETE SET NULL,
  spare_equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  spare_serial_number TEXT,
  spare_source_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- เครื่องเก่าที่ถูกถอด
  old_media_player_id UUID REFERENCES public.media_players(id) ON DELETE SET NULL,
  old_equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  old_serial_number TEXT,
  old_billboard_equipment_id UUID REFERENCES public.billboard_equipment(id) ON DELETE SET NULL,
  return_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- ผลลัพธ์
  result TEXT NOT NULL CHECK (result IN ('approved', 'rejected')),
  reject_reason_id UUID REFERENCES public.mp_swap_reject_reasons(id) ON DELETE SET NULL,
  reject_reason_other TEXT,
  
  before_photo_urls TEXT[] DEFAULT '{}',
  after_photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  
  executed_by UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_swap_executions_request ON public.swap_executions(swap_request_id);
CREATE INDEX idx_swap_executions_result ON public.swap_executions(result);

-- ============================
-- RLS Policies
-- ============================
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_executions ENABLE ROW LEVEL SECURITY;

-- swap_requests
CREATE POLICY "Authenticated users can view swap_requests"
  ON public.swap_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create swap_requests"
  ON public.swap_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators and admins can update swap_requests"
  ON public.swap_requests FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete swap_requests"
  ON public.swap_requests FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- swap_executions
CREATE POLICY "Authenticated users can view swap_executions"
  ON public.swap_executions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create swap_executions"
  ON public.swap_executions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Executors and admins can update swap_executions"
  ON public.swap_executions FOR UPDATE
  USING (auth.uid() = executed_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete swap_executions"
  ON public.swap_executions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================
-- Triggers
-- ============================
CREATE TRIGGER update_swap_requests_updated_at
  BEFORE UPDATE ON public.swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- Document number sequence
-- ============================
CREATE SEQUENCE IF NOT EXISTS public.swap_request_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_swap_request_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'SWP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('swap_request_number_seq')::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_swap_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_no IS NULL OR NEW.document_no = '' THEN
    NEW.document_no := generate_swap_request_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_swap_request_doc_number
  BEFORE INSERT ON public.swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_swap_request_number();