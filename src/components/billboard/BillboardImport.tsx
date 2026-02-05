import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportRow {
  equipment_id: string;
  description?: string;
  department?: string;
  media_class?: string;
  media_segment?: string;
  region?: string;
  district?: string;
  territory?: string;
  media_type?: string;
  location_name?: string;
  old_code?: string;
  extra_1?: string;
  extra_2?: string;
  extra_3?: string;
  target_monitoring?: string;
  bkk_upc?: string;
  route_monitoring?: string;
  route_install_demolish?: string;
  route_report_photo?: string;
  route_pm?: string;
  status: "new" | "update" | "error";
  errorMessage?: string;
}

interface BillboardImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const BillboardImport = ({ onSuccess, onCancel }: BillboardImportProps) => {
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Get existing equipment_ids from database
      const { data: existingBillboards } = await supabase
        .from("billboards")
        .select("equipment_id");
      
      const existingIds = new Set(existingBillboards?.map(b => b.equipment_id) || []);

      // Map Excel columns to our schema and check status
      const mappedData: ImportRow[] = jsonData.map((row: any) => {
        const equipmentId = row["EquipmentID"] || row["equipment_id"] || "";
        
        if (!equipmentId) {
          return {
            equipment_id: "",
            status: "error" as const,
            errorMessage: "ไม่มีรหัสป้าย (EquipmentID)",
          };
        }

        const isExisting = existingIds.has(equipmentId);
        
        return {
          equipment_id: equipmentId,
          description: row["Description"] || row["description"] || "",
          department: row["Department"] || row["department"] || "",
          media_class: row["MediaClass"] || row["media_class"] || "",
          media_segment: row["MediaSegment"] || row["media_segment"] || "",
          region: row["Region"] || row["region"] || "",
          district: row["District"] || row["district"] || "",
          territory: row["Territory"] || row["territory"] || "",
          media_type: row["MediaType"] || row["media_type"] || "",
          location_name: row["Location"] || row["location_name"] || "",
          old_code: row["OldCode"] || row["old_code"] || "",
          extra_1: row["Extra_1"] || "",
          extra_2: row["Extra_2"] || "",
          extra_3: row["Extra_3"] || "",
          target_monitoring: row["TargetMonitoring"] || "",
          bkk_upc: row["BKKUPC"] || "",
          route_monitoring: row["RouteMonitoring"] || "",
          route_install_demolish: row["RouteInstallAndDemolish"] || "",
          route_report_photo: row["RouteReportPhoto"] || "",
          route_pm: row["RoutePM"] || "",
          status: isExisting ? "update" as const : "new" as const,
        };
      });

      setPreviewData(mappedData);
    } catch (error) {
      toast.error("ไม่สามารถอ่านไฟล์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const validData = previewData.filter(row => row.status !== "error" && row.equipment_id);
    if (validData.length === 0) {
      toast.error("ไม่มีข้อมูลที่สามารถนำเข้าได้");
      return;
    }

    setIsImporting(true);
    try {
      // Separate new and update records
      const newRecords = validData.filter(row => row.status === "new");
      const updateRecords = validData.filter(row => row.status === "update");

      let insertedCount = 0;
      let updatedCount = 0;

      // Insert new records
      if (newRecords.length > 0) {
        const insertData = newRecords.map(({ status, errorMessage, ...rest }) => ({
          ...rest,
          status: "active",
        }));
        
        const { error: insertError } = await supabase
          .from("billboards")
          .insert(insertData);
        
        if (insertError) throw insertError;
        insertedCount = newRecords.length;
      }

      // Update existing records
      for (const record of updateRecords) {
        const { status, errorMessage, equipment_id, ...updateData } = record;
        const { error: updateError } = await supabase
          .from("billboards")
          .update(updateData)
          .eq("equipment_id", equipment_id);
        
        if (updateError) throw updateError;
        updatedCount++;
      }

      toast.success(`นำเข้าสำเร็จ: เพิ่มใหม่ ${insertedCount} รายการ, อัพเดท ${updatedCount} รายการ`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        EquipmentID: "A05005-XXX-001",
        Description: "คำอธิบายป้าย",
        Department: "Airport Media",
        MediaClass: "Digital TV Screen at Passenger Hall",
        MediaSegment: "Digital TV Screen",
        Region: "Northern",
        District: "เมือง",
        Territory: "CHIANG MAI",
        MediaType: "Airport Digital Network",
        Location: "ตำแหน่งติดตั้ง",
        OldCode: "XXX-001",
        Extra_1: "",
        Extra_2: "",
        Extra_3: "",
        TargetMonitoring: "",
        BKKUPC: "",
        RouteMonitoring: "",
        RouteInstallAndDemolish: "",
        RouteReportPhoto: "",
        RoutePM: "",
        Status: "active",
        Notes: "หมายเหตุ",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billboards");
    XLSX.writeFile(wb, "billboard_template.xlsx");
  };

  const newCount = previewData.filter(r => r.status === "new").length;
  const updateCount = previewData.filter(r => r.status === "update").length;
  const errorCount = previewData.filter(r => r.status === "error").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            นำเข้าข้อมูลจาก Excel
          </CardTitle>
          <CardDescription>
            ระบบจะตรวจสอบรหัสป้าย (EquipmentID) อัตโนมัติ - ถ้ามีแล้วจะ Update, ถ้าไม่มีจะเพิ่มใหม่
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              ดาวน์โหลด Template
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <Upload className="w-4 h-4 mr-2" />
              {isLoading ? "กำลังอ่านไฟล์..." : "เลือกไฟล์ Excel"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ตรวจสอบข้อมูลก่อนนำเข้า ({previewData.length} รายการ)</CardTitle>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">เพิ่มใหม่: {newCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-sm">อัพเดท: {updateCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm">ข้อผิดพลาด: {errorCount}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">สถานะ</TableHead>
                    <TableHead>รหัสป้าย</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>ภูมิภาค</TableHead>
                    <TableHead>ประเภทสื่อ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {row.status === "new" && (
                          <Badge className="bg-success/10 text-success">เพิ่มใหม่</Badge>
                        )}
                        {row.status === "update" && (
                          <Badge className="bg-warning/10 text-warning">อัพเดท</Badge>
                        )}
                        {row.status === "error" && (
                          <Badge variant="destructive">{row.errorMessage}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.equipment_id || "-"}</TableCell>
                      <TableCell className="max-w-48 truncate">{row.description || "-"}</TableCell>
                      <TableCell>{row.department || "-"}</TableCell>
                      <TableCell>{row.region || "-"}</TableCell>
                      <TableCell>{row.media_type || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {previewData.length > 50 && (
              <p className="text-sm text-muted-foreground mt-2">
                แสดง 50 จาก {previewData.length} รายการ
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          ยกเลิก
        </Button>
        {previewData.length > 0 && (
          <Button 
            onClick={handleImport} 
            disabled={isImporting || (newCount === 0 && updateCount === 0)}
          >
            {isImporting ? "กำลังนำเข้า..." : `นำเข้า ${newCount + updateCount} รายการ`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BillboardImport;
