import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ReceiptPurpose {
  id: string;
  name: string;
  description: string | null;
  purpose_type: string;
  max_storage_days: number | null;
  requires_location: boolean;
  is_active: boolean | null;
}

interface ReceiptPurposeFormProps {
  onSuccess: () => void;
  purpose?: ReceiptPurpose;
}

const purposeTypeOptions = [
  { value: "storage", label: "ฝากเก็บ (ไม่มี Process ต่อ)" },
  { value: "regular", label: "นำเข้าปกติ (มี Process ต่อ)" },
];

export function ReceiptPurposeForm({ onSuccess, purpose }: ReceiptPurposeFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: purpose?.name || "",
    description: purpose?.description || "",
    purpose_type: purpose?.purpose_type || "storage",
    max_storage_days: purpose?.max_storage_days?.toString() || "",
    requires_location: purpose?.requires_location || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อวัตถุประสงค์");
      return;
    }

    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        purpose_type: formData.purpose_type,
        max_storage_days: formData.max_storage_days ? parseInt(formData.max_storage_days) : null,
        requires_location: formData.purpose_type === "regular" ? true : false,
        created_by: userData?.user?.id,
      };

      if (purpose) {
        const { error } = await supabase
          .from("receipt_purposes")
          .update(payload)
          .eq("id", purpose.id);
        if (error) throw error;
        toast.success("แก้ไขวัตถุประสงค์สำเร็จ");
      } else {
        const { error } = await supabase.from("receipt_purposes").insert(payload);
        if (error) throw error;
        toast.success("เพิ่มวัตถุประสงค์สำเร็จ");
      }

      setFormData({
        name: "",
        description: "",
        purpose_type: "storage",
        max_storage_days: "",
        requires_location: false,
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {purpose ? (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มวัตถุประสงค์
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {purpose ? "แก้ไขวัตถุประสงค์การนำสินค้าเข้า" : "เพิ่มวัตถุประสงค์การนำสินค้าเข้า"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อวัตถุประสงค์ *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="เช่น ฝากเก็บ (ไม่เกิน 24 ชั่วโมง)"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose_type">ประเภท *</Label>
            <SearchableSelect
              options={purposeTypeOptions}
              value={formData.purpose_type}
              onValueChange={(value) => setFormData({ ...formData, purpose_type: value })}
              placeholder="เลือกประเภท"
            />
            <p className="text-xs text-muted-foreground">
              {formData.purpose_type === "storage" 
                ? "ฝากเก็บ: ไม่มี Process ต่อ รอเบิกออกเท่านั้น"
                : "นำเข้าปกติ: ต้องจัดเก็บตามตำแหน่ง มี Process ต่อ"}
            </p>
          </div>

          {formData.purpose_type === "storage" && (
            <div className="space-y-2">
              <Label htmlFor="max_storage_days">จำนวนวันสูงสุดที่ฝากเก็บได้</Label>
              <Input
                id="max_storage_days"
                type="number"
                min="1"
                value={formData.max_storage_days}
                onChange={(e) => setFormData({ ...formData, max_storage_days: e.target.value })}
                placeholder="เว้นว่างถ้าไม่จำกัด"
              />
              <p className="text-xs text-muted-foreground">
                เช่น 1 = ไม่เกิน 24 ชั่วโมง, 7 = ไม่เกิน 7 วัน
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="คำอธิบายเพิ่มเติม"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
