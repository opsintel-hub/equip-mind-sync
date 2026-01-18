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

interface ImportRow {
  code: string;
  name: string;
  description?: string;
  department?: string;
  brand?: string;
  unit: string;
  initial_quantity: number;
  current_quantity: number;
  serial_number?: string;
  unit_price?: number;
  pm_interval_days: number;
  has_warranty?: boolean;
  warranty_expiry_date?: string;
  expiry_date?: string;
  notes?: string;
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
        "มีประกัน (has_warranty)": "ใช่",
        "วันหมดประกัน (warranty_expiry_date)": "2026-06-30",
        "วันหมดอายุ (expiry_date)": "2027-12-31",
        "หมายเหตุ (notes)": "หมายเหตุเพิ่มเติม",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tools");

    ws["!cols"] = [
      { wch: 22 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 25 }, { wch: 18 },
      { wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 30 },
    ];

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

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;

        const code = row["รหัสเครื่องมือ (code)*"] || row["code"];
        const name = row["ชื่อเครื่องมือ (name)*"] || row["name"];
        const unit = row["หน่วย (unit)*"] || row["unit"];
        const initialQty = row["จำนวนเริ่มต้น (initial_quantity)*"] ?? row["initial_quantity"];
        const currentQty = row["จำนวนปัจจุบัน (current_quantity)*"] ?? row["current_quantity"];
        const pmDays = row["ระยะเวลา PM (วัน) (pm_interval_days)*"] ?? row["pm_interval_days"];

        if (!code || !name || !unit || initialQty === undefined || currentQty === undefined || pmDays === undefined) {
          errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัส, ชื่อ, หน่วย, จำนวนเริ่มต้น, จำนวนปัจจุบัน และระยะเวลา PM`);
          failedCount++;
          continue;
        }

        const toolData: ImportRow = {
          code: String(code).trim(),
          name: String(name).trim(),
          description: row["รายละเอียด (description)"] || row["description"] || undefined,
          department: row["ฝ่าย (department)"] || row["department"] || undefined,
          brand: row["ยี่ห้อ (brand)"] || row["brand"] || undefined,
          unit: String(unit).trim(),
          initial_quantity: Number(initialQty) || 0,
          current_quantity: Number(currentQty) || 0,
          serial_number: row["หมายเลขซีเรียล (serial_number)"] || row["serial_number"] || undefined,
          unit_price: row["ราคาต่อหน่วย (unit_price)"] ?? row["unit_price"] ?? undefined,
          pm_interval_days: Number(pmDays) || 30,
          has_warranty: parseBoolean(row["มีประกัน (has_warranty)"] ?? row["has_warranty"]),
          warranty_expiry_date: parseDate(row["วันหมดประกัน (warranty_expiry_date)"] || row["warranty_expiry_date"]),
          expiry_date: parseDate(row["วันหมดอายุ (expiry_date)"] || row["expiry_date"]),
          notes: row["หมายเหตุ (notes)"] || row["notes"] || undefined,
        };

        const { data: existing } = await supabase
          .from("tools")
          .select("id")
          .eq("code", toolData.code)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("tools")
            .update({
              ...toolData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            errors.push(`แถวที่ ${rowNum}: ${error.message}`);
            failedCount++;
          } else {
            successCount++;
          }
        } else {
          const { error } = await supabase.from("tools").insert({
            ...toolData,
            warehouse_entry_date: new Date().toISOString().split("T")[0],
            created_by: userData?.user?.id,
          });

          if (error) {
            errors.push(`แถวที่ ${rowNum}: ${error.message}`);
            failedCount++;
          } else {
            successCount++;
          }
        }
      }

      setImportResult({ success: successCount, failed: failedCount, errors });

      if (successCount > 0) {
        toast.success(`นำเข้าข้อมูลสำเร็จ ${successCount} รายการ`);
        onSuccess();
      }

      if (failedCount > 0) {
        toast.error(`นำเข้าไม่สำเร็จ ${failedCount} รายการ`);
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์: " + error.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
        </Button>
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
          </div>

          <Button onClick={downloadTemplate} variant="secondary" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            ดาวน์โหลด Template Excel
          </Button>

          <div className="border-t pt-4">
            <label className="block">
              <span className="text-sm font-medium">อัปโหลดไฟล์ Excel/CSV</span>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="mt-2"
              />
            </label>
          </div>

          {loading && (
            <div className="text-center py-4 text-muted-foreground">
              กำลังนำเข้าข้อมูล...
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
              {importResult.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    นำเข้าสำเร็จ {importResult.success} รายการ
                  </AlertDescription>
                </Alert>
              )}

              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    นำเข้าไม่สำเร็จ {importResult.failed} รายการ
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 text-xs list-disc list-inside max-h-32 overflow-auto">
                        {importResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>...และอีก {importResult.errors.length - 10} รายการ</li>
                        )}
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
