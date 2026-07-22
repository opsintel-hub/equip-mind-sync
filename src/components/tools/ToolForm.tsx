import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ToolCategorySelect } from "./ToolCategorySelect";
import { ToolSubcategorySelect } from "./ToolSubcategorySelect";
import { ToolCodePrefixSelect } from "./ToolCodePrefixSelect";
import { CompanySelect } from "@/components/company/CompanySelect";
import { SupplierSelect } from "@/components/supplier/SupplierSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { BrandSelect } from "@/components/equipment/BrandSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { CategorySuggestWizard } from "@/components/category/CategorySuggestWizard";
import { ToolImageUpload, persistToolImages, type ToolImageItem } from "./ToolImageUpload";
import { ToolPMMatrix, saveToolPMMatrix, type PMMatrixRow } from "./ToolPMMatrix";
import { ToolDocumentUpload, persistPendingToolDocuments, type ToolDocumentItem } from "./ToolDocumentUpload";

const formSchema = z.object({
  prefix: z.string().min(1, "กรุณาเลือก Prefix รหัสเครื่องมือ"),
  name: z.string().min(1, "กรุณากรอกชื่อเครื่องมือ"),
  description: z.string().optional(),
  tool_category_id: z.string().optional(),
  tool_subcategory_id: z.string().optional(),
  department: z.string().optional(),
  company_id: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, "กรุณากรอกหน่วยนับ"),
  initial_quantity: z.coerce.number().min(1, "จำนวนต้องมากกว่า 0"),
  serial_number: z.string().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  warehouse_entry_date: z.string().min(1, "กรุณาเลือกวันที่นำเข้าคลัง"),
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

interface ToolFormProps {
  onSuccess?: () => void;
}

export function ToolForm({ onSuccess }: ToolFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pmMatrix, setPmMatrix] = useState<PMMatrixRow[]>([]);
  const [previewCode, setPreviewCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [images, setImages] = useState<ToolImageItem[]>([]);
  const [documents, setDocuments] = useState<ToolDocumentItem[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: "",
      name: "",
      description: "",
      tool_category_id: "",
      tool_subcategory_id: "",
      department: "",
      company_id: "",
      brand: "",
      unit: "ชิ้น",
      initial_quantity: 1,
      serial_number: "",
      unit_price: 0,
      warehouse_entry_date: new Date().toISOString().split("T")[0],
      location_id: "",
      supplier_id: "",
      expiry_date: "",
      warranty_expiry_date: "",
      has_warranty: true,
      pm_interval_days: 30,
      notes: "",
      is_asset: false,
      asset_code: "",
      responsible_person: "",
      is_personal_tool: false,
    },
  });

  const hasWarranty = form.watch("has_warranty");
  const isAsset = form.watch("is_asset");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Generate code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc("get_next_tool_code", { p_prefix: data.prefix });

      if (codeError) throw codeError;

      const generatedCode = codeData as string;

      const { data: newTool, error: toolError } = await supabase
        .from("tools")
        .insert({
          code: generatedCode,
          name: data.name,
          description: data.description || null,
          tool_category_id: data.tool_category_id || null,
          tool_subcategory_id: data.tool_subcategory_id || null,
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
          supplier_id: data.supplier_id || null,
          expiry_date: data.expiry_date || null,
          warranty_expiry_date: data.has_warranty ? data.warranty_expiry_date || null : null,
          has_warranty: data.has_warranty,
          pm_interval_days: data.pm_interval_days || (pmMatrix[0]?.interval_days ?? 30),
          notes: data.notes || null,
          is_asset: data.is_asset,
          asset_code: data.is_asset ? data.asset_code || null : null,
          responsible_person: data.responsible_person || null,
          is_personal_tool: data.is_personal_tool,
        })
        .select()
        .single();

      if (toolError) throw toolError;

      // Save PM matrix (per-type intervals)
      if (newTool && pmMatrix.length > 0) {
        await saveToolPMMatrix(newTool.id, pmMatrix);
      }

      // Create first PM task using the smallest interval in matrix (or default)
      if (newTool) {
        const minInterval = pmMatrix.length > 0
          ? Math.min(...pmMatrix.map((m) => m.interval_days))
          : (data.pm_interval_days || 30);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + minInterval);
        await supabase.from("tool_pm_tasks").insert({
          tool_id: newTool.id,
          due_date: dueDate.toISOString(),
          status: "pending",
        });
      }

      // Save uploaded images
      if (newTool && images.length > 0) {
        await persistToolImages(newTool.id, images);
      }

      // Save uploaded documents
      if (newTool && documents.length > 0) {
        await persistPendingToolDocuments(newTool.id, documents);
      }

      toast.success(`เพิ่มเครื่องมือ ${generatedCode} สำเร็จ`);
      form.reset();
      setPmMatrix([]);
      setPreviewCode("");
      setImages([]);
      setDocuments([]);
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มเครื่องมือ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            เพิ่มเครื่องมือใหม่
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            💡 จัดการหมวดหมู่ / ยี่ห้อ / ผู้จัดจำหน่าย ได้ที่เมนู "ข้อมูลหลัก" (Master Data)
          </p>
        </DialogHeader>


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section: ข้อมูลพื้นฐาน */}

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">📋 ข้อมูลพื้นฐาน</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Prefix code select */}
              <FormField control={form.control} name="prefix" render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสเครื่องมือ (Prefix) *</FormLabel>
                  <FormControl>
                    <ToolCodePrefixSelect
                      value={field.value}
                      onChange={field.onChange}
                      onCodeGenerated={setPreviewCode}
                    />
                  </FormControl>
                  {previewCode && (
                    <p className="text-xs text-muted-foreground">
                      รหัสที่จะได้: <span className="font-medium text-foreground">{previewCode}</span>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อเครื่องมือ *</FormLabel>
                  <FormControl><Input {...field} placeholder="เช่น สว่านกระแทก" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>ยี่ห้อ</FormLabel>
                  <FormControl><BrandSelect value={field.value || ""} onChange={field.onChange} brandType="tool" /></FormControl>
                </FormItem>
              )} />

              <div className="md:col-span-2 flex items-center justify-between gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  ไม่แน่ใจว่าเครื่องมือนี้อยู่หมวดไหน? ให้ AI ช่วยแนะนำจากชื่อ/การใช้งาน
                </div>
                <CategorySuggestWizard
                  entryType="tool"
                  triggerVariant="outline"
                  triggerSize="sm"
                  triggerLabel="แนะนำหมวดหมู่ด้วย AI"
                  defaultProductName={form.watch("name")}
                  onPick={async (mainName, subName, mainId, subId) => {
                    let resolvedMainId = mainId;
                    if (!resolvedMainId) {
                      const { data: mainRow } = await supabase
                        .from("tool_categories")
                        .select("id")
                        .ilike("name", mainName)
                        .maybeSingle();
                      resolvedMainId = mainRow?.id;
                    }
                    if (resolvedMainId) {
                      form.setValue("tool_category_id", resolvedMainId);
                      form.setValue("tool_subcategory_id", "");
                      let resolvedSubId = subId;
                      if (!resolvedSubId && subName) {
                        const { data: subRow } = await supabase
                          .from("tool_subcategories")
                          .select("id")
                          .ilike("name", subName)
                          .eq("tool_category_id", resolvedMainId)
                          .maybeSingle();
                        resolvedSubId = subRow?.id;
                      }
                      if (resolvedSubId) form.setValue("tool_subcategory_id", resolvedSubId);
                    }
                  }}
                />
              </div>

              <FormField control={form.control} name="tool_category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวดหมู่หลัก</FormLabel>
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


              <FormField control={form.control} name="serial_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl><Input {...field} placeholder="กรอก Serial Number" /></FormControl>
                </FormItem>
              )} />
              </div>
            </div>

            {/* Section: จำนวน & ราคา */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">📦 จำนวน & ราคา</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>หน่วยนับ *</FormLabel>
                    <FormControl><Input {...field} placeholder="เช่น ชิ้น, อัน, ตัว" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="initial_quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนเริ่มต้น *</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="unit_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาต่อชิ้น (บาท)</FormLabel>
                    <FormControl><Input {...field} type="number" min={0} step="0.01" /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Section: แหล่งที่มา & คลัง */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">🏢 แหล่งที่มา & คลังจัดเก็บ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>ฝ่าย</FormLabel>
                    <FormControl>
                      <SimpleDepartmentSelect value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="company_id" render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>บริษัท</FormLabel>
                    <FormControl><CompanySelect value={field.value || ""} onChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="supplier_id" render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>ผู้จัดจำหน่าย</FormLabel>
                    <FormControl><SupplierSelect value={field.value || ""} onChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="warehouse_entry_date" render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>วันที่นำเข้าคลัง *</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
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
            </div>

            {/* Section: การรับประกัน & ทรัพย์สิน */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">🛡️ การรับประกัน & ทรัพย์สิน</h3>


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

              </div>
            </div>

            {/* Section: การบำรุงรักษา (PM) - Matrix */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">🔧 การบำรุงรักษา (PM) - กำหนดรอบแยกตามประเภท</h3>
              <ToolPMMatrix value={pmMatrix} onChange={setPmMatrix} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>รายละเอียดเครื่องมือ</FormLabel>
                <FormControl><Textarea {...field} placeholder="กรอกรายละเอียดเครื่องมือ" /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>หมายเหตุ</FormLabel>
                <FormControl><Textarea {...field} placeholder="หมายเหตุเพิ่มเติม" /></FormControl>
              </FormItem>
            )} />

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">📷 รูปภาพเครื่องมือ (สูงสุด 4 รูป)</h3>
              <ToolImageUpload images={images} onChange={setImages} maxImages={4} />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">📎 เอกสารประกอบ (Warranty / PO / Invoice / คู่มือ)</h3>
              <ToolDocumentUpload
                toolCode={previewCode || "TOOL"}
                value={documents}
                onChange={setDocuments}
              />
            </div>



            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "กำลังบันทึก..." : "เพิ่มเครื่องมือ"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
