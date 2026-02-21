import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ToolImportProps {
  onSuccess: () => void;
}

export function ToolImport({ onSuccess }: ToolImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        "รหัสเครื่องมือ (code)*": "TL-001",
        "ชื่อเครื่องมือ (name)*": "ตัวอย่างเครื่องมือ",
        "รายละเอียด (description)": "รายละเอียดเครื่องมือ",
        "ฝ่าย (department)": "ฝ่ายปฏิบัติการ",
        "ยี่ห้อ (brand)": "ยี่ห้อตัวอย่าง",
        "หน่วย (unit)*": "ชิ้น",
        "จำนวนเริ่มต้น (initial_quantity)*": 10,
        "จำนวนปัจจุบัน (current_quantity)*": 10,
        "หมายเลขซีเรียล (serial_number)": "SN-TL-001",
        "ราคาต่อหน่วย (unit_price)": 1500,
        "ระยะเวลา PM (วัน) (pm_interval_days)*": 30,
        "เป็นทรัพย์สิน (is_asset)": "ไม่ใช่",
        "เลขที่ทรัพย์สิน (asset_code)": "",
        "ผู้รับผิดชอบ (responsible_person)": "สมชาย ใจดี",
        "เครื่องมือประจำตัวช่าง (is_personal_tool)": "ไม่ใช่",
        "มีประกัน (has_warranty)": "ใช่",
        "วันหมดประกัน (warranty_expiry_date)": "2026-06-30",
        "วันหมดอายุ (expiry_date)": "2027-12-31",
        "หมายเหตุ (notes)": "หมายเหตุเพิ่มเติม",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tools");

    ws["!cols"] = Array(19).fill({ wch: 22 });

    XLSX.writeFile(wb, "tool_import_template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const parseDate = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }
    return undefined;
  };

  const parseBoolean = (value: any): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "ใช่" || value.toLowerCase() === "yes" || value.toLowerCase() === "true" || value === "1";
    }
    if (typeof value === "number") return value === 1;
    return false;
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
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Detect format: check if first row has simplified columns
      const firstRow = jsonData[0] as Record<string, any>;
      const isSimplifiedFormat = !!(firstRow["ประเภทเครื่องมือ"] || firstRow["รายการเครื่องมือ"] || firstRow["ความถี่ PM"]);

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;

        let code: string;
        let name: string;
        let unit: string;
        let initialQty: number;
        let currentQty: number;
        let pmDays: number;
        let department: string | undefined;
        let description: string | undefined;
        let brand: string | undefined;
        let serialNumber: string | undefined;
        let unitPrice: number | undefined;
        let hasWarranty: boolean;
        let warrantyExpiryDate: string | undefined;
        let expiryDate: string | undefined;
        let notes: string | undefined;
        let isAsset: boolean;
        let assetCode: string | undefined;
        let responsiblePerson: string | undefined;
        let isPersonalTool: boolean;

        if (isSimplifiedFormat) {
          // Simplified 4-column format
          name = cleanValue(row["รายการเครื่องมือ"] || row["ชื่อเครื่องมือ"]) || "";
          if (!name) {
            errors.push(`แถวที่ ${rowNum}: ต้องระบุชื่อเครื่องมือ`);
            failedCount++;
            continue;
          }
          code = `IMPORT-${rowNum}`;
          unit = "ชิ้น";
          initialQty = 1;
          currentQty = 1;
          pmDays = parsePMInterval(row["ความถี่ PM"] || row["ความถี่PM"] || 30);
          department = cleanValue(row["ฝ่าย"] || row["Department"]);
          description = cleanValue(row["ประเภทเครื่องมือ"]);
          brand = undefined;
          serialNumber = undefined;
          unitPrice = undefined;
          hasWarranty = false;
          warrantyExpiryDate = undefined;
          expiryDate = undefined;
          notes = undefined;
          isAsset = false;
          assetCode = undefined;
          responsiblePerson = undefined;
          isPersonalTool = false;
        } else {
          // Full format
          const rawCode = row["รหัสเครื่องมือ (code)*"] || row["code"];
          const rawName = row["ชื่อเครื่องมือ (name)*"] || row["name"];
          const rawUnit = row["หน่วย (unit)*"] || row["unit"];
          const rawInitQty = row["จำนวนเริ่มต้น (initial_quantity)*"] ?? row["initial_quantity"];
          const rawCurQty = row["จำนวนปัจจุบัน (current_quantity)*"] ?? row["current_quantity"];
          const rawPmDays = row["ระยะเวลา PM (วัน) (pm_interval_days)*"] ?? row["pm_interval_days"];

          if (!rawCode || !rawName || !rawUnit || rawInitQty === undefined || rawCurQty === undefined || rawPmDays === undefined) {
            errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัส, ชื่อ, หน่วย, จำนวนเริ่มต้น, จำนวนปัจจุบัน และระยะเวลา PM`);
            failedCount++;
            continue;
          }

          code = String(rawCode).trim();
          name = String(rawName).trim();
          unit = String(rawUnit).trim();
          initialQty = Number(rawInitQty) || 0;
          currentQty = Number(rawCurQty) || 0;
          pmDays = parsePMInterval(rawPmDays);
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

        const toolData = {
          code,
          name,
          description: description || null,
          department: department || null,
          brand: brand || null,
          unit,
          initial_quantity: initialQty,
          current_quantity: currentQty,
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
        };

        const { data: existing } = await supabase
          .from("tools")
          .select("id")
          .eq("code", toolData.code)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("tools")
            .update({ ...toolData, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) { errors.push(`แถวที่ ${rowNum}: ${error.message}`); failedCount++; } else { successCount++; }
        } else {
          const { error } = await supabase.from("tools").insert({
            ...toolData,
            warehouse_entry_date: new Date().toISOString().split("T")[0],
            created_by: userData?.user?.id,
          });
          if (error) { errors.push(`แถวที่ ${rowNum}: ${error.message}`); failedCount++; } else { successCount++; }
        }
      }

      setImportResult({ success: successCount, failed: failedCount, errors });
      if (successCount > 0) { toast.success(`นำเข้าข้อมูลสำเร็จ ${successCount} รายการ`); onSuccess(); }
      if (failedCount > 0) { toast.error(`นำเข้าไม่สำเร็จ ${failedCount} รายการ`); }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์: " + error.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) { fileInputRef.current.value = ""; }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>นำเข้าข้อมูลเครื่องมือ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              ขั้นตอนการนำเข้า
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>ดาวน์โหลด Template Excel</li>
              <li>กรอกข้อมูลตาม Template (ห้ามเปลี่ยนชื่อหัวคอลัมน์)</li>
              <li>บันทึกไฟล์เป็น .xlsx หรือ .csv</li>
              <li>อัปโหลดไฟล์เพื่อนำเข้าข้อมูล</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              💡 รองรับ 2 รูปแบบ: แบบเต็ม (Template) และแบบย่อ (ฝ่าย, ประเภท, ชื่อ, ความถี่ PM)
            </p>
          </div>

          <Button onClick={downloadTemplate} variant="secondary" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            ดาวน์โหลด Template Excel
          </Button>

          <div className="border-t pt-4">
            <label className="block">
              <span className="text-sm font-medium">อัปโหลดไฟล์ Excel/CSV</span>
              <Input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={loading} className="mt-2" />
            </label>
          </div>

          {loading && <div className="text-center py-4 text-muted-foreground">กำลังนำเข้าข้อมูล...</div>}

          {importResult && (
            <div className="space-y-3">
              {importResult.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">นำเข้าสำเร็จ {importResult.success} รายการ</AlertDescription>
                </Alert>
              )}
              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    นำเข้าไม่สำเร็จ {importResult.failed} รายการ
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 text-xs list-disc list-inside max-h-32 overflow-auto">
                        {importResult.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                        {importResult.errors.length > 10 && <li>...และอีก {importResult.errors.length - 10} รายการ</li>}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
