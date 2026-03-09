import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Eye, ArrowLeft, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ToolImportProps {
  onSuccess: () => void;
}

interface PreviewRow {
  rowNum: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  pmDays: number;
  category?: string;
  department?: string;
  brand?: string;
  serialNumber?: string;
  isUpdate: boolean;
  errors: string[];
  warnings: string[];
  toolData: Record<string, any>;
}

export function ToolImport({ onSuccess }: ToolImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setPreviewRows([]);
    setImportResult(null);
    setProgress(0);
    setLoading(false);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "รหัสเครื่องมือ*": "TL-0001",
        "ชื่อเครื่องมือ*": "สว่านกระแทก Bosch",
        "หมวดหมู่": "เครื่องมือไฟฟ้า",
        "ฝ่าย": "ฝ่ายปฏิบัติการ",
        "บริษัท": "",
        "ยี่ห้อ": "Bosch",
        "หน่วย*": "ชิ้น",
        "จำนวน*": 1,
        "Serial Number": "SN-DRILL-001",
        "ราคาต่อชิ้น (บาท)": 4500,
        "ระยะเวลา PM (วัน)*": 30,
        "เป็นทรัพย์สิน": "ไม่ใช่",
        "เลขที่ทรัพย์สิน": "",
        "ผู้รับผิดชอบ": "สมชาย ใจดี",
        "ประจำตัวช่าง": "ไม่ใช่",
        "มีประกัน": "ใช่",
        "วันหมดประกัน (yyyy-mm-dd)": "2026-12-31",
        "วันหมดอายุ (yyyy-mm-dd)": "",
        "วันที่นำเข้าคลัง (yyyy-mm-dd)": "2025-01-15",
        "หมายเหตุ": "",
      },
      {
        "รหัสเครื่องมือ*": "TL-0002",
        "ชื่อเครื่องมือ*": "ประแจเลื่อน 10 นิ้ว",
        "หมวดหมู่": "เครื่องมือมือ",
        "ฝ่าย": "ฝ่ายซ่อมบำรุง",
        "บริษัท": "",
        "ยี่ห้อ": "STANLEY",
        "หน่วย*": "ชิ้น",
        "จำนวน*": 5,
        "Serial Number": "",
        "ราคาต่อชิ้น (บาท)": 350,
        "ระยะเวลา PM (วัน)*": 90,
        "เป็นทรัพย์สิน": "ไม่ใช่",
        "เลขที่ทรัพย์สิน": "",
        "ผู้รับผิดชอบ": "",
        "ประจำตัวช่าง": "ไม่ใช่",
        "มีประกัน": "ไม่ใช่",
        "วันหมดประกัน (yyyy-mm-dd)": "",
        "วันหมดอายุ (yyyy-mm-dd)": "",
        "วันที่นำเข้าคลัง (yyyy-mm-dd)": "2025-03-01",
        "หมายเหตุ": "ซื้อมาชุดเดียวกัน",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 18 },
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "เครื่องมือ");

    const instructions = [
      ["คำอธิบายการกรอกข้อมูล"], [""],
      ["คอลัมน์", "คำอธิบาย", "จำเป็น"],
      ["รหัสเครื่องมือ*", "รหัสที่ใช้ในระบบ เช่น TL-0001 (ห้ามซ้ำกัน ถ้าซ้ำจะอัปเดตข้อมูลเดิม)", "ใช่"],
      ["ชื่อเครื่องมือ*", "ชื่อเครื่องมือ", "ใช่"],
      ["หมวดหมู่", "ชื่อหมวดหมู่ ถ้าไม่มีในระบบจะข้ามการผูกข้อมูล", "ไม่"],
      ["ฝ่าย", "ชื่อฝ่ายที่ดูแล", "ไม่"],
      ["บริษัท", "ชื่อบริษัทเจ้าของ (ต้องตรงกับข้อมูลในระบบ)", "ไม่"],
      ["ยี่ห้อ", "ยี่ห้อเครื่องมือ", "ไม่"],
      ["หน่วย*", "หน่วยนับ เช่น ชิ้น, อัน, ตัว", "ใช่"],
      ["จำนวน*", "จำนวนที่มี", "ใช่"],
      ["Serial Number", "หมายเลขซีเรียล", "ไม่"],
      ["ราคาต่อชิ้น (บาท)", "ราคาต่อหน่วย", "ไม่"],
      ["ระยะเวลา PM (วัน)*", "15, 30, 60, 90, 180 หรือ 365", "ใช่"],
      ["เป็นทรัพย์สิน", "ใช่ / ไม่ใช่", "ไม่"],
      ["เลขที่ทรัพย์สิน", "กรอกเมื่อเป็นทรัพย์สิน", "ไม่"],
      ["ผู้รับผิดชอบ", "ชื่อผู้ดูแลเครื่องมือ", "ไม่"],
      ["ประจำตัวช่าง", "ใช่ / ไม่ใช่", "ไม่"],
      ["มีประกัน", "ใช่ / ไม่ใช่", "ไม่"],
      ["วันหมดประกัน", "รูปแบบ yyyy-mm-dd เช่น 2026-12-31", "ไม่"],
      ["วันหมดอายุ", "รูปแบบ yyyy-mm-dd", "ไม่"],
      ["วันที่นำเข้าคลัง", "รูปแบบ yyyy-mm-dd (ถ้าไม่กรอกจะใช้วันที่นำเข้า)", "ไม่"],
      ["หมายเหตุ", "หมายเหตุเพิ่มเติม", "ไม่"],
      [""], ["หมายเหตุ:"],
      ["- คอลัมน์ที่มี * คือต้องกรอก"],
      ["- ถ้ารหัสเครื่องมือซ้ำกับที่มีในระบบแล้ว ข้อมูลจะถูกอัปเดต"],
      ["- ค่า '-', '#N/A', 'N/A' จะถูกเปลี่ยนเป็นค่าว่าง"],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    wsInst["!cols"] = [{ wch: 25 }, { wch: 55 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsInst, "คำอธิบาย");

    XLSX.writeFile(wb, "template_นำเข้าเครื่องมือ.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const parseDate = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) return value;
    return undefined;
  };

  const parseBoolean = (value: any): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return ["ใช่", "yes", "true", "1"].includes(value.toLowerCase());
    }
    return value === 1;
  };

  const cleanValue = (val: any): string | undefined => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    if (str === "" || str === "-" || str === "#N/A" || str === "N/A") return undefined;
    return str;
  };

  const parsePMInterval = (val: any): number => {
    if (typeof val === "number") return val;
    const str = String(val).trim().toLowerCase();
    if (str.includes("15")) return 15;
    if (str.includes("60")) return 60;
    if (str.includes("90")) return 90;
    if (str.includes("180")) return 180;
    if (str.includes("365") || str.includes("1 ปี") || str.includes("ปี")) return 365;
    if (str.includes("30")) return 30;
    return 30;
  };

  // Step 1: Parse file and show preview
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("ไฟล์ไม่มีข้อมูล");
        setLoading(false);
        return;
      }

      // Pre-fetch for validation
      const [catRes, compRes, existingRes] = await Promise.all([
        supabase.from("tool_categories").select("id, name").eq("is_active", true),
        supabase.from("companies").select("id, name").eq("is_active", true),
        supabase.from("tools").select("id, code"),
      ]);
      const catMap = new Map((catRes.data || []).map(c => [c.name.toLowerCase(), c.id]));
      const compMap = new Map((compRes.data || []).map(c => [c.name.toLowerCase(), c.id]));
      const existingCodes = new Map((existingRes.data || []).map(t => [t.code, t.id]));

      const firstRow = jsonData[0] as Record<string, any>;
      const isSimplifiedFormat = !!(firstRow["ประเภทเครื่องมือ"] || firstRow["รายการเครื่องมือ"] || firstRow["ความถี่ PM"]);
      const isNewTemplate = !!(firstRow["รหัสเครื่องมือ*"] || firstRow["ชื่อเครื่องมือ*"]);

      const preview: PreviewRow[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;
        const errors: string[] = [];
        const warnings: string[] = [];

        let code = "", name = "", unit = "ชิ้น", quantity = 1, pmDays = 30;
        let category: string | undefined, department: string | undefined, brand: string | undefined, serialNumber: string | undefined;
        let unitPrice: number | undefined, hasWarranty = false, warrantyExpiryDate: string | undefined;
        let expiryDate: string | undefined, notes: string | undefined, isAsset = false, assetCode: string | undefined;
        let responsiblePerson: string | undefined, isPersonalTool = false, companyName: string | undefined;
        let warehouseEntryDate: string | undefined, description: string | undefined;

        if (isSimplifiedFormat) {
          name = cleanValue(row["รายการเครื่องมือ"] || row["ชื่อเครื่องมือ"]) || "";
          if (!name) errors.push("ต้องระบุชื่อเครื่องมือ");
          code = `IMPORT-${rowNum}`;
          pmDays = parsePMInterval(row["ความถี่ PM"] || row["ความถี่PM"] || 30);
          department = cleanValue(row["ฝ่าย"] || row["Department"]);
          description = cleanValue(row["ประเภทเครื่องมือ"]);
        } else if (isNewTemplate) {
          code = cleanValue(row["รหัสเครื่องมือ*"]) || "";
          name = cleanValue(row["ชื่อเครื่องมือ*"]) || "";
          if (!code) errors.push("ต้องระบุรหัสเครื่องมือ");
          if (!name) errors.push("ต้องระบุชื่อเครื่องมือ");
          unit = cleanValue(row["หน่วย*"]) || "ชิ้น";
          quantity = Number(row["จำนวน*"]) || 1;
          pmDays = parsePMInterval(row["ระยะเวลา PM (วัน)*"] || 30);
          category = cleanValue(row["หมวดหมู่"]);
          department = cleanValue(row["ฝ่าย"]);
          companyName = cleanValue(row["บริษัท"]);
          brand = cleanValue(row["ยี่ห้อ"]);
          serialNumber = cleanValue(row["Serial Number"]);
          unitPrice = row["ราคาต่อชิ้น (บาท)"] != null ? Number(row["ราคาต่อชิ้น (บาท)"]) : undefined;
          isAsset = parseBoolean(row["เป็นทรัพย์สิน"]);
          assetCode = cleanValue(row["เลขที่ทรัพย์สิน"]);
          responsiblePerson = cleanValue(row["ผู้รับผิดชอบ"]);
          isPersonalTool = parseBoolean(row["ประจำตัวช่าง"]);
          hasWarranty = parseBoolean(row["มีประกัน"]);
          warrantyExpiryDate = parseDate(row["วันหมดประกัน (yyyy-mm-dd)"]);
          expiryDate = parseDate(row["วันหมดอายุ (yyyy-mm-dd)"]);
          warehouseEntryDate = parseDate(row["วันที่นำเข้าคลัง (yyyy-mm-dd)"]);
          notes = cleanValue(row["หมายเหตุ"]);
        } else {
          code = cleanValue(row["รหัสเครื่องมือ (code)*"] || row["code"]) || "";
          name = cleanValue(row["ชื่อเครื่องมือ (name)*"] || row["name"]) || "";
          if (!code) errors.push("ต้องระบุรหัส");
          if (!name) errors.push("ต้องระบุชื่อ");
          unit = String(row["หน่วย (unit)*"] || row["unit"] || "ชิ้น").trim();
          quantity = Number(row["จำนวนเริ่มต้น (initial_quantity)*"] ?? row["initial_quantity"] ?? row["จำนวนปัจจุบัน (current_quantity)*"] ?? row["current_quantity"]) || 1;
          pmDays = parsePMInterval(row["ระยะเวลา PM (วัน) (pm_interval_days)*"] ?? row["pm_interval_days"] ?? 30);
          department = cleanValue(row["ฝ่าย (department)"] || row["department"]);
          description = cleanValue(row["รายละเอียด (description)"] || row["description"]);
          brand = cleanValue(row["ยี่ห้อ (brand)"] || row["brand"]);
          serialNumber = cleanValue(row["หมายเลขซีเรียล (serial_number)"] || row["serial_number"]);
          unitPrice = row["ราคาต่อหน่วย (unit_price)"] ?? row["unit_price"] ?? undefined;
          hasWarranty = parseBoolean(row["มีประกัน (has_warranty)"] ?? row["has_warranty"]);
          warrantyExpiryDate = parseDate(row["วันหมดประกัน (warranty_expiry_date)"] || row["warranty_expiry_date"]);
          expiryDate = parseDate(row["วันหมดอายุ (expiry_date)"] || row["expiry_date"]);
          notes = cleanValue(row["หมายเหตุ (notes)"] || row["notes"]);
          isAsset = parseBoolean(row["เป็นทรัพย์สิน (is_asset)"] ?? row["is_asset"]);
          assetCode = cleanValue(row["เลขที่ทรัพย์สิน (asset_code)"] || row["asset_code"]);
          responsiblePerson = cleanValue(row["ผู้รับผิดชอบ (responsible_person)"] || row["responsible_person"]);
          isPersonalTool = parseBoolean(row["เครื่องมือประจำตัวช่าง (is_personal_tool)"] ?? row["is_personal_tool"]);
        }

        // Validation warnings
        if (category && !catMap.has(category.toLowerCase())) {
          warnings.push(`หมวดหมู่ "${category}" ไม่พบในระบบ`);
        }
        if (companyName && !compMap.has(companyName.toLowerCase())) {
          warnings.push(`บริษัท "${companyName}" ไม่พบในระบบ`);
        }
        if (isAsset && !assetCode) {
          warnings.push("เป็นทรัพย์สินแต่ไม่มีเลขที่ทรัพย์สิน");
        }
        if (hasWarranty && !warrantyExpiryDate) {
          warnings.push("มีประกันแต่ไม่ระบุวันหมดประกัน");
        }

        const isUpdate = existingCodes.has(code);
        const toolCategoryId = category ? catMap.get(category.toLowerCase()) || null : null;
        const companyId = companyName ? compMap.get(companyName.toLowerCase()) || null : null;

        const toolData: Record<string, any> = {
          code, name,
          description: description || null,
          department: department || null,
          brand: brand || null,
          unit,
          initial_quantity: quantity,
          current_quantity: quantity,
          serial_number: serialNumber || null,
          unit_price: unitPrice != null ? Number(unitPrice) : 0,
          pm_interval_days: pmDays,
          has_warranty: hasWarranty,
          warranty_expiry_date: warrantyExpiryDate || null,
          expiry_date: expiryDate || null,
          notes: notes || null,
          is_asset: isAsset,
          asset_code: isAsset ? assetCode || null : null,
          responsible_person: responsiblePerson || null,
          is_personal_tool: isPersonalTool,
          tool_category_id: toolCategoryId,
          company_id: companyId,
          warehouse_entry_date: warehouseEntryDate || new Date().toISOString().split("T")[0],
        };

        if (isUpdate) {
          toolData._existingId = existingCodes.get(code);
        }

        preview.push({
          rowNum, code, name, unit, quantity, pmDays,
          category, department, brand, serialNumber,
          isUpdate, errors, warnings, toolData,
        });
      }

      setPreviewRows(preview);
      setStep("preview");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm and import
  const handleConfirmImport = async () => {
    const validRows = previewRows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    setImporting(true);
    setProgress(0);

    const { data: userData } = await supabase.auth.getUser();
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const total = validRows.length;
    const BATCH_SIZE = 20;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const { _existingId, ...data } = row.toolData;

      try {
        if (_existingId) {
          const { error } = await supabase.from("tools").update({ ...data, updated_at: new Date().toISOString() }).eq("id", _existingId);
          if (error) { errors.push(`แถวที่ ${row.rowNum}: ${error.message}`); failedCount++; } else { successCount++; }
        } else {
          const { error } = await supabase.from("tools").insert({ ...data, created_by: userData?.user?.id });
          if (error) { errors.push(`แถวที่ ${row.rowNum}: ${error.message}`); failedCount++; } else { successCount++; }
        }
      } catch (e: any) {
        errors.push(`แถวที่ ${row.rowNum}: ${e.message}`);
        failedCount++;
      }

      if (i % BATCH_SIZE === 0 || i === validRows.length - 1) {
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const skipped = previewRows.filter(r => r.errors.length > 0).length;
    setImportResult({ success: successCount, failed: failedCount + skipped, total: previewRows.length, errors });
    setStep("result");
    setImporting(false);

    if (successCount > 0) {
      toast.success(`นำเข้าข้อมูลสำเร็จ ${successCount} รายการ`);
      onSuccess();
    }
  };

  const validCount = previewRows.filter(r => r.errors.length === 0).length;
  const errorCount = previewRows.filter(r => r.errors.length > 0).length;
  const updateCount = previewRows.filter(r => r.errors.length === 0 && r.isUpdate).length;
  const newCount = previewRows.filter(r => r.errors.length === 0 && !r.isUpdate).length;
  const warningCount = previewRows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            นำเข้าข้อมูลเครื่องมือ
            {step === "preview" && <Badge variant="outline" className="ml-2">ตรวจสอบข้อมูล</Badge>}
            {step === "result" && <Badge variant="outline" className="ml-2">ผลลัพธ์</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                ขั้นตอนการนำเข้า
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>ดาวน์โหลด Template Excel ด้านล่าง</li>
                <li>กรอกข้อมูลตาม Template (ดูแท็บ "คำอธิบาย" ในไฟล์)</li>
                <li>บันทึกไฟล์เป็น .xlsx</li>
                <li>อัปโหลดไฟล์ → ระบบจะตรวจสอบก่อนนำเข้าจริง</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                💡 ถ้ารหัสเครื่องมือซ้ำกับที่มีในระบบ จะอัปเดตข้อมูลเดิมให้อัตโนมัติ
              </p>
            </div>

            <Button onClick={downloadTemplate} variant="secondary" className="w-full gap-2">
              <Download className="h-4 w-4" />
              ดาวน์โหลด Template Excel
            </Button>

            <div className="border-t pt-4">
              <label className="block">
                <span className="text-sm font-medium">อัปโหลดไฟล์ Excel</span>
                <Input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={loading} className="mt-2" />
              </label>
            </div>

            {loading && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                กำลังตรวจสอบข้อมูล...
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                ทั้งหมด {previewRows.length} แถว
              </Badge>
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                ✓ พร้อมนำเข้า {validCount}
              </Badge>
              {newCount > 0 && (
                <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                  เพิ่มใหม่ {newCount}
                </Badge>
              )}
              {updateCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  อัปเดต {updateCount}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">
                  ✗ ข้อผิดพลาด {errorCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  ⚠ คำเตือน {warningCount}
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            <ScrollArea className="flex-1 border rounded-lg max-h-[45vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">แถว</TableHead>
                    <TableHead className="w-16">สถานะ</TableHead>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อเครื่องมือ</TableHead>
                    <TableHead className="hidden sm:table-cell">หน่วย</TableHead>
                    <TableHead className="hidden sm:table-cell">จำนวน</TableHead>
                    <TableHead className="hidden sm:table-cell">PM (วัน)</TableHead>
                    <TableHead>ปัญหา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r) => (
                    <TableRow key={r.rowNum} className={r.errors.length > 0 ? "bg-destructive/5" : r.isUpdate ? "bg-amber-500/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{r.rowNum}</TableCell>
                      <TableCell>
                        {r.errors.length > 0 ? (
                          <Badge variant="destructive" className="text-[10px] px-1">ผิดพลาด</Badge>
                        ) : r.isUpdate ? (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px] px-1">อัปเดต</Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px] px-1">ใหม่</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.code || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{r.name || "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{r.unit}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{r.quantity}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{r.pmDays}</TableCell>
                      <TableCell>
                        {r.errors.length > 0 && (
                          <span className="text-xs text-destructive">{r.errors.join(", ")}</span>
                        )}
                        {r.errors.length === 0 && r.warnings.length > 0 && (
                          <span className="text-xs text-warning">{r.warnings.join(", ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2 justify-between pt-2 border-t">
              <Button variant="outline" onClick={resetState} disabled={importing}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                กลับ
              </Button>
              <Button onClick={handleConfirmImport} disabled={importing || validCount === 0} className="gap-2">
                {importing ? (
                  <>กำลังนำเข้า... {progress}%</>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    ยืนยันนำเข้า {validCount} รายการ
                  </>
                )}
              </Button>
            </div>

            {importing && <Progress value={progress} className="h-2" />}
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && importResult && (
          <div className="space-y-4">
            {importResult.success > 0 && (
              <Alert className="border-success/30 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  นำเข้าสำเร็จ {importResult.success}/{importResult.total} รายการ
                </AlertDescription>
              </Alert>
            )}
            {importResult.failed > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ข้ามไป {importResult.failed} รายการ (ข้อมูลไม่ครบหรือผิดพลาด)
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 text-xs list-disc list-inside max-h-32 overflow-auto">
                      {importResult.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                      {importResult.errors.length > 10 && <li>...และอีก {importResult.errors.length - 10} รายการ</li>}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Button variant="outline" onClick={resetState} className="w-full">
              นำเข้าไฟล์ใหม่
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
