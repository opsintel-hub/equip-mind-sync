import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SupplierImportProps {
  onSuccess: () => void;
}

interface ImportRow {
  code: string;
  vendor_code?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function SupplierImport({ onSuccess }: SupplierImportProps) {
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
        "รหัสผู้จัดจำหน่าย (code)*": "SUP-001",
        "รหัส Vendor (vendor_code)": "VD-001",
        "ชื่อผู้จัดจำหน่าย (name)*": "บริษัท ตัวอย่าง จำกัด",
        "ผู้ติดต่อ (contact_person)": "คุณสมชาย",
        "เบอร์โทร (phone)": "02-xxx-xxxx",
        "อีเมล (email)": "contact@example.com",
        "ที่อยู่ (address)": "123 ถนนตัวอย่าง กรุงเทพฯ",
        "หมายเหตุ (notes)": "หมายเหตุเพิ่มเติม",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");

    // Set column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 40 },
      { wch: 30 },
    ];

    XLSX.writeFile(wb, "supplier_import_template.xlsx");
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
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as Record<string, any>;
        const rowNum = i + 2; // Excel row number (1-based + header)

        // Map Thai/English column names to database fields
        const code = row["รหัสผู้จัดจำหน่าย (code)*"] || row["code"];
        const vendorCode = row["รหัส Vendor (vendor_code)"] || row["vendor_code"];
        const name = row["ชื่อผู้จัดจำหน่าย (name)*"] || row["name"];
        const contactPerson = row["ผู้ติดต่อ (contact_person)"] || row["contact_person"];
        const phone = row["เบอร์โทร (phone)"] || row["phone"];
        const email = row["อีเมล (email)"] || row["email"];
        const address = row["ที่อยู่ (address)"] || row["address"];
        const notes = row["หมายเหตุ (notes)"] || row["notes"];

        // Validate required fields
        if (!code || !name) {
          errors.push(`แถวที่ ${rowNum}: ต้องระบุ รหัสผู้จัดจำหน่าย และ ชื่อ`);
          failedCount++;
          continue;
        }

        const supplierData: ImportRow = {
          code: String(code).trim(),
          vendor_code: vendorCode ? String(vendorCode).trim() : undefined,
          name: String(name).trim(),
          contact_person: contactPerson ? String(contactPerson).trim() : undefined,
          phone: phone ? String(phone).trim() : undefined,
          email: email ? String(email).trim() : undefined,
          address: address ? String(address).trim() : undefined,
          notes: notes ? String(notes).trim() : undefined,
        };

        // Check for duplicate code
        const { data: existing } = await supabase
          .from("suppliers")
          .select("id")
          .eq("code", supplierData.code)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("suppliers")
            .update({
              ...supplierData,
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
          // Insert new
          const { error } = await supabase.from("suppliers").insert({
            ...supplierData,
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
          <DialogTitle>นำเข้าข้อมูลผู้จัดจำหน่าย</DialogTitle>
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
