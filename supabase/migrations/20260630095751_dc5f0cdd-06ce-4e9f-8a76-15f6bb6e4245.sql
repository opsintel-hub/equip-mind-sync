
-- Add result_kind to mp_claim_results to drive the claim-return flow deterministically
ALTER TABLE public.mp_claim_results
  ADD COLUMN IF NOT EXISTS result_kind text;

-- Seed kinds for the existing 5 rows (idempotent)
UPDATE public.mp_claim_results SET result_kind = 'refurb_return'  WHERE name = 'ซ่อมสำเร็จ → คืน Spare Pool';
UPDATE public.mp_claim_results SET result_kind = 'replacement'    WHERE name = 'เปลี่ยนเครื่องใหม่';
UPDATE public.mp_claim_results SET result_kind = 'write_off'      WHERE name = 'ซ่อมไม่ได้ → Write-off';
UPDATE public.mp_claim_results SET result_kind = 'vendor_rejected' WHERE name = 'Vendor ปฏิเสธการเคลม';
UPDATE public.mp_claim_results SET result_kind = 'in_progress'    WHERE name = 'อยู่ระหว่างดำเนินการ';

-- Loose validation (allow nulls to keep backward-compat for custom rows)
ALTER TABLE public.mp_claim_results
  DROP CONSTRAINT IF EXISTS mp_claim_results_result_kind_check;
ALTER TABLE public.mp_claim_results
  ADD CONSTRAINT mp_claim_results_result_kind_check
  CHECK (result_kind IS NULL OR result_kind IN ('refurb_return','replacement','write_off','vendor_rejected','in_progress'));
