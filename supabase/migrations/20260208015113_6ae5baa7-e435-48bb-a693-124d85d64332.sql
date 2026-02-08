
-- 1. Master Data: Ad Sizes
CREATE TABLE public.ad_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Master Data: Ad Media Types
CREATE TABLE public.ad_media_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Main Table: Advertisements (Header)
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  entry_type VARCHAR NOT NULL DEFAULT 'new',
  name VARCHAR NOT NULL,
  ad_size_id UUID REFERENCES public.ad_sizes(id),
  ad_media_type_id UUID REFERENCES public.ad_media_types(id),
  photo_urls TEXT[],
  supporting_doc_url TEXT,
  target_installation_date DATE,
  installation_team_id UUID REFERENCES public.contractors(id),
  installation_details TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending',
  total_quantity INTEGER DEFAULT 0,
  retention_days INTEGER,
  retention_start_date DATE,
  retention_alert_sent BOOLEAN DEFAULT false,
  storage_location TEXT,
  storage_in_datetime TIMESTAMPTZ,
  storage_out_datetime TIMESTAMPTZ,
  pickup_contractor_id UUID REFERENCES public.contractors(id),
  contact_name VARCHAR,
  contact_phone VARCHAR,
  contact_email VARCHAR,
  department_id UUID REFERENCES public.departments(id),
  company_id UUID REFERENCES public.companies(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Ad Versions (1 ad has multiple versions)
CREATE TABLE public.ad_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  version_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Ad Target Billboards (multi-select)
CREATE TABLE public.ad_target_billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES public.billboards(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Ad Issue Requests
CREATE TABLE public.ad_issue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no VARCHAR NOT NULL,
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id),
  issue_purpose VARCHAR NOT NULL DEFAULT 'install',
  old_ad_action VARCHAR,
  issued_quantity INTEGER,
  target_billboard_id UUID REFERENCES public.billboards(id),
  issued_by UUID,
  issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  status VARCHAR NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enable RLS on all tables
ALTER TABLE public.ad_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_target_billboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_issue_requests ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies (authenticated users full access)
CREATE POLICY "Authenticated users can manage ad_sizes" ON public.ad_sizes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage ad_media_types" ON public.ad_media_types
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage advertisements" ON public.advertisements
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage ad_versions" ON public.ad_versions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage ad_target_billboards" ON public.ad_target_billboards
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage ad_issue_requests" ON public.ad_issue_requests
  FOR ALL USING (auth.role() = 'authenticated');

-- 9. Update timestamp triggers
CREATE TRIGGER update_ad_sizes_updated_at
  BEFORE UPDATE ON public.ad_sizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_media_types_updated_at
  BEFORE UPDATE ON public.ad_media_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_issue_requests_updated_at
  BEFORE UPDATE ON public.ad_issue_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Indexes for performance
CREATE INDEX idx_advertisements_entry_type ON public.advertisements(entry_type);
CREATE INDEX idx_advertisements_status ON public.advertisements(status);
CREATE INDEX idx_ad_versions_advertisement_id ON public.ad_versions(advertisement_id);
CREATE INDEX idx_ad_target_billboards_advertisement_id ON public.ad_target_billboards(advertisement_id);
CREATE INDEX idx_ad_issue_requests_advertisement_id ON public.ad_issue_requests(advertisement_id);
CREATE INDEX idx_ad_issue_requests_status ON public.ad_issue_requests(status);

-- 11. Storage Bucket for ad files
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-files', 'ad-files', true);

CREATE POLICY "Authenticated users can upload ad files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ad-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view ad files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-files');

CREATE POLICY "Authenticated users can delete ad files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ad-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ad files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ad-files' AND auth.role() = 'authenticated');
