import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileX2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadStorageFile, parseStorageUrls } from "@/lib/storageDownload";
import { PdfCanvasViewer } from "@/components/PdfCanvasViewer";
import { cn } from "@/lib/utils";

/** A single category of documents (e.g. "เอกสารจัดซื้อ"). May contain 0..N files. */
export interface DocumentCategory {
  label: string;
  /** Either a comma-separated string of URLs, an array, or null/empty. */
  urls?: string | string[] | null;
}

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Legacy single-URL (string) mode. If `categories` is provided it takes precedence. */
  publicUrl?: string | null;
  title?: string;
  /** Legacy: labels per URL when publicUrl has multiple comma-separated URLs. */
  labels?: string[];
  /** Preferred: list of all expected categories — empty ones still render as disabled tabs. */
  categories?: DocumentCategory[];
}

interface FlatTab {
  /** Category label (e.g. "เอกสารจัดซื้อ") */
  category: string;
  /** Display label for the tab itself */
  tabLabel: string;
  url: string | null;
  hasFile: boolean;
}

const toUrlArray = (input: string | string[] | null | undefined): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  return parseStorageUrls(input);
};

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  publicUrl,
  title = "ดูเอกสาร",
  labels,
  categories,
}: DocumentPreviewDialogProps) {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Build the unified flat tab list (each tab = one file slot OR an empty category).
  const tabs: FlatTab[] = useMemo(() => {
    if (categories && categories.length > 0) {
      const out: FlatTab[] = [];
      for (const cat of categories) {
        const urls = toUrlArray(cat.urls);
        if (urls.length === 0) {
          out.push({ category: cat.label, tabLabel: cat.label, url: null, hasFile: false });
        } else if (urls.length === 1) {
          out.push({ category: cat.label, tabLabel: cat.label, url: urls[0], hasFile: true });
        } else {
          urls.forEach((u, i) => {
            out.push({
              category: cat.label,
              tabLabel: `${cat.label} - ${i + 1}`,
              url: u,
              hasFile: true,
            });
          });
        }
      }
      return out;
    }
    // Legacy mode
    const urls = toUrlArray(publicUrl);
    if (urls.length === 0) return [];
    return urls.map((u, i) => ({
      category: labels?.[i] || `เอกสาร ${i + 1}`,
      tabLabel:
        labels && labels.length === urls.length
          ? labels[i]
          : `เอกสาร ${i + 1}`,
      url: u,
      hasFile: true,
    }));
  }, [categories, publicUrl, labels]);

  useEffect(() => {
    if (!open) return;
    // Default to first tab that actually has a file
    const firstWithFile = tabs.findIndex((t) => t.hasFile);
    setActiveIndex(firstWithFile >= 0 ? firstWithFile : 0);
  }, [open, tabs]);

  const activeTab = tabs[activeIndex];
  const activeUrl = activeTab?.url || null;

  useEffect(() => {
    if (!open || !activeUrl) {
      setPdfData(null);
      setImageDataUrl(null);
      setMimeType("");
      setFilename("");
      setLoading(false);
      setError(null);
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
          {tabs.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-background overflow-x-auto">
              {tabs.map((tab, index) => {
                const isActive = index === activeIndex;
                return (
                  <Button
                    key={index}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "gap-1.5 shrink-0",
                      !tab.hasFile && !isActive && "opacity-60"
                    )}
                    title={tab.hasFile ? "มีไฟล์แนบ" : "ยังไม่มีไฟล์"}
                  >
                    {tab.hasFile ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <FileX2 className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    {tab.tabLabel}
                  </Button>
                );
              })}
            </div>
          )}
          {!activeTab && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              ไม่มีเอกสาร
            </div>
          )}
          {activeTab && !activeTab.hasFile && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
              <FileX2 className="w-12 h-12 opacity-50" />
              <p className="font-medium">ยังไม่มีไฟล์ในหมวด "{activeTab.category}"</p>
              <p className="text-sm">หมวดนี้ยังไม่ได้อัปโหลดเอกสาร</p>
            </div>
          )}
          {activeTab?.hasFile && loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {activeTab?.hasFile && !loading && error && (
            <div className="flex-1 flex items-center justify-center text-destructive">
              {error}
            </div>
          )}
          {activeTab?.hasFile && !loading && !error && isPdf && pdfData && (
            <div className="flex-1 min-h-0">
              <PdfCanvasViewer data={pdfData} />
            </div>
          )}
          {activeTab?.hasFile && !loading && !error && isImage && imageDataUrl && (
            <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-auto p-4">
              <img
                src={imageDataUrl}
                alt={filename}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          {activeTab?.hasFile && !loading && !error && !canPreview && (
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
