import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, QrCode, Download, Printer, ChevronLeft, ChevronRight, X } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import { MediaPlayerRow } from "./types";
import { getConditionDisplay } from "./constants";
import { getPublicBaseUrl } from "@/lib/publicUrl";

type StickerOptions = {
  widthMm: number;
  heightMm: number;
  qrPosition: "right" | "left";
};

const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "50 × 30", w: 50, h: 30 },
  { label: "70 × 40", w: 70, h: 40 },
  { label: "40 × 25", w: 40, h: 25 },
  { label: "100 × 50", w: 100, h: 50 },
];

interface ProfileHeaderProps {
  player: MediaPlayerRow;
  modelName: string;
  statusLabel: string;
  images: string[];
}

export function ProfileHeader({ player, modelName, statusLabel, images }: ProfileHeaderProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const condition = getConditionDisplay(player.item_condition);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const drawSticker = async (canvas: HTMLCanvasElement, mmScale = 24) => {
    const svg = document.getElementById("media-player-qr-code");
    if (!svg) return false;
    const svgData = new XMLSerializer().serializeToString(svg);
    const remoteName = (player.remote_name || player.code || "").toString();
    const sn = (player.serial_number_1 || "").toString();
    const code = (player.code || "").toString();

    const MM = mmScale;
    const W = 50 * MM;
    const H = 30 * MM;
    const padX = 2 * MM;
    const padY = 1.5 * MM;
    const qrSize = 21 * MM;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = reject;
      qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    });

    const topAreaH = H - padY * 2 - 0.3 * MM - 4 * MM;
    const qrX = W - padX - qrSize;
    const qrY = padY + (topAreaH - qrSize) / 2;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    const leftAreaW = qrX - padX - 1.5 * MM;
    const leftAreaH = topAreaH;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontPx = Math.floor(leftAreaH * 0.85);
    const fontFamily = `'Arial Black', 'Helvetica', system-ui, sans-serif`;
    while (fontPx > 10) {
      ctx.font = `900 ${fontPx}px ${fontFamily}`;
      const m = ctx.measureText(remoteName);
      if (m.width <= leftAreaW * 0.95 && fontPx <= leftAreaH * 0.95) break;
      fontPx -= 2;
    }
    ctx.fillText(remoteName, padX + leftAreaW / 2, padY + leftAreaH / 2);

    const divY = padY + topAreaH + 1 * MM;
    ctx.fillStyle = "#000000";
    ctx.fillRect(padX, divY, W - padX * 2, Math.max(1, 0.3 * MM));

    const bottomY = divY + 0.3 * MM + 1.5 * MM;
    const bottomFontPx = 2.6 * MM;
    ctx.font = `bold ${bottomFontPx}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const sep = "  |  ";
    const text = sn ? `${code}${sep}${sn}` : code;
    ctx.fillText(text, W / 2, bottomY);
    return true;
  };

  // Render preview when dialog opens
  useEffect(() => {
    if (!qrOpen) return;
    const t = setTimeout(() => {
      if (previewCanvasRef.current) {
        drawSticker(previewCanvasRef.current, 8).catch(() => {});
      }
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen, player.id]);

  const downloadQR = async () => {
    const canvas = document.createElement("canvas");
    const ok = await drawSticker(canvas, 24);
    if (!ok) return;
    const link = document.createElement("a");
    link.download = `qr-media-player-${player.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svg = document.getElementById("media-player-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const remoteName = (player.remote_name || player.code || "").toString();
    const sn = (player.serial_number_1 || "").toString();
    const model = modelName && modelName !== "-" ? modelName : "";
    // Auto-fit Name (เผื่อ 3 ตัว default ใหญ่, ยิ่งยาวยิ่งเล็กลง)
    const nameLen = remoteName.length;
    // รองรับ Name 4 ตัวอักษรแบบใหญ่เต็มที่ (เดิม 3 ตัว)
    const nameFontMm = nameLen <= 4 ? 11 : nameLen <= 6 ? 8.5 : nameLen <= 8 ? 7 : 5.5;
    printWindow.document.write(`
      <html><head><title>QR - ${player.code}</title>
      <style>
        @page { size: 50mm 30mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; color: #000; font-family: system-ui, -apple-system, "Segoe UI", "Sarabun", sans-serif; }
        .sticker {
          width: 50mm; height: 30mm; padding: 1.5mm 2mm;
          display: flex; flex-direction: column; gap: 0.8mm;
          page-break-after: always;
        }
        .top { flex: 1; display: flex; align-items: center; gap: 1.5mm; min-height: 0; }
        .left { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; }
        .remote {
          font-weight: 900; line-height: 0.95; text-align: center;
          font-size: ${nameFontMm}mm;
          word-break: break-all; overflow: hidden;
        }
        .qr { flex-shrink: 0; width: 21mm; height: 21mm; }
        .qr svg { width: 100% !important; height: 100% !important; display: block; }
        .divider { border-top: 0.3mm solid #000; }
        .bottom {
          display: flex; align-items: center; justify-content: center; gap: 1.5mm;
          font-size: 2.6mm; font-weight: 700; letter-spacing: 0.1px;
          white-space: nowrap; overflow: hidden;
        }
        .model { font-weight: 700; }
        .vbar { width: 0.3mm; height: 2.6mm; background: #000; }
        .sn { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 700; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head><body>
        <div class="sticker">
          <div class="top">
            <div class="left"><div class="remote">${remoteName}</div></div>
            <div class="qr">${svgData}</div>
          </div>
          <div class="divider"></div>
          <div class="bottom">
            ${model ? `<span class="model">${model}</span><span class="vbar"></span>` : ""}
            ${sn ? `<span class="sn">${sn}</span>` : ""}
          </div>
        </div>
        <script>setTimeout(()=>window.print(),300)</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="shrink-0">
              {images.length > 0 ? (
                <img
                  src={images[0]}
                  alt={player.code}
                  className="w-40 h-40 object-cover rounded-xl border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openLightbox(0)}
                />
              ) : (
                <div className="w-40 h-40 bg-muted rounded-xl flex items-center justify-center">
                  <Monitor className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
              {images.length > 1 && (
                <div className="flex gap-1 mt-2">
                  {images.slice(1, 5).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      className="w-9 h-9 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openLightbox(i + 1)}
                    />
                  ))}
                  {images.length > 5 && (
                    <button
                      className="w-9 h-9 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
                      onClick={() => openLightbox(5)}
                    >
                      +{images.length - 5}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold font-mono">{player.code}</h2>
                <Badge variant="secondary">{statusLabel}</Badge>
                <Badge variant="outline" className={`${condition.className} border`}>
                  {condition.label}
                </Badge>
                {/* QR Code */}
                <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <QrCode className="w-4 h-4" />
                      QR Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>QR Code — {player.code}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="bg-white p-4 rounded-xl hidden">
                        <QRCodeSVG
                          id="media-player-qr-code"
                          value={`${getPublicBaseUrl()}/p/media-player/${player.id}`}
                          size={220}
                          level="H"
                        />
                      </div>
                      {/* Sticker preview (50x30mm @ 8px/mm = 400x240) */}
                      <div className="w-full">
                        <p className="text-xs text-muted-foreground mb-1.5 text-center">
                          ตัวอย่างสติ๊กเกอร์ (ขนาดจริง 50 × 30 มม.)
                        </p>
                        <div className="flex justify-center">
                          <canvas
                            ref={previewCanvasRef}
                            className="border rounded-md shadow-sm bg-white"
                            style={{ width: "400px", maxWidth: "100%", height: "auto" }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        สแกนเพื่อเปิดหน้า Profile ของ <span className="font-mono font-semibold">{player.code}</span>
                      </p>
                      {player.serial_number_1 && (
                        <p className="text-xs text-muted-foreground font-mono">S/N: {player.serial_number_1}</p>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={downloadQR}>
                          <Download className="w-4 h-4 mr-1" />
                          ดาวน์โหลด
                        </Button>
                        <Button variant="outline" size="sm" onClick={printQR}>
                          <Printer className="w-4 h-4 mr-1" />
                          พิมพ์
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-lg text-muted-foreground mt-1">{player.name} {modelName !== "-" ? `• ${modelName}` : ""}</p>
              {player.remote_name && (
                <p className="text-sm mt-1">
                  ชื่อเครื่อง (Name): <span className="font-semibold">{player.remote_name}</span>
                </p>
              )}
              {player.serial_number_1 && (
                <p className="text-sm mt-2 font-mono">
                  S/N 1: <span className="font-semibold">{player.serial_number_1}</span>
                  {player.serial_number_2 && <> &nbsp;|&nbsp; S/N 2: <span className="font-semibold">{player.serial_number_2}</span></>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      {images.length > 0 && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>รูปภาพ {player.code}</DialogTitle>
            </DialogHeader>
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={images[lightboxIndex]}
                alt={`${player.code} - ${lightboxIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/40 rounded-full p-2"
              >
                <X className="w-5 h-5" />
              </button>
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 rounded-full p-2"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 rounded-full p-2"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {images.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
