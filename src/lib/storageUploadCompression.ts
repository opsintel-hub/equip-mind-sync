// Shrinks large phone photos before any storage upload so uploads don't fail/time out on mobile.
import { supabase } from "@/integrations/supabase/client";

const MAX_DIM = 2000;
const COMPRESS_OVER = 1.5 * 1024 * 1024;

async function compressImage(file: Blob & { name?: string }): Promise<Blob> {
  const type = file.type || "";
  if (!type.startsWith("image/") || type === "image/gif" || type === "image/svg+xml") return file;
  if (file.size < COMPRESS_OVER) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], (file.name || "image").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // browser can't decode (e.g. HEIC on desktop) — upload original
  }
}

export function installUploadCompression() {
  const proto = Object.getPrototypeOf(supabase.storage.from("equipment-images"));
  if (proto.__compressPatched) return;
  const orig = proto.upload;
  proto.upload = async function (path: string, body: any, options?: any) {
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      const out = await compressImage(body as any);
      if (out !== body) options = { ...(options || {}), contentType: "image/jpeg" };
      body = out;
    }
    return orig.call(this, path, body, options);
  };
  proto.__compressPatched = true;
}
