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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(1, "กรุณาระบุรหัสผู้จัดจำหน่าย"),
  vendor_code: z.string().optional(),
  name: z.string().min(1, "กรุณาระบุชื่อผู้จัดจำหน่าย"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface SupplierFormProps {
  onSuccess: () => void;
  supplier?: {
    id: string;
    code: string;
    vendor_code: string | null;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
  };
}

export function SupplierForm({ onSuccess, supplier }: SupplierFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: supplier?.code || "",
      vendor_code: supplier?.vendor_code || "",
      name: supplier?.name || "",
      contact_person: supplier?.contact_person || "",
      phone: supplier?.phone || "",
      email: supplier?.email || "",
      address: supplier?.address || "",
      notes: supplier?.notes || "",
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

      if (supplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            code: values.code,
            vendor_code: values.vendor_code || null,
            name: values.name,
            contact_person: values.contact_person || null,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            notes: values.notes || null,
          })
          .eq("id", supplier.id);

        if (error) throw error;
        toast.success("อัพเดทผู้จัดจำหน่ายสำเร็จ");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert({
            code: values.code,
            vendor_code: values.vendor_code || null,
            name: values.name,
            contact_person: values.contact_person || null,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            notes: values.notes || null,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("เพิ่มผู้จัดจำหน่ายสำเร็จ");
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
        {supplier ? (
          <Button variant="ghost" size="sm">แก้ไข</Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มผู้จัดจำหน่าย
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "แก้ไขผู้จัดจำหน่าย" : "เพิ่มผู้จัดจำหน่าย"}
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลผู้จัดจำหน่ายและซัพพลายเออร์
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผู้จัดจำหน่าย *</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น SUP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัส Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น VD-001" {...field} />
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
                    <FormLabel>ชื่อผู้จัดจำหน่าย *</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อบริษัท/ร้านค้า" {...field} />
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
