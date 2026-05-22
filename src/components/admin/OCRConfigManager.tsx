import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Plus, Trash2, AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AI_MODELS = [
  { value: "google/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (เร็วสุด+ถูกสุด)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (เร็ว+ถูก)" },
  { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash (แนะนำ)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (สมดุล)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (แม่นยำสูง)" },
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (สมดุล)" },
  { value: "openai/gpt-5", label: "GPT-5 (แม่นยำสูง)" },
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { value: "openai/gpt-5.5", label: "GPT-5.5 (แม่นยำสูงสุด)" },
];

const DEFAULT_SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญอ่านเอกสาร Purchase Order (PO) ภาษาไทยและภาษาอังกฤษ
อ่านเอกสาร PO ที่แนบมา และดึงข้อมูลให้ครบตาม function schema ที่กำหนด

กฎสำคัญ:
- วันที่ให้แปลงเป็น YYYY-MM-DD เสมอ (เช่น 15/10/20 → 2020-10-15)
- ราคาให้เป็นตัวเลขล้วน ไม่มี comma (เช่น 350,000 → 350000)
- ถ้าอ่านไม่ได้หรือไม่มีข้อมูลให้ใส่ null
- รองรับ PO หลาย format (Plan B Media, ทั่วไป, บริษัทอื่น)
- Item No คือรหัสสินค้า/รหัสอะไหล่ที่ระบุในตาราง (เช่น DG-A03001-F001) — เก็บไว้แม้ระบบจะ match รหัสภายในไม่เจอ
- Description คือรายละเอียดสินค้า/บริการ
- ดึง Vendor Code (รหัสผู้ขาย) จากหัวเอกสาร
- ดึง PR Number (เลขที่ใบขอซื้อ) จากช่อง Refer PR หรือ PR No.

ข้อมูลเพิ่มเติมต่อรายการ (per-item) ให้ดึงให้ครบหากปรากฏใน description หรือคอลัมน์ใดก็ตาม:
- model: รุ่นสินค้า เช่น DS-086GB2601-T
- warranty_years: ระยะเวลารับประกัน (ปี) ถ้าระบุเป็นเดือนให้แปลงเป็นปี (เช่น 24 เดือน → 2)
- asset_caretaker: ชื่อผู้ดูแล/ผู้ใช้งานทรัพย์สิน (ถ้ามีระบุ)
- planned_location: สถานที่ติดตั้ง/Location ปลายทางตามแผน PO`;

const DEFAULT_EXTRACTION_SCHEMA = {
  name: "extract_po_data",
  description: "Extract structured data from Purchase Order PDF document",
  parameters: {
    type: "object",
    properties: {
      po_number: { type: "string", description: "เลขที่ PO เช่น PO20100177" },
      po_date: { type: "string", description: "วันที่ PO ในรูปแบบ YYYY-MM-DD" },
      buyer_company_name: { type: "string", description: "ชื่อบริษัทผู้ซื้อ (หัวเอกสาร)" },
      vendor_code: { type: "string", description: "รหัสผู้ขาย/Vendor No เช่น 002402" },
      vendor_name: { type: "string", description: "ชื่อผู้ขาย/บริษัท Vendor" },
      vendor_address: { type: "string", description: "ที่อยู่ Vendor" },
      vendor_phone: { type: "string", description: "เบอร์โทร Vendor" },
      pr_number: { type: "string", description: "เลขที่ PR / Refer PR เช่น PR2010135" },
      department: { type: "string", description: "ชื่อฝ่าย/Department เช่น Online Media" },
      payment_terms: { type: "string", description: "เงื่อนไขชำระเงิน เช่น CASH, 15D" },
      receipt_date: { type: "string", description: "วันรับสินค้า ในรูปแบบ YYYY-MM-DD" },
      contract_ref: { type: "string", description: "อ้างอิงสัญญา/Contract" },
      quote_no: { type: "string", description: "เลขที่ใบเสนอราคา" },
      comment: { type: "string", description: "หมายเหตุ/Comment ในเอกสาร" },
      items: {
        type: "array",
        description: "รายการสินค้า/บริการทั้งหมดในตาราง",
        items: {
          type: "object",
          properties: {
            item_no: { type: "string", description: "รหัสสินค้า/Item No (เช่น DG-A03001-F001)" },
            description: { type: "string", description: "รายละเอียดสินค้า/บริการ" },
            asset_no: { type: "string", description: "เลขทรัพย์สิน/Asset No" },
            quantity: { type: "number", description: "จำนวน" },
            unit: { type: "string", description: "หน่วยนับ เช่น UNIT, PCS, EA" },
            unit_price: { type: "number", description: "ราคาต่อหน่วย (ไม่รวม VAT)" },
            amount: { type: "number", description: "จำนวนเงินรวม (ไม่รวม VAT)" },
            model: { type: "string", description: "รุ่นสินค้า เช่น DS-086GB2601-T" },
            warranty_years: { type: "number", description: "ระยะเวลารับประกัน หน่วยปี (แปลงจากเดือนถ้าจำเป็น)" },
            asset_caretaker: { type: "string", description: "ชื่อผู้ดูแลทรัพย์สิน/ผู้ใช้งาน" },
            planned_location: { type: "string", description: "สถานที่ติดตั้ง/Location ปลายทางตามแผน PO" },
          },
          required: ["description", "quantity", "unit"],
        },
      },
      total_excl_vat: { type: "number", description: "ยอดรวมก่อน VAT" },
      vat: { type: "number", description: "VAT 7%" },
      total_incl_vat: { type: "number", description: "ยอดรวมสุทธิ" },
    },
    required: ["po_number", "items"],
  },
};

const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  po_number: "poNumber",
  pr_number: "prNumber",
  vendor_code: "supplierId",
  vendor_name: "supplierName",
  department: "departmentId",
  comment: "notes",
  receipt_date: "expectedDate",
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export function OCRConfigManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [schemaText, setSchemaText] = useState(JSON.stringify(DEFAULT_EXTRACTION_SCHEMA, null, 2));
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<{ key: string; value: string }[]>(
    Object.entries(DEFAULT_FIELD_MAPPING).map(([key, value]) => ({ key, value }))
  );
  const [model, setModel] = useState(DEFAULT_MODEL);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "ocr_po_config")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingId(data.id);
        setUpdatedAt(data.updated_at);
        const val = data.value as any;
        if (val.system_prompt) setSystemPrompt(val.system_prompt);
        if (val.extraction_schema) setSchemaText(JSON.stringify(val.extraction_schema, null, 2));
        if (val.field_mapping) {
          setFieldMapping(
            Object.entries(val.field_mapping as Record<string, string>).map(([key, value]) => ({ key, value }))
          );
        }
        if (val.model) setModel(val.model);
      }
    } catch (err) {
      console.error("Error fetching OCR config:", err);
      toast.error("ไม่สามารถโหลดค่าตั้งค่า OCR ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const validateSchema = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.name || !parsed.parameters) {
        setSchemaError("Schema ต้องมี 'name' และ 'parameters'");
        return false;
      }
      setSchemaError(null);
      return true;
    } catch {
      setSchemaError("JSON ไม่ถูกต้อง กรุณาตรวจสอบ format");
      return false;
    }
  };

  const handleSchemaChange = (text: string) => {
    setSchemaText(text);
    if (text.trim()) validateSchema(text);
    else setSchemaError(null);
  };

  const handleSave = async () => {
    if (!validateSchema(schemaText)) {
      toast.error("Extraction Schema ไม่ถูกต้อง");
      return;
    }

    const mappingObj: Record<string, string> = {};
    for (const { key, value } of fieldMapping) {
      if (key.trim() && value.trim()) {
        mappingObj[key.trim()] = value.trim();
      }
    }

    const configValue = {
      system_prompt: systemPrompt,
      extraction_schema: JSON.parse(schemaText),
      field_mapping: mappingObj,
      model,
    };

    setSaving(true);
    try {
      if (settingId) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value: configValue as any })
          .eq("id", settingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ key: "ocr_po_config", value: configValue as any });
        if (error) throw error;
      }
      toast.success("บันทึกค่าตั้งค่า OCR สำเร็จ");
      fetchConfig();
    } catch (err) {
      console.error("Error saving OCR config:", err);
      toast.error("ไม่สามารถบันทึกได้");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setSchemaText(JSON.stringify(DEFAULT_EXTRACTION_SCHEMA, null, 2));
    setSchemaError(null);
    setFieldMapping(Object.entries(DEFAULT_FIELD_MAPPING).map(([key, value]) => ({ key, value })));
    setModel(DEFAULT_MODEL);
    toast.info("รีเซ็ตเป็นค่าเริ่มต้นแล้ว (ยังไม่ได้บันทึก)");
  };

  const addMappingRow = () => {
    setFieldMapping((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeMappingRow = (index: number) => {
    setFieldMapping((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMappingRow = (index: number, field: "key" | "value", val: string) => {
    setFieldMapping((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          แก้ไขล่าสุด: {new Date(updatedAt).toLocaleString("th-TH")}
        </p>
      )}

      {/* System Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">จุดปรับ #1: System Prompt</CardTitle>
          <CardDescription>คำสั่งที่ส่งให้ AI สำหรับอ่านเอกสาร PO</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Extraction Schema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            จุดปรับ #2: Extraction Schema
            {schemaError ? (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" /> Error
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
              </Badge>
            )}
          </CardTitle>
          <CardDescription>JSON Schema กำหนด field ที่ต้องการดึงจาก PO — เพิ่ม/ลด property ในนี้</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={schemaText}
            onChange={(e) => handleSchemaChange(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          {schemaError && <p className="text-xs text-destructive">{schemaError}</p>}
        </CardContent>
      </Card>

      {/* Field Mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">จุดปรับ #3: Field Mapping</CardTitle>
          <CardDescription>
            กำหนดว่า field จาก OCR (ซ้าย) จะ map ไป field ในระบบ (ขวา) อย่างไร
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center text-xs font-medium text-muted-foreground mb-1">
            <span>OCR Field</span>
            <span>ระบบ Field</span>
            <span className="w-8" />
          </div>
          {fieldMapping.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input
                value={row.key}
                onChange={(e) => updateMappingRow(i, "key", e.target.value)}
                placeholder="เช่น po_number"
                className="text-sm"
              />
              <Input
                value={row.value}
                onChange={(e) => updateMappingRow(i, "value", e.target.value)}
                placeholder="เช่น poNumber"
                className="text-sm"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMappingRow(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMappingRow} className="mt-1">
            <Plus className="w-3 h-3 mr-1" /> เพิ่ม Mapping
          </Button>
        </CardContent>
      </Card>

      {/* AI Model */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI Model</CardTitle>
          <CardDescription>เลือก AI Model สำหรับอ่านเอกสาร PO</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !!schemaError}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึก
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          รีเซ็ตค่าเริ่มต้น
        </Button>
      </div>
    </div>
  );
}
