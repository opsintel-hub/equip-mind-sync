ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS notify_pending_assessment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_disposal_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_direct_shipping_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_manager_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pending_asset_codes boolean NOT NULL DEFAULT true;