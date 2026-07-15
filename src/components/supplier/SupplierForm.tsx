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
import { MediaSiteSelect } from "@/components/media-site/MediaSiteSelect";

const formSchema = z.object({
  company_code: z.string().optional(),
  vendor_code: z.string().min(1, "กรุณาระบุ Vendor ID"),
  tax_id: z.string().min(1, "กรุณาระบุ Tax ID"),
  name: z.string().min(1, "กรุณาระบุชื่อผู้จัดจำหน่าย"),
  description: z.string().optional(),
  media_site_name: z.string().optional(),
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
    tax_id?: string | null;
    company_code?: string | null;
    name: string;
    description?: string | null;
    media_site_name?: string | null;
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
      company_code: supplier?.company_code || "",
      vendor_code: supplier?.vendor_code || "",
      tax_id: supplier?.tax_id || "",
      name: supplier?.name || "",
      description: supplier?.description || "",
      media_site_name: supplier?.media_site_name || "",
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
        toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
        return;
      }

      const payload = {
        code: values.vendor_code.trim(),
        vendor_code: values.vendor_code.trim(),
        company_code: values.company_code?.trim() || null,
        tax_id: values.tax_id.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || null,
        media_site_name: values.media_site_name?.trim() || null,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        notes: values.notes || null,
      };

      if (supplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", supplier.id);
        if (error) throw error;
        toast.success("อัพเดทผู้จัดจำหน่ายสำเร็จ");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert({ ...payload, created_by: user.id });
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
            กรอกข้อมูลผู้จัดจำหน่ายให้ตรงกับระบบต้นทาง (Company, Vendor ID, Tax ID)
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Identity */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                ข้อมูลระบุตัวตน
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="company_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company (ชื่อย่อ)</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น ADS, BWM, PCS" {...field} />
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
                      <FormLabel>Vendor ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น 000006" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="เลข 13 หลัก" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้จัดจำหน่าย (Vendor Name) *</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อบริษัท/ห้างหุ้นส่วน/ร้านค้า" {...field} />
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
                    <FormLabel>Description (คำอธิบายสินค้า/บริการ)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="เช่น AL LED Strip 1.6 M, 24V CCT"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="media_site_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Media Site Name</FormLabel>
                    <FormControl>
                      <MediaSiteSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Section 2: Contact */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                ข้อมูลติดต่อ
              </h3>
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
                      <Textarea rows={2} placeholder="ที่อยู่สำหรับติดต่อ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Section 3: Notes */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                หมายเหตุ
              </h3>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea rows={2} placeholder="บันทึกเพิ่มเติม..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
