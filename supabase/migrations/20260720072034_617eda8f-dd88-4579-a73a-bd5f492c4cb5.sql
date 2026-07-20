
-- 1) Matrix PM: add per-type interval_days on tool_pm_types
ALTER TABLE public.tool_pm_types
  ADD COLUMN IF NOT EXISTS interval_days integer NOT NULL DEFAULT 30;

-- 2) Tool documents table
CREATE TABLE IF NOT EXISTS public.tool_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  notes text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_documents TO authenticated;
GRANT ALL ON public.tool_documents TO service_role;

ALTER TABLE public.tool_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view tool documents" ON public.tool_documents;
CREATE POLICY "Authenticated can view tool documents"
  ON public.tool_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert tool documents" ON public.tool_documents;
CREATE POLICY "Authenticated can insert tool documents"
  ON public.tool_documents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update tool documents" ON public.tool_documents;
CREATE POLICY "Authenticated can update tool documents"
  ON public.tool_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete tool documents" ON public.tool_documents;
CREATE POLICY "Authenticated can delete tool documents"
  ON public.tool_documents FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_tool_documents_updated_at ON public.tool_documents;
CREATE TRIGGER update_tool_documents_updated_at
  BEFORE UPDATE ON public.tool_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tool_documents_tool_id ON public.tool_documents(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_documents_type ON public.tool_documents(document_type);

-- 3) Storage policies for tool-documents bucket (bucket created via tool)
DROP POLICY IF EXISTS "Authenticated can read tool-documents" ON storage.objects;
CREATE POLICY "Authenticated can read tool-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tool-documents');

DROP POLICY IF EXISTS "Authenticated can upload tool-documents" ON storage.objects;
CREATE POLICY "Authenticated can upload tool-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tool-documents');

DROP POLICY IF EXISTS "Authenticated can update tool-documents" ON storage.objects;
CREATE POLICY "Authenticated can update tool-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tool-documents');

DROP POLICY IF EXISTS "Authenticated can delete tool-documents" ON storage.objects;
CREATE POLICY "Authenticated can delete tool-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tool-documents');
