
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_policy_note TEXT;

ALTER TABLE public.goods_issue_pending_items
  ADD COLUMN IF NOT EXISTS needs_return BOOLEAN,
  ADD COLUMN IF NOT EXISTS needs_return_overridden BOOLEAN NOT NULL DEFAULT false;

WITH calc AS (
  SELECT i.id AS item_id,
         (COALESCE(p.requires_return, false) AND NOT COALESCE(e.is_consumable, false)) AS v
  FROM public.goods_issue_pending_items i
  JOIN public.goods_issue_pending gp ON gp.id = i.pending_id
  LEFT JOIN public.issue_purposes p ON p.id = gp.purpose_id
  LEFT JOIN public.equipment e ON e.id = i.equipment_id
  WHERE i.needs_return IS NULL
)
UPDATE public.goods_issue_pending_items x
SET needs_return = calc.v
FROM calc
WHERE x.id = calc.item_id;
