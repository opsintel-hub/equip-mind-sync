import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, Eye, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolImageItem {
  path: string; // storage path within the tool-images bucket
  url: string;  // signed url for preview
}

interface ToolImageUploadProps {
  images: ToolImageItem[];
  onChange: (images: ToolImageItem[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

const BUCKET = "tool-images";

async function sign(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 8);
  return data?.signedUrl || "";
}

export function ToolImageUpload({
  images,
  onChange,
  disabled,
  maxImages = 4,
}: ToolImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`อัพโหลดได้สูงสุด ${maxImages} รูป`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setIsUploading(true);

    try {
      const uploaded: ToolImageItem[] = [];
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`ไฟล์ ${file.name} ใหญ่เกิน 10MB`);
          continue;
        }
        const ext = file.name.split(".").pop();
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `tools/${filename}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const url = await sign(path);
        uploaded.push({ path, url });
      }
      onChange([...images, ...uploaded]);
      if (uploaded.length) toast.success(`อัพโหลด ${uploaded.length} รูปสำเร็จ`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "อัพโหลดไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const img = images[index];
    try {
      await supabase.storage.from(BUCKET).remove([img.path]);
    } catch (e) {
      console.error(e);
    }
    onChange(images.filter((_, i) => i !== index));
  };

  const handleDownload = async (img: ToolImageItem) => {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = img.path.split("/").pop() || "tool-image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("ดาวน์โหลดไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">รูปภาพเครื่องมือ</span>
        <span className="text-xs text-muted-foreground">{images.length}/{maxImages} รูป</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative w-20 h-20 border rounded-lg overflow-hidden group">
            <img src={img.url} alt={`รูป ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={() => setPreviewImage(img.url)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={() => handleDownload(img)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={() => handleRemove(idx)} disabled={disabled}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {images.length < maxImages && (
          <label className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">เพิ่มรูป</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        อัพโหลดได้ 1-{maxImages} รูป (สูงสุด 10MB ต่อรูป) —
        <strong> แนะนำให้มีรูป Serial Number (S/N) ของเครื่องมือรวมอยู่ด้วย 1 รูป</strong>
      </p>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>ดูรูปภาพ</DialogTitle></DialogHeader>
          {previewImage && <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[70vh] object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to load images for edit form
export async function loadToolImages(toolId: string): Promise<ToolImageItem[]> {
  const { data, error } = await supabase
    .from("tool_images")
    .select("image_url")
    .eq("tool_id", toolId)
    .order("display_order");
  if (error || !data) return [];
  const items: ToolImageItem[] = [];
  for (const row of data as any[]) {
    const path: string = row.image_url;
    const url = await sign(path);
    items.push({ path, url });
  }
  return items;
}

// Save current image list for a tool: diff and update tool_images rows
export async function persistToolImages(toolId: string, images: ToolImageItem[]) {
  await supabase.from("tool_images").delete().eq("tool_id", toolId);
  if (images.length === 0) return;
  const rows = images.map((img, idx) => ({
    tool_id: toolId,
    image_url: img.path,
    display_order: idx,
  }));
  await supabase.from("tool_images").insert(rows);
}

export type { ToolImageItem };
