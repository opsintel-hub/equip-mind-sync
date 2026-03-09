import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ToolImportProps {
  onSuccess: () => void;
}

export function ToolImport({ onSuccess }: ToolImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 18 },
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "เครื่องมือ");

    // Add instruction sheet
    const instructions = [
      ["คำอธิบายการกรอกข้อมูล"],
      [""],
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
      [""],
      ["หมายเหตุ:"],
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
    setProgress(0);

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

      const { data: userData } = await supabase.auth.getUser();

      // Pre-fetch categories and companies for mapping
      const [catRes, compRes] = await Promise.all([
        supabase.from("tool_categories").select("id, name").eq("is_active", true),
        supabase.from("companies").select("id, name").eq("is_active", true),
      ]);
      const catMap = new Map((catRes.data || []).map(c => [c.name.toLowerCase(), c.id]));
      const compMap = new Map((compRes.data || []).map(c => [c.name.toLowerCase(), c.id]));

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      const total = jsonData.length;

      // Detect format
      const firstRow = jsonData[0] as Record<string, any>;
      const isSimplifiedFormat = !!(firstRow["ประเภทเครื่องมือ"] || firstRow["รายการเครื่องมือ"] || firstRow["ความถี่ PM"]);
      const isNewTemplate = !!(firstRow["รหัสเครื่องมือ*"] || firstRow["ชื่อเครื่องมือ*"]);

      const BATCH_SIZE = 20;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2;

        let code: string;
        let name: string;
        let unit: string;
        let quantity: number;
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
        let categoryName: string | undefined;
        let companyName: string | undefined;
        let warehouseEntryDate: string | undefined;

        if (isSimplifiedFormat) {
          name = cleanValue(row["รายการเครื่องมือ"] || row["ชื่อเครื่องมือ"]) || "";
          if (!name) { errors.push(`แถวที่ ${rowNum}: ต้องระบุชื่อเครื่องมือ`); failedCount++; continue; }
          code = `IMPORT-${rowNum}`;
          unit = "ชิ้น";
          quantity = 1;
          pmDays = parsePMInterval(row["ความถี่ PM"] || row["ความถี่PM"] || 30);
          department = cleanValue(row["ฝ่าย"] || row["Department"]);
          description = cleanValue(row["ประเภทเครื่องมือ"]);
          brand = undefined; serialNumber = undefined; unitPrice = undefined;
          hasWarranty = false; warrantyExpiryDate = undefined; expiryDate = undefined;
          notes = undefined; isAsset = false; assetCode = undefined;
          responsiblePerson = undefined; isPersonalTool = false;
          categoryName = undefined; companyName = undefined; warehouseEntryDate = undefined;
        } else if (isNewTemplate) {
          const rawCode = row["รหัสเครื่องมือ*"];
          const rawName = row["ชื่อเครื่องมือ*"];
          const rawUnit = row["หน่วย*"];
          const rawQty = row["จำนวน*"];
          const rawPm = row["ระยะเวลา PM (วัน)*"];

          if (!rawCode || !rawName) {
            errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัส และชื่อเครื่องมือ`);
            failedCount++; continue;
          }
          code = String(rawCode).trim();
          name = String(rawName).trim();
          unit = cleanValue(rawUnit) || "ชิ้น";
          quantity = Number(rawQty) || 1;
          pmDays = parsePMInterval(rawPm || 30);
          categoryName = cleanValue(row["หมวดหมู่"]);
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
          description = undefined;
        } else {
          // Old format fallback
          const rawCode = row["รหัสเครื่องมือ (code)*"] || row["code"];
          const rawName = row["ชื่อเครื่องมือ (name)*"] || row["name"];
          const rawUnit = row["หน่วย (unit)*"] || row["unit"];
          const rawQty = row["จำนวนเริ่มต้น (initial_quantity)*"] ?? row["initial_quantity"] ?? row["จำนวนปัจจุบัน (current_quantity)*"] ?? row["current_quantity"];
          const rawPm = row["ระยะเวลา PM (วัน) (pm_interval_days)*"] ?? row["pm_interval_days"];

          if (!rawCode || !rawName) { errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัส และชื่อ`); failedCount++; continue; }
          code = String(rawCode).trim();
          name = String(rawName).trim();
          unit = String(rawUnit || "ชิ้น").trim();
          quantity = Number(rawQty) || 1;
          pmDays = parsePMInterval(rawPm || 30);
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
          categoryName = undefined; companyName = undefined; warehouseEntryDate = undefined;
        }

        // Map category & company
        const toolCategoryId = categoryName ? catMap.get(categoryName.toLowerCase()) || null : null;
        const companyId = companyName ? compMap.get(companyName.toLowerCase()) || null : null;

        const toolData = {
          code,
          name,
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
            created_by: userData?.user?.id,
          });
          if (error) { errors.push(`แถวที่ ${rowNum}: ${error.message}`); failedCount++; } else { successCount++; }
        }

        // Update progress
        if (i % BATCH_SIZE === 0 || i === jsonData.length - 1) {
          setProgress(Math.round(((i + 1) / total) * 100));
          await new Promise(r => setTimeout(r, 0)); // yield to UI thread
        }
      }

      setImportResult({ success: successCount, failed: failedCount, total, errors });
      if (successCount > 0) { toast.success(`นำเข้าข้อมูลสำเร็จ ${successCount}/${total} รายการ`); onSuccess(); }
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
      <DialogContent className="max-w-lg max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            นำเข้าข้อมูลเครื่องมือ
          </DialogTitle>
        </DialogHeader>

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
              <li>อัปโหลดไฟล์เพื่อนำเข้าข้อมูล</li>
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
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">กำลังนำเข้าข้อมูล... {progress}%</p>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
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
