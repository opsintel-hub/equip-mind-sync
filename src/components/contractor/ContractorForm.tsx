import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1, "กรุณาระบุรหัสผู้รับเหมา"),
  name: z.string().min(1, "กรุณาระบุชื่อผู้รับเหมา"),
  entity_type: z.enum(["corporate", "individual"], {
    required_error: "กรุณาเลือกประเภทบุคคล",
  }),
  tax_id: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface ContractorFormProps {
  onSuccess: () => void;
  contractor?: {
    id: string;
    code: string;
    name: string;
    entity_type: string;
    tax_id: string | null;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
  };
}

export function ContractorForm({ onSuccess, contractor }: ContractorFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: contractor?.code || "",
      name: contractor?.name || "",
      entity_type: (contractor?.entity_type as "corporate" | "individual") || "corporate",
      tax_id: contractor?.tax_id || "",
      contact_person: contractor?.contact_person || "",
      phone: contractor?.phone || "",
      email: contractor?.email || "",
      address: contractor?.address || "",
      notes: contractor?.notes || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("กรุณาเข้าสระบบก่อนทำรายการ");
        return;
      }

      if (contractor) {
        const { error } = await supabase
          .from("contractors")
          .update({
            code: values.code,
            name: values.name,
            entity_type: values.entity_type,
            tax_id: values.tax_id || null,
            contact_person: values.contact_person || null,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            notes: values.notes || null,
          })
          .eq("id", contractor.id);

        if (error) throw error;
        toast.success("อัพเดทผู้รับเหมาสำเร็จ");
      } else {
        const { error } = await supabase
          .from("contractors")
          .insert({
            code: values.code,
            name: values.name,
            entity_type: values.entity_type,
            tax_id: values.tax_id || null,
            contact_person: values.contact_person || null,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            notes: values.notes || null,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("เพิ่มผู้รับเหมาสำเร็จ");
      }

      form.reset();
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
        {contractor ? (
          <Button variant="ghost" size="sm">แก้ไข</Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มผู้รับเหมา
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contractor ? "แก้ไขผู้รับเหมา" : "เพิ่มผู้รับเหมา"}
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลผู้รับเหมา
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผู้รับเหมา *</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น CON-001" {...field} />
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
                    <FormLabel>ชื่อผู้รับเหมา *</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อบริษัท/ชื่อบุคคล" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ประเภทบุคคล *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภทบุคคล" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corporate">นิติบุคคล</SelectItem>
                        <SelectItem value="individual">บุคคลธรรมดา</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น 1234567890123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ติดต่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อผู้ติดต่อ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input placeholder="0X-XXXX-XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>อีเมล</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ที่อยู่</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ที่อยู่สำหรับติดต่อ..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="บันทึกเพิ่มเติม..."
                      {...field}
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
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
