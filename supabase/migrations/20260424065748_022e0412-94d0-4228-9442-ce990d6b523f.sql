-- Remove duplicate old_codes (keep newest) before adding unique index
DELETE FROM public.billboards a
USING public.billboards b
WHERE a.old_code IS NOT NULL
  AND a.old_code = b.old_code
  AND a.created_at < b.created_at;

-- Partial unique index allows multiple NULLs (legacy rows) and supports ON CONFLICT (old_code)
CREATE UNIQUE INDEX IF NOT EXISTS billboards_old_code_unique
  ON public.billboards (old_code)
  WHERE old_code IS NOT NULL;