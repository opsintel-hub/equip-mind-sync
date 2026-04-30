import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadStorageFile } from "@/lib/storageDownload";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string | null;
  title?: string;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  publicUrl,
  title = "ดูเอกสาร",
}: DocumentPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [filename, setFilename] = useState<string>("");

  useEffect(() => {
    if (!open || !publicUrl) return;

    let revoke: string | null = null;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    (async () => {
      try {
        const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
        if (!match) {
          setError("URL เอกสารไม่ถูกต้อง");
          return;
        }
        const [, bucket, path] = match;
        const { data, error: dlErr } = await supabase.storage
          .from(bucket)
          .download(decodeURIComponent(path));

        if (dlErr || !data) {
          setError("โหลดเอกสารไม่สำเร็จ");
          return;
        }

        const fname = decodeURIComponent(path.split("/").pop() || "file");
        setFilename(fname);

        // Infer MIME type from extension if blob.type is empty
        const ext = fname.split(".").pop()?.toLowerCase() || "";
        const mimeMap: Record<string, string> = {
          pdf: "application/pdf",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
        };
        const detectedMime = data.type || mimeMap[ext] || "application/octet-stream";
        setMimeType(detectedMime);

        const typed = new Blob([data], { type: detectedMime });
        const url = URL.createObjectURL(typed);
        revoke = url;
        setBlobUrl(url);
      } catch (e: any) {
        console.error(e);
        setError("เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, publicUrl]);

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const canPreview = isImage || isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate">{title}</DialogTitle>
          <div className="flex items-center gap-2 mr-6">
            {blobUrl && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(blobUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  เปิดแท็บใหม่
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => publicUrl && downloadStorageFile(publicUrl)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  ดาวน์โหลด
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/20 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && blobUrl && isPdf && (
            <object
              data={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
              type="application/pdf"
              className="w-full h-full"
              aria-label={filename}
            >
              <embed
                src={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
                type="application/pdf"
                className="w-full h-full"
              />
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center text-muted-foreground">
                <p>เบราว์เซอร์ไม่สามารถ preview PDF ได้</p>
                <Button
                  size="sm"
                  onClick={() => window.open(blobUrl, "_blank", "noopener,noreferrer")}
                >
                  เปิดในแท็บใหม่
                </Button>
              </div>
            </object>
          )}
          {!loading && !error && blobUrl && isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img src={blobUrl} alt={filename} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          {!loading && !error && blobUrl && !canPreview && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6 text-center">
              <p>ไฟล์ประเภทนี้ ({mimeType || filename}) ไม่รองรับการ preview ในเบราว์เซอร์</p>
              <p className="text-sm">กรุณาใช้ปุ่ม "ดาวน์โหลด" เพื่อเปิดดูในโปรแกรมอื่น</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
