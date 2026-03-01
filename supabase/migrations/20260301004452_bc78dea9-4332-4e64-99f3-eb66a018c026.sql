
-- Table for per-user notification dismissals (hide without deleting)
CREATE TABLE public.notification_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissals"
  ON public.notification_dismissals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss notifications"
  ON public.notification_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can un-dismiss notifications"
  ON public.notification_dismissals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_notification_dismissals_user ON public.notification_dismissals(user_id);
CREATE INDEX idx_notification_dismissals_notification ON public.notification_dismissals(notification_id);
