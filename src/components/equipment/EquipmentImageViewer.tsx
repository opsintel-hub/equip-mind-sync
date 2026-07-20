import { useState, useEffect } from "react";
import { ImageIcon, ChevronLeft, ChevronRight, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EquipmentImageViewerProps {
  equipmentId: string;
  equipmentName?: string;
  variant?: "button" | "icon";
}

export function EquipmentImageViewer({ 
  equipmentId, 
  equipmentName,
  variant = "icon" 
}: EquipmentImageViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImages = async () => {
    if (!equipmentId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment_images")
        .select("image_url")
        .eq("equipment_id", equipmentId)
        .order("display_order");

      if (error) throw error;
      setImages(data?.map(img => img.image_url) || []);
    } catch (error) {
      console.error("Error fetching equipment images:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, equipmentId]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (variant === "button") {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            ดูรูปภาพ
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              รูปภาพสินค้า {equipmentName && `- ${equipmentName}`}
            </DialogTitle>
          </DialogHeader>
          <ImageViewerContent
            images={images}
            currentIndex={currentIndex}
            isLoading={isLoading}
            onPrevious={handlePrevious}
            onNext={handleNext}
            setCurrentIndex={setCurrentIndex}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            รูปภาพสินค้า {equipmentName && `- ${equipmentName}`}
          </DialogTitle>
        </DialogHeader>
        <ImageViewerContent
          images={images}
          currentIndex={currentIndex}
          isLoading={isLoading}
          onPrevious={handlePrevious}
          onNext={handleNext}
          setCurrentIndex={setCurrentIndex}
        />
      </DialogContent>
    </Dialog>
  );
}

function ImageViewerContent({
  images,
  currentIndex,
  isLoading,
  onPrevious,
  onNext,
  setCurrentIndex
}: {
  images: string[];
  currentIndex: number;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  setCurrentIndex: (index: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
        <p>ไม่มีรูปภาพสินค้า</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <img
          src={images[currentIndex]}
          alt={`รูปภาพ ${currentIndex + 1}`}
          className="w-full h-full object-contain"
        />
        
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={onNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {currentIndex + 1} / {images.length}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-2 left-2"
          onClick={async () => {
            try {
              const res = await fetch(images[currentIndex]);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = images[currentIndex].split("/").pop()?.split("?")[0] || "image";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch {
              toast.error("ดาวน์โหลดไม่สำเร็จ");
            }
          }}
        >
          <Download className="h-4 w-4 mr-1" /> ดาวน์โหลด
        </Button>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 justify-center">
          {images.map((url, index) => (
            <button
              key={index}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex 
                  ? 'border-primary' 
                  : 'border-transparent hover:border-muted-foreground'
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <img
                src={url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
