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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { StorageSlotSelect } from "./StorageSlotSelect";
import { SubStorageSlotSelect } from "./SubStorageSlotSelect";

const formSchema = z.object({
  code: z.string().min(1, "กรุณาระบุรหัสตำแหน่ง"),
  name: z.string().min(1, "กรุณาระบุชื่อตำแหน่ง"),
  description: z.string().optional(),
  storage_area: z.string().min(1, "กรุณาเลือกพื้นที่จัดเก็บ"),
  storage_slot_id: z.string().min(1, "กรุณาเลือกช่องจัดเก็บ"),
  sub_storage_slot_id: z.string().optional(),
});

interface LocationFormProps {
  onSuccess: () => void;
  location?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    storage_area: string | null;
  };
}

export function LocationForm({ onSuccess, location }: LocationFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | undefined>(location?.id);
  const [storageSlotId, setStorageSlotId] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: location?.code || "",
      name: location?.name || "",
      description: location?.description || "",
      storage_area: location?.storage_area || "",
      storage_slot_id: "",
      sub_storage_slot_id: "",
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

      if (location) {
        const { error } = await supabase
          .from("locations")
          .update({
            code: values.code,
            name: values.name,
            description: values.description || null,
            storage_area: values.storage_area,
          })
          .eq("id", location.id);

        if (error) throw error;
        toast.success("อัพเดทตำแหน่งจัดเก็บสำเร็จ");
      } else {
        const { data, error } = await supabase
          .from("locations")
          .insert({
            code: values.code,
            name: values.name,
            description: values.description || null,
            storage_area: values.storage_area,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        
        // Create storage slot
        if (data && values.storage_slot_id) {
          const { error: slotError } = await supabase
            .from("storage_slots")
            .insert({
              location_id: data.id,
              name: values.storage_slot_id,
              created_by: user.id,
            });
          
          if (slotError) throw slotError;
        }
        
        toast.success("เพิ่มตำแหน่งจัดเก็บสำเร็จ");
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
        {location ? (
          <Button variant="ghost" size="sm">แก้ไข</Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มตำแหน่งจัดเก็บ
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {location ? "แก้ไขตำแหน่งจัดเก็บ" : "เพิ่มตำแหน่งจัดเก็บ"}
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลตำแหน่งจัดเก็บสินค้าในคลัง
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
                    <FormLabel>รหัสตำแหน่ง *</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น LOC-001" {...field} />
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
                    <FormLabel>ชื่อตำแหน่ง *</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น คลังหลัก ชั้น 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="storage_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>พื้นที่จัดเก็บ *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value) {
                        setLocationId(location?.id);
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกพื้นที่จัดเก็บ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Indoor">Indoor</SelectItem>
                      <SelectItem value="Outdoor">Outdoor</SelectItem>
                      <SelectItem value="Semi-outdoor">Semi-outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storage_slot_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ช่องจัดเก็บ *</FormLabel>
                  <FormControl>
                    <StorageSlotSelect
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setStorageSlotId(value);
                      }}
                      locationId={locationId}
                      disabled={!locationId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sub_storage_slot_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ช่องย่อยจัดเก็บ</FormLabel>
                  <FormControl>
                    <SubStorageSlotSelect
                      value={field.value}
                      onChange={field.onChange}
                      storageSlotId={storageSlotId}
                      disabled={!storageSlotId}
                    />
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
                      placeholder="รายละเอียดเพิ่มเติม..."
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
