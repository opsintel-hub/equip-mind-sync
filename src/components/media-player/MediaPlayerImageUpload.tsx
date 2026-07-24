import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2, Camera, Star, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { setPrimaryImage } from "@/hooks/usePrimaryImages";


interface MediaPlayerImageUploadProps {
  mediaPlayerId: string;
  mediaPlayerCode: string;
  onClose: () => void;
  onImagesChange?: () => void;
}

interface MPImage {
  id: string;
  image_url: string;
  description: string | null;
  display_order: number | null;
  is_primary?: boolean | null;
}

const MAX_IMAGES = 5;

export function MediaPlayerImageUpload({ mediaPlayerId, mediaPlayerCode, onClose, onImagesChange }: MediaPlayerImageUploadProps) {
  const [existingImages, setExistingImages] = useState<MPImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchImages();
  }, [mediaPlayerId]);

  const fetchImages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("media_player_images" as any)
      .select("*")
      .eq("media_player_id", mediaPlayerId)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true });

    if (!error && data) {
      setExistingImages(data as any);
    }
    setIsLoading(false);
  };

  const handleSetPrimary = async (img: MPImage) => {
    try {
      await setPrimaryImage("media_player_images", "media_player_id", mediaPlayerId, img.id);
      toast.success("ตั้งเป็นรูปหลักแล้ว");
      await fetchImages();
      onImagesChange?.();
    } catch {
      toast.error("ตั้งรูปหลักไม่สำเร็จ");
    }
  };

  const handleReorder = async (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...existingImages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setExistingImages(next);
    try {
      await Promise.all(
        next.map((img, idx) =>
          supabase.from("media_player_images" as any).update({ display_order: idx }).eq("id", img.id)
        )
      );
      onImagesChange?.();
    } catch {
      toast.error("จัดลำดับรูปไม่สำเร็จ");
      fetchImages();
    }
  };



  const visibleExistingImages = existingImages.slice(0, MAX_IMAGES);
  const remainingSlots = Math.max(0, MAX_IMAGES - existingImages.length);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxNew = remainingSlots - selectedFiles.length;
    if (maxNew <= 0) {
      toast.error(`ถึงจำนวนสูงสุด ${MAX_IMAGES} รูปแล้ว`);
      return;
    }

    const newFiles = files.slice(0, maxNew);
    if (newFiles.length < files.length) {
      toast.warning(`เลือกได้เพิ่มอีก ${maxNew} รูปเท่านั้น — จำกัดสูงสุด ${MAX_IMAGES} ภาพ`);
    }
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
      await fetchImages();
      onImagesChange?.();
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
      await fetchImages();
      onImagesChange?.();
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
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-medium text-foreground">
            ⚠ อัปโหลดได้ไม่เกิน {MAX_IMAGES} ภาพ (ปัจจุบัน {Math.min(existingImages.length, MAX_IMAGES)}/{MAX_IMAGES})
          </div>
        </DialogHeader>

        {/* Existing images */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : existingImages.length > 0 ? (
          <div className="space-y-2">
            <Label>รูปภาพปัจจุบัน ({Math.min(existingImages.length, MAX_IMAGES)} / {MAX_IMAGES} รูป)</Label>
            <p className="text-xs text-muted-foreground">ลากรูปเพื่อเรียงลำดับใหม่ • กด ⭐ เพื่อตั้งเป็นรูปหลักที่แสดงในตาราง</p>
            <div className="grid grid-cols-5 gap-2">
              {visibleExistingImages.map((img, idx) => {
                const isPrimary = !!img.is_primary || (!existingImages.some(i => i.is_primary) && idx === 0);
                return (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIndex !== null) { handleReorder(dragIndex, idx); setDragIndex(null); } }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`relative group cursor-move rounded-lg border-2 ${isPrimary ? "border-yellow-500" : "border-transparent"} ${dragIndex === idx ? "opacity-40" : ""}`}
                    title="ลากเพื่อเรียงลำดับ"
                  >
                    <img src={img.image_url} alt="Media Player" className="w-full h-24 object-cover rounded-md" />
                    <div className="absolute top-1 left-1 p-0.5 bg-black/40 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-3 w-3" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img)}
                      className={`absolute bottom-1 left-1 p-1 rounded-full transition-opacity ${isPrimary ? "bg-yellow-500 text-white opacity-100" : "bg-black/50 text-white opacity-0 group-hover:opacity-100"}`}
                      title={isPrimary ? "รูปหลัก" : "ตั้งเป็นรูปหลัก"}
                    >
                      <Star className={`h-3 w-3 ${isPrimary ? "fill-current" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExisting(img)}
                      className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="ลบรูป"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
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

        {remainingSlots === 0 && !isLoading && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
            ครบ {MAX_IMAGES} ภาพแล้ว หากต้องการเพิ่มรูปใหม่ กรุณาลบรูปเดิมก่อน
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
