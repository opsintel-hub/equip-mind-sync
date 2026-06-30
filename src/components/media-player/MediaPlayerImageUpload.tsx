import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface MediaPlayerImageUploadProps {
  mediaPlayerId: string;
  mediaPlayerCode: string;
  onClose: () => void;
}

interface MPImage {
  id: string;
  image_url: string;
  description: string | null;
  display_order: number | null;
}

export function MediaPlayerImageUpload({ mediaPlayerId, mediaPlayerCode, onClose }: MediaPlayerImageUploadProps) {
  const [existingImages, setExistingImages] = useState<MPImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const MAX_IMAGES = 5;

  useEffect(() => {
    fetchImages();
  }, [mediaPlayerId]);

  const fetchImages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("media_player_images" as any)
      .select("*")
      .eq("media_player_id", mediaPlayerId)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setExistingImages(data as any);
    }
    setIsLoading(false);
  };

  const remainingSlots = MAX_IMAGES - existingImages.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxNew = remainingSlots - selectedFiles.length;
    if (maxNew <= 0) {
      toast.error(`ถึงจำนวนสูงสุด ${MAX_IMAGES} รูปแล้ว`);
      return;
    }

    const newFiles = files.slice(0, maxNew);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExisting = async (image: MPImage) => {
    if (!confirm("ต้องการลบรูปภาพนี้?")) return;

    try {
      // Delete from storage
      const urlParts = image.image_url.split("/media-player-images/");
      if (urlParts.length > 1) {
        await supabase.storage.from("media-player-images").remove([urlParts[1]]);
      }

      // Delete from DB
      const { error } = await supabase
        .from("media_player_images" as any)
        .delete()
        .eq("id", image.id);

      if (error) throw error;

      toast.success("ลบรูปภาพสำเร็จ");
      fetchImages();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("ลบรูปภาพไม่สำเร็จ");
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("กรุณาเลือกรูปภาพ");
      return;
    }

    setIsUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${mediaPlayerId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("media-player-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("media-player-images")
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from("media_player_images" as any)
          .insert({
            media_player_id: mediaPlayerId,
            image_url: urlData.publicUrl,
            display_order: existingImages.length + i,
          });

        if (dbError) throw dbError;
      }

      toast.success(`อัปโหลด ${selectedFiles.length} รูปสำเร็จ`);
      setSelectedFiles([]);
      setPreviews([]);
      fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload ภาพ Media Player — {mediaPlayerCode}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            อัปโหลดได้สูงสุด {MAX_IMAGES} รูป (ปัจจุบัน {existingImages.length}/{MAX_IMAGES})
          </p>
        </DialogHeader>

        {/* Existing images */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : existingImages.length > 0 ? (
          <div className="space-y-2">
            <Label>รูปภาพปัจจุบัน ({existingImages.length} รูป)</Label>
            <div className="grid grid-cols-5 gap-2">
              {existingImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.image_url}
                    alt="Media Player"
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => handleDeleteExisting(img)}
                    className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">ยังไม่มีรูปภาพ</p>
        )}

        {/* Upload new */}
        {remainingSlots > 0 && (
          <div className="space-y-3">
            <Label>เพิ่มรูปภาพใหม่ (เพิ่มได้อีก {remainingSlots - selectedFiles.length} รูป)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="mp-multi-upload"
              disabled={selectedFiles.length >= remainingSlots}
            />
            <label htmlFor="mp-multi-upload">
              <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">คลิกเพื่อเลือกรูปภาพ</p>
              </div>
            </label>

            {previews.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`New ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeNewFile(index)}
                        className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      อัปโหลดรูปภาพ ({selectedFiles.length} รูป)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
