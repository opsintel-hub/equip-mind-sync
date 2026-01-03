-- Add document_url column to goods_receipt_pending table
ALTER TABLE public.goods_receipt_pending 
ADD COLUMN document_url TEXT NULL;

-- Create storage bucket for delivery documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-documents', 'delivery-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for delivery documents
CREATE POLICY "Anyone can view delivery documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'delivery-documents');

CREATE POLICY "Authenticated users can upload delivery documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'delivery-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update delivery documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'delivery-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete delivery documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'delivery-documents' AND auth.role() = 'authenticated');