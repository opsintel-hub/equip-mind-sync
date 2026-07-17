import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationImportProps {
  onSuccess: () => void;
}

interface WarehouseSummary {
  code: string;
  name: string;
  inserted: number;
  updated: number;
}

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return isFinite(n) && n > 0 ? n : null;
};

export function LocationImport({ onSuccess }: LocationImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
    perWarehouse: WarehouseSummary[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        "รหัสตำแหน่ง (code)*": "A01",
        "ชื่อตำแหน่ง (name)*": "ช่อง 01",
        "รายละเอียด (description)": "",
        "พื้นที่จัดเก็บ (storage_area)": "Indoor",
        "รหัสคลังสินค้า (warehouse_code)*": "PB-01",
        "รหัสโซน (zone_code)": "A",
        "ชื่อโซน (zone_name)": "โซนซ้าย",
        "กว้าง cm (width_cm)": 60,
        "สูง cm (height_cm)": 40,
        "ลึก cm (depth_cm)": 40,
      },
      {
        "รหัสตำแหน่ง (code)*": "A02",
        "ชื่อตำแหน่ง (name)*": "ช่อง 02",
        "รายละเอียด (description)": "",
        "พื้นที่จัดเก็บ (storage_area)": "Indoor",
        "รหัสคลังสินค้า (warehouse_code)*": "PB-01",
        "รหัสโซน (zone_code)": "A",
        "ชื่อโซน (zone_name)": "โซนซ้าย",
        "กว้าง cm (width_cm)": 60,
        "สูง cm (height_cm)": 40,
        "ลึก cm (depth_cm)": 40,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locations");
    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 22 },
      { wch: 24 }, { wch: 15 }, { wch: 22 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];
    XLSX.writeFile(wb, "location_import_template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("ไฟล์ไม่มีข้อมูล");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: warehouses } = await supabase.from("warehouses").select("id, code, name");
      const warehouseMap = new Map(warehouses?.map((w) => [w.code, { id: w.id, name: w.name }]) || []);

      const zoneCache = new Map<string, string>();
      const perWh = new Map<string, WarehouseSummary>();

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;

        const code = row["รหัสตำแหน่ง (code)*"] || row["code"];
        const name = row["ชื่อตำแหน่ง (name)*"] || row["name"];
        const warehouseCode =
          row["รหัสคลังสินค้า (warehouse_code)*"] || row["รหัสคลังสินค้า (warehouse_code)"] || row["warehouse_code"];

        if (!code || !name || !warehouseCode) {
          errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัสตำแหน่ง, ชื่อตำแหน่ง และ รหัสคลังสินค้า`);
          failedCount++;
          continue;
        }

        const whCodeStr = String(warehouseCode).trim();
        const wh = warehouseMap.get(whCodeStr);
        if (!wh) {
          errors.push(`แถวที่ ${rowNum}: ไม่พบคลังสินค้า "${warehouseCode}" — กรุณาสร้างคลังก่อน (ใช้ปุ่ม Import คลัง หรือ + เพิ่มคลังสินค้า)`);
          failedCount++;
          continue;
        }

        const locationCode = String(code).trim();

        try {
          const zoneCode = row["รหัสโซน (zone_code)"] || row["zone_code"];
          const zoneName = row["ชื่อโซน (zone_name)"] || row["zone_name"];
          let zoneId: string | null = null;

          if (zoneCode) {
            const zoneKey = `${wh.id}|${String(zoneCode).trim()}`;
            zoneId = zoneCache.get(zoneKey) || null;
            if (!zoneId) {
              const { data: existingZone } = await supabase
                .from("zones")
                .select("id")
                .eq("warehouse_id", wh.id)
                .eq("code", String(zoneCode).trim())
                .maybeSingle();
              if (existingZone) {
                zoneId = existingZone.id;
              } else {
                const { data: newZone, error: zErr } = await supabase
                  .from("zones")
                  .insert({
                    warehouse_id: wh.id,
                    code: String(zoneCode).trim(),
                    name: zoneName ? String(zoneName).trim() : String(zoneCode).trim(),
                    created_by: userData?.user?.id,
                  })
                  .select("id")
                  .single();
                if (zErr) throw zErr;
                zoneId = newZone.id;
              }
              zoneCache.set(zoneKey, zoneId);
            }
          }

          const w = toNum(row["กว้าง cm (width_cm)"] ?? row["width_cm"]);
          const h = toNum(row["สูง cm (height_cm)"] ?? row["height_cm"]);
          const d = toNum(row["ลึก cm (depth_cm)"] ?? row["depth_cm"]);
          const volume = w && h && d ? w * h * d : null;

          const payload = {
            code: locationCode,
            name: String(name).trim(),
            description: row["รายละเอียด (description)"] || row["description"] || null,
            storage_area: row["พื้นที่จัดเก็บ (storage_area)"] || row["storage_area"] || null,
            warehouse_id: wh.id,
            zone_id: zoneId,
            width_cm: w,
            height_cm: h,
            depth_cm: d,
            volume_cm3: volume,
          };

          const { data: existingLocation } = await supabase
            .from("locations")
            .select("id")
            .eq("code", locationCode)
            .maybeSingle();

          const summary = perWh.get(whCodeStr) || { code: whCodeStr, name: wh.name, inserted: 0, updated: 0 };

          if (existingLocation) {
            const { error } = await supabase
              .from("locations")
              .update({ ...payload, updated_at: new Date().toISOString() })
              .eq("id", existingLocation.id);
            if (error) throw error;
            summary.updated++;
          } else {
            const { error } = await supabase.from("locations").insert({
              ...payload,
              used_volume_cm3: 0,
              created_by: userData?.user?.id,
            });
            if (error) throw error;
            summary.inserted++;
          }
          perWh.set(whCodeStr, summary);

          successCount++;
        } catch (error: any) {
          errors.push(`แถวที่ ${rowNum}: ${error.message}`);
          failedCount++;
        }
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        errors,
        perWarehouse: Array.from(perWh.values()).sort((a, b) => a.code.localeCompare(b.code)),
      });
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import ตำแหน่ง
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>นำเข้าข้อมูลตำแหน่งจัดเก็บ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              ขั้นตอนการนำเข้า
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>ต้องมีคลังสินค้าอยู่ก่อน (ใช้ปุ่ม Import คลัง หากยังไม่มี)</li>
              <li>ดาวน์โหลด Template Excel</li>
              <li>กรอกข้อมูลตาม Template (ห้ามเปลี่ยนชื่อหัวคอลัมน์)</li>
              <li>ระบุ กว้าง/สูง/ลึก (cm) → ระบบจะคำนวณปริมาตร m³ อัตโนมัติ</li>
              <li>ถ้ากรอก "รหัสโซน" ระบบจะสร้างโซนอัตโนมัติหากยังไม่มี</li>
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
            <div className="text-center py-4 text-muted-foreground">กำลังนำเข้าข้อมูล...</div>
          )}

          {importResult && (
            <div className="space-y-3">
              {importResult.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="font-medium mb-1">นำเข้าสำเร็จ {importResult.success} รายการ</div>
                    {importResult.perWarehouse.length > 0 && (
                      <ul className="text-xs space-y-0.5 mt-1">
                        {importResult.perWarehouse.map((w) => (
                          <li key={w.code}>
                            • <b>{w.code}</b> — {w.name}: เพิ่มใหม่ {w.inserted}, อัปเดต {w.updated}
                          </li>
                        ))}
                      </ul>
                    )}
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
