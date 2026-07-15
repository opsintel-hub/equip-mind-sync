import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const sectionSchema = z.object({
  department_id: z.string().min(1, "กรุณาเลือกฝ่าย"),
  name: z.string().min(1, "กรุณากรอกชื่อแผนก").max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  description: z.string().max(500, "รายละเอียดต้องไม่เกิน 500 ตัวอักษร").optional(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

interface SectionFormProps {
  onSuccess?: () => void;
  editData?: {
    id: string;
    department_id: string;
    name: string;
    description: string | null;
  };
  defaultDepartmentId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  triggerClassName?: string;
}

export function SectionForm({ onSuccess, editData }: SectionFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-for-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      department_id: editData?.department_id || "",
      name: editData?.name || "",
      description: editData?.description || "",
    },
  });

  // Reset form when editData changes
  useEffect(() => {
    if (editData) {
      form.reset({
        department_id: editData.department_id,
        name: editData.name,
        description: editData.description || "",
      });
    }
  }, [editData, form]);

  const onSubmit = async (data: SectionFormValues) => {
    setIsLoading(true);
    try {
      if (editData) {
        const { error } = await supabase
          .from("sections")
          .update({
            department_id: data.department_id,
            name: data.name,
            description: data.description || null,
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("แก้ไขแผนกสำเร็จ");
      } else {
        const { error } = await supabase.from("sections").insert({
          department_id: data.department_id,
          name: data.name,
          description: data.description || null,
        });

        if (error) throw error;
        toast.success("เพิ่มแผนกสำเร็จ");
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast.error(error.message || "บันทึกแผนกไม่สำเร็จ");
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
            เพิ่มแผนก
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ฝ่าย *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกฝ่าย" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อแผนก *</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น แผนกซ่อมบำรุง, แผนกบัญชี" {...field} disabled={isLoading} />
                  </FormControl>
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
