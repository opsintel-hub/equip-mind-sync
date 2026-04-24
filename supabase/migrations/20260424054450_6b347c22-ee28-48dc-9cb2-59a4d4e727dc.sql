
-- =====================================================
-- Phase 0: Master Data tables for Media Player workflows
-- =====================================================

-- 1. Symptoms (อาการเสีย)
CREATE TABLE public.mp_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 2. Assessment Results (ผลการประเมิน)
CREATE TABLE public.mp_assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 3. Swap Reject Reasons (เหตุผลการ Reject Swap)
CREATE TABLE public.mp_swap_reject_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 4. Claim Results (ผลการเคลม)
CREATE TABLE public.mp_claim_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- =====================================================
-- Enable RLS
-- =====================================================
ALTER TABLE public.mp_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_swap_reject_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_claim_results ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies (same pattern for all 4 tables)
-- =====================================================

-- mp_symptoms
CREATE POLICY "Authenticated users can view symptoms"
  ON public.mp_symptoms FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins can insert symptoms"
  ON public.mp_symptoms FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update symptoms"
  ON public.mp_symptoms FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete symptoms"
  ON public.mp_symptoms FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- mp_assessment_results
CREATE POLICY "Authenticated users can view assessment results"
  ON public.mp_assessment_results FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins can insert assessment results"
  ON public.mp_assessment_results FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update assessment results"
  ON public.mp_assessment_results FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete assessment results"
  ON public.mp_assessment_results FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- mp_swap_reject_reasons
CREATE POLICY "Authenticated users can view swap reject reasons"
  ON public.mp_swap_reject_reasons FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins can insert swap reject reasons"
  ON public.mp_swap_reject_reasons FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update swap reject reasons"
  ON public.mp_swap_reject_reasons FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete swap reject reasons"
  ON public.mp_swap_reject_reasons FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- mp_claim_results
CREATE POLICY "Authenticated users can view claim results"
  ON public.mp_claim_results FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins can insert claim results"
  ON public.mp_claim_results FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update claim results"
  ON public.mp_claim_results FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete claim results"
  ON public.mp_claim_results FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- updated_at triggers
-- =====================================================
CREATE TRIGGER trg_mp_symptoms_updated_at
  BEFORE UPDATE ON public.mp_symptoms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_mp_assessment_results_updated_at
  BEFORE UPDATE ON public.mp_assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_mp_swap_reject_reasons_updated_at
  BEFORE UPDATE ON public.mp_swap_reject_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_mp_claim_results_updated_at
  BEFORE UPDATE ON public.mp_claim_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed default values
-- =====================================================
INSERT INTO public.mp_symptoms (name, sort_order) VALUES
  ('จอดับ', 10),
  ('ไม่มีสัญญาณภาพ', 20),
  ('Boot ไม่ขึ้น', 30),
  ('ค้าง / แฮงค์', 40),
  ('รีสตาร์ทเอง', 50),
  ('ภาพกระตุก', 60),
  ('สีเพี้ยน', 70),
  ('ไม่เชื่อมต่อ Network', 80),
  ('CMS ไม่ทำงาน', 90),
  ('อื่นๆ', 999);

INSERT INTO public.mp_assessment_results (name, sort_order) VALUES
  ('ซ่อมเองได้ → คืน Spare Pool', 10),
  ('ส่งซ่อมภายนอก', 20),
  ('เคลมประกัน Vendor', 30),
  ('Write-off (ใช้งานต่อไม่ได้)', 40),
  ('รอประเมินเพิ่มเติม', 50);

INSERT INTO public.mp_swap_reject_reasons (name, sort_order) VALUES
  ('Spare เสียเช่นกัน', 10),
  ('Spec ไม่ตรงกับจุดติดตั้ง', 20),
  ('ไม่จำเป็นต้อง Swap (ปัญหาอื่น)', 30),
  ('รอประเมินเพิ่ม', 40),
  ('อื่นๆ', 999);

INSERT INTO public.mp_claim_results (name, sort_order) VALUES
  ('ซ่อมสำเร็จ → คืน Spare Pool', 10),
  ('เปลี่ยนเครื่องใหม่', 20),
  ('ซ่อมไม่ได้ → Write-off', 30),
  ('Vendor ปฏิเสธการเคลม', 40),
  ('อยู่ระหว่างดำเนินการ', 50);
