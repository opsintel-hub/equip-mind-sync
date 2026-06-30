UPDATE public.goods_issue_pending
SET status = 'pending'
WHERE status = 'pending_approval'
  AND approval_status = 'approved';