import { useState, useEffect } from "react";
import { ImageIcon, ChevronLeft, ChevronRight, Download, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { setPrimaryImage } from "@/hooks/usePrimaryImages";
import { toast } from "sonner";

interface EquipmentImageViewerProps {
  equipmentId: string;
  equipmentName?: string;
  variant?: "button" | "icon";
}

interface Row { id: string; image_url: string; is_primary: boolean }

export function EquipmentImageViewer({
  equipmentId,
  equipmentName,
  variant = "icon",
}: EquipmentImageViewerProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImages = async () => {
    if (!equipmentId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment_images")
        .select("id, image_url, is_primary")
        .eq("equipment_id", equipmentId)
        .order("is_primary", { ascending: false })
        .order("display_order");
      if (error) throw error;
      setRows(((data as any[]) || []) as Row[]);
      setCurrentIndex(0);
    } catch (e) {
      console.error("Error fetching equipment images:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (isOpen) fetchImages(); }, [isOpen, equipmentId]);

  const handlePrev = () => setCurrentIndex((p) => (p > 0 ? p - 1 : rows.length - 1));
  const handleNext = () => setCurrentIndex((p) => (p < rows.length - 1 ? p + 1 : 0));

  const currentRow = rows[currentIndex];
  const isCurrentPrimary = currentRow?.is_primary;

  const handleSetPrimary = async () => {
    if (!currentRow) return;
    try {
      await setPrimaryImage("equipment_images", "equipment_id", equipmentId, currentRow.id);
      toast.success("ตั้งเป็นรูปหลักแล้ว");
      fetchImages();
    } catch { toast.error("ตั้งรูปหลักไม่สำเร็จ"); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />ดูรูปภาพ
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span>รูปภาพสินค้า {equipmentName && `- ${equipmentName}`}</span>
            {rows.length > 0 && (
              <Button
                variant={isCurrentPrimary ? "default" : "outline"}
                size="sm"
                onClick={handleSetPrimary}
                disabled={isCurrentPrimary}
              >
                <Star className={`h-4 w-4 mr-2 ${isCurrentPrimary ? "fill-current" : ""}`} />
                {isCurrentPrimary ? "รูปหลัก" : "ตั้งเป็นรูปหลัก"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
            <p>ไม่มีรูปภาพสินค้า</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img src={rows[currentIndex].image_url} alt={`รูปภาพ ${currentIndex + 1}`} className="w-full h-full object-contain" />
              {rows.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={handlePrev}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70" onClick={handleNext}>
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {currentIndex + 1} / {rows.length}
              </div>
              {isCurrentPrimary && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" /> รูปหลัก
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 left-2"
                onClick={async () => {
                  try {
                    const res = await fetch(rows[currentIndex].image_url);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = rows[currentIndex].image_url.split("/").pop()?.split("?")[0] || "image";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch { toast.error("ดาวน์โหลดไม่สำเร็จ"); }
                }}
              >
                <Download className="h-4 w-4 mr-1" /> ดาวน์โหลด
              </Button>
            </div>
            {rows.length > 1 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {rows.map((r, idx) => (
                  <button
                    key={r.id}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === currentIndex ? "border-primary" : "border-transparent hover:border-muted-foreground"
                    }`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    <img src={r.image_url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    {r.is_primary && (
                      <div className="absolute top-0.5 right-0.5 bg-yellow-500 rounded-full p-0.5">
                        <Star className="h-2.5 w-2.5 text-white fill-current" />
                      </div>
                    )}
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
