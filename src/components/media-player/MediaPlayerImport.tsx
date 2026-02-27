import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ImportRow {
  code: string;
  name: string;
  description?: string;
  cms_type?: string;
  specification?: string;
  serial_number_1?: string;
  serial_number_2?: string;
  brand?: string;
  unit?: string;
  unit_price?: number;
  depreciation_months?: number;
  warranty_expiry_date?: string;
  asset_code?: string;
  equipment_id_code?: string;
  notes?: string;
  status?: "valid" | "error";
  error?: string;
}

interface MediaPlayerImportProps {
  onImportSuccess: () => void;
}

const MediaPlayerImport = ({ onImportSuccess }: MediaPlayerImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        code: "MP-EXAMPLE-001",
        name: "Media Player Example",
        description: "รายละเอียด",
        cms_type: "BroadSign",
        specification: "Intel i5, 8GB RAM",
        serial_number_1: "SN123456",
        serial_number_2: "SN789012",
        brand: "Samsung",
        unit: "เครื่อง",
        unit_price: 50000,
        depreciation_months: 60,
        warranty_expiry_date: "2025-12-31",
        asset_code: "AC001",
        equipment_id_code: "EQ001",
        notes: "หมายเหตุ",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MediaPlayers");
    XLSX.writeFile(wb, "media_player_import_template.xlsx");
    toast.success("ดาวน์โหลด Template สำเร็จ");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ImportRow>(sheet);

      // Fetch CMS types for validation
      const { data: cmsTypes } = await supabase
        .from("cms_types")
        .select("id, name")
        .eq("is_active", true);

      // Fetch existing codes
      const { data: existingPlayers } = await supabase
        .from("media_players")
        .select("code");

      const existingCodes = new Set(existingPlayers?.map((p) => p.code.toLowerCase()) || []);
      const cmsTypeMap = new Map(cmsTypes?.map((c) => [c.name.toLowerCase(), c.id]) || []);

      // Validate rows
      const validatedData = jsonData.map((row) => {
        const errors: string[] = [];

        if (!row.name || !row.name.toString().trim()) {
          errors.push("ชื่อ (name) จำเป็น");
        }

        if (row.code && existingCodes.has(row.code.toLowerCase())) {
          errors.push(`รหัส ${row.code} มีอยู่แล้ว`);
        }

        if (row.cms_type && !cmsTypeMap.has(row.cms_type.toLowerCase())) {
          errors.push(`ไม่พบประเภท CMS: ${row.cms_type}`);
        }

        return {
          ...row,
          status: errors.length > 0 ? ("error" as const) : ("valid" as const),
          error: errors.join(", "),
        };
      });

      setImportData(validatedData);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("ไม่สามารถอ่านไฟล์ได้");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    const validRows = importData.filter((row) => row.status === "valid");
    if (validRows.length === 0) {
      toast.error("ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    setIsImporting(true);
    try {
      // Fetch CMS types for mapping
      const { data: cmsTypes } = await supabase
        .from("cms_types")
        .select("id, name")
        .eq("is_active", true);

      const cmsTypeMap = new Map(cmsTypes?.map((c) => [c.name.toLowerCase(), c.id]) || []);

      const recordsToInsert = validRows.map((row) => {
        const code = row.code || `MP-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        return {
          code,
          name: row.name,
          description: row.description || null,
          cms_type_id: row.cms_type ? cmsTypeMap.get(row.cms_type.toLowerCase()) || null : null,
          specification: row.specification || null,
          serial_number_1: row.serial_number_1 || null,
          serial_number_2: row.serial_number_2 || null,
          brand: row.brand || null,
          unit: row.unit || "เครื่อง",
          unit_price: row.unit_price || 0,
          depreciation_months: row.depreciation_months || 60,
          warranty_expiry_date: row.warranty_expiry_date || null,
          asset_code: row.asset_code || null,
          equipment_id_code: row.equipment_id_code || null,
          notes: row.notes || null,
          quantity: 1,
          is_asset: true,
          is_active: true,
        };
      });

      const { error } = await supabase.from("media_players").insert(recordsToInsert);

      if (error) throw error;

      toast.success(`นำเข้าสำเร็จ ${validRows.length} รายการ`);
      setIsOpen(false);
      setImportData([]);
      onImportSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = importData.filter((r) => r.status === "valid").length;
  const errorCount = importData.filter((r) => r.status === "error").length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            นำเข้าข้อมูล Media Player จาก Excel
          </DialogTitle>
          <DialogDescription>
            อัปโหลดไฟล์ Excel (.xlsx, .xls) เพื่อนำเข้าข้อมูล Media Player แบบ Bulk
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Actions */}
          <div className="flex gap-3 items-center">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              ดาวน์โหลด Template
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="media-player-import-file"
              />
              <label htmlFor="media-player-import-file">
                <Button variant="default" asChild disabled={isLoading}>
                  <span>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังอ่านไฟล์...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        เลือกไฟล์
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* Preview */}
          {importData.length > 0 && (
            <>
              <div className="flex gap-4">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  ถูกต้อง: {validCount}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    ไม่ถูกต้อง: {errorCount}
                  </Badge>
                )}
              </div>

              <div className="border rounded-md overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">สถานะ</TableHead>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>CMS</TableHead>
                      <TableHead>ยี่ห้อ</TableHead>
                      <TableHead>S/N 1</TableHead>
                      <TableHead>ข้อผิดพลาด</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.map((row, index) => (
                      <TableRow key={index} className={row.status === "error" ? "bg-destructive/10" : ""}>
                        <TableCell>
                          {row.status === "valid" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>{row.code || "-"}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.cms_type || "-"}</TableCell>
                        <TableCell>{row.brand || "-"}</TableCell>
                        <TableCell>{row.serial_number_1 || "-"}</TableCell>
                        <TableCell className="text-destructive text-sm">{row.error || ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleImport} disabled={validCount === 0 || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังนำเข้า...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                นำเข้า {validCount} รายการ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPlayerImport;
