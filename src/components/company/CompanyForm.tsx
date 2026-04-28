import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALL_DEPARTMENTS_VALUE = "__ALL__";

const companySchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสบริษัท"),
  name: z.string().min(1, "กรุณากรอกชื่อบริษัท"),
  department_id: z.string().min(1, "กรุณาเลือกฝ่าย"),
  description: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface Department {
  id: string;
  name: string;
}

interface CompanyFormProps {
  onSuccess?: () => void;
  editData?: {
    id: string;
    code: string;
    name: string;
    department_id: string | null;
    description: string | null;
  };
}

export function CompanyForm({ onSuccess, editData }: CompanyFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      code: editData?.code || "",
      name: editData?.name || "",
      department_id: editData ? (editData.department_id || ALL_DEPARTMENTS_VALUE) : "",
      description: editData?.description || "",
    },
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (editData) {
      form.reset({
        code: editData.code,
        name: editData.name,
        department_id: editData.department_id || ALL_DEPARTMENTS_VALUE,
        description: editData.description || "",
      });
    }
  }, [editData, form]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setDepartments(data);
    }
  };

  const onSubmit = async (data: CompanyFormValues) => {
    setIsLoading(true);
    try {
      const departmentIdToSave =
        data.department_id === ALL_DEPARTMENTS_VALUE ? null : data.department_id;

      if (editData) {
        const { error } = await supabase
          .from("companies")
          .update({
            code: data.code,
            name: data.name,
            department_id: departmentIdToSave,
            description: data.description || null,
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("แก้ไขบริษัทสำเร็จ");
      } else {
        const { error } = await supabase.from("companies").insert({
          code: data.code,
          name: data.name,
          department_id: departmentIdToSave,
          description: data.description || null,
        });

        if (error) throw error;
        toast.success("เพิ่มบริษัทสำเร็จ");
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "เกิดข้อผิดพลาด");
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
          <Button>+ เพิ่มบริษัท</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editData ? "แก้ไขบริษัท" : "เพิ่มบริษัท"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ฝ่าย *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกฝ่าย" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสบริษัท *</FormLabel>
                  <FormControl>
                    <Input placeholder="COM-001" {...field} disabled={isLoading} />
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
                  <FormLabel>ชื่อบริษัท *</FormLabel>
                  <FormControl>
                    <Input placeholder="บริษัท ABC จำกัด" {...field} disabled={isLoading} />
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
                    <Textarea
                      placeholder="รายละเอียดบริษัท..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editData ? "บันทึก" : "เพิ่ม"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
