import { useState, useEffect } from "react";
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

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

const formSchema = z.object({
  warehouse_id: z.string().min(1, "กรุณาเลือกคลังสินค้า"),
  code: z.string().min(1, "กรุณาระบุรหัสตำแหน่ง"),
  name: z.string().min(1, "กรุณาระบุชื่อตำแหน่ง"),
  description: z.string().optional(),
  storage_area: z.string().optional(),
  storage_area_size: z.string().optional(),
  storage_slot_id: z.string().optional(),
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
    storage_area_size: string | null;
    warehouse_id: string | null;
  };
}

export function LocationForm({ onSuccess, location }: LocationFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string | undefined>(location?.id);
  const [storageSlotId, setStorageSlotId] = useState<string>("");
  const [isNewLocationSaved, setIsNewLocationSaved] = useState(!!location);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from("warehouses")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    setWarehouses(data || []);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouse_id: location?.warehouse_id || "",
      code: location?.code || "",
      name: location?.name || "",
      description: location?.description || "",
      storage_area: location?.storage_area || "",
      storage_area_size: location?.storage_area_size || "",
      storage_slot_id: "",
      sub_storage_slot_id: "",
    },
  });

  const handleSaveBasicInfo = async () => {
    const values = form.getValues();
    
    // Validate required fields
    if (!values.warehouse_id || !values.code || !values.name) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .insert({
          warehouse_id: values.warehouse_id,
          code: values.code,
          name: values.name,
          description: values.description || null,
          storage_area: values.storage_area || null,
          storage_area_size: values.storage_area_size || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setLocationId(data.id);
      setIsNewLocationSaved(true);
      toast.success("บันทึกข้อมูลแล้ว ตอนนี้สามารถจัดการช่องจัดเก็บได้");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
        return;
      }

      if (location || isNewLocationSaved) {
        const targetId = location?.id || locationId;
        const { error } = await supabase
          .from("locations")
          .update({
            warehouse_id: values.warehouse_id,
            code: values.code,
            name: values.name,
            description: values.description || null,
            storage_area: values.storage_area || null,
            storage_area_size: values.storage_area_size || null,
          })
          .eq("id", targetId);

        if (error) throw error;
        toast.success("อัพเดทตำแหน่งจัดเก็บสำเร็จ");
        
        form.reset();
        setOpen(false);
        setIsNewLocationSaved(false);
        setLocationId(undefined);
        onSuccess();
      } else {
        // Save basic info first
        await handleSaveBasicInfo();
      }
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
            <FormField
              control={form.control}
              name="warehouse_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คลังสินค้า *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกคลังสินค้า" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.code} - {wh.name}
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
                      <Input placeholder="เช่น ชั้น 1 โซน A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="storage_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>พื้นที่จัดเก็บ</FormLabel>
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
                name="storage_area_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ขนาดพื้นที่</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น 50 ตร.ม., 100 ตร.ฟุต" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!locationId && !location && (
              <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                กรุณากดปุ่ม "บันทึก" ด้านล่างก่อนเพื่อสร้างตำแหน่ง จากนั้นจึงจะสามารถจัดการช่องจัดเก็บได้
              </div>
            )}

            {locationId && (
              <>
                <FormField
                  control={form.control}
                  name="storage_slot_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ช่องจัดเก็บ</FormLabel>
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
                      <FormLabel>ช่องย่อยจัดเก็บ (ไม่บังคับ)</FormLabel>
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
              </>
            )}

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
                {loading ? "กำลังบันทึก..." : (location || isNewLocationSaved ? "บันทึก" : "บันทึกข้อมูลพื้นฐาน")}
              </Button>
              {isNewLocationSaved && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setOpen(false);
                    setIsNewLocationSaved(false);
                    setLocationId(undefined);
                    onSuccess();
                  }}
                >
                  เสร็จสิ้น
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
