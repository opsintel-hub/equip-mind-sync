import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MediaPlayerImageUploadProps {
  serialNumber1: string;
  imageUrl: string | null;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
}

export function MediaPlayerImageUpload({
  serialNumber1,
  imageUrl,
  onImageUploaded,
  onImageRemoved,
}: MediaPlayerImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = serialNumber1
        ? `${serialNumber1.replace(/[^a-zA-Z0-9-_]/g, "_")}.${ext}`
        : `${Date.now()}.${ext}`;

      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media-player-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media-player-images")
        .getPublicUrl(filePath);

      onImageUploaded(publicUrl);
      toast.success(`อัปโหลดรูปภาพสำเร็จ${serialNumber1 ? ` (ชื่อไฟล์: ${fileName})` : ""}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>รูปภาพ Media Player</Label>
      <p className="text-xs text-muted-foreground">
        {serialNumber1
          ? `ไฟล์จะถูกตั้งชื่อตาม S/N 1: "${serialNumber1}"`
          : "กรอก S/N 1 ก่อนเพื่อตั้งชื่อไฟล์ตาม Serial Number"}
      </p>
      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Media Player"
            className="w-40 h-40 object-cover rounded border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={onImageRemoved}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
            id="mp-image-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("mp-image-upload")?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            เลือกรูปภาพ
          </Button>
        </div>
      )}
    </div>
  );
}
