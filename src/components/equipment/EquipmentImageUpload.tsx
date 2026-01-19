import { useState, useRef } from "react";
import { ImagePlus, X, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EquipmentImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function EquipmentImageUpload({ 
  images, 
  onChange, 
  disabled,
  maxImages = 5 
}: EquipmentImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`สามารถอัพโหลดได้สูงสุด ${maxImages} รูป`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน 5MB`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `equipment/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('equipment-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
      toast.success(`อัพโหลดรูปภาพสำเร็จ ${uploadedUrls.length} รูป`);
    } catch (error: any) {
      console.error("Error uploading images:", error);
      toast.error(error.message || "อัพโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    const imageUrl = images[indexToRemove];
    
    // Try to delete from storage (extract path from URL)
    try {
      const urlParts = imageUrl.split('/equipment-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('equipment-images').remove([filePath]);
      }
    } catch (error) {
      console.error("Error removing image from storage:", error);
    }

    const newImages = images.filter((_, index) => index !== indexToRemove);
    onChange(newImages);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">รูปภาพสินค้า (ไม่บังคับ)</span>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxImages} รูป
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Existing images */}
        {images.map((url, index) => (
          <div 
            key={index} 
            className="relative w-20 h-20 border rounded-lg overflow-hidden group"
          >
            <img
              src={url}
              alt={`รูปภาพ ${index + 1}`}
              className="w-full h-full object-cover"
            />
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
                onClick={() => handleRemoveImage(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        {images.length < maxImages && (
          <label
            className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors ${
              disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''
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

      <p className="text-xs text-muted-foreground">
        อัพโหลดได้ 1-5 รูป (สูงสุด 5MB ต่อรูป) - ใส่ครั้งแรกเท่านั้น
      </p>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>ดูรูปภาพ</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
