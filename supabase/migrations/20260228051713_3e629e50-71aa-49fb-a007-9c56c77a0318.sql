
-- Add new notification type columns for comprehensive coverage
ALTER TABLE public.notification_settings 
  ADD COLUMN IF NOT EXISTS notify_media_player_expiry boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_media_player_warranty boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_billboard_pm boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_tool_pm boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pending_requests boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_loan_overdue boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_ad_retention boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_incomplete_issues boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS department_emails jsonb DEFAULT '[]'::jsonb;

-- department_emails structure: [{"department_id": "uuid", "department_name": "name", "emails": ["a@b.com"]}]
