-- ============================================
-- 1. Fix notifications: Service role policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notifications;
CREATE POLICY "Service role can manage notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true);

-- Fix notifications: Scope SELECT to user's own or system-wide
DROP POLICY IF EXISTS "Users can view all notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Fix notifications: Scope UPDATE to user's own
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. Fix notification_settings: owner-only
-- ============================================
DROP POLICY IF EXISTS "Users can manage notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can view notification_settings" ON public.notification_settings;
CREATE POLICY "Users can manage own notification_settings"
  ON public.notification_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. Fix goods_issue_pending: require authentication
-- ============================================
DROP POLICY IF EXISTS "Anyone can view issue requests" ON public.goods_issue_pending;
CREATE POLICY "Authenticated users can view issue requests"
  ON public.goods_issue_pending FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can create issue requests" ON public.goods_issue_pending;
CREATE POLICY "Authenticated users can create issue requests"
  ON public.goods_issue_pending FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 4. Fix advertisements: create a view excluding sensitive fields for anon access
-- ============================================
DROP POLICY IF EXISTS "anon_read_advertisements_for_ad_issue" ON public.advertisements;

-- Create a restricted view for anonymous access (contractor confirmation flow)
CREATE OR REPLACE VIEW public.advertisements_public AS
SELECT 
  id, code, name, entry_type, ad_size_id, ad_media_type_id,
  target_installation_date, installation_details, installation_team_id,
  status, total_quantity, photo_urls, supporting_doc_url,
  company_id, department_id, created_at
FROM public.advertisements;

-- Grant anon access to the view only
GRANT SELECT ON public.advertisements_public TO anon;

-- ============================================
-- 5. Fix ad_issue_requests: tighten anon update policy
-- ============================================
DROP POLICY IF EXISTS "anon_confirm_ad_issue" ON public.ad_issue_requests;
DROP POLICY IF EXISTS "anon_read_ad_issue_by_token" ON public.ad_issue_requests;