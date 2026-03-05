import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EquipmentImportProps {
  onSuccess: () => void;
}

interface ImportRow {
  code: string;
  name: string;
  category: string;
  department?: string;
  brand?: string;
  unit: string;
  quantity_in_stock: number;
  min_stock_level?: number;
  unit_price?: number;
  serial_number?: string;
  volt?: number;
  amp?: number;
  watt?: number;
  lumen?: number;
  lux?: number;
  expiry_date?: string;
  warranty_expiry_date?: string;
  notes?: string;
  is_asset?: boolean;
  asset_code?: string;
  equipment_id_code?: string;
}

export function EquipmentImport({ onSuccess }: EquipmentImportProps) {
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
        "รหัสอุปกรณ์ (code)*": "EQ-001",
        "ชื่ออุปกรณ์ (name)*": "ตัวอย่างอุปกรณ์",
        "หมวดหมู่ (category)*": "อุปกรณ์ไฟฟ้า",
        "ฝ่าย (department)": "ฝ่ายปฏิบัติการ",
        "ยี่ห้อ (brand)": "ยี่ห้อตัวอย่าง",
        "หน่วย (unit)*": "ชิ้น",
        "จำนวน (quantity_in_stock)*": 100,
        "จุดสั่งซื้อ (min_stock_level)": 10,
        "ราคาต่อหน่วย (unit_price)": 500,
        "หมายเลขซีเรียล (serial_number)": "SN-001",
        "โวลท์ (volt)": 220,
        "แอมป์ (amp)": 5,
        "วัตต์ (watt)": 100,
        "ลูเมน (lumen)": 1000,
        "ลักซ์ (lux)": 500,
        "วันหมดอายุ (expiry_date)": "2025-12-31",
        "วันหมดประกัน (warranty_expiry_date)": "2026-06-30",
        "เป็นสินทรัพย์ (is_asset)": "ไม่",
        "รหัสสินทรัพย์ (asset_code)": "",
        "รหัส Equipment ID (equipment_id_code)": "",
        "หมายเหตุ (notes)": "หมายเหตุเพิ่มเติม",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment");

    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 18 }, { wch: 22 }, { wch: 30 },
    ];

    XLSX.writeFile(wb, "equipment_import_template.xlsx");
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

      // Fetch all existing codes with pagination to bypass 1000 row limit
      const existingCodeMap = new Map<string, string>();
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: eqData, error } = await supabase
          .from("equipment")
          .select("id, code")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!eqData || eqData.length === 0) break;
        eqData.forEach(eq => existingCodeMap.set(eq.code, eq.id));
        if (eqData.length < pageSize) break;
        from += pageSize;
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process in batches for better performance
      const BATCH_SIZE = 50;
      const rowsToInsert: any[] = [];
      const rowsToUpdate: { id: string; data: any; rowNum: number }[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;

        const code = row["รหัสอุปกรณ์ (code)*"] || row["code"];
        const name = row["ชื่ออุปกรณ์ (name)*"] || row["name"];
        const category = row["หมวดหมู่ (category)*"] || row["category"];
        const unit = row["หน่วย (unit)*"] || row["unit"];
        const quantity = row["จำนวน (quantity_in_stock)*"] ?? row["quantity_in_stock"];

        if (!code || !name || !category || !unit || quantity === undefined) {
          errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัส, ชื่อ, หมวดหมู่, หน่วย และจำนวน`);
          failedCount++;
          continue;
        }

        const equipmentData: ImportRow = {
          code: String(code).trim(),
          name: String(name).trim(),
          category: String(category).trim(),
          department: row["ฝ่าย (department)"] || row["department"] || undefined,
          brand: row["ยี่ห้อ (brand)"] || row["brand"] || undefined,
          unit: String(unit).trim(),
          quantity_in_stock: Number(quantity) || 0,
          min_stock_level: row["จุดสั่งซื้อ (min_stock_level)"] ?? row["min_stock_level"] ?? undefined,
          unit_price: row["ราคาต่อหน่วย (unit_price)"] ?? row["unit_price"] ?? undefined,
          serial_number: row["หมายเลขซีเรียล (serial_number)"] || row["serial_number"] || undefined,
          volt: row["โวลท์ (volt)"] ?? row["volt"] ?? undefined,
          amp: row["แอมป์ (amp)"] ?? row["amp"] ?? undefined,
          watt: row["วัตต์ (watt)"] ?? row["watt"] ?? undefined,
          lumen: row["ลูเมน (lumen)"] ?? row["lumen"] ?? undefined,
          lux: row["ลักซ์ (lux)"] ?? row["lux"] ?? undefined,
          expiry_date: parseDate(row["วันหมดอายุ (expiry_date)"] || row["expiry_date"]),
          warranty_expiry_date: parseDate(row["วันหมดประกัน (warranty_expiry_date)"] || row["warranty_expiry_date"]),
          notes: row["หมายเหตุ (notes)"] || row["notes"] || undefined,
        };

        const existingId = existingCodeMap.get(equipmentData.code);

        if (existingId) {
          rowsToUpdate.push({ id: existingId, data: equipmentData, rowNum });
        } else {
          rowsToInsert.push({
            ...equipmentData,
            warehouse_entry_date: new Date().toISOString().split("T")[0],
            created_by: userData?.user?.id,
            _rowNum: rowNum,
          });
        }
      }

      // Batch insert new records
      for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
        const batch = rowsToInsert.slice(i, i + BATCH_SIZE).map(({ _rowNum, ...rest }) => rest);
        const { error } = await supabase.from("equipment").insert(batch);
        if (error) {
          const batchStart = rowsToInsert[i]._rowNum;
          const batchEnd = rowsToInsert[Math.min(i + BATCH_SIZE - 1, rowsToInsert.length - 1)]._rowNum;
          errors.push(`แถวที่ ${batchStart}-${batchEnd}: ${error.message}`);
          failedCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      // Update existing records (still row-by-row due to different IDs)
      for (const { id, data, rowNum } of rowsToUpdate) {
        const { error } = await supabase
          .from("equipment")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) {
          errors.push(`แถวที่ ${rowNum}: ${error.message}`);
          failedCount++;
        } else {
          successCount++;
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
          <DialogTitle>นำเข้าข้อมูลอุปกรณ์</DialogTitle>
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
