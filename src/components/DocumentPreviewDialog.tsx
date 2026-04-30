import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadStorageFile, parseStorageUrls } from "@/lib/storageDownload";
import { PdfCanvasViewer } from "@/components/PdfCanvasViewer";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string | null;
  title?: string;
  /** Optional labels for each URL (when publicUrl contains multiple comma-separated URLs).
   *  If provided length matches URL count, used as tab labels; otherwise falls back to "เอกสาร N". */
  labels?: string[];
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  publicUrl,
  title = "ดูเอกสาร",
  labels,
}: DocumentPreviewDialogProps) {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open || !publicUrl) {
      setPdfData(null);
      setImageDataUrl(null);
      setMimeType("");
      setFilename("");
      setError(null);
      setLoading(false);
      setDocumentUrls([]);
      setActiveIndex(0);
      return;
    }

    const urls = parseStorageUrls(publicUrl);
    setDocumentUrls(urls);
    setActiveIndex(0);
  }, [open, publicUrl]);

  const activeUrl = documentUrls[activeIndex] || null;

  useEffect(() => {
    if (!open || !activeUrl) {
      setPdfData(null);
      setImageDataUrl(null);
      setMimeType("");
      setFilename("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPdfData(null);
    setImageDataUrl(null);

    (async () => {
      try {
        const match = activeUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
        if (!match) {
          setError("URL เอกสารไม่ถูกต้อง");
          setLoading(false);
          return;
        }
        const [, bucket, path] = match;
        const { data, error: dlErr } = await supabase.storage
          .from(bucket)
          .download(decodeURIComponent(path));

        if (dlErr || !data) {
          setError("โหลดเอกสารไม่สำเร็จ");
          setLoading(false);
          return;
        }

        const fname = decodeURIComponent(path.split("/").pop() || "file");
        setFilename(fname);

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

        if (detectedMime === "application/pdf") {
          const buf = await data.arrayBuffer();
          setPdfData(buf);
        } else if (detectedMime.startsWith("image/")) {
          // Convert to data URL — bypasses ad-blocker (no blob:, no http URL)
          const reader = new FileReader();
          reader.onload = () => setImageDataUrl(reader.result as string);
          reader.readAsDataURL(data);
        }
        setLoading(false);
      } catch (e: any) {
        console.error(e);
        setError("เกิดข้อผิดพลาด");
        setLoading(false);
      }
    })();
  }, [open, activeUrl]);

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const canPreview = isImage || isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate">{title}</DialogTitle>
          <div className="flex items-center gap-2 mr-6">
            {activeUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadStorageFile(activeUrl)}
              >
                <Download className="w-4 h-4 mr-1" />
                ดาวน์โหลด
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/20 overflow-hidden min-h-0 flex flex-col">
          {documentUrls.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-background overflow-x-auto">
              {documentUrls.map((_, index) => (
                <Button
                  key={index}
                  type="button"
                  size="sm"
                  variant={index === activeIndex ? "default" : "outline"}
                  onClick={() => setActiveIndex(index)}
                >
                  เอกสาร {index + 1}
                </Button>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {!loading && error && (
            <div className="flex-1 flex items-center justify-center text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && isPdf && pdfData && (
            <div className="flex-1 min-h-0">
              <PdfCanvasViewer data={pdfData} />
            </div>
          )}
          {!loading && !error && isImage && imageDataUrl && (
            <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-auto p-4">
              <img
                src={imageDataUrl}
                alt={filename}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          {!loading && !error && !canPreview && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
              <p>ไฟล์ประเภทนี้ ({mimeType || filename}) ไม่รองรับการ preview</p>
              <p className="text-sm">กรุณากด "ดาวน์โหลด" เพื่อเปิดในโปรแกรมอื่น</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
