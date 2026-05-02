
ALTER TABLE public.defective_returns
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS reporter_department text,
  ADD COLUMN IF NOT EXISTS assessment_log_id uuid REFERENCES public.assessment_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_defective_returns_assessment_log_id
  ON public.defective_returns(assessment_log_id);
