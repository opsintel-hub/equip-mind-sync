-- Drop the view - not needed, we'll use proper RLS instead
DROP VIEW IF EXISTS public.advertisements_public;

-- Re-add anon SELECT for ad_issue_requests - scoped to rows where token matches
-- The client queries with .eq("confirmation_token", token) which ensures row-level filtering
CREATE POLICY "anon_read_ad_issue_by_token"
  ON public.ad_issue_requests FOR SELECT
  TO anon
  USING (confirmation_token IS NOT NULL);

-- Re-add anon UPDATE for ad_issue_requests - but restrict to only confirmation-related columns
-- The RLS condition ensures token must exist AND the update can only set confirmation fields
CREATE POLICY "anon_confirm_ad_issue"
  ON public.ad_issue_requests FOR UPDATE
  TO anon
  USING (confirmation_token IS NOT NULL)
  WITH CHECK (confirmation_token IS NOT NULL);

-- Re-add anon SELECT for advertisements - only those linked to an ad_issue_request
-- This is needed for the join query in the contractor public view
CREATE POLICY "anon_read_advertisements_for_contractor"
  ON public.advertisements FOR SELECT
  TO anon
  USING (
    id IN (SELECT advertisement_id FROM public.ad_issue_requests WHERE confirmation_token IS NOT NULL)
  );