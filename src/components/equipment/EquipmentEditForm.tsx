import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CategorySelect } from "./CategorySelect";
import { SubcategorySelect } from "./SubcategorySelect";
import { DepartmentSelect } from "./DepartmentSelect";
import { BrandSelect } from "./BrandSelect";
import { LocationSelect } from "./LocationSelect";

const equipmentSchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสอุปกรณ์").max(50, "รหัสอุปกรณ์ต้องไม่เกิน 50 ตัวอักษร"),
  name: z.string().min(1, "กรุณากรอกชื่ออุปกรณ์").max(200, "ชื่ออุปกรณ์ต้องไม่เกิน 200 ตัวอักษร"),
  description: z.string().max(500, "รายละเอียดต้องไม่เกิน 500 ตัวอักษร").optional(),
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  subcategory_id: z.string().min(1, "กรุณาเลือกหมวดหมู่ย่อย"),
  department: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, "กรุณากรอกหน่วยนับ").max(20, "หน่วยนับต้องไม่เกิน 20 ตัวอักษร"),
  quantity_in_stock: z.number().min(0, "จำนวนต้องไม่ติดลบ").int("จำนวนต้องเป็นจำนวนเต็ม"),
  min_stock_level: z.number().min(0, "จำนวนต้องไม่ติดลบ").int("จำนวนต้องเป็นจำนวนเต็ม"),
  location_id: z.string().min(1, "กรุณาเลือกคลังสินค้า"),
  serial_number: z.string().max(100, "Serial Number ต้องไม่เกิน 100 ตัวอักษร").optional(),
  unit_price: z.number().min(0, "ราคาต้องไม่ติดลบ"),
  warehouse_entry_date: z.date(),
  expiry_date: z.date().optional().nullable(),
  warranty_expiry_date: z.date().optional().nullable(),
  notes: z.string().max(1000, "หมายเหตุต้องไม่เกิน 1000 ตัวอักษร").optional(),
  volt: z.number().optional().nullable(),
  amp: z.number().optional().nullable(),
  watt: z.number().optional().nullable(),
  lumen: z.number().optional().nullable(),
  lux: z.number().optional().nullable(),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;

interface EquipmentData {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory_id?: string | null;
  department?: string | null;
  brand?: string | null;
  unit: string;
  quantity_in_stock: number;
  min_stock_level?: number | null;
  location_id?: string | null;
  serial_number?: string | null;
  unit_price: number;
  warehouse_entry_date: string;
  expiry_date?: string | null;
  warranty_expiry_date?: string | null;
  notes?: string | null;
  volt?: number | null;
  amp?: number | null;
  watt?: number | null;
  lumen?: number | null;
  lux?: number | null;
}

interface EquipmentEditFormProps {
  equipment: EquipmentData;
  onSuccess?: () => void;
}

export function EquipmentEditForm({ equipment, onSuccess }: EquipmentEditFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      code: equipment.code,
      name: equipment.name,
      description: equipment.description || "",
      category: equipment.category,
      subcategory_id: equipment.subcategory_id || "",
      department: equipment.department || "",
      brand: equipment.brand || "",
      unit: equipment.unit,
      quantity_in_stock: equipment.quantity_in_stock,
      min_stock_level: equipment.min_stock_level || 0,
      location_id: equipment.location_id || "",
      serial_number: equipment.serial_number || "",
      unit_price: equipment.unit_price,
      warehouse_entry_date: equipment.warehouse_entry_date ? parseISO(equipment.warehouse_entry_date) : new Date(),
      expiry_date: equipment.expiry_date ? parseISO(equipment.expiry_date) : undefined,
      warranty_expiry_date: equipment.warranty_expiry_date ? parseISO(equipment.warranty_expiry_date) : undefined,
      notes: equipment.notes || "",
      volt: equipment.volt || undefined,
      amp: equipment.amp || undefined,
      watt: equipment.watt || undefined,
      lumen: equipment.lumen || undefined,
      lux: equipment.lux || undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: equipment.code,
        name: equipment.name,
        description: equipment.description || "",
        category: equipment.category,
        subcategory_id: equipment.subcategory_id || "",
        department: equipment.department || "",
        brand: equipment.brand || "",
        unit: equipment.unit,
        quantity_in_stock: equipment.quantity_in_stock,
        min_stock_level: equipment.min_stock_level || 0,
        location_id: equipment.location_id || "",
        serial_number: equipment.serial_number || "",
        unit_price: equipment.unit_price,
        warehouse_entry_date: equipment.warehouse_entry_date ? parseISO(equipment.warehouse_entry_date) : new Date(),
        expiry_date: equipment.expiry_date ? parseISO(equipment.expiry_date) : undefined,
        warranty_expiry_date: equipment.warranty_expiry_date ? parseISO(equipment.warranty_expiry_date) : undefined,
        notes: equipment.notes || "",
        volt: equipment.volt || undefined,
        amp: equipment.amp || undefined,
        watt: equipment.watt || undefined,
        lumen: equipment.lumen || undefined,
        lux: equipment.lux || undefined,
      });
    }
  }, [open, equipment, form]);

  const selectedCategory = form.watch("category");

  const onSubmit = async (data: EquipmentFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("equipment")
        .update({
          code: data.code,
          name: data.name,
          description: data.description || null,
          category: data.category,
          subcategory_id: data.subcategory_id,
          department: data.department || null,
          brand: data.brand || null,
          unit: data.unit,
          quantity_in_stock: data.quantity_in_stock,
          min_stock_level: data.min_stock_level,
          location_id: data.location_id,
          serial_number: data.serial_number || null,
          unit_price: data.unit_price,
          warehouse_entry_date: format(data.warehouse_entry_date, "yyyy-MM-dd"),
          expiry_date: data.expiry_date ? format(data.expiry_date, "yyyy-MM-dd") : null,
          warranty_expiry_date: data.warranty_expiry_date ? format(data.warranty_expiry_date, "yyyy-MM-dd") : null,
          notes: data.notes || null,
          volt: data.volt || null,
          amp: data.amp || null,
          watt: data.watt || null,
          lumen: data.lumen || null,
          lux: data.lux || null,
        })
        .eq("id", equipment.id);

      if (error) throw error;

      toast.success("อัพเดทอุปกรณ์สำเร็จ");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating equipment:", error);
      toast.error(error.message || "อัพเดทอุปกรณ์ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="แก้ไข">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขอุปกรณ์: {equipment.code}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสอุปกรณ์ *</FormLabel>
                    <FormControl>
                      <Input placeholder="EQ-001" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หมวดหมู่ *</FormLabel>
                    <FormControl>
                      <CategorySelect
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subcategory_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวดหมู่ย่อย *</FormLabel>
                  <FormControl>
                    <SubcategorySelect
                      categoryName={selectedCategory}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
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
                    <FormLabel>ฝ่าย</FormLabel>
                    <FormControl>
                      <DepartmentSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ยี่ห้อ</FormLabel>
                    <FormControl>
                      <BrandSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
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
                  <FormLabel>ชื่ออุปกรณ์ *</FormLabel>
                  <FormControl>
                    <Input placeholder="สายไฟ 2x4" {...field} disabled={isLoading} />
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
                    <Textarea placeholder="รายละเอียดเพิ่มเติม..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Electrical Specification Fields */}
            <div className="grid grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="volt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>โวลท์ (V)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>แอมป์ (A)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="watt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วัตต์ (W)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lumen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ลูเมน (lm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lux"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ลักซ์ (lx)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หน่วยนับ *</FormLabel>
                    <FormControl>
                      <Input placeholder="ชิ้น, เมตร, กล่อง" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_in_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนในคลัง *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={field.value === 0 ? "" : field.value.toString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          field.onChange(value ? parseInt(value, 10) : 0);
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_stock_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนขั้นต่ำ *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={field.value === 0 ? "" : field.value.toString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          field.onChange(value ? parseInt(value, 10) : 0);
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input placeholder="SN-xxxxx" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาต่อชิ้น (บาท) *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        placeholder="0.00"
                        value={field.value === 0 ? "" : field.value.toString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, "");
                          field.onChange(value ? parseFloat(value) : 0);
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse_entry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>วันที่นำเข้าคลัง *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>เลือกวันที่</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คลังสินค้า *</FormLabel>
                  <FormControl>
                    <LocationSelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>วันหมดอายุ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>เลือกวันที่</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warranty_expiry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>วันหมดรับประกัน</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>เลือกวันที่</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ</FormLabel>
                  <FormControl>
                    <Textarea placeholder="หมายเหตุเพิ่มเติม..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึกการแก้ไข
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
