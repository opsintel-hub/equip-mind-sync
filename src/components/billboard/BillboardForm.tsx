import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

const billboardSchema = z.object({
  equipment_id: z.string().min(1, "กรุณากรอกรหัสป้าย"),
  description: z.string().optional(),
  department: z.string().optional(),
  media_class: z.string().optional(),
  media_segment: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  territory: z.string().optional(),
  media_type: z.string().optional(),
  location_name: z.string().optional(),
  old_code: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
  size: z.string().optional(),
});

type BillboardFormValues = z.infer<typeof billboardSchema>;

interface BillboardFormProps {
  billboard?: Tables<"billboards"> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const BillboardForm = ({ billboard, onSuccess, onCancel }: BillboardFormProps) => {
  const form = useForm<BillboardFormValues>({
    resolver: zodResolver(billboardSchema),
    defaultValues: {
      equipment_id: billboard?.equipment_id || "",
      description: billboard?.description || "",
      department: billboard?.department || "",
      media_class: billboard?.media_class || "",
      media_segment: billboard?.media_segment || "",
      region: billboard?.region || "",
      district: billboard?.district || "",
      territory: billboard?.territory || "",
      media_type: billboard?.media_type || "",
      location_name: billboard?.location_name || "",
      old_code: billboard?.old_code || "",
      status: billboard?.status || "active",
      notes: billboard?.notes || "",
      size: (billboard as any)?.size || "",
    },
  });

  const onSubmit = async (data: BillboardFormValues) => {
    try {
      if (billboard) {
        const { error } = await supabase
          .from("billboards")
          .update({
            description: data.description,
            department: data.department,
            media_class: data.media_class,
            media_segment: data.media_segment,
            region: data.region,
            district: data.district,
            territory: data.territory,
            media_type: data.media_type,
            location_name: data.location_name,
            old_code: data.old_code,
            status: data.status,
            notes: data.notes,
            size: data.size,
          })
          .eq("id", billboard.id);
        if (error) throw error;
        toast.success("อัพเดทข้อมูลป้ายสำเร็จ");
      } else {
        const { error } = await supabase
          .from("billboards")
          .insert({
            equipment_id: data.equipment_id,
            description: data.description,
            department: data.department,
            media_class: data.media_class,
            media_segment: data.media_segment,
            region: data.region,
            district: data.district,
            territory: data.territory,
            media_type: data.media_type,
            location_name: data.location_name,
            old_code: data.old_code,
            status: data.status,
            notes: data.notes,
            size: data.size,
          });
        if (error) throw error;
        toast.success("เพิ่มป้ายใหม่สำเร็จ");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="equipment_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>รหัสป้าย (Equipment ID) *</FormLabel>
                <FormControl>
                  <Input placeholder="เช่น A05005-CNX-DPL01" {...field} disabled={!!billboard} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>สถานะ</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="maintenance">บำรุงรักษา</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
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
              <FormItem className="md:col-span-2">
                <FormLabel>คำอธิบาย</FormLabel>
                <FormControl>
                  <Input placeholder="คำอธิบายป้าย" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>แผนก (Department)</FormLabel>
                <FormControl>
                  <Input placeholder="เช่น Airport Media" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="media_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ประเภทสื่อ (Media Type)</FormLabel>
                <FormControl>
                  <Input placeholder="เช่น Airport Digital Network" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="media_class"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media Class</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="media_segment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media Segment</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ภูมิภาค (Region)</FormLabel>
                <FormControl>
                  <Input placeholder="เช่น Northern" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>อำเภอ (District)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="territory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>จังหวัด (Territory)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ตำแหน่งติดตั้ง (Location)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="old_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>รหัสเดิม (Old Code)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <Input placeholder="เช่น 512x320 px" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>หมายเหตุ</FormLabel>
                <FormControl>
                  <Textarea placeholder="หมายเหตุเพิ่มเติม" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="submit">
            {billboard ? "บันทึกการแก้ไข" : "เพิ่มป้าย"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BillboardForm;
