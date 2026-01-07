import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface IssuePurposeFormProps {
  onSuccess: () => void;
}

export function IssuePurposeForm({ onSuccess }: IssuePurposeFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    requires_billboard: false,
    requires_return: false,
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

      const { error } = await supabase.from("issue_purposes").insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        requires_billboard: formData.requires_billboard,
        requires_return: formData.requires_return,
        created_by: userData?.user?.id,
      });

      if (error) throw error;

      toast.success("เพิ่มวัตถุประสงค์สำเร็จ");
      setFormData({
        name: "",
        description: "",
        requires_billboard: false,
        requires_return: false,
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มวัตถุประสงค์
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มวัตถุประสงค์การเบิก</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อวัตถุประสงค์ *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="เช่น ซ่อมป้ายโฆษณา"
              required
            />
          </div>

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

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_billboard"
                checked={formData.requires_billboard}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_billboard: checked === true })
                }
              />
              <Label htmlFor="requires_billboard" className="text-sm font-normal">
                ต้องระบุป้ายโฆษณา (เช่น เบิกเพื่อซ่อม)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_return"
                checked={formData.requires_return}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_return: checked === true })
                }
              />
              <Label htmlFor="requires_return" className="text-sm font-normal">
                ต้องรับคืนกลับคลัง (เช่น เบิกเพื่อเคลม)
              </Label>
            </div>
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
