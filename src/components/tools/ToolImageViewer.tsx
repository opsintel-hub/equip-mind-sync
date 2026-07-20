import { useState, useEffect } from "react";
import { ImageIcon, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolImageViewerProps {
  toolId: string;
  toolName?: string;
  variant?: "button" | "icon";
}

const BUCKET = "tool-images";

export function ToolImageViewer({ toolId, toolName, variant = "icon" }: ToolImageViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImages = async () => {
    if (!toolId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tool_images")
        .select("image_url")
        .eq("tool_id", toolId)
        .order("display_order");
      if (error) throw error;
      const rows = (data as any[]) || [];
      const signedUrls: string[] = [];
      const pathList: string[] = [];
      for (const r of rows) {
        pathList.push(r.image_url);
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(r.image_url, 60 * 60 * 8);
        signedUrls.push(s?.signedUrl || "");
      }
      setPaths(pathList);
      setImages(signedUrls);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchImages();
  }, [isOpen, toolId]);

  const prev = () => setCurrentIndex((p) => (p > 0 ? p - 1 : images.length - 1));
  const next = () => setCurrentIndex((p) => (p < images.length - 1 ? p + 1 : 0));

  const download = async () => {
    try {
      const res = await fetch(images[currentIndex]);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = paths[currentIndex]?.split("/").pop() || "tool-image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("ดาวน์โหลดไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />ดูรูปภาพ
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="ดูรูปภาพเครื่องมือ">
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>รูปภาพเครื่องมือ {toolName && `- ${toolName}`}</span>
            {images.length > 0 && (
              <Button variant="outline" size="sm" onClick={download}>
                <Download className="h-4 w-4 mr-2" />ดาวน์โหลด
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
            <p>ยังไม่มีรูปภาพเครื่องมือ</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img src={images[currentIndex]} alt={`รูปภาพ ${currentIndex + 1}`} className="w-full h-full object-contain" />
              {images.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={prev}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={next}>
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${idx === currentIndex ? "border-primary" : "border-transparent hover:border-muted-foreground"}`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
