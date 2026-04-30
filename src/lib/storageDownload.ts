import { supabase } from "@/integrations/supabase/client";

export function parseStorageUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s*,\s*/)
    .map((url) => url.trim())
    .filter(Boolean);
}

/**
 * Fetches a file from Supabase Storage via SDK as a Blob.
 * Bypasses ad blockers that block *.supabase.co URLs.
 */
async function fetchStorageBlob(publicUrl: string): Promise<{ blob: Blob; filename: string } | null> {
  const [singleUrl] = parseStorageUrls(publicUrl);
  if (!singleUrl) return null;

  const match = singleUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;

  const [, bucket, path] = match;
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(decodeURIComponent(path));

  if (error || !data) {
    console.error('Storage download error:', error);
    return null;
  }

  const filename = decodeURIComponent(path.split('/').pop() || 'file');
  return { blob: data, filename };
}

/**
 * Opens a file from Supabase Storage in a new tab for preview.
 * Falls back to download if preview fails.
 */
export async function previewStorageFile(publicUrl: string) {
  try {
    const [singleUrl] = parseStorageUrls(publicUrl);
    const result = await fetchStorageBlob(singleUrl || publicUrl);
    if (!result) {
      window.open(singleUrl || publicUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Create blob URL with explicit MIME type for proper inline preview
    const blob = new Blob([result.blob], { type: result.blob.type || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked → fallback to download
      await downloadStorageFile(publicUrl);
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (e) {
    console.error('previewStorageFile failed:', e);
    const [singleUrl] = parseStorageUrls(publicUrl);
    window.open(singleUrl || publicUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Downloads a file from Supabase Storage via SDK (bypasses ad blockers).
 */
export async function downloadStorageFile(publicUrl: string, fallbackFilename?: string) {
  try {
    const urls = parseStorageUrls(publicUrl);
    if (urls.length > 1) {
      for (const url of urls) {
        await downloadStorageFile(url);
      }
      return;
    }

    const singleUrl = urls[0] || publicUrl;
    const result = await fetchStorageBlob(singleUrl);
    if (!result) {
      window.location.href = singleUrl;
      return;
    }

    const filename = fallbackFilename || result.filename;
    const blobUrl = URL.createObjectURL(result.blob);
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
    const [singleUrl] = parseStorageUrls(publicUrl);
    window.location.href = singleUrl || publicUrl;
  }
}
