import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface DeliveryImportProps {
  onSuccess: () => void;
}

interface ImportRow {
  equipment_code?: string;
  equipment_name?: string;
  quantity: number;
  unit: string;
  supplier_name?: string;
  company_code?: string;
  department?: string;
  po_number?: string;
  pr_number?: string;
  purpose?: string;
  lot_number_1?: string;
  lot_number_2?: string;
  serial_number?: string;
  unit_price?: number;
  is_asset?: boolean;
  asset_code?: string;
  equipment_id_code?: string;
  depreciation_months?: number;
  delivery_person_name: string;
  delivery_person_phone?: string;
  expiry_date?: string;
  warranty_expiry_date?: string;
  storage_width_cm?: number;
  storage_height_cm?: number;
  storage_depth_cm?: number;
  notes?: string;
}

const INVALID_VALUES = ["-", "#N/A", "N/A", "#REF!", "#VALUE!", "#NAME?", "null", "undefined", ""];

function cleanValue(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).trim();
  if (INVALID_VALUES.includes(str)) return undefined;
  return str;
}

function parseDate(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  // Handle Excel serial date numbers
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
    return undefined;
  }
  const str = String(val).trim();
  if (INVALID_VALUES.includes(str)) return undefined;
  // Validate YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return undefined;
}

export function DeliveryImport({ onSuccess }: DeliveryImportProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        "รหัสสินค้า": "",
        "ชื่อสินค้า": "ตัวอย่างสินค้า",
        "จำนวน": 10,
        "หน่วย": "ชิ้น",
        "ผู้จัดจำหน่าย": "บริษัท ABC",
        "รหัสบริษัท (company_code)": "",
        "รหัสฝ่าย (department)": "",
        "เลขที่ PO": "",
        "เลขที่ PR": "",
        "วัตถุประสงค์ (ซื้อ/ยืม/โอน)": "ซื้อ",
        "Lot Number 1": "LOT001",
        "Lot Number 2": "",
        "Serial Number": "",
        "ราคาต่อชิ้น": 100,
        "เป็นสินทรัพย์ (ใช่/ไม่)": "ไม่",
        "รหัสสินทรัพย์ (Asset Code)": "",
        "รหัส Equipment ID": "",
        "ค่าเสื่อมราคา (เดือน)": "",
        "ชื่อผู้ส่ง": "นายทดสอบ",
        "เบอร์โทรผู้ส่ง": "0812345678",
        "วันหมดอายุ (YYYY-MM-DD)": "",
        "วันสิ้นสุดรับประกัน (YYYY-MM-DD)": "",
        "กว้าง (cm)": 50,
        "สูง (cm)": 30,
        "ลึก (cm)": 40,
        "หมายเหตุ": ""
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 25 },
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }, { wch: 22 }, { wch: 28 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Delivery_Import_Template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast.error("รองรับเฉพาะไฟล์ Excel หรือ CSV");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsedData: ImportRow[] = [];
      const parseErrors: string[] = [];
      const parseWarnings: string[] = [];

      jsonData.forEach((row: any, index) => {
        const rowNum = index + 2; // Excel row (1-indexed + header)

        if (!row["ชื่อสินค้า"] && !row["รหัสสินค้า"]) {
          parseErrors.push(`แถว ${rowNum}: ต้องระบุรหัสสินค้าหรือชื่อสินค้า`);
          return;
        }

        if (!row["จำนวน"] || isNaN(Number(row["จำนวน"]))) {
          parseErrors.push(`แถว ${rowNum}: จำนวนไม่ถูกต้อง`);
          return;
        }

        if (!row["ชื่อผู้ส่ง"]) {
          parseErrors.push(`แถว ${rowNum}: ต้องระบุชื่อผู้ส่ง`);
          return;
        }

        // Validate and warn about auto-corrected values
        const rawExpiryDate = row["วันหมดอายุ (YYYY-MM-DD)"];
        const rawWarrantyDate = row["วันสิ้นสุดรับประกัน (YYYY-MM-DD)"];
        const rawAssetCode = row["รหัสสินทรัพย์ (Asset Code)"];
        const rawEquipmentId = row["รหัส Equipment ID"];
        const rawSerial = row["Serial Number"];

        if (rawExpiryDate && !parseDate(rawExpiryDate)) {
          parseWarnings.push(`แถว ${rowNum}: วันหมดอายุ "${rawExpiryDate}" ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD) → ข้ามค่านี้`);
        }
        if (rawWarrantyDate && !parseDate(rawWarrantyDate)) {
          parseWarnings.push(`แถว ${rowNum}: วันสิ้นสุดรับประกัน "${rawWarrantyDate}" ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD) → ข้ามค่านี้`);
        }
        if (rawAssetCode && !cleanValue(rawAssetCode)) {
          parseWarnings.push(`แถว ${rowNum}: รหัสสินทรัพย์ "${rawAssetCode}" ไม่ถูกต้อง → ข้ามค่านี้`);
        }
        if (rawEquipmentId && !cleanValue(rawEquipmentId)) {
          parseWarnings.push(`แถว ${rowNum}: รหัส Equipment ID "${rawEquipmentId}" ไม่ถูกต้อง → ข้ามค่านี้`);
        }
        if (rawSerial && !cleanValue(rawSerial)) {
          parseWarnings.push(`แถว ${rowNum}: Serial Number "${rawSerial}" ไม่ถูกต้อง → ข้ามค่านี้`);
        }

        parsedData.push({
          equipment_code: row["รหัสสินค้า"] || undefined,
          equipment_name: row["ชื่อสินค้า"] || undefined,
          quantity: Number(row["จำนวน"]),
          unit: row["หน่วย"] || "ชิ้น",
          supplier_name: row["ผู้จัดจำหน่าย"] || undefined,
          company_code: row["รหัสบริษัท (company_code)"] || undefined,
          department: row["รหัสฝ่าย (department)"] || undefined,
          po_number: row["เลขที่ PO"] || undefined,
          pr_number: row["เลขที่ PR"] || undefined,
          purpose: row["วัตถุประสงค์ (ซื้อ/ยืม/โอน)"] || undefined,
          lot_number_1: row["Lot Number 1"] || undefined,
          lot_number_2: row["Lot Number 2"] || undefined,
          serial_number: cleanValue(rawSerial),
          unit_price: row["ราคาต่อชิ้น"] ? Number(row["ราคาต่อชิ้น"]) : undefined,
          is_asset: row["เป็นสินทรัพย์ (ใช่/ไม่)"] === "ใช่" || row["เป็นสินทรัพย์ (ใช่/ไม่)"] === "yes" || row["เป็นสินทรัพย์ (ใช่/ไม่)"] === "Yes",
          asset_code: cleanValue(rawAssetCode),
          equipment_id_code: cleanValue(rawEquipmentId),
          depreciation_months: row["ค่าเสื่อมราคา (เดือน)"] ? Number(row["ค่าเสื่อมราคา (เดือน)"]) : undefined,
          delivery_person_name: row["ชื่อผู้ส่ง"],
          delivery_person_phone: row["เบอร์โทรผู้ส่ง"] || undefined,
          expiry_date: parseDate(rawExpiryDate),
          warranty_expiry_date: parseDate(rawWarrantyDate),
          storage_width_cm: row["กว้าง (cm)"] ? Number(row["กว้าง (cm)"]) : undefined,
          storage_height_cm: row["สูง (cm)"] ? Number(row["สูง (cm)"]) : undefined,
          storage_depth_cm: row["ลึก (cm)"] ? Number(row["ลึก (cm)"]) : undefined,
          notes: row["หมายเหตุ"] || undefined
        });
      });

      setImportData(parsedData);
      setErrors(parseErrors);
      setWarnings(parseWarnings);

      if (parsedData.length === 0) {
        toast.error("ไม่พบข้อมูลที่สามารถนำเข้าได้");
      } else if (parseWarnings.length > 0) {
        toast.warning(`พบข้อมูล ${parsedData.length} รายการ แต่มี ${parseWarnings.length} คำเตือน`);
      } else {
        toast.success(`พบข้อมูล ${parsedData.length} รายการ พร้อมนำเข้า`);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const generateDocumentNo = () => {
    const date = new Date();
    const dateStr = format(date, "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `PD-${dateStr}-${random}`;
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      toast.error("ไม่มีข้อมูลให้นำเข้า");
      return;
    }

    setIsLoading(true);

    try {
      const insertData = importData.map(row => ({
        document_no: generateDocumentNo(),
        equipment_code: row.equipment_code || null,
        equipment_name: row.equipment_name || null,
        quantity: row.quantity,
        unit: row.unit,
        supplier_name: row.supplier_name || null,
        po_number: row.po_number || null,
        pr_number: row.pr_number || null,
        is_asset: row.is_asset || false,
        asset_code: row.asset_code || null,
        equipment_id_code: row.equipment_id_code || null,
        depreciation_months: row.depreciation_months || null,
        lot_number: row.lot_number_1 || null,
        lot_number_2: row.lot_number_2 || null,
        serial_number: row.serial_number || null,
        unit_price: row.unit_price || null,
        delivery_person_name: row.delivery_person_name,
        delivery_person_phone: row.delivery_person_phone || null,
        expiry_date: row.expiry_date || null,
        warranty_expiry_date: row.warranty_expiry_date || null,
        storage_width_cm: row.storage_width_cm || null,
        storage_height_cm: row.storage_height_cm || null,
        storage_depth_cm: row.storage_depth_cm || null,
        storage_volume_cm3: row.storage_width_cm && row.storage_height_cm && row.storage_depth_cm
          ? row.storage_width_cm * row.storage_height_cm * row.storage_depth_cm
          : null,
        notes: row.notes || null,
        status: "pending"
      }));

      const { error } = await supabase
        .from("goods_receipt_pending")
        .insert(insertData);

      if (error) throw error;

      toast.success(`นำเข้าข้อมูลสำเร็จ ${importData.length} รายการ`);
      setImportData([]);
      setErrors([]);
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>นำเข้าข้อมูลสินค้าจาก Excel</DialogTitle>
          <DialogDescription>
            ดาวน์โหลด Template แล้วกรอกข้อมูล จากนั้นอัปโหลดไฟล์เพื่อนำเข้าข้อมูล
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                เลือกไฟล์
              </Button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">พบข้อผิดพลาด</span>
              </div>
              <ul className="list-disc list-inside text-sm text-destructive">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-center gap-2 text-warning mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">คำเตือน: ข้อมูลบางส่วนถูกแก้ไขอัตโนมัติ ({warnings.length} รายการ)</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">ค่าที่ไม่ถูกต้อง (เช่น "-", "#N/A", "N/A") จะถูกข้ามและไม่บันทึกลงฐานข้อมูล สามารถนำเข้าได้ตามปกติ</p>
              <ul className="list-disc list-inside text-sm text-warning max-h-32 overflow-auto">
                {warnings.slice(0, 20).map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
                {warnings.length > 20 && (
                  <li className="text-muted-foreground">...และอีก {warnings.length - 20} รายการ</li>
                )}
              </ul>
            </div>
          )}

          {importData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">พร้อมนำเข้า {importData.length} รายการ</span>
              </div>
              
              <div className="border rounded-lg max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>จำนวน</TableHead>
                      <TableHead>หน่วย</TableHead>
                      <TableHead>ผู้จัดจำหน่าย</TableHead>
                      <TableHead>ผู้ส่ง</TableHead>
                      <TableHead>ราคา/ชิ้น</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.equipment_name || row.equipment_code}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>{row.unit}</TableCell>
                        <TableCell>{row.supplier_name || "-"}</TableCell>
                        <TableCell>{row.delivery_person_name}</TableCell>
                        <TableCell>{row.unit_price?.toLocaleString() || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {importData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          ... และอีก {importData.length - 10} รายการ
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  `นำเข้าข้อมูล ${importData.length} รายการ`
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
