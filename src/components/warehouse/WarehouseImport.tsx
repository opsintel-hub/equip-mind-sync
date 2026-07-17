import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WarehouseImportProps {
  onSuccess: () => void;
}

const ALLOWED_AREAS = ["Indoor", "Outdoor", "Semi-outdoor"];

export function WarehouseImport({ onSuccess }: WarehouseImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const data = [
      {
        "รหัสคลัง (code)*": "PB-01",
        "ชื่อคลัง (name)*": "คลังพระราม9",
        "ประเภทพื้นที่ (storage_area) Indoor|Outdoor|Semi-outdoor*": "Indoor",
        "ฝ่าย (department)": "ฝ่ายป้ายโฆษณา",
        "รายละเอียด (description)": "",
      },
      {
        "รหัสคลัง (code)*": "PB-02",
        "ชื่อคลัง (name)*": "บางเสาธง",
        "ประเภทพื้นที่ (storage_area) Indoor|Outdoor|Semi-outdoor*": "Indoor",
        "ฝ่าย (department)": "ฝ่ายป้ายโฆษณา",
        "รายละเอียด (description)": "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Warehouses");
    ws["!cols"] = [{ wch: 18 }, { wch: 25 }, { wch: 42 }, { wch: 22 }, { wch: 30 }];
    XLSX.writeFile(wb, "warehouse_import_template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, any>[];
      if (rows.length === 0) {
        toast.error("ไฟล์ไม่มีข้อมูล");
        return;
      }

      const { data: depts } = await supabase.from("departments").select("name").eq("is_active", true);
      const deptNames = new Set((depts || []).map((d) => d.name));

      let inserted = 0;
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 2;
        const code = r["รหัสคลัง (code)*"] || r["code"];
        const name = r["ชื่อคลัง (name)*"] || r["name"];
        const storageArea =
          r["ประเภทพื้นที่ (storage_area) Indoor|Outdoor|Semi-outdoor*"] || r["storage_area"];
        const department = r["ฝ่าย (department)"] || r["department"] || null;
        const description = r["รายละเอียด (description)"] || r["description"] || null;

        if (!code || !name || !storageArea) {
          errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัสคลัง, ชื่อคลัง, ประเภทพื้นที่`);
          failed++;
          continue;
        }

        const areaStr = String(storageArea).trim();
        if (!ALLOWED_AREAS.includes(areaStr)) {
          errors.push(`แถวที่ ${rowNum}: ประเภทพื้นที่ "${areaStr}" ไม่ถูกต้อง (ใช้ ${ALLOWED_AREAS.join("/")})`);
          failed++;
          continue;
        }

        const deptStr = department ? String(department).trim() : null;
        if (deptStr && deptNames.size > 0 && !deptNames.has(deptStr)) {
          errors.push(`แถวที่ ${rowNum}: ไม่พบฝ่าย "${deptStr}" ในระบบ`);
          failed++;
          continue;
        }

        try {
          const codeStr = String(code).trim();
          const payload = {
            code: codeStr,
            name: String(name).trim(),
            storage_area: areaStr,
            department: deptStr,
            description: description ? String(description).trim() : null,
          };

          const { data: existing } = await supabase
            .from("warehouses")
            .select("id")
            .eq("code", codeStr)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase.from("warehouses").update(payload).eq("id", existing.id);
            if (error) throw error;
            updated++;
          } else {
            const { error } = await supabase.from("warehouses").insert(payload);
            if (error) throw error;
            inserted++;
          }
        } catch (e: any) {
          errors.push(`แถวที่ ${rowNum}: ${e.message}`);
          failed++;
        }
      }

      setResult({ inserted, updated, failed, errors });
      const total = inserted + updated;
      if (total > 0) {
        toast.success(`นำเข้าคลังสำเร็จ ${total} รายการ (ใหม่ ${inserted}, อัปเดต ${updated})`);
        onSuccess();
      }
      if (failed > 0) toast.error(`นำเข้าไม่สำเร็จ ${failed} รายการ`);
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์: " + e.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import คลัง
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>นำเข้าข้อมูลคลังสินค้า</DialogTitle>
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
              <li>ประเภทพื้นที่ ต้องเป็น <b>Indoor / Outdoor / Semi-outdoor</b> เท่านั้น</li>
              <li>ฝ่าย ต้องตรงกับชื่อฝ่ายในระบบ (ตาราง Departments)</li>
              <li>ถ้ารหัสคลังมีอยู่แล้ว ระบบจะอัปเดต ถ้ายังไม่มีจะสร้างใหม่</li>
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

          {loading && <div className="text-center py-4 text-muted-foreground">กำลังนำเข้าข้อมูล...</div>}

          {result && (
            <div className="space-y-3">
              {(result.inserted + result.updated) > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    เพิ่มใหม่ {result.inserted} คลัง · อัปเดต {result.updated} คลัง
                  </AlertDescription>
                </Alert>
              )}
              {result.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่สำเร็จ {result.failed} รายการ
                    {result.errors.length > 0 && (
                      <ul className="mt-2 text-xs list-disc list-inside max-h-32 overflow-auto">
                        {result.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li>...และอีก {result.errors.length - 10} รายการ</li>
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
