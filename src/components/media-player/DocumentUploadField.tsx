import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, X, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadStorageFile, previewStorageFile } from "@/lib/storageDownload";

interface DocumentUploadFieldProps {
  label: string;
  numberValue: string;
  onNumberChange: (value: string) => void;
  documentUrl: string;
  onDocumentUploaded: (url: string) => void;
  onDocumentRemoved: () => void;
  placeholder?: string;
}

export function DocumentUploadField({
  label,
  numberValue,
  onNumberChange,
  documentUrl,
  onDocumentUploaded,
  onDocumentRemoved,
  placeholder,
}: DocumentUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const docName = numberValue.trim()
        ? numberValue.trim().replace(/[^a-zA-Z0-9-_]/g, "_")
        : `doc_${Date.now()}`;
      const filePath = `documents/${docName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media-player-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media-player-documents")
        .getPublicUrl(filePath);

      onDocumentUploaded(publicUrl);
      toast.success(`อัปโหลดไฟล์ ${label} สำเร็จ (${docName}.${ext})`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  };

  const inputId = `doc-upload-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={numberValue}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder={placeholder || `เลข ${label}`}
          className="flex-1"
        />
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
          onChange={handleUpload}
          disabled={isUploading}
          className="hidden"
          id={inputId}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={isUploading}
          title={`อัปโหลดไฟล์ ${label}`}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
      {documentUrl && (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-primary" />
          <button
            type="button"
            onClick={() => downloadStorageFile(documentUrl)}
            className="text-primary hover:underline truncate max-w-[200px] cursor-pointer text-left"
          >
            ดูไฟล์
          </button>
          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={onDocumentRemoved}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {numberValue && !documentUrl && (
        <p className="text-xs text-muted-foreground">
          ไฟล์จะถูกตั้งชื่อตามเลข {label}: "{numberValue}"
        </p>
      )}
    </div>
  );
}
