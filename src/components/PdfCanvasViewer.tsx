import { useEffect, useRef, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Use the bundled worker from pdfjs-dist (no CDN, ad-blocker safe)
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite handles ?url import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfCanvasViewerProps {
  data: ArrayBuffer | Uint8Array;
}

export function PdfCanvasViewer({ data }: PdfCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Clone buffer to avoid detached ArrayBuffer issues on re-render
    const buf = data instanceof Uint8Array ? data.slice() : new Uint8Array(data).slice();

    const task = pdfjsLib.getDocument({ data: buf });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("PDF load error:", e);
        setError("ไม่สามารถโหลด PDF ได้");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [data]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let renderTask: any = null;
    let cancelled = false;

    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const viewport = pdfPage.getViewport({ scale });

        // Sharp rendering for retina
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        renderTask = pdfPage.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await renderTask.promise;
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") {
          console.error("Render error:", e);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdf, page, scale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b bg-background/80 backdrop-blur">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          {page} / {numPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setScale((s) => Math.min(3, s + 0.2))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4 flex justify-center">
        <canvas ref={canvasRef} className="shadow-lg bg-white" />
      </div>
    </div>
  );
}
