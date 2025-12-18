import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const departmentSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อฝ่าย").max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
  description: z.string().max(500, "รายละเอียดต้องไม่เกิน 500 ตัวอักษร").optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
  onSuccess?: () => void;
  editData?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function DepartmentForm({ onSuccess, editData }: DepartmentFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: editData?.name || "",
      description: editData?.description || "",
    },
  });

  const onSubmit = async (data: DepartmentFormValues) => {
    setIsLoading(true);
    try {
      if (editData) {
        const { error } = await supabase
          .from("departments")
          .update({
            name: data.name,
            description: data.description || null,
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("แก้ไขฝ่ายสำเร็จ");
      } else {
        const { error } = await supabase.from("departments").insert({
          name: data.name,
          description: data.description || null,
        });

        if (error) throw error;
        toast.success("เพิ่มฝ่ายสำเร็จ");
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving department:", error);
      toast.error(error.message || "บันทึกฝ่ายไม่สำเร็จ");
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
            เพิ่มฝ่าย
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "แก้ไขฝ่าย" : "เพิ่มฝ่ายใหม่"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อฝ่าย *</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น Billboard, Airport, Digital" {...field} disabled={isLoading} />
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
