import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { ToolCategorySelect } from "./ToolCategorySelect";
import { ToolSubcategorySelect } from "./ToolSubcategorySelect";
import { CompanySelect } from "@/components/company/CompanySelect";
import { SupplierSelect } from "@/components/supplier/SupplierSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { BrandSelect } from "@/components/equipment/BrandSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { ToolImageUpload, loadToolImages, persistToolImages, type ToolImageItem } from "./ToolImageUpload";
import { ToolPMMatrix, loadToolPMMatrix, saveToolPMMatrix, type PMMatrixRow } from "./ToolPMMatrix";
import { ToolDocumentUpload, loadToolDocuments, type ToolDocumentItem } from "./ToolDocumentUpload";

const formSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อเครื่องมือ"),
  description: z.string().optional(),
  tool_category_id: z.string().optional(),
  tool_subcategory_id: z.string().optional(),
  department: z.string().optional(),
  company_id: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, "กรุณากรอกหน่วยนับ"),
  serial_number: z.string().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  location_id: z.string().optional(),
  supplier_id: z.string().optional(),
  expiry_date: z.string().optional(),
  warranty_expiry_date: z.string().optional(),
  has_warranty: z.boolean().default(true),
  pm_interval_days: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
  is_asset: z.boolean().default(false),
  asset_code: z.string().optional(),
  responsible_person: z.string().optional(),
  is_personal_tool: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface ToolEditFormProps {
  tool: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    tool_category_id: string | null;
    tool_subcategory_id: string | null;
    department: string | null;
    company_id: string | null;
    brand: string | null;
    unit: string;
    serial_number: string | null;
    unit_price: number;
    location_id: string | null;
    supplier_id: string | null;
    expiry_date: string | null;
    warranty_expiry_date: string | null;
    has_warranty: boolean;
    pm_interval_days: number;
    notes: string | null;
    is_asset: boolean;
    asset_code: string | null;
    responsible_person: string | null;
    is_personal_tool: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ToolEditForm({ tool, open, onOpenChange, onSuccess }: ToolEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [images, setImages] = useState<ToolImageItem[]>([]);
  const [pmMatrix, setPmMatrix] = useState<PMMatrixRow[]>([]);
  const [documents, setDocuments] = useState<ToolDocumentItem[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tool.name,
      description: tool.description || "",
      tool_category_id: tool.tool_category_id || "",
      tool_subcategory_id: tool.tool_subcategory_id || "",
      department: tool.department || "",
      company_id: tool.company_id || "",
      brand: tool.brand || "",
      unit: tool.unit,
      serial_number: tool.serial_number || "",
      unit_price: tool.unit_price || 0,
      location_id: tool.location_id || "",
      supplier_id: tool.supplier_id || "",
      expiry_date: tool.expiry_date || "",
      warranty_expiry_date: tool.warranty_expiry_date || "",
      has_warranty: tool.has_warranty,
      pm_interval_days: tool.pm_interval_days,
      notes: tool.notes || "",
      is_asset: tool.is_asset || false,
      asset_code: tool.asset_code || "",
      responsible_person: tool.responsible_person || "",
      is_personal_tool: tool.is_personal_tool || false,
    },
  });

  // Preload warehouseId from location_id
  useEffect(() => {
    if (open && tool.location_id) {
      const preloadWarehouse = async () => {
        const { data } = await supabase
          .from("locations")
          .select("warehouse_id")
          .eq("id", tool.location_id!)
          .maybeSingle();
        if (data?.warehouse_id) {
          setWarehouseId(data.warehouse_id);
        }
      };
      preloadWarehouse();
    } else if (open) {
      setWarehouseId("");
    }
  }, [open, tool.location_id]);

  // Load existing images, PM matrix, documents when dialog opens
  useEffect(() => {
    if (open && tool.id) {
      loadToolImages(tool.id).then(setImages);
      loadToolPMMatrix(tool.id).then(setPmMatrix);
      loadToolDocuments(tool.id).then(setDocuments);
    } else if (!open) {
      setImages([]);
      setPmMatrix([]);
      setDocuments([]);
    }
  }, [open, tool.id]);

  useEffect(() => {
    if (open) {
      form.reset({
        name: tool.name,
        description: tool.description || "",
        tool_category_id: tool.tool_category_id || "",
        tool_subcategory_id: tool.tool_subcategory_id || "",
        department: tool.department || "",
        company_id: tool.company_id || "",
        brand: tool.brand || "",
        unit: tool.unit,
        serial_number: tool.serial_number || "",
        unit_price: tool.unit_price || 0,
        location_id: tool.location_id || "",
        supplier_id: tool.supplier_id || "",
        expiry_date: tool.expiry_date || "",
        warranty_expiry_date: tool.warranty_expiry_date || "",
        has_warranty: tool.has_warranty,
        pm_interval_days: tool.pm_interval_days,
        notes: tool.notes || "",
        is_asset: tool.is_asset || false,
        asset_code: tool.asset_code || "",
        responsible_person: tool.responsible_person || "",
        is_personal_tool: tool.is_personal_tool || false,
      });
    }
  }, [open, tool]);

  const hasWarranty = form.watch("has_warranty");
  const isAsset = form.watch("is_asset");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("tools")
        .update({
          name: data.name,
          description: data.description || null,
          tool_category_id: data.tool_category_id || null,
          tool_subcategory_id: data.tool_subcategory_id || null,
          department: data.department || null,
          company_id: data.company_id || null,
          brand: data.brand || null,
          unit: data.unit,
          serial_number: data.serial_number || null,
          unit_price: data.unit_price || 0,
          location_id: data.location_id || null,
          supplier_id: data.supplier_id || null,
          expiry_date: data.expiry_date || null,
          warranty_expiry_date: data.has_warranty ? data.warranty_expiry_date || null : null,
          has_warranty: data.has_warranty,
          pm_interval_days: data.pm_interval_days,
          notes: data.notes || null,
          is_asset: data.is_asset,
          asset_code: data.is_asset ? data.asset_code || null : null,
          responsible_person: data.responsible_person || null,
          is_personal_tool: data.is_personal_tool,
        })
        .eq("id", tool.id);

      if (error) throw error;

      // Sync images
      await persistToolImages(tool.id, images);

      // Sync PM matrix
      await saveToolPMMatrix(tool.id, pmMatrix);

      toast.success("แก้ไขเครื่องมือสำเร็จ");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating tool:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขเครื่องมือ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            แก้ไขเครื่องมือ: {tool.code}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <FormLabel>รหัสเครื่องมือ</FormLabel>
                <Input value={tool.code} disabled className="mt-1.5 bg-muted" />
              </div>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อเครื่องมือ *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="tool_category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวดหมู่</FormLabel>
                  <FormControl><ToolCategorySelect hideManage value={field.value || ""} onChange={(v) => { field.onChange(v); form.setValue("tool_subcategory_id", ""); }} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="tool_subcategory_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวดหมู่ย่อย</FormLabel>
                  <FormControl>
                    <ToolSubcategorySelect
                      hideManage
                      toolCategoryId={form.watch("tool_category_id") || ""}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />

                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>ฝ่าย</FormLabel>
                  <FormControl>
                    <SimpleDepartmentSelect value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="company_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>บริษัท</FormLabel>
                  <FormControl><CompanySelect value={field.value || ""} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>ยี่ห้อ</FormLabel>
                  <FormControl><BrandSelect value={field.value || ""} onChange={field.onChange} brandType="tool" /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>หน่วยนับ *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="serial_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="unit_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>ราคาต่อชิ้น (บาท)</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} step="0.01" /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="supplier_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>ผู้จัดจำหน่าย</FormLabel>
                  <FormControl><SupplierSelect value={field.value || ""} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>

            {/* Warehouse Location Select */}
            <FormField control={form.control} name="location_id" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <WarehouseLocationSelect
                    department={form.watch("department") || ""}
                    warehouseId={warehouseId}
                    onWarehouseChange={setWarehouseId}
                    locationId={field.value || ""}
                    onLocationChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">




              <FormField control={form.control} name="responsible_person" render={({ field }) => (
                <FormItem>
                  <FormLabel>ผู้รับผิดชอบ/ผู้ครอบครอง</FormLabel>
                  <FormControl><Input {...field} placeholder="ชื่อผู้รับผิดชอบ" /></FormControl>
                </FormItem>
              )} />

              <div className="space-y-2">
                <FormField control={form.control} name="has_warranty" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="cursor-pointer">มีการรับประกัน</FormLabel>
                  </FormItem>
                )} />
                {hasWarranty && (
                  <FormField control={form.control} name="warranty_expiry_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันหมดประกัน</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                    </FormItem>
                  )} />
                )}
              </div>

              <div className="space-y-2">
                <FormField control={form.control} name="is_asset" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="cursor-pointer">เป็นทรัพย์สินของบริษัท</FormLabel>
                  </FormItem>
                )} />
                {isAsset && (
                  <FormField control={form.control} name="asset_code" render={({ field }) => (
                    <FormItem>
                      <FormLabel>เลขที่ทรัพย์สิน</FormLabel>
                      <FormControl><Input {...field} placeholder="เช่น AST-2025-001" /></FormControl>
                    </FormItem>
                  )} />
                )}
              </div>

              <FormField control={form.control} name="is_personal_tool" render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">เครื่องมือประจำตัวช่าง</FormLabel>
                </FormItem>
              )} />

              <FormField control={form.control} name="pm_interval_days" render={({ field }) => (
                <FormItem>
                  <FormLabel>ระยะเวลาที่ต้อง PM *</FormLabel>
                  <Select value={String(field.value)} onValueChange={(val) => field.onChange(parseInt(val))}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>รายละเอียด</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>หมายเหตุ</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">📷 รูปภาพเครื่องมือ (สูงสุด 4 รูป)</h3>
              <ToolImageUpload images={images} onChange={setImages} maxImages={4} />
            </div>


            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
