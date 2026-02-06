import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

interface CategoryFormProps {
  category?: Category | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CategoryForm({ category, open, onOpenChange, onSuccess }: CategoryFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  const isEditMode = !!category;

  useEffect(() => {
    if (category && dialogOpen) {
      setName(category.name);
      setDescription(category.description || "");
      setIsActive(category.is_active ?? true);
    } else if (!dialogOpen) {
      setName("");
      setDescription("");
      setIsActive(true);
    }
  }, [category, dialogOpen]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        name,
        description: description || null,
        is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("เพิ่มหมวดหมู่หลักสำเร็จ");
      setDialogOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!category) return;
      const { error } = await supabase.from("categories").update({
        name,
        description: description || null,
        is_active: isActive,
      }).eq("id", category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("แก้ไขหมวดหมู่หลักสำเร็จ");
      setDialogOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อหมวดหมู่");
      return;
    }
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มหมวดหมู่หลัก
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "แก้ไขหมวดหมู่หลัก" : "เพิ่มหมวดหมู่หลัก"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อหมวดหมู่ *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น อุปกรณ์ไฟฟ้า"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">เปิดใช้งาน</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "กำลังบันทึก..." : isEditMode ? "บันทึก" : "เพิ่ม"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
