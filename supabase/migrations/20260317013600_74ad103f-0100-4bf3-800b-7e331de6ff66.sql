
-- Add confirmation fields to ad_issue_requests for public confirmation flow
ALTER TABLE public.ad_issue_requests 
  ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by_name text,
  ADD COLUMN IF NOT EXISTS issue_report_type text,
  ADD COLUMN IF NOT EXISTS issue_report_description text;

-- Create index on confirmation_token for fast lookup
CREATE INDEX IF NOT EXISTS idx_ad_issue_requests_confirmation_token ON public.ad_issue_requests(confirmation_token);

-- Allow anon users to read ad_issue_requests by confirmation_token (for public view)
CREATE POLICY "anon_read_ad_issue_by_token" ON public.ad_issue_requests
  FOR SELECT TO anon
  USING (confirmation_token IS NOT NULL);

-- Allow anon users to update confirmation fields only
CREATE POLICY "anon_confirm_ad_issue" ON public.ad_issue_requests
  FOR UPDATE TO anon
  USING (confirmation_token IS NOT NULL)
  WITH CHECK (confirmation_token IS NOT NULL);

-- Allow anon to read related advertisements
CREATE POLICY "anon_read_advertisements_for_ad_issue" ON public.advertisements
  FOR SELECT TO anon
  USING (true);

-- Allow anon to read billboards for ad issue view
CREATE POLICY "anon_read_billboards_for_ad_issue" ON public.billboards
  FOR SELECT TO anon
  USING (true);

-- Allow anon to read ad_target_billboards
CREATE POLICY "anon_read_ad_target_billboards" ON public.ad_target_billboards
  FOR SELECT TO anon
  USING (true);

-- Allow anon to read ad_versions
CREATE POLICY "anon_read_ad_versions" ON public.ad_versions
  FOR SELECT TO anon
  USING (true);
