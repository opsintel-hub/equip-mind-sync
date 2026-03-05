
-- Add manager to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Add approval columns to goods_issue_pending
ALTER TABLE public.goods_issue_pending 
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;

-- Create delivery_confirmations table
CREATE TABLE public.delivery_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_issue_pending_id uuid NOT NULL REFERENCES public.goods_issue_pending(id) ON DELETE CASCADE,
  document_no text NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'confirmed',
  issue_type text,
  issue_description text,
  notes text,
  photo_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_confirmations
CREATE POLICY "Authenticated users can view delivery confirmations"
  ON public.delivery_confirmations FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery confirmations"
  ON public.delivery_confirmations FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery confirmations"
  ON public.delivery_confirmations FOR UPDATE
  TO authenticated USING (true);

-- Create storage bucket for delivery confirmation files
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-confirmations', 'delivery-confirmations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload delivery confirmation files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-confirmations');

CREATE POLICY "Anyone can view delivery confirmation files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'delivery-confirmations');

CREATE POLICY "Authenticated users can delete delivery confirmation files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'delivery-confirmations');

-- Update trigger for delivery_confirmations
CREATE TRIGGER update_delivery_confirmations_updated_at
  BEFORE UPDATE ON public.delivery_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
