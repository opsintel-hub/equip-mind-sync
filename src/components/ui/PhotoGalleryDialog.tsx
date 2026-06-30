import { useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhotoGalleryDialogProps {
  photos: string[];
  title?: string;
  /** Custom trigger element. If omitted, renders a small badge-style button "{n} รูป". */
  trigger?: React.ReactNode;
}

/**
 * Reusable lightbox for browsing attached photos.
 * Click thumbnail/badge → open full dialog with prev/next, thumbnails strip, and "open original" link.
 */
export function PhotoGalleryDialog({ photos, title = "รูปประกอบ", trigger }: PhotoGalleryDialogProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const n = photos?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : n - 1));
      else if (e.key === "ArrowRight") setIndex((i) => (i < n - 1 ? i + 1 : 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, n]);

  if (!n) return null;

  const defaultTrigger = (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-0.5 text-xs hover:bg-secondary/80 transition-colors"
      title="คลิกเพื่อดูรูปต้นฉบับ"
    >
      <Camera className="h-3 w-3" />
      {n} รูป
    </button>
  );

  return (
    <>
      {trigger ? (
        <span onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="cursor-pointer inline-flex">
          {trigger}
        </span>
      ) : (
        defaultTrigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {title} <span className="text-muted-foreground text-sm font-normal">({index + 1}/{n})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <img
              src={photos[index]}
              alt={`รูปที่ ${index + 1}`}
              className="w-full h-full object-contain"
            />
            {n > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setIndex((i) => (i > 0 ? i - 1 : n - 1))}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setIndex((i) => (i < n - 1 ? i + 1 : 0))}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            <a
              href={photos[index]}
              target="_blank"
              rel="noreferrer"
              className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-black/60 text-white text-xs px-2 py-1 hover:bg-black/80"
            >
              <ExternalLink className="h-3 w-3" /> เปิดต้นฉบับ
            </a>
          </div>

          {n > 1 && (
            <div className="flex gap-2 flex-wrap justify-center pt-2">
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                    i === index ? "border-primary" : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  <img src={url} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
