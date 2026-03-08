ALTER TABLE public.equipment_loans
  ADD COLUMN IF NOT EXISTS is_cross_department boolean NOT NULL DEFAULT false;