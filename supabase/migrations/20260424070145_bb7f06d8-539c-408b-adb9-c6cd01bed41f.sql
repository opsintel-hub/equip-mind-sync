-- Drop the partial index (cannot be used by ON CONFLICT)
DROP INDEX IF EXISTS public.billboards_old_code_unique;

-- Normalize empty strings to NULL before adding constraint
UPDATE public.billboards SET old_code = NULL WHERE old_code = '';

-- Remove duplicates again just to be safe
DELETE FROM public.billboards a
USING public.billboards b
WHERE a.old_code IS NOT NULL
  AND a.old_code = b.old_code
  AND a.ctid < b.ctid;

-- Create real UNIQUE constraint that ON CONFLICT can target
ALTER TABLE public.billboards
  ADD CONSTRAINT billboards_old_code_key UNIQUE (old_code);