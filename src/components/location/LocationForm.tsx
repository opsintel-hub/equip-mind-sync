import { useState, useEffect, useCallback } from "react";
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
import { LocationDimensionFields } from "./LocationDimensionFields";
import { ZoneSelect } from "./ZoneSelect";

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

const formSchema = z.object({
  warehouse_id: z.string().min(1, "กรุณาเลือกคลังสินค้า"),
  zone_id: z.string().optional(),
  code: z.string().min(1, "กรุณาระบุรหัสตำแหน่ง"),
  name: z.string().min(1, "กรุณาระบุชื่อตำแหน่ง"),
  description: z.string().optional(),
  storage_area: z.string().optional(),
});

interface LocationFormProps {
  onSuccess: () => void;
  location?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    storage_area: string | null;
    warehouse_id: string | null;
    zone_id?: string | null;
    width_cm?: number | null;
    height_cm?: number | null;
    depth_cm?: number | null;
    volume_cm3?: number | null;
  };
  defaultWarehouseId?: string;
  defaultZoneId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost" | "outline" | "secondary";
  triggerClassName?: string;
}

export function LocationForm({
  onSuccess,
  location,
  defaultWarehouseId,
  defaultZoneId,
  triggerLabel,
  triggerVariant,
  triggerClassName,
}: LocationFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [widthCm, setWidthCm] = useState<number | undefined>(location?.width_cm ?? undefined);
  const [heightCm, setHeightCm] = useState<number | undefined>(location?.height_cm ?? undefined);
  const [depthCm, setDepthCm] = useState<number | undefined>(location?.depth_cm ?? undefined);
  const [volumeCm3, setVolumeCm3] = useState<number | undefined>(location?.volume_cm3 ?? undefined);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (open) {
      setWidthCm(location?.width_cm ?? undefined);
      setHeightCm(location?.height_cm ?? undefined);
      setDepthCm(location?.depth_cm ?? undefined);
      setVolumeCm3(location?.volume_cm3 ?? undefined);
    }
  }, [open, location]);

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
      warehouse_id: location?.warehouse_id || defaultWarehouseId || "",
      zone_id: location?.zone_id || defaultZoneId || "",
      code: location?.code || "",
      name: location?.name || "",
      description: location?.description || "",
      storage_area: location?.storage_area || "",
    },
  });

  const warehouseId = form.watch("warehouse_id");

  const handleVolumeChange = useCallback((value: number | undefined) => {
    setVolumeCm3(value);
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
        return;
      }

      const payload = {
        warehouse_id: values.warehouse_id,
        zone_id: values.zone_id || null,
        code: values.code,
        name: values.name,
        description: values.description || null,
        storage_area: values.storage_area || null,
        width_cm: widthCm || null,
        height_cm: heightCm || null,
        depth_cm: depthCm || null,
        volume_cm3: volumeCm3 || null,
      };

      if (location) {
        const { error } = await supabase.from("locations").update(payload).eq("id", location.id);
        if (error) throw error;
        toast.success("อัพเดทตำแหน่งจัดเก็บสำเร็จ");
      } else {
        const { error } = await supabase
          .from("locations")
          .insert({ ...payload, used_volume_cm3: 0, created_by: user.id });
        if (error) throw error;
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
          <Button variant={triggerVariant ?? "default"} className={triggerClassName ?? "gap-2"}>
            <Plus className="h-4 w-4" />
            {triggerLabel ?? "เพิ่มตำแหน่งจัดเก็บ"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{location ? "แก้ไขตำแหน่งจัดเก็บ" : "เพิ่มตำแหน่งจัดเก็บ"}</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลตำแหน่งจัดเก็บ (เช่น A01, A02) และเลือกโซน (เช่น A) เพื่อจัดกลุ่ม
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
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("zone_id", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกคลังสินค้า" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      position="popper"
                      sideOffset={4}
                      className="bg-background z-[200] max-h-60 overflow-y-auto"
                    >
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

            <FormField
              control={form.control}
              name="zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>โซน (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <ZoneSelect
                      value={field.value}
                      onChange={field.onChange}
                      warehouseId={warehouseId}
                    />
                  </FormControl>
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
                      <Input placeholder="เช่น A01" {...field} />
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
                      <Input placeholder="เช่น ช่อง 01" {...field} />
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
                  <FormLabel>พื้นที่จัดเก็บ</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกพื้นที่จัดเก็บ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      position="popper"
                      sideOffset={4}
                      className="bg-background z-[200] max-h-60 overflow-y-auto"
                    >
                      <SelectItem value="Indoor">Indoor</SelectItem>
                      <SelectItem value="Outdoor">Outdoor</SelectItem>
                      <SelectItem value="Semi-outdoor">Semi-outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LocationDimensionFields
              widthCm={widthCm}
              heightCm={heightCm}
              depthCm={depthCm}
              volumeCm3={volumeCm3}
              onWidthChange={setWidthCm}
              onHeightChange={setHeightCm}
              onDepthChange={setDepthCm}
              onVolumeChange={handleVolumeChange}
              disabled={loading}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียด</FormLabel>
                  <FormControl>
                    <Textarea placeholder="รายละเอียดเพิ่มเติม..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
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
