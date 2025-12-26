import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const warehouseSchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสคลัง").max(50, "รหัสต้องไม่เกิน 50 ตัวอักษร"),
  name: z.string().min(1, "กรุณากรอกชื่อคลัง").max(200, "ชื่อต้องไม่เกิน 200 ตัวอักษร"),
  description: z.string().max(500, "รายละเอียดต้องไม่เกิน 500 ตัวอักษร").optional(),
  storage_area: z.string().min(1, "กรุณาเลือกประเภทพื้นที่"),
  department: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

interface DepartmentOption {
  id: string;
  name: string;
}

interface WarehouseFormProps {
  onSuccess?: () => void;
  editData?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    storage_area: string | null;
    department: string | null;
  };
}

const storageAreaOptions = [
  { value: "Indoor", label: "ภายในอาคาร (Indoor)" },
  { value: "Outdoor", label: "ภายนอกอาคาร (Outdoor)" },
  { value: "Semi-outdoor", label: "กึ่งภายนอก (Semi-outdoor)" },
];

export function WarehouseForm({ onSuccess, editData }: WarehouseFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setDepartments(data || []);
  };

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      code: editData?.code || "",
      name: editData?.name || "",
      description: editData?.description || "",
      storage_area: editData?.storage_area || "",
      department: editData?.department || "",
    },
  });

  const onSubmit = async (data: WarehouseFormValues) => {
    setIsLoading(true);
    try {
      if (editData) {
        const { error } = await supabase
          .from("warehouses")
          .update({
            code: data.code,
            name: data.name,
            description: data.description || null,
            storage_area: data.storage_area,
            department: data.department || null,
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("แก้ไขคลังสินค้าสำเร็จ");
      } else {
        const { error } = await supabase.from("warehouses").insert({
          code: data.code,
          name: data.name,
          description: data.description || null,
          storage_area: data.storage_area,
          department: data.department || null,
        });

        if (error) throw error;
        toast.success("เพิ่มคลังสินค้าสำเร็จ");
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving warehouse:", error);
      toast.error(error.message || "บันทึกคลังสินค้าไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editData ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มคลังสินค้า
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "แก้ไขคลังสินค้า" : "เพิ่มคลังสินค้าใหม่"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสคลัง *</FormLabel>
                  <FormControl>
                    <Input placeholder="WH-001" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อคลังสินค้า *</FormLabel>
                  <FormControl>
                    <Input placeholder="คลังใหญ่พระราม9" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storage_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทพื้นที่จัดเก็บ *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทพื้นที่" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                      {storageAreaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ฝ่าย</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกฝ่าย (ถ้ามี)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียด</FormLabel>
                  <FormControl>
                    <Textarea placeholder="รายละเอียดเพิ่มเติม..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
