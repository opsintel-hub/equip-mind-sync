import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CategorySelect } from "./CategorySelect";
import { SubcategorySelect } from "./SubcategorySelect";
import { SimpleDepartmentSelect } from "./SimpleDepartmentSelect";
import { BrandSelect } from "./BrandSelect";
import { SimpleLocationSelect } from "./SimpleLocationSelect";
import { CompanySelect } from "@/components/company/CompanySelect";
import { EquipmentCodePrefixSelect } from "./EquipmentCodePrefixSelect";
import { UnitSelect } from "./UnitSelect";
import { DimensionFields } from "./DimensionFields";
import { EquipmentImageUpload } from "./EquipmentImageUpload";

const equipmentSchema = z.object({
  code_prefix: z.string().min(1, "กรุณาเลือก Prefix รหัสอุปกรณ์"),
  code: z.string().optional(),
  name: z.string().min(1, "กรุณากรอกชื่อสินค้า").max(200, "ชื่อสินค้าต้องไม่เกิน 200 ตัวอักษร"),
  description: z.string().max(500, "รายละเอียดต้องไม่เกิน 500 ตัวอักษร").optional(),
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  subcategory_id: z.string().min(1, "กรุณาเลือกหมวดหมู่ย่อย"),
  department: z.string().min(1, "กรุณาเลือกฝ่าย"),
  company_id: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, "กรุณาเลือกหน่วยนับ"),
  quantity_in_stock: z.number().min(0, "จำนวนต้องไม่ติดลบ").int("จำนวนต้องเป็นจำนวนเต็ม"),
  min_stock_level: z.number().min(0, "จำนวนต้องไม่ติดลบ").int("จำนวนต้องเป็นจำนวนเต็ม"),
  location_id: z.string().min(1, "กรุณาเลือกคลังสินค้า"),
  serial_number: z.string().max(100, "Serial Number ต้องไม่เกิน 100 ตัวอักษร").optional(),
  warehouse_entry_date: z.date(),
  expiry_date: z.date().optional(),
  warranty_expiry_date: z.date().optional(),
  notes: z.string().max(1000, "หมายเหตุต้องไม่เกิน 1000 ตัวอักษร").optional(),
  volt: z.number().optional(),
  amp: z.number().optional(),
  watt: z.number().optional(),
  lumen: z.number().optional(),
  lux: z.number().optional(),
  width_cm: z.number().optional(),
  height_cm: z.number().optional(),
  depth_cm: z.number().optional(),
  volume_cm3: z.number().optional(),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  onSuccess?: () => void;
}

export function EquipmentForm({ onSuccess }: EquipmentFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      code_prefix: "",
      code: "",
      name: "",
      description: "",
      category: "",
      subcategory_id: "",
      department: "",
      company_id: "",
      brand: "",
      unit: "",
      quantity_in_stock: 0,
      min_stock_level: 0,
      location_id: "",
      serial_number: "",
      warehouse_entry_date: new Date(),
      notes: "",
      volt: undefined,
      amp: undefined,
      watt: undefined,
      lumen: undefined,
      lux: undefined,
      width_cm: undefined,
      height_cm: undefined,
      depth_cm: undefined,
      volume_cm3: undefined,
    },
  });

  const selectedCategory = form.watch("category");
  const watchedName = form.watch("name");

  // Check for duplicate equipment name
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!watchedName || watchedName.length < 3) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const { data, error } = await supabase
          .from("equipment")
          .select("id, code, name")
          .ilike("name", `%${watchedName}%`)
          .limit(5);

        if (error) throw error;

        if (data && data.length > 0) {
          const matches = data.map(e => `${e.code}: ${e.name}`).join(", ");
          setDuplicateWarning(`พบสินค้าที่คล้ายกัน: ${matches}`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error("Error checking duplicate:", error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const debounceTimer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(debounceTimer);
  }, [watchedName]);

  const onSubmit = async (data: EquipmentFormValues) => {
    setIsLoading(true);
    try {
      // Generate the actual code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('get_next_equipment_code', { p_prefix: data.code_prefix });

      if (codeError) throw codeError;

      const generatedCode = codeData as string;

      const { data: equipmentData, error } = await supabase.from("equipment").insert({
        code: generatedCode,
        name: data.name,
        description: data.description || null,
        category: data.category,
        subcategory_id: data.subcategory_id,
        department: data.department || null,
        company_id: data.company_id || null,
        brand: data.brand || null,
        unit: data.unit,
        quantity_in_stock: data.quantity_in_stock,
        min_stock_level: data.min_stock_level,
        location_id: data.location_id,
        serial_number: data.serial_number || null,
        unit_price: 0,
        warehouse_entry_date: format(data.warehouse_entry_date, "yyyy-MM-dd"),
        expiry_date: data.expiry_date ? format(data.expiry_date, "yyyy-MM-dd") : null,
        warranty_expiry_date: data.warranty_expiry_date ? format(data.warranty_expiry_date, "yyyy-MM-dd") : null,
        notes: data.notes || null,
        volt: data.volt || null,
        amp: data.amp || null,
        watt: data.watt || null,
        lumen: data.lumen || null,
        lux: data.lux || null,
        width_cm: data.width_cm || null,
        height_cm: data.height_cm || null,
        depth_cm: data.depth_cm || null,
        volume_cm3: data.volume_cm3 || null,
      }).select('id').single();

      if (error) throw error;

      // Save images if any
      if (images.length > 0 && equipmentData) {
        const imageInserts = images.map((url, index) => ({
          equipment_id: equipmentData.id,
          image_url: url,
          display_order: index,
        }));

        const { error: imageError } = await supabase
          .from("equipment_images")
          .insert(imageInserts);

        if (imageError) {
          console.error("Error saving images:", imageError);
        }
      }

      toast.success(`เพิ่มอุปกรณ์สำเร็จ (รหัส: ${generatedCode})`);
      form.reset();
      setPreviewCode("");
      setImages([]);
      setDuplicateWarning(null);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding equipment:", error);
      toast.error(error.message || "เพิ่มอุปกรณ์ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ เพิ่มอุปกรณ์</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มอุปกรณ์/อะไหล่</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Department - First field as required */}
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ฝ่าย *</FormLabel>
                  <FormControl>
                    <SimpleDepartmentSelect
                      value={field.value || ""}
                      onChange={(value) => {
                        field.onChange(value);
                        // Reset company when department changes
                        form.setValue("company_id", "");
                      }}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipment Code Prefix */}
            <FormField
              control={form.control}
              name="code_prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสอุปกรณ์ *</FormLabel>
                  <FormControl>
                    <EquipmentCodePrefixSelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                      onCodeGenerated={setPreviewCode}
                    />
                  </FormControl>
                  {previewCode && (
                    <p className="text-sm text-muted-foreground">
                      รหัสถัดไป: <span className="font-medium text-primary">{previewCode}</span>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บริษัท</FormLabel>
                    <FormControl>
                      <CompanySelect
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={isLoading}
                        placeholder="เลือกบริษัท..."
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
                  <FormLabel>ชื่อสินค้า * (กรุณาคีย์ให้ถูกต้องเพราะมีผลต่อการค้นหา)</FormLabel>
                  <FormControl>
                    <Input placeholder="สายไฟ 2x4" {...field} disabled={isLoading} />
                  </FormControl>
                  {duplicateWarning && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {duplicateWarning}
                      </AlertDescription>
                    </Alert>
                  )}
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

            {/* Dimension Fields */}
            <DimensionFields
              widthCm={form.watch("width_cm")}
              heightCm={form.watch("height_cm")}
              depthCm={form.watch("depth_cm")}
              volumeCm3={form.watch("volume_cm3")}
              onWidthChange={(v) => form.setValue("width_cm", v)}
              onHeightChange={(v) => form.setValue("height_cm", v)}
              onDepthChange={(v) => form.setValue("depth_cm", v)}
              onVolumeChange={(v) => form.setValue("volume_cm3", v)}
              disabled={isLoading}
            />

            {/* Image Upload */}
            <EquipmentImageUpload
              images={images}
              onChange={setImages}
              disabled={isLoading}
              maxImages={5}
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
                      <UnitSelect
                        value={field.value}
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
                name="quantity_in_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนเริ่มต้น</FormLabel>
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
                    <p className="text-xs text-muted-foreground">ใช้สำหรับตั้งค่าเริ่มต้น หลังจากนั้นให้รับเข้าผ่านหน้า "นำเข้าสินค้า"</p>
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
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>คลังสินค้า *</FormLabel>
                    <FormControl>
                      <SimpleLocationSelect
                        value={field.value}
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
                          selected={field.value}
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
                          selected={field.value}
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
                บันทึก
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
