import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/importTemplates/imageMatcher";

interface Props {
  photos: string[];
  onChange: (p: string[]) => void;
  max?: number;
  folder: string;
  label: string;
}

const BUCKET = "delivery-confirmations";

export function ReturnPhotoDropzone({ photos, onChange, max = 3, folder, label }: Props) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFiles = async (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return toast.error("กรุณาเลือกไฟล์รูปภาพ");
    const slots = max - photos.length;
    if (slots <= 0) return toast.error(`ใส่รูปได้ไม่เกิน ${max} รูป`);
    if (files.length > slots) toast.warning(`รับเพิ่มได้อีก ${slots} รูป`);
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files.slice(0, slots)) {
        const blob = await compressImage(f, 1280, 0.75);
        const path = `returns/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }
      onChange([...photos, ...urls]);
    } catch (e: any) {
      toast.error(e.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label} <span className="text-destructive">*</span></span>
        <span className="text-xs text-muted-foreground">{photos.length}/{max} รูป (อย่างน้อย 1)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {photos.map((u, i) => (
          <div key={u} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={u} alt={`รูป ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <div
            onClick={() => !busy && ref.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) handleFiles(e.dataTransfer.files); }}
            className={`flex-1 min-w-[180px] h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer text-xs text-muted-foreground transition-colors ${drag ? "border-primary bg-primary/5" : "hover:border-primary hover:bg-muted/50"}`}
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="mt-1">{busy ? "กำลังอัปโหลด..." : "ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์"}</span>
            <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">ระบบจะลดความละเอียดรูปอัตโนมัติก่อนอัปโหลด</p>
    </div>
  );
}
