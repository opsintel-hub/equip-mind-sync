import { useState, useEffect } from "react";
import { ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface MediaPlayerImageViewerProps {
  mediaPlayerId: string;
  mediaPlayerName?: string;
  variant?: "button" | "icon";
}

export function MediaPlayerImageViewer({
  mediaPlayerId,
  mediaPlayerName,
  variant = "icon",
}: MediaPlayerImageViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImages = async () => {
    if (!mediaPlayerId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("media_player_images" as any)
        .select("image_url")
        .eq("media_player_id", mediaPlayerId)
        .order("display_order");
      if (error) throw error;
      setImages((data as any[])?.map((img) => img.image_url) || []);
    } catch (e) {
      console.error("Error fetching media player images:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchImages();
  }, [isOpen, mediaPlayerId]);

  const handlePrev = () => setCurrentIndex((p) => (p > 0 ? p - 1 : images.length - 1));
  const handleNext = () => setCurrentIndex((p) => (p < images.length - 1 ? p + 1 : 0));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            ดูรูปภาพ
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            รูปภาพ Media Player {mediaPlayerName && `- ${mediaPlayerName}`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
            <p>ไม่มีรูปภาพ</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={handleNext}
                  >
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
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === currentIndex ? "border-primary" : "border-transparent hover:border-muted-foreground"
                    }`}
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
