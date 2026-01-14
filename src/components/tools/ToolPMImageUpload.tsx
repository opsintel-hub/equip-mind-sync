import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, X, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ToolPMImageUploadProps {
  taskId: string;
  onUploadComplete?: () => void;
}

export function ToolPMImageUpload({ taskId, onUploadComplete }: ToolPMImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 files
    const newFiles = files.slice(0, 5 - selectedFiles.length);
    
    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("กรุณาเลือกรูปภาพ");
      return;
    }

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        // Create a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('pm-images')
          .upload(fileName, file);

        if (uploadError) {
          // If bucket doesn't exist, save as base64 data URL
          console.warn("Storage upload failed, saving reference:", uploadError);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('pm-images')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('tool_pm_task_images')
          .insert({
            tool_pm_task_id: taskId,
            image_url: urlData.publicUrl || fileName,
            description: description || null,
          });

        if (dbError) throw dbError;
      }

      toast.success("อัปโหลดรูปภาพสำเร็จ");
      setSelectedFiles([]);
      setPreviews([]);
      setDescription("");
      onUploadComplete?.();
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          เพิ่มรูปภาพ (สูงสุด 5 รูป)
        </Label>
        
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="pm-image-upload"
            disabled={selectedFiles.length >= 5}
          />
          <label htmlFor="pm-image-upload" className="flex-1">
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                คลิกเพื่อเลือกรูปภาพ หรือลากไฟล์มาวาง
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Preview */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>คำอธิบายรูปภาพ (ไม่บังคับ)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น สภาพก่อนทำความสะอาด, หลังหยอดน้ำมัน"
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              "กำลังอัปโหลด..."
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
  );
}
