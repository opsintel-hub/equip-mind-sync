import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  category_id: string | null;
}

interface SubcategoryFormProps {
  subcategory?: Subcategory | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SubcategoryForm({ subcategory, open, onOpenChange, onSuccess }: SubcategoryFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  const isEditMode = !!subcategory;

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  useEffect(() => {
    if (subcategory && dialogOpen) {
      setName(subcategory.name);
      setDescription(subcategory.description || "");
      setCategoryId(subcategory.category_id || "");
      setIsActive(subcategory.is_active ?? true);
    } else if (!dialogOpen) {
      setName("");
      setDescription("");
      setCategoryId("");
      setIsActive(true);
    }
  }, [subcategory, dialogOpen]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subcategories").insert({
        name,
        description: description || null,
        category_id: categoryId || null,
        is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories-with-category"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
      toast.success("เพิ่มหมวดหมู่ย่อยสำเร็จ");
      setDialogOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!subcategory) return;
      const { error } = await supabase.from("subcategories").update({
        name,
        description: description || null,
        category_id: categoryId || null,
        is_active: isActive,
      }).eq("id", subcategory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories-with-category"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-count"] });
      toast.success("แก้ไขหมวดหมู่ย่อยสำเร็จ");
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
      toast.error("กรุณาระบุชื่อหมวดหมู่ย่อย");
      return;
    }
    if (!categoryId) {
      toast.error("กรุณาเลือกหมวดหมู่หลัก");
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
            เพิ่มหมวดหมู่ย่อย
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "แก้ไขหมวดหมู่ย่อย" : "เพิ่มหมวดหมู่ย่อย"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryId">หมวดหมู่หลัก *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวดหมู่หลัก" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อหมวดหมู่ย่อย *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สายไฟฟ้า"
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
