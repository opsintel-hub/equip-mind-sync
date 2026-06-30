import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, QrCode, Download, Printer, ChevronLeft, ChevronRight, X, Move, RotateCcw, Camera, ExternalLink } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import { MediaPlayerRow } from "./types";
import { getConditionDisplay } from "./constants";
import { getPublicBaseUrl } from "@/lib/publicUrl";
import { DeviceTypeBadge } from "@/components/media-player/DeviceTypeBadge";
import { MediaPlayerImageUpload } from "@/components/media-player/MediaPlayerImageUpload";

type StickerOptions = {
  widthMm: number;
  heightMm: number;
};

// Layout uses ratios (0..1) of sticker w/h so resizing is consistent.
type Box = { x: number; y: number; w: number; h: number };
type StickerLayout = {
  qr: Box;     // QR is drawn as square based on min(w,h)
  name: Box;
  bottom: Box;
};

type DragKey = keyof StickerLayout | null;

const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "50 × 30", w: 50, h: 30 },
  { label: "70 × 40", w: 70, h: 40 },
  { label: "40 × 25", w: 40, h: 25 },
  { label: "100 × 50", w: 100, h: 50 },
  { label: "30 × 30", w: 30, h: 30 },
];

const defaultLayout = (): StickerLayout => ({
  // QR on the right side, square ~70% of height
  qr:     { x: 0.55, y: 0.08, w: 0.40, h: 0.66 },
  // Name on the left, large
  name:   { x: 0.04, y: 0.08, w: 0.50, h: 0.66 },
  // Bottom strip across full width
  bottom: { x: 0.04, y: 0.78, w: 0.92, h: 0.18 },
});

const LAYOUT_KEY = (w: number, h: number) => `mp-sticker-layout:${w}x${h}`;

const loadLayout = (w: number, h: number): StickerLayout => {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY(w, h));
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw);
    if (parsed?.qr && parsed?.name && parsed?.bottom) return parsed as StickerLayout;
  } catch {}
  return defaultLayout();
};

const saveLayout = (w: number, h: number, lay: StickerLayout) => {
  try {
    localStorage.setItem(LAYOUT_KEY(w, h), JSON.stringify(lay));
  } catch {}
};

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

  const [stickerOpts, setStickerOpts] = useState<StickerOptions>({
    widthMm: 50,
    heightMm: 30,
  });
  const [layout, setLayout] = useState<StickerLayout>(() => loadLayout(50, 30));
  const [editMode, setEditMode] = useState(false);
  const dragRef = useRef<{ key: DragKey; offsetX: number; offsetY: number }>({
    key: null, offsetX: 0, offsetY: 0,
  });

  // Load saved layout when sticker size changes
  useEffect(() => {
    setLayout(loadLayout(stickerOpts.widthMm, stickerOpts.heightMm));
  }, [stickerOpts.widthMm, stickerOpts.heightMm]);

  // Persist layout per size whenever it changes
  useEffect(() => {
    saveLayout(stickerOpts.widthMm, stickerOpts.heightMm, layout);
  }, [stickerOpts.widthMm, stickerOpts.heightMm, layout]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const drawSticker = async (
    canvas: HTMLCanvasElement,
    opts: StickerOptions,
    lay: StickerLayout,
    mmScale = 24,
    showHandles = false,
  ) => {
    const svg = document.getElementById("media-player-qr-code");
    if (!svg) return false;
    const svgData = new XMLSerializer().serializeToString(svg);
    const remoteName = (player.remote_name || player.code || "").toString();
    const sn = (player.serial_number_1 || "").toString();
    const code = (player.code || "").toString();

    const MM = mmScale;
    const W = opts.widthMm * MM;
    const H = opts.heightMm * MM;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // QR
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = reject;
      qrImg.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    });

    const qrBoxW = lay.qr.w * W;
    const qrBoxH = lay.qr.h * H;
    const qrSize = Math.min(qrBoxW, qrBoxH);
    const qrX = lay.qr.x * W + (qrBoxW - qrSize) / 2;
    const qrY = lay.qr.y * H + (qrBoxH - qrSize) / 2;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Name (auto-fit inside name box)
    const nameX = lay.name.x * W;
    const nameY = lay.name.y * H;
    const nameW = lay.name.w * W;
    const nameH = lay.name.h * H;
    const fontFamily = `'Arial Black', 'Helvetica', system-ui, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontPx = Math.floor(nameH * 0.95);
    while (fontPx > 8) {
      ctx.font = `900 ${fontPx}px ${fontFamily}`;
      const m = ctx.measureText(remoteName);
      if (m.width <= nameW * 0.96 && fontPx <= nameH * 0.96) break;
      fontPx -= 2;
    }
    ctx.fillText(remoteName, nameX + nameW / 2, nameY + nameH / 2);

    // Bottom strip with divider line above
    const bX = lay.bottom.x * W;
    const bY = lay.bottom.y * H;
    const bW = lay.bottom.w * W;
    const bH = lay.bottom.h * H;
    ctx.fillStyle = "#000000";
    ctx.fillRect(bX, bY, bW, Math.max(1, 0.3 * MM));
    const text = sn ? `${code}  |  ${sn}` : code;
    let bFont = Math.floor(bH * 0.7);
    while (bFont > 6) {
      ctx.font = `bold ${bFont}px ${fontFamily}`;
      if (ctx.measureText(text).width <= bW * 0.98) break;
      bFont -= 1;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bX + bW / 2, bY + bH / 2 + Math.max(1, 0.3 * MM) / 2);

    // Edit-mode handles
    if (showHandles) {
      const drawBox = (b: Box, color: string, label: string) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x * W, b.y * H, b.w * W, b.h * H);
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = `bold 10px ${fontFamily}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label, b.x * W + 3, b.y * H + 2);
        ctx.restore();
      };
      drawBox(lay.qr, "rgba(37,99,235,0.85)", "QR");
      drawBox(lay.name, "rgba(220,38,38,0.85)", "Name");
      drawBox(lay.bottom, "rgba(16,185,129,0.85)", "Code|S/N");
    }
    return true;
  };

  // Render preview when dialog opens or options/layout change
  useEffect(() => {
    if (!qrOpen) return;
    const t = setTimeout(() => {
      if (previewCanvasRef.current) {
        drawSticker(previewCanvasRef.current, stickerOpts, layout, 8, editMode).catch(() => {});
      }
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen, player.id, stickerOpts.widthMm, stickerOpts.heightMm, layout, editMode]);

  // Drag handlers (preview canvas)
  const hitTest = (lay: StickerLayout, rx: number, ry: number): DragKey => {
    // Check in priority order (smallest on top)
    const inside = (b: Box) => rx >= b.x && rx <= b.x + b.w && ry >= b.y && ry <= b.y + b.h;
    if (inside(lay.qr)) return "qr";
    if (inside(lay.name)) return "name";
    if (inside(lay.bottom)) return "bottom";
    return null;
  };

  const getRel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      rx: (e.clientX - rect.left) / rect.width,
      ry: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    const { rx, ry } = getRel(e);
    const key = hitTest(layout, rx, ry);
    if (!key) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const b = layout[key];
    dragRef.current = { key, offsetX: rx - b.x, offsetY: ry - b.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editMode || !dragRef.current.key) return;
    const { rx, ry } = getRel(e);
    const key = dragRef.current.key;
    setLayout((prev) => {
      const b = prev[key];
      const nx = Math.max(0, Math.min(1 - b.w, rx - dragRef.current.offsetX));
      const ny = Math.max(0, Math.min(1 - b.h, ry - dragRef.current.offsetY));
      return { ...prev, [key]: { ...b, x: nx, y: ny } };
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.key = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const resizeBox = useCallback((key: keyof StickerLayout, dw: number, dh: number) => {
    setLayout((prev) => {
      const b = prev[key];
      const nw = Math.max(0.05, Math.min(1 - b.x, b.w + dw));
      const nh = Math.max(0.05, Math.min(1 - b.y, b.h + dh));
      return { ...prev, [key]: { ...b, w: nw, h: nh } };
    });
  }, []);

  const downloadOne = async (opts: StickerOptions) => {
    const canvas = document.createElement("canvas");
    const ok = await drawSticker(canvas, opts, layout, 24, false);
    if (!ok) return;
    const link = document.createElement("a");
    link.download = `qr-${player.code}-${opts.widthMm}x${opts.heightMm}mm.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadQR = () => downloadOne(stickerOpts);

  const downloadAllPresets = async () => {
    for (const p of SIZE_PRESETS) {
      await downloadOne({ widthMm: p.w, heightMm: p.h });
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const canvas = document.createElement("canvas");
    drawSticker(canvas, stickerOpts, layout, 24, false).then((ok) => {
      if (!ok) return;
      const dataUrl = canvas.toDataURL("image/png");
      const escHtml = (s: string) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      printWindow.document.write(`
        <html><head><title>QR - ${escHtml(player.code)}</title>
        <style>
          @page { size: ${stickerOpts.widthMm}mm ${stickerOpts.heightMm}mm; margin: 0; }
          html, body { margin: 0; padding: 0; }
          img { width: ${stickerOpts.widthMm}mm; height: ${stickerOpts.heightMm}mm; display: block; }
        </style></head><body>
          <img src="${dataUrl}" />
          <script>setTimeout(()=>window.print(),300)</script>
        </body></html>
      `);
      printWindow.document.close();
    });
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
                <DeviceTypeBadge value={(player as any).device_type} />
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
                  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                      {/* Size presets */}
                      <div className="w-full space-y-2">
                        <Label className="text-xs">ขนาดสติ๊กเกอร์ (มม.)</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {SIZE_PRESETS.map((p) => {
                            const active =
                              stickerOpts.widthMm === p.w && stickerOpts.heightMm === p.h;
                            return (
                              <Button
                                key={p.label}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() =>
                                  setStickerOpts({ widthMm: p.w, heightMm: p.h })
                                }
                              >
                                {p.label}
                              </Button>
                            );
                          })}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">กว้าง (มม.)</Label>
                            <Input
                              type="number"
                              min={20}
                              max={200}
                              value={stickerOpts.widthMm}
                              onChange={(e) =>
                                setStickerOpts((o) => ({
                                  ...o,
                                  widthMm: Math.max(20, Math.min(200, Number(e.target.value) || 0)),
                                }))
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">สูง (มม.)</Label>
                            <Input
                              type="number"
                              min={15}
                              max={150}
                              value={stickerOpts.heightMm}
                              onChange={(e) =>
                                setStickerOpts((o) => ({
                                  ...o,
                                  heightMm: Math.max(15, Math.min(150, Number(e.target.value) || 0)),
                                }))
                              }
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Edit toggle + reset */}
                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={editMode ? "default" : "outline"}
                            className="h-8 text-xs"
                            onClick={() => setEditMode((v) => !v)}
                          >
                            <Move className="w-3.5 h-3.5 mr-1" />
                            {editMode ? "เสร็จสิ้น" : "แก้ไขเลย์เอาต์"}
                          </Button>
                          {editMode && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => setLayout(defaultLayout())}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              รีเซ็ต
                            </Button>
                          )}
                        </div>
                        {editMode && (
                          <span className="text-[10px] text-muted-foreground">
                            ลากกล่องเพื่อย้าย
                          </span>
                        )}
                      </div>

                      {/* Sticker preview */}
                      <div className="w-full">
                        <p className="text-xs text-muted-foreground mb-1.5 text-center">
                          ตัวอย่างสติ๊กเกอร์ (ขนาดจริง {stickerOpts.widthMm} × {stickerOpts.heightMm} มม.)
                        </p>
                        <div className="flex justify-center">
                          <canvas
                            ref={previewCanvasRef}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            className="border rounded-md shadow-sm bg-white touch-none select-none"
                            style={{
                              width: `${Math.min(400, stickerOpts.widthMm * 6)}px`,
                              maxWidth: "100%",
                              height: "auto",
                              cursor: editMode ? "grab" : "default",
                            }}
                          />
                        </div>
                      </div>

                      {/* Resize controls in edit mode */}
                      {editMode && (
                        <div className="w-full grid grid-cols-3 gap-2 text-xs">
                          {(["qr", "name", "bottom"] as const).map((k) => (
                            <div key={k} className="border rounded-md p-2 space-y-1">
                              <div className="font-semibold capitalize text-center">
                                {k === "bottom" ? "Code|S/N" : k.toUpperCase()}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-muted-foreground">กว้าง</span>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => resizeBox(k, -0.05, 0)}>−</Button>
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => resizeBox(k, 0.05, 0)}>+</Button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-muted-foreground">สูง</span>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => resizeBox(k, 0, -0.05)}>−</Button>
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => resizeBox(k, 0, 0.05)}>+</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground text-center">
                        สแกนเพื่อเปิดหน้า Profile ของ <span className="font-mono font-semibold">{player.code}</span>
                      </p>
                      {player.serial_number_1 && (
                        <p className="text-xs text-muted-foreground font-mono">S/N: {player.serial_number_1}</p>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button variant="default" size="sm" onClick={downloadQR}>
                          <Download className="w-4 h-4 mr-1" />
                          ดาวน์โหลดขนาดนี้
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadAllPresets}>
                          <Download className="w-4 h-4 mr-1" />
                          ดาวน์โหลดทุกขนาด ({SIZE_PRESETS.length})
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
