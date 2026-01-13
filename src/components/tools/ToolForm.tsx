import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ToolCategorySelect } from "./ToolCategorySelect";
import { PMTypeSelect } from "./PMTypeSelect";
import { CompanySelect } from "@/components/company/CompanySelect";
import { LocationSelect } from "@/components/location/LocationSelect";
import { BrandSelect } from "@/components/equipment/BrandSelect";

const formSchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสเครื่องมือ"),
  name: z.string().min(1, "กรุณากรอกชื่อเครื่องมือ"),
  description: z.string().optional(),
  tool_category_id: z.string().optional(),
  department: z.string().optional(),
  company_id: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, "กรุณากรอกหน่วยนับ"),
  initial_quantity: z.coerce.number().min(1, "จำนวนต้องมากกว่า 0"),
  serial_number: z.string().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  warehouse_entry_date: z.string().min(1, "กรุณาเลือกวันที่นำเข้าคลัง"),
  location_id: z.string().optional(),
  expiry_date: z.string().optional(),
  warranty_expiry_date: z.string().optional(),
  has_warranty: z.boolean().default(true),
  pm_interval_days: z.coerce.number().min(1, "กรุณาเลือกระยะเวลา PM"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ToolFormProps {
  onSuccess?: () => void;
}

export function ToolForm({ onSuccess }: ToolFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPMTypes, setSelectedPMTypes] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      tool_category_id: "",
      department: "",
      company_id: "",
      brand: "",
      unit: "ชิ้น",
      initial_quantity: 1,
      serial_number: "",
      unit_price: 0,
      warehouse_entry_date: new Date().toISOString().split("T")[0],
      location_id: "",
      expiry_date: "",
      warranty_expiry_date: "",
      has_warranty: true,
      pm_interval_days: 30,
      notes: "",
    },
  });

  const hasWarranty = form.watch("has_warranty");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Insert tool
      const { data: newTool, error: toolError } = await supabase
        .from("tools")
        .insert({
          code: data.code,
          name: data.name,
          description: data.description || null,
          tool_category_id: data.tool_category_id || null,
          department: data.department || null,
          company_id: data.company_id || null,
          brand: data.brand || null,
          unit: data.unit,
          initial_quantity: data.initial_quantity,
          current_quantity: data.initial_quantity,
          serial_number: data.serial_number || null,
          unit_price: data.unit_price || 0,
          warehouse_entry_date: data.warehouse_entry_date,
          location_id: data.location_id || null,
          expiry_date: data.expiry_date || null,
          warranty_expiry_date: data.has_warranty ? data.warranty_expiry_date || null : null,
          has_warranty: data.has_warranty,
          pm_interval_days: data.pm_interval_days,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (toolError) throw toolError;

      // Insert PM types relationship
      if (selectedPMTypes.length > 0 && newTool) {
        const pmTypeRecords = selectedPMTypes.map((pmTypeId) => ({
          tool_id: newTool.id,
          pm_type_id: pmTypeId,
        }));

        const { error: pmTypeError } = await supabase
          .from("tool_pm_types")
          .insert(pmTypeRecords);

        if (pmTypeError) throw pmTypeError;
      }

      // Create first PM task
      if (newTool) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + data.pm_interval_days);

        const { error: taskError } = await supabase.from("tool_pm_tasks").insert({
          tool_id: newTool.id,
          due_date: dueDate.toISOString(),
          status: "pending",
        });

        if (taskError) {
          console.error("Error creating PM task:", taskError);
        }
      }

      toast.success("เพิ่มเครื่องมือสำเร็จ");
      form.reset();
      setSelectedPMTypes([]);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating tool:", error);
      if (error.code === "23505") {
        toast.error("รหัสเครื่องมือนี้มีอยู่แล้วในระบบ");
      } else {
        toast.error("เกิดข้อผิดพลาดในการเพิ่มเครื่องมือ");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          เพิ่มเครื่องมือใหม่
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสเครื่องมือ *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="เช่น TOOL-001" />
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
                    <FormLabel>ชื่อเครื่องมือ *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="เช่น สว่านกระแทก" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tool_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หมวดหมู่เครื่องมือ</FormLabel>
                    <FormControl>
                      <ToolCategorySelect
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
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
                    <FormLabel>ฝ่าย</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="กรอกชื่อฝ่าย" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      <BrandSelect value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หน่วยนับ *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="เช่น ชิ้น, อัน, ตัว" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initial_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนเริ่มต้น *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="กรอก Serial Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาต่อชิ้น (บาท)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse_entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่นำเข้าคลัง *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>คลังสินค้าที่นำเข้า</FormLabel>
                    <FormControl>
                      <LocationSelect
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันหมดอายุ</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="has_warranty"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">มีการรับประกัน</FormLabel>
                    </FormItem>
                  )}
                />
                {hasWarranty && (
                  <FormField
                    control={form.control}
                    name="warranty_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันหมดประกัน</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="pm_interval_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ระยะเวลาที่ต้อง PM *</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(parseInt(val))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกระยะเวลา" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">ทุก 15 วัน</SelectItem>
                        <SelectItem value="30">ทุก 30 วัน</SelectItem>
                        <SelectItem value="60">ทุก 60 วัน</SelectItem>
                        <SelectItem value="90">ทุก 90 วัน</SelectItem>
                        <SelectItem value="180">ทุก 180 วัน</SelectItem>
                        <SelectItem value="365">ทุก 1 ปี</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>ประเภทการ PM (เลือกได้หลายรายการ)</FormLabel>
              <PMTypeSelect value={selectedPMTypes} onChange={setSelectedPMTypes} />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียดเครื่องมือ</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="กรอกรายละเอียดเครื่องมือ" />
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
                    <Textarea {...field} placeholder="หมายเหตุเพิ่มเติม" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "กำลังบันทึก..." : "เพิ่มเครื่องมือ"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
