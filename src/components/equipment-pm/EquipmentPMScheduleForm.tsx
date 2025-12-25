import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  equipment_id: z.string().min(1, "กรุณาเลือกเครื่องมือ"),
  department: z.string().min(1, "กรุณาระบุฝ่าย"),
  equipment_type: z.string().min(1, "กรุณาระบุประเภทเครื่องมือ"),
  title: z.string().min(1, "กรุณาระบุชื่องาน PM"),
  description: z.string().optional(),
  schedule_type: z.string().min(1, "กรุณาเลือกความถี่"),
  next_due_date: z.string().min(1, "กรุณาระบุวันที่ครบกำหนด"),
  advance_notice_days: z.coerce.number().min(1, "กรุณาระบุจำนวนวันแจ้งเตือน"),
});

type FormData = z.infer<typeof formSchema>;

interface Equipment {
  id: string;
  code: string;
  name: string;
  department: string | null;
  category: string;
}

interface Department {
  id: string;
  name: string;
}

interface EquipmentPMScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    equipment_id: string;
    department: string;
    equipment_type: string;
    title: string;
    description: string | null;
    schedule_type: string;
    next_due_date: string;
    advance_notice_days: number;
  } | null;
}

const SCHEDULE_TYPES = [
  { value: "monthly", label: "1 เดือน" },
  { value: "quarterly", label: "3 เดือน" },
  { value: "semi-annual", label: "6 เดือน" },
  { value: "annual", label: "รายปี" },
];

const EQUIPMENT_TYPES = [
  "เครื่องมือประจำตัวช่าง",
  "เครื่องมือวัด",
  "เครื่องมือหนัก",
  "พาหนะ",
  "อุปกรณ์ safety และ อุปกรณ์ที่สูง",
  "อุปกรณ์ถ่ายภาพ",
  "อื่นๆ",
];


export function EquipmentPMScheduleForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: EquipmentPMScheduleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipment_id: "",
      department: "",
      equipment_type: "",
      title: "",
      description: "",
      schedule_type: "monthly",
      next_due_date: new Date().toISOString().split("T")[0],
      advance_notice_days: 7,
    },
  });

  useEffect(() => {
    fetchEquipment();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (editData) {
      form.reset({
        equipment_id: editData.equipment_id,
        department: editData.department,
        equipment_type: editData.equipment_type,
        title: editData.title,
        description: editData.description || "",
        schedule_type: editData.schedule_type,
        next_due_date: editData.next_due_date,
        advance_notice_days: editData.advance_notice_days,
      });
    } else {
      form.reset({
        equipment_id: "",
        department: "",
        equipment_type: "",
        title: "",
        description: "",
        schedule_type: "monthly",
        next_due_date: new Date().toISOString().split("T")[0],
        advance_notice_days: 7,
      });
    }
  }, [editData, form]);

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("id, code, name, department, category")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setEquipment(data);
    }
  };

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (editData) {
        const { error } = await supabase
          .from("equipment_pm_schedules")
          .update({
            equipment_id: data.equipment_id,
            department: data.department,
            equipment_type: data.equipment_type,
            title: data.title,
            description: data.description || null,
            schedule_type: data.schedule_type,
            next_due_date: data.next_due_date,
            advance_notice_days: data.advance_notice_days,
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("อัพเดทตาราง PM สำเร็จ");
      } else {
        const { error } = await supabase.from("equipment_pm_schedules").insert({
          equipment_id: data.equipment_id,
          department: data.department,
          equipment_type: data.equipment_type,
          title: data.title,
          description: data.description || null,
          schedule_type: data.schedule_type,
          next_due_date: data.next_due_date,
          advance_notice_days: data.advance_notice_days,
        });

        if (error) throw error;
        toast.success("เพิ่มตาราง PM สำเร็จ");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? "แก้ไขตาราง PM เครื่องมือ" : "เพิ่มตาราง PM เครื่องมือ"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="equipment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เครื่องมือ</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกเครื่องมือ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.code} - {eq.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ฝ่าย/Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกฝ่าย" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                name="equipment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ประเภทเครื่องมือ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่องาน PM</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น ตรวจสอบสภาพเครื่องมือ" {...field} />
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
                      placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="schedule_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ความถี่ตรวจสอบ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกความถี่" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SCHEDULE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="next_due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่ครบกำหนดถัดไป</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advance_notice_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>แจ้งเตือนล่วงหน้า (วัน)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "กำลังบันทึก..." : editData ? "บันทึก" : "เพิ่ม"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
