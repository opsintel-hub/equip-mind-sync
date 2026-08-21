ALTER TABLE public.goods_issue_pending_items
  ADD COLUMN IF NOT EXISTS returned_good_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returned_defective_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_by uuid,
  ADD COLUMN IF NOT EXISTS return_location_id uuid REFERENCES public.locations(id);

ALTER TABLE public.defective_returns
  ADD COLUMN IF NOT EXISTS symptom_id uuid REFERENCES public.mp_symptoms(id),
  ADD COLUMN IF NOT EXISTS symptom_other text,
  ADD COLUMN IF NOT EXISTS source_issue_item_id uuid REFERENCES public.goods_issue_pending_items(id),
  ADD COLUMN IF NOT EXISTS source_document text;