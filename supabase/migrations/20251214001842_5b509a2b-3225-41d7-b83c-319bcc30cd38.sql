-- Create notifications table for in-app alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
  category TEXT NOT NULL, -- equipment_expiry, warranty_expiry, pm_schedule, low_stock
  reference_id UUID, -- reference to related record (billboard_equipment, pm_schedule, etc.)
  reference_type TEXT, -- billboard_equipment, pm_schedule, equipment
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PM Schedule table for billboard maintenance
CREATE TABLE public.pm_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, yearly
  next_due_date DATE NOT NULL,
  last_completed_date DATE,
  advance_notice_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PM completion history
CREATE TABLE public.pm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pm_schedule_id UUID NOT NULL REFERENCES public.pm_schedules(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email_addresses TEXT[], -- array of emails for future use
  notify_equipment_expiry BOOLEAN NOT NULL DEFAULT true,
  notify_warranty_expiry BOOLEAN NOT NULL DEFAULT true,
  notify_pm_schedule BOOLEAN NOT NULL DEFAULT true,
  notify_low_stock BOOLEAN NOT NULL DEFAULT true,
  advance_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies (all authenticated users can read, system can create)
CREATE POLICY "Users can view all notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role can manage notifications" ON public.notifications FOR ALL USING (true);

-- PM Schedules policies
CREATE POLICY "Users can view pm_schedules" ON public.pm_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create pm_schedules" ON public.pm_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update pm_schedules" ON public.pm_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete pm_schedules" ON public.pm_schedules FOR DELETE TO authenticated USING (true);

-- PM History policies
CREATE POLICY "Users can view pm_history" ON public.pm_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create pm_history" ON public.pm_history FOR INSERT TO authenticated WITH CHECK (true);

-- Notification settings policies
CREATE POLICY "Users can view notification_settings" ON public.notification_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage notification_settings" ON public.notification_settings FOR ALL TO authenticated USING (true);

-- Create trigger for pm_schedules updated_at
CREATE TRIGGER update_pm_schedules_updated_at
BEFORE UPDATE ON public.pm_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for notification_settings updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();