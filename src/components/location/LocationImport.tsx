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

const ALLOWED_AREAS = ["Indoor", "Outdoor", "Semi-outdoor"];

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return isFinite(n) && n > 0 ? n : null;
};

export function LocationImport({ onSuccess }: LocationImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    warehousesInserted: number;
    warehousesUpdated: number;
    locationsSuccess: number;
    locationsFailed: number;
    warehousesFailed: number;
    errors: string[];
    perWarehouse: WarehouseSummary[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const warehousesData = [
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

    const locationsData = [
      {
        "รหัสคลังสินค้า (warehouse_code)*": "PB-01",
        "รหัสตำแหน่ง (code)*": "A01",
        "ชื่อตำแหน่ง (name)*": "ช่อง 01",
        "รายละเอียด (description)": "",
        "พื้นที่จัดเก็บ (storage_area)": "Indoor",
        "รหัสโซน (zone_code)": "A",
        "ชื่อโซน (zone_name)": "โซนซ้าย",
        "กว้าง cm (width_cm)": 60,
        "สูง cm (height_cm)": 40,
        "ลึก cm (depth_cm)": 40,
      },
      {
        "รหัสคลังสินค้า (warehouse_code)*": "PB-01",
        "รหัสตำแหน่ง (code)*": "A02",
        "ชื่อตำแหน่ง (name)*": "ช่อง 02",
        "รายละเอียด (description)": "",
        "พื้นที่จัดเก็บ (storage_area)": "Indoor",
        "รหัสโซน (zone_code)": "A",
        "ชื่อโซน (zone_name)": "โซนซ้าย",
        "กว้าง cm (width_cm)": 60,
        "สูง cm (height_cm)": 40,
        "ลึก cm (depth_cm)": 40,
      },
    ];

    const wb = XLSX.utils.book_new();

    const wsWh = XLSX.utils.json_to_sheet(warehousesData);
    wsWh["!cols"] = [{ wch: 18 }, { wch: 25 }, { wch: 42 }, { wch: 22 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsWh, "Warehouses");

    const wsLoc = XLSX.utils.json_to_sheet(locationsData);
    wsLoc["!cols"] = [
      { wch: 24 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 22 },
      { wch: 15 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLoc, "Locations");

    const readme = [
      { "คำแนะนำการใช้งาน": "ไฟล์นี้มี 2 sheet — Warehouses (คลัง) และ Locations (ตำแหน่งจัดเก็บ)" },
      { "คำแนะนำการใช้งาน": "1. กรอก sheet Warehouses ก่อน (ระบบจะสร้างคลังใหม่หรืออัปเดตถ้ามีอยู่แล้ว)" },
      { "คำแนะนำการใช้งาน": "2. กรอก sheet Locations โดยอ้างอิง 'รหัสคลังสินค้า' ให้ตรงกับคลังใน sheet แรก" },
      { "คำแนะนำการใช้งาน": "3. ประเภทพื้นที่ต้องเป็น Indoor / Outdoor / Semi-outdoor เท่านั้น" },
      { "คำแนะนำการใช้งาน": "4. ฝ่ายต้องตรงกับชื่อฝ่ายในระบบ" },
      { "คำแนะนำการใช้งาน": "5. กรอก กว้าง/สูง/ลึก (cm) เพื่อให้ระบบคำนวณปริมาตร m³ อัตโนมัติ" },
      { "คำแนะนำการใช้งาน": "6. ถ้ากรอก 'รหัสโซน' ระบบจะสร้างโซนอัตโนมัติหากยังไม่มี" },
      { "คำแนะนำการใช้งาน": "7. ห้ามเปลี่ยนชื่อหัวคอลัมน์" },
    ];
    const wsReadme = XLSX.utils.json_to_sheet(readme);
    wsReadme["!cols"] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsReadme, "README");

    XLSX.writeFile(wb, "warehouse_location_template.xlsx");
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

      // Find sheets (case-insensitive)
      const findSheet = (name: string) =>
        wb.SheetNames.find((n) => n.toLowerCase() === name.toLowerCase());
      const whSheetName = findSheet("Warehouses");
      const locSheetName = findSheet("Locations") || wb.SheetNames[0];

      const whRows: Record<string, any>[] = whSheetName
        ? (XLSX.utils.sheet_to_json(wb.Sheets[whSheetName]) as any[])
        : [];
      const locRows: Record<string, any>[] = locSheetName
        ? (XLSX.utils.sheet_to_json(wb.Sheets[locSheetName]) as any[])
        : [];

      if (whRows.length === 0 && locRows.length === 0) {
        toast.error("ไฟล์ไม่มีข้อมูล — กรุณากรอกใน sheet Warehouses หรือ Locations");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: depts } = await supabase.from("departments").select("name").eq("is_active", true);
      const deptNames = new Set((depts || []).map((d) => d.name));

      const errors: string[] = [];
      let whInserted = 0;
      let whUpdated = 0;
      let whFailed = 0;

      // ===== STAGE 1: Warehouses =====
      for (let i = 0; i < whRows.length; i++) {
        const r = whRows[i];
        const rowNum = i + 2;
        const code = r["รหัสคลัง (code)*"] || r["code"];
        const name = r["ชื่อคลัง (name)*"] || r["name"];
        const storageArea =
          r["ประเภทพื้นที่ (storage_area) Indoor|Outdoor|Semi-outdoor*"] || r["storage_area"];
        const department = r["ฝ่าย (department)"] || r["department"] || null;
        const description = r["รายละเอียด (description)"] || r["description"] || null;

        if (!code || !name || !storageArea) {
          errors.push(`[Warehouses แถวที่ ${rowNum}] ต้องระบุ รหัสคลัง, ชื่อคลัง, ประเภทพื้นที่`);
          whFailed++;
          continue;
        }
        const areaStr = String(storageArea).trim();
        if (!ALLOWED_AREAS.includes(areaStr)) {
          errors.push(`[Warehouses แถวที่ ${rowNum}] ประเภทพื้นที่ "${areaStr}" ไม่ถูกต้อง (${ALLOWED_AREAS.join("/")})`);
          whFailed++;
          continue;
        }
        const deptStr = department ? String(department).trim() : null;
        if (deptStr && deptNames.size > 0 && !deptNames.has(deptStr)) {
          errors.push(`[Warehouses แถวที่ ${rowNum}] ไม่พบฝ่าย "${deptStr}" ในระบบ`);
          whFailed++;
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
            whUpdated++;
          } else {
            const { error } = await supabase.from("warehouses").insert(payload);
            if (error) throw error;
            whInserted++;
          }
        } catch (e: any) {
          errors.push(`[Warehouses แถวที่ ${rowNum}] ${e.message}`);
          whFailed++;
        }
      }

      // ===== STAGE 2: Locations =====
      const { data: warehouses } = await supabase.from("warehouses").select("id, code, name");
      const warehouseMap = new Map(warehouses?.map((w) => [w.code, { id: w.id, name: w.name }]) || []);
      const zoneCache = new Map<string, string>();
      const perWh = new Map<string, WarehouseSummary>();

      let locSuccess = 0;
      let locFailed = 0;

      for (let i = 0; i < locRows.length; i++) {
        const row = locRows[i];
        const rowNum = i + 2;

        const code = row["รหัสตำแหน่ง (code)*"] || row["code"];
        const name = row["ชื่อตำแหน่ง (name)*"] || row["name"];
        const warehouseCode =
          row["รหัสคลังสินค้า (warehouse_code)*"] || row["รหัสคลังสินค้า (warehouse_code)"] || row["warehouse_code"];

        if (!code || !name || !warehouseCode) {
          errors.push(`[Locations แถวที่ ${rowNum}] ต้องระบุ รหัสตำแหน่ง, ชื่อตำแหน่ง และ รหัสคลังสินค้า`);
          locFailed++;
          continue;
        }

        const whCodeStr = String(warehouseCode).trim();
        const wh = warehouseMap.get(whCodeStr);
        if (!wh) {
          errors.push(`[Locations แถวที่ ${rowNum}] ไม่พบคลังสินค้า "${warehouseCode}" — กรุณาเพิ่มในชีท Warehouses`);
          locFailed++;
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
          locSuccess++;
        } catch (error: any) {
          errors.push(`[Locations แถวที่ ${rowNum}] ${error.message}`);
          locFailed++;
        }
      }

      setResult({
        warehousesInserted: whInserted,
        warehousesUpdated: whUpdated,
        warehousesFailed: whFailed,
        locationsSuccess: locSuccess,
        locationsFailed: locFailed,
        errors,
        perWarehouse: Array.from(perWh.values()).sort((a, b) => a.code.localeCompare(b.code)),
      });

      const okTotal = whInserted + whUpdated + locSuccess;
      if (okTotal > 0) {
        toast.success(`นำเข้าสำเร็จ — คลัง ${whInserted + whUpdated} · ตำแหน่ง ${locSuccess}`);
        onSuccess();
      }
      if (whFailed + locFailed > 0) {
        toast.error(`นำเข้าไม่สำเร็จ ${whFailed + locFailed} รายการ`);
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
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>นำเข้าคลัง & ตำแหน่งจัดเก็บ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Template เดียว — 2 ชีทในไฟล์เดียว
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>ดาวน์โหลด Template Excel (มี 2 ชีท: Warehouses, Locations)</li>
              <li>กรอกชีท <b>Warehouses</b> ก่อน — รหัส/ชื่อคลัง, ประเภทพื้นที่, ฝ่าย</li>
              <li>กรอกชีท <b>Locations</b> — อ้าง 'รหัสคลังสินค้า' ให้ตรงกับชีทแรก</li>
              <li>ระบุ กว้าง/สูง/ลึก (cm) → คำนวณ m³ อัตโนมัติ</li>
              <li>อัปโหลดไฟล์เดียว — ระบบสร้างคลังก่อน แล้วค่อยสร้างตำแหน่ง</li>
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

          {result && (
            <div className="space-y-3">
              {(result.warehousesInserted + result.warehousesUpdated + result.locationsSuccess) > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 space-y-1">
                    <div>
                      <b>คลัง:</b> เพิ่มใหม่ {result.warehousesInserted} · อัปเดต {result.warehousesUpdated}
                    </div>
                    <div>
                      <b>ตำแหน่ง:</b> สำเร็จ {result.locationsSuccess} รายการ
                    </div>
                    {result.perWarehouse.length > 0 && (
                      <ul className="text-xs space-y-0.5 mt-1">
                        {result.perWarehouse.map((w) => (
                          <li key={w.code}>
                            • <b>{w.code}</b> — {w.name}: เพิ่มใหม่ {w.inserted}, อัปเดต {w.updated}
                          </li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {(result.warehousesFailed + result.locationsFailed) > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่สำเร็จ คลัง {result.warehousesFailed} · ตำแหน่ง {result.locationsFailed} รายการ
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
