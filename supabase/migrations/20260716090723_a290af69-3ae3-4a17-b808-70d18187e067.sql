
ALTER TABLE public.goods_issue_pending_items
  ADD COLUMN IF NOT EXISTS intended_billboard_id uuid REFERENCES public.billboards(id),
  ADD COLUMN IF NOT EXISTS install_status text NOT NULL DEFAULT 'not_required';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goods_issue_pending_items_install_status_check'
  ) THEN
    ALTER TABLE public.goods_issue_pending_items
      ADD CONSTRAINT goods_issue_pending_items_install_status_check
      CHECK (install_status IN ('not_required','pending_confirmation','installed','cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gipi_install_status
  ON public.goods_issue_pending_items(install_status)
  WHERE install_status = 'pending_confirmation';
