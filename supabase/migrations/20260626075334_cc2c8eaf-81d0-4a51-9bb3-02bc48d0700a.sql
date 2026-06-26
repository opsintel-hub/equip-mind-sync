
-- Phase 1: Claim close fields
ALTER TABLE public.claim_records
  ADD COLUMN IF NOT EXISTS return_location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS restock_decision text,
  ADD COLUMN IF NOT EXISTS replacement_serial text,
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

-- Phase 2: Self-repair close fields
ALTER TABLE public.assessment_logs
  ADD COLUMN IF NOT EXISTS repair_status text,
  ADD COLUMN IF NOT EXISTS repair_result text,
  ADD COLUMN IF NOT EXISTS repair_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS repair_completed_by uuid,
  ADD COLUMN IF NOT EXISTS repair_cost numeric,
  ADD COLUMN IF NOT EXISTS return_location_id uuid REFERENCES public.locations(id);

-- Seed repair_status for existing self_repair rows
UPDATE public.assessment_logs
   SET repair_status = 'in_progress'
 WHERE outcome = 'self_repair' AND repair_status IS NULL;
