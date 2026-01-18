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

interface ImportRow {
  code: string;
  name: string;
  description?: string;
  storage_area?: string;
  storage_area_size?: string;
  warehouse_code?: string;
  storage_slot_name?: string;
  sub_storage_slot_name?: string;
}

export function LocationImport({ onSuccess }: LocationImportProps) {
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
        "รหัสตำแหน่ง (code)*": "LOC-001",
        "ชื่อตำแหน่ง (name)*": "ชั้นวาง A1",
        "รายละเอียด (description)": "ตำแหน่งจัดเก็บหลัก",
        "พื้นที่จัดเก็บ (storage_area)": "โซน A",
        "ขนาดพื้นที่ (storage_area_size)": "5x3 เมตร",
        "รหัสคลังสินค้า (warehouse_code)": "WH-001",
        "ช่องจัดเก็บ (storage_slot_name)": "ชั้น 1",
        "ช่องย่อย (sub_storage_slot_name)": "ช่อง A",
      },
      {
        "รหัสตำแหน่ง (code)*": "LOC-001",
        "ชื่อตำแหน่ง (name)*": "ชั้นวาง A1",
        "รายละเอียด (description)": "ตำแหน่งจัดเก็บหลัก",
        "พื้นที่จัดเก็บ (storage_area)": "โซน A",
        "ขนาดพื้นที่ (storage_area_size)": "5x3 เมตร",
        "รหัสคลังสินค้า (warehouse_code)": "WH-001",
        "ช่องจัดเก็บ (storage_slot_name)": "ชั้น 1",
        "ช่องย่อย (sub_storage_slot_name)": "ช่อง B",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locations");

    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 20 },
      { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
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
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("ไฟล์ไม่มีข้อมูล");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: warehouses } = await supabase.from("warehouses").select("id, code");
      const warehouseMap = new Map(warehouses?.map(w => [w.code, w.id]) || []);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      const locationCache = new Map<string, string>();
      const slotCache = new Map<string, string>();

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;

        const code = row["รหัสตำแหน่ง (code)*"] || row["code"];
        const name = row["ชื่อตำแหน่ง (name)*"] || row["name"];

        if (!code || !name) {
          errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัสตำแหน่ง และ ชื่อตำแหน่ง`);
          failedCount++;
          continue;
        }

        const locationCode = String(code).trim();
        const warehouseCode = row["รหัสคลังสินค้า (warehouse_code)"] || row["warehouse_code"];
        const warehouseId = warehouseCode ? warehouseMap.get(String(warehouseCode).trim()) : null;

        try {
          let locationId = locationCache.get(locationCode);

          if (!locationId) {
            const { data: existingLocation } = await supabase
              .from("locations")
              .select("id")
              .eq("code", locationCode)
              .maybeSingle();

            if (existingLocation) {
              locationId = existingLocation.id;
              await supabase
                .from("locations")
                .update({
                  name: String(name).trim(),
                  description: row["รายละเอียด (description)"] || row["description"] || null,
                  storage_area: row["พื้นที่จัดเก็บ (storage_area)"] || row["storage_area"] || null,
                  storage_area_size: row["ขนาดพื้นที่ (storage_area_size)"] || row["storage_area_size"] || null,
                  warehouse_id: warehouseId || null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", locationId);
            } else {
              const { data: newLocation, error: locError } = await supabase
                .from("locations")
                .insert({
                  code: locationCode,
                  name: String(name).trim(),
                  description: row["รายละเอียด (description)"] || row["description"] || null,
                  storage_area: row["พื้นที่จัดเก็บ (storage_area)"] || row["storage_area"] || null,
                  storage_area_size: row["ขนาดพื้นที่ (storage_area_size)"] || row["storage_area_size"] || null,
                  warehouse_id: warehouseId || null,
                  created_by: userData?.user?.id,
                })
                .select("id")
                .single();

              if (locError) throw locError;
              locationId = newLocation.id;
            }

            locationCache.set(locationCode, locationId);
          }

          const slotName = row["ช่องจัดเก็บ (storage_slot_name)"] || row["storage_slot_name"];
          if (slotName && locationId) {
            const slotKey = `${locationId}-${String(slotName).trim()}`;
            let slotId = slotCache.get(slotKey);

            if (!slotId) {
              const { data: existingSlot } = await supabase
                .from("storage_slots")
                .select("id")
                .eq("location_id", locationId)
                .eq("name", String(slotName).trim())
                .maybeSingle();

              if (existingSlot) {
                slotId = existingSlot.id;
              } else {
                const { data: newSlot, error: slotError } = await supabase
                  .from("storage_slots")
                  .insert({
                    location_id: locationId,
                    name: String(slotName).trim(),
                    created_by: userData?.user?.id,
                  })
                  .select("id")
                  .single();

                if (slotError) throw slotError;
                slotId = newSlot.id;
              }

              slotCache.set(slotKey, slotId);
            }

            const subSlotName = row["ช่องย่อย (sub_storage_slot_name)"] || row["sub_storage_slot_name"];
            if (subSlotName && slotId) {
              const { data: existingSubSlot } = await supabase
                .from("sub_storage_slots")
                .select("id")
                .eq("storage_slot_id", slotId)
                .eq("name", String(subSlotName).trim())
                .maybeSingle();

              if (!existingSubSlot) {
                await supabase
                  .from("sub_storage_slots")
                  .insert({
                    storage_slot_id: slotId,
                    name: String(subSlotName).trim(),
                    created_by: userData?.user?.id,
                  });
              }
            }
          }

          successCount++;
        } catch (error: any) {
          errors.push(`แถวที่ ${rowNum}: ${error.message}`);
          failedCount++;
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
          <DialogTitle>นำเข้าข้อมูลตำแหน่งจัดเก็บ</DialogTitle>
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
              <li>สามารถใส่หลายแถวที่มีรหัสตำแหน่งเดียวกันเพื่อเพิ่มช่องจัดเก็บ/ช่องย่อย</li>
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
