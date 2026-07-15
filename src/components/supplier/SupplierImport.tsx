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

const HEADERS = {
  company: ["Company", "company", "company_code", "รหัสบริษัท"],
  vendor_id: ["Vendor ID", "Vendor Id", "vendor_id", "vendor_code", "Vendor Code", "รหัส Vendor"],
  tax_id: ["Tax ID", "Tax Id", "tax_id", "เลขผู้เสียภาษี"],
  name: ["Vendor Name", "vendor_name", "name", "ชื่อผู้จัดจำหน่าย"],
  description: ["Description", "description", "คำอธิบาย"],
  media_site_name: ["Media Site Name", "media_site_name", "Media Site", "ชื่อสื่อ"],
  contact_person: ["Contact Person", "contact_person", "ผู้ติดต่อ"],
  phone: ["Phone", "phone", "เบอร์โทร"],
  email: ["Email", "email", "อีเมล"],
  address: ["Address", "address", "ที่อยู่"],
  notes: ["Notes", "notes", "หมายเหตุ"],
};

function pick(row: Record<string, any>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).replace(/\u00a0/g, " ").trim();
    }
  }
  return "";
}

export function SupplierImport({ onSuccess }: SupplierImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    updated: number;
    inserted: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        Company: "ADS",
        "Vendor ID": "000006",
        "Tax ID": "0105549081490",
        "Vendor Name": "บริษัท ตัวอย่าง จำกัด",
        Description: "AL LED Strip 1.6 M, 24V CCT",
        "Media Site Name": "Metro Poster",
        "Contact Person": "คุณสมชาย",
        Phone: "02-xxx-xxxx",
        Email: "contact@example.com",
        Address: "123 ถนนตัวอย่าง กรุงเทพฯ",
        Notes: "หมายเหตุ",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor list-Store");
    XLSX.writeFile(wb, "supplier_import_template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportResult(null);
    setProgress("กำลังอ่านไฟล์...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast.error("ไฟล์ไม่มีข้อมูล");
        return;
      }

      setProgress(`พบ ${jsonData.length.toLocaleString()} แถว — กำลัง dedupe...`);
      await new Promise((r) => setTimeout(r, 10));

      // Dedupe by Vendor ID (keep latest non-empty fields)
      const dedup = new Map<string, any>();
      const errors: string[] = [];
      jsonData.forEach((row, idx) => {
        const vendorId = pick(row, HEADERS.vendor_id);
        const name = pick(row, HEADERS.name);
        if (!vendorId || !name) {
          if (idx < 20) errors.push(`แถวที่ ${idx + 2}: ไม่มี Vendor ID หรือ Vendor Name`);
          return;
        }
        const existing = dedup.get(vendorId) || {};
        dedup.set(vendorId, {
          code: vendorId,
          vendor_code: vendorId,
          company_code: pick(row, HEADERS.company) || existing.company_code || null,
          tax_id: pick(row, HEADERS.tax_id) || existing.tax_id || null,
          name: name || existing.name,
          description: pick(row, HEADERS.description) || existing.description || null,
          media_site_name: pick(row, HEADERS.media_site_name) || existing.media_site_name || null,
          contact_person: pick(row, HEADERS.contact_person) || existing.contact_person || null,
          phone: pick(row, HEADERS.phone) || existing.phone || null,
          email: pick(row, HEADERS.email) || existing.email || null,
          address: pick(row, HEADERS.address) || existing.address || null,
          notes: pick(row, HEADERS.notes) || existing.notes || null,
        });
      });

      const rows = Array.from(dedup.values());
      setProgress(`เตรียมอัปเสิร์ต ${rows.length.toLocaleString()} รายการ...`);
      await new Promise((r) => setTimeout(r, 10));

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Fetch existing to determine insert vs update counts
      const codes = rows.map((r) => r.code);
      const { data: existingRows } = await supabase
        .from("suppliers")
        .select("id, code")
        .in("code", codes);
      const existingCodes = new Set((existingRows || []).map((r) => r.code));

      const CHUNK = 200;
      let success = 0;
      let failed = 0;
      let inserted = 0;
      let updated = 0;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK).map((r) => ({ ...r, created_by: userId }));
        setProgress(`กำลังบันทึก ${Math.min(i + CHUNK, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}...`);
        const { error } = await supabase.from("suppliers").upsert(chunk, { onConflict: "code" });
        if (error) {
          failed += chunk.length;
          errors.push(`Chunk ${i}-${i + chunk.length}: ${error.message}`);
        } else {
          success += chunk.length;
          chunk.forEach((c) => (existingCodes.has(c.code) ? updated++ : inserted++));
        }
        await new Promise((r) => setTimeout(r, 5));
      }

      setImportResult({ total: rows.length, success, updated, inserted, failed, errors });
      setProgress("");

      if (success > 0) {
        toast.success(`นำเข้าสำเร็จ ${success.toLocaleString()} รายการ (ใหม่ ${inserted}, อัปเดต ${updated})`);
        onSuccess();
      }
      if (failed > 0) toast.error(`ล้มเหลว ${failed.toLocaleString()} รายการ`);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
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
          <DialogTitle>นำเข้าข้อมูลผู้จัดจำหน่าย</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              รองรับไฟล์ Vendor list-Store
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>คอลัมน์ที่รองรับ: <b>Company, Vendor ID, Tax ID, Vendor Name, Description, Media Site Name</b></li>
              <li>ระบบจะ <b>ยุบซ้ำอัตโนมัติ</b> ตาม Vendor ID (จากไฟล์ 250k+ แถว → ~80 vendor)</li>
              <li>ถ้า Vendor ID ตรงกับที่มีอยู่ ระบบจะ <b>อัปเดต</b>; ถ้าไม่ตรงจะ <b>เพิ่มใหม่</b> (Upsert)</li>
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
            <div className="text-center py-4 text-sm text-muted-foreground">
              {progress || "กำลังนำเข้า..."}
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
              {importResult.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    นำเข้าสำเร็จ {importResult.success.toLocaleString()} รายการ
                    <div className="text-xs mt-1">
                      เพิ่มใหม่ {importResult.inserted.toLocaleString()} · อัปเดต {importResult.updated.toLocaleString()}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ล้มเหลว {importResult.failed.toLocaleString()} รายการ
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
