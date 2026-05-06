import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Monitor, QrCode, Download, Printer, ChevronLeft, ChevronRight, X } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import { MediaPlayerRow } from "./types";
import { getConditionDisplay } from "./constants";
import { getPublicBaseUrl } from "@/lib/publicUrl";

interface ProfileHeaderProps {
  player: MediaPlayerRow;
  modelName: string;
  statusLabel: string;
  images: string[];
}

export function ProfileHeader({ player, modelName, statusLabel, images }: ProfileHeaderProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const condition = getConditionDisplay(player.item_condition);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const downloadQR = async () => {
    const svg = document.getElementById("media-player-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const remoteName = (player.remote_name || player.code || "").toString();
    const sn = (player.serial_number_1 || "").toString();
    const model = modelName && modelName !== "-" ? modelName : "";
    const nameLen = remoteName.length;
    const nameFontMm = nameLen <= 4 ? 11 : nameLen <= 6 ? 8.5 : nameLen <= 8 ? 7 : 5.5;

    // Sticker dimensions: 50mm x 30mm @ ~12 px/mm (scale 8x for crispness)
    const MM = 12;
    const W = 50 * MM;
    const H = 30 * MM;

    const container = document.createElement("div");
    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${W}px;height:${H}px;background:#fff;`;
    container.innerHTML = `
      <div style="width:${W}px;height:${H}px;padding:${1.5 * MM}px ${2 * MM}px;box-sizing:border-box;display:flex;flex-direction:column;gap:${0.8 * MM}px;font-family:system-ui,-apple-system,'Segoe UI','Sarabun',sans-serif;color:#000;background:#fff;">
        <div style="flex:1;display:flex;align-items:center;gap:${1.5 * MM}px;min-height:0;">
          <div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;">
            <div style="font-weight:900;line-height:0.95;text-align:center;font-size:${nameFontMm * MM}px;word-break:break-all;overflow:hidden;">${remoteName}</div>
          </div>
          <div style="flex-shrink:0;width:${21 * MM}px;height:${21 * MM}px;">${svgData.replace("<svg ", `<svg style="width:100%;height:100%;display:block;" `)}</div>
        </div>
        <div style="border-top:${0.3 * MM}px solid #000;"></div>
        <div style="display:flex;align-items:center;justify-content:center;gap:${1.5 * MM}px;font-size:${2.6 * MM}px;font-weight:700;white-space:nowrap;overflow:hidden;">
          ${model ? `<span>${model}</span><span style="width:${0.3 * MM}px;height:${2.6 * MM}px;background:#000;display:inline-block;"></span>` : ""}
          ${sn ? `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;">${sn}</span>` : ""}
        </div>
      </div>
    `;
    document.body.appendChild(container);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        backgroundColor: "#ffffff",
        scale: 4,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `qr-media-player-${player.code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      document.body.removeChild(container);
    }
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
                <Dialog>
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
                      <div className="bg-white p-4 rounded-xl">
                        <QRCodeSVG
                          id="media-player-qr-code"
                          value={`${getPublicBaseUrl()}/p/media-player/${player.id}`}
                          size={220}
                          level="H"
                        />
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
