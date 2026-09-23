// Utilities for bulk image import: match image file names to serial numbers / codes

export interface ParsedImageName {
  key: string;      // normalized matching key (S/N or code)
  sequence: number; // 1-based order taken from the file name suffix (1 when absent)
}

const SEQ_PATTERNS = [
  /[\s_-]+\((\d{1,2})\)$/, // "SN123 (2)"
  /[\s_-]+(\d{1,2})$/,     // "SN123_2" / "SN123-2" / "SN123 2"
];

export function normalizeKey(value: string): string {
  return value.replace(/\s+/g, "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function parseImageFileName(fileName: string): ParsedImageName {
  const withoutExt = fileName.replace(/\.[^.]+$/, "").trim();
  let base = withoutExt;
  let sequence = 1;

  for (const re of SEQ_PATTERNS) {
    const m = base.match(re);
    if (m) {
      sequence = parseInt(m[1], 10) || 1;
      base = base.slice(0, m.index).trim();
      break;
    }
  }

  return { key: normalizeKey(base), sequence };
}

export interface TargetRecord {
  id: string;
  label: string; // shown in preview table
}

/** Build lookup map from a list of candidate keys per record. Duplicate keys map to null (ambiguous). */
export function buildKeyIndex(
  records: { id: string; label: string; keys: (string | null | undefined)[] }[],
): Map<string, TargetRecord | null> {
  const index = new Map<string, TargetRecord | null>();
  for (const rec of records) {
    for (const raw of rec.keys) {
      if (!raw) continue;
      const key = normalizeKey(String(raw));
      if (!key) continue;
      if (index.has(key)) {
        const current = index.get(key);
        if (current && current.id !== rec.id) index.set(key, null);
      } else {
        index.set(key, { id: rec.id, label: rec.label });
      }
    }
  }
  return index;
}

/** Downscale an image in the browser before upload. Returns a JPEG blob. */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  return blob && blob.size < file.size ? blob : file;
}
