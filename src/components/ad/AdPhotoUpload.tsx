import { useState, useRef } from "react";
import { ImagePlus, X, Eye, Loader2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdPhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
  label?: string;
  hint?: string;
  required?: boolean;
}

export function AdPhotoUpload({
  photos,
  onChange,
  disabled,
  maxPhotos = 5,
  label = "ภาพถ่ายภาพโฆษณาจริง",
  hint = "ภาพถ่ายจะต้องเห็นภาพโฆษณาที่ชัดเจน สามารถระบุจำนวน และเวอร์ชันได้ ความจุได้ไม่เกิน 10Mb/ภาพ",
  required = false,
}: AdPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`สามารถอัปโหลดได้สูงสุด ${maxPhotos} รูป`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        if (!file.type.startsWith("image/")) {
          throw new Error(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน 10MB`);
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `photos/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("ad-files").upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("ad-files").getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...photos, ...uploadedUrls]);
      toast.success(`อัปโหลดรูปภาพสำเร็จ ${uploadedUrls.length} รูป`);
    } catch (error: any) {
      toast.error(error.message || "อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async (indexToRemove: number) => {
    const imageUrl = photos[indexToRemove];
    try {
      const urlParts = imageUrl.split("/ad-files/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("ad-files").remove([filePath]);
      }
    } catch (error) {
      console.error("Error removing image from storage:", error);
    }
    onChange(photos.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {label} {required && "*"} (สูงสุด {maxPhotos} ภาพ)
        </span>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos} รูป
        </span>
      </div>

      {hint && <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">💡 {hint}</p>}

      <div className="flex flex-wrap gap-2">
        {photos.map((url, index) => (
          <div key={index} className="relative w-20 h-20 border rounded-lg overflow-hidden group">
            <img src={url} alt={`ภาพ ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                onClick={() => setPreviewImage(url)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                onClick={() => handleRemovePhoto(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <label
            className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors ${
              disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
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

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>ดูรูปภาพ</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[70vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AdDocUploadProps {
  docUrl: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function AdDocUpload({ docUrl, onChange, disabled }: AdDocUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์มีขนาดใหญ่เกิน 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `docs/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("ad-files").upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("ad-files").getPublicUrl(filePath);

      onChange(publicUrl);
      toast.success("อัปโหลดเอกสารสำเร็จ");
    } catch (error: any) {
      toast.error(error.message || "อัปโหลดเอกสารไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (docUrl) {
      try {
        const urlParts = docUrl.split("/ad-files/");
        if (urlParts.length > 1) {
          await supabase.storage.from("ad-files").remove([urlParts[1]]);
        }
      } catch (error) {
        console.error("Error removing doc:", error);
      }
    }
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">เอกสารประกอบการติดตั้ง (PDF/รูปภาพ)</label>
      {docUrl ? (
        <div className="flex items-center gap-2 border rounded-lg p-2">
          <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex-1"
          >
            ดูเอกสาร
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          className={`flex items-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors ${
            disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isUploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดเอกสาร"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
          />
        </label>
      )}
    </div>
  );
}
