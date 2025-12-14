import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BillboardSelect from "@/components/billboard/BillboardSelect";

const formSchema = z.object({
  billboard_id: z.string().min(1, "กรุณาเลือกป้ายโฆษณา"),
  title: z.string().min(1, "กรุณาระบุชื่องาน PM"),
  description: z.string().optional(),
  schedule_type: z.string().min(1, "กรุณาเลือกรอบการบำรุงรักษา"),
  next_due_date: z.string().min(1, "กรุณาระบุวันที่กำหนด"),
  advance_notice_days: z.coerce.number().min(1, "ต้องแจ้งเตือนล่วงหน้าอย่างน้อย 1 วัน"),
});

type FormData = z.infer<typeof formSchema>;

interface PMScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

export function PMScheduleForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: PMScheduleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      billboard_id: editData?.billboard_id || "",
      title: editData?.title || "",
      description: editData?.description || "",
      schedule_type: editData?.schedule_type || "monthly",
      next_due_date: editData?.next_due_date || "",
      advance_notice_days: editData?.advance_notice_days || 7,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editData) {
        const { error } = await supabase
          .from("pm_schedules")
          .update({
            billboard_id: data.billboard_id,
            title: data.title,
            description: data.description || null,
            schedule_type: data.schedule_type,
            next_due_date: data.next_due_date,
            advance_notice_days: data.advance_notice_days,
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("แก้ไขตาราง PM เรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("pm_schedules").insert({
          billboard_id: data.billboard_id,
          title: data.title,
          description: data.description || null,
          schedule_type: data.schedule_type,
          next_due_date: data.next_due_date,
          advance_notice_days: data.advance_notice_days,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success("เพิ่มตาราง PM เรียบร้อยแล้ว");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Error saving PM schedule:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editData ? "แก้ไขตาราง PM" : "เพิ่มตาราง PM"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="billboard_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ป้ายโฆษณา</FormLabel>
                  <FormControl>
                    <BillboardSelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่องาน PM</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น ตรวจสอบโครงสร้าง" {...field} />
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
                      placeholder="รายละเอียดงานบำรุงรักษา..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schedule_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รอบการบำรุงรักษา</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกรอบ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">รายวัน</SelectItem>
                        <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                        <SelectItem value="monthly">รายเดือน</SelectItem>
                        <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                        <SelectItem value="yearly">รายปี</SelectItem>
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
                    <FormLabel>วันที่กำหนดถัดไป</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
