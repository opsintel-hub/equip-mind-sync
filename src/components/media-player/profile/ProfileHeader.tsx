import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Monitor, QrCode, Download, Printer, ChevronLeft, ChevronRight, X } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import { MediaPlayerRow } from "./types";
import { getConditionDisplay } from "./constants";

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

  const downloadQR = () => {
    const svg = document.getElementById("media-player-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `qr-media-player-${player.code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svg = document.getElementById("media-player-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    printWindow.document.write(`
      <html><head><title>QR Code - ${player.code}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}</style>
      </head><body>
      <h2>${player.code}</h2>
      <p>${player.name}</p>
      ${player.serial_number_1 ? `<p style="font-family:monospace">S/N: ${player.serial_number_1}</p>` : ""}
      ${svgData}
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
                          value={`${window.location.origin}/p/media-player/${player.id}`}
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
