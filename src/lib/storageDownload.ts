import { supabase } from "@/integrations/supabase/client";

/**
 * Downloads a file from Supabase Storage via SDK (bypasses ad blockers
 * that block *.supabase.co AND blob: URLs from preview domains).
 *
 * Strategy: Always trigger a real file download via <a download> — never
 * window.open() blob URLs (Chrome shield blocks blob: in some setups).
 */
export async function downloadStorageFile(publicUrl: string, fallbackFilename?: string) {
  try {
    // Parse: .../storage/v1/object/public/{bucket}/{path}
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      // Last resort: try opening URL directly
      window.location.href = publicUrl;
      return;
    }

    const [, bucket, path] = match;
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(decodeURIComponent(path));

    if (error || !data) {
      console.error('Storage download error:', error);
      window.location.href = publicUrl;
      return;
    }

    const filename = fallbackFilename || decodeURIComponent(path.split('/').pop() || 'file');

    // Always trigger a real file download — works even when ad blockers
    // block blob: URLs from being opened in new tabs.
    const blobUrl = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch (e) {
    console.error('downloadStorageFile failed:', e);
    window.location.href = publicUrl;
  }
}
