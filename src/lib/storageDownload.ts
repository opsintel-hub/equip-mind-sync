import { supabase } from "@/integrations/supabase/client";

/**
 * Downloads a file from Supabase Storage via SDK (bypasses ad blockers).
 * Extracts bucket and path from a public storage URL.
 */
export async function downloadStorageFile(publicUrl: string, fallbackFilename?: string) {
  try {
    // Parse: .../storage/v1/object/public/{bucket}/{path}
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      // Fallback: open URL directly
      window.open(publicUrl, '_blank');
      return;
    }

    const [, bucket, path] = match;
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(decodeURIComponent(path));

    if (error || !data) {
      console.error('Storage download error:', error);
      window.open(publicUrl, '_blank');
      return;
    }

    // Create blob URL and trigger download/view
    const blobUrl = URL.createObjectURL(data);
    const filename = fallbackFilename || decodeURIComponent(path.split('/').pop() || 'file');
    
    // For PDFs, open in new tab; for others, download
    if (data.type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      window.open(blobUrl, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
    }

    // Cleanup after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch {
    window.open(publicUrl, '_blank');
  }
}
