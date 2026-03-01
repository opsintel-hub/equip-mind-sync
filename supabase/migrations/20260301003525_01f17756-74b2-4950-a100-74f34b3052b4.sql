
-- Add department column to notifications for department-based filtering
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS department text;

-- Create index for faster department-based queries
CREATE INDEX IF NOT EXISTS idx_notifications_department ON public.notifications(department);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
