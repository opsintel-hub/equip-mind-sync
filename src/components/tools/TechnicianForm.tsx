import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสช่าง"),
  name: z.string().min(1, "กรุณากรอกชื่อช่าง"),
  department: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TechnicianFormProps {
  onSuccess: () => void;
}

export function TechnicianForm({ onSuccess }: TechnicianFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", department: "", phone: "", notes: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("technicians").insert({
        code: data.code.trim(),
        name: data.name.trim(),
        department: data.department || null,
        phone: data.phone || null,
        notes: data.notes || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("รหัสช่างนี้มีอยู่แล้วในระบบ");
        } else {
          throw error;
        }
        return;
      }

      toast.success("เพิ่มช่างสำเร็จ");
      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating technician:", error);
      toast.error("เกิดข้อผิดพลาดในการเพิ่มช่าง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />เพิ่มช่าง</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มช่างใหม่</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>รหัสช่าง *</FormLabel>
                <FormControl><Input {...field} placeholder="เช่น TECH-001" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>ชื่อ-นามสกุล *</FormLabel>
                <FormControl><Input {...field} placeholder="กรอกชื่อ-นามสกุล" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="department" render={({ field }) => (
              <FormItem>
                <FormLabel>ฝ่าย</FormLabel>
                <FormControl><Input {...field} placeholder="กรอกชื่อฝ่าย" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>เบอร์โทร</FormLabel>
                <FormControl><Input {...field} placeholder="กรอกเบอร์โทร" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>หมายเหตุ</FormLabel>
                <FormControl><Textarea {...field} placeholder="หมายเหตุเพิ่มเติม" /></FormControl>
              </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "กำลังบันทึก..." : "เพิ่มช่าง"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
