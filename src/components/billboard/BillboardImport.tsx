import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, AlertTriangle } from "lucide-react";
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
  status: "new" | "update" | "error" | "duplicate";
  errorMessage?: string;
  rowNumber?: number;
  duplicateOfRow?: number;
}

interface BillboardImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// แปลง Technical Error เป็นข้อความภาษาไทยที่เข้าใจง่าย
const translateDatabaseError = (error: any, equipmentId?: string): string => {
  const message = error?.message || error?.toString() || "";
  
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    if (equipmentId) {
      return `รหัสป้าย "${equipmentId}" ซ้ำกับข้อมูลในระบบ - กรุณาตรวจสอบว่ารหัสนี้มีอยู่แล้วหรือไม่`;
    }
    return "พบรหัสป้ายซ้ำกับข้อมูลในระบบ - กรุณาตรวจสอบรหัสป้ายในไฟล์";
  }
  
  if (message.includes("foreign key") || message.includes("violates foreign key")) {
    return "ข้อมูลอ้างอิงไม่ถูกต้อง - กรุณาตรวจสอบค่าในช่องต่างๆ";
  }
  
  if (message.includes("null value") || message.includes("not-null constraint")) {
    return "มีข้อมูลบางช่องที่จำเป็นไม่ได้กรอก - กรุณาตรวจสอบไฟล์";
  }
  
  if (message.includes("invalid input syntax")) {
    return "รูปแบบข้อมูลไม่ถูกต้อง - กรุณาตรวจสอบรูปแบบวันที่หรือตัวเลข";
  }
  
  return `เกิดข้อผิดพลาด: ${message}`;
};

const BillboardImport = ({ onSuccess, onCancel }: BillboardImportProps) => {
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

      // Step 1: ตรวจหา equipment_id ที่ซ้ำกันในไฟล์ Excel
      const equipmentIdRowMap = new Map<string, number>();
      const duplicateInfo = new Map<number, number>(); // rowIndex -> duplicateOfRowNumber

      jsonData.forEach((row: any, index: number) => {
        const equipmentId = row["EquipmentID"] || row["equipment_id"] || "";
        const rowNumber = index + 2; // +2 เพราะ Excel Header = แถว 1, และ index เริ่มจาก 0
        
        if (equipmentId) {
          if (equipmentIdRowMap.has(equipmentId)) {
            // ซ้ำ! บันทึกว่าแถวนี้ซ้ำกับแถวไหน
            duplicateInfo.set(index, equipmentIdRowMap.get(equipmentId)!);
          } else {
            equipmentIdRowMap.set(equipmentId, rowNumber);
          }
        }
      });

      // Step 2: Map Excel columns to our schema and check status
      const mappedData: ImportRow[] = jsonData.map((row: any, index: number) => {
        const equipmentId = row["EquipmentID"] || row["equipment_id"] || "";
        const rowNumber = index + 2;
        
        // ตรวจสอบ equipment_id ว่างเปล่า
        if (!equipmentId) {
          return {
            equipment_id: "",
            status: "error" as const,
            errorMessage: "ไม่มีรหัสป้าย (EquipmentID)",
            rowNumber,
          };
        }

        // ตรวจสอบว่าซ้ำในไฟล์หรือไม่
        if (duplicateInfo.has(index)) {
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
            status: "duplicate" as const,
            errorMessage: `ซ้ำกับแถวที่ ${duplicateInfo.get(index)} ในไฟล์`,
            rowNumber,
            duplicateOfRow: duplicateInfo.get(index),
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
          rowNumber,
        };
      });

      setPreviewData(mappedData);
    } catch (error) {
      toast.error("ไม่สามารถอ่านไฟล์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  // เปิด Dialog ยืนยันก่อน Import
  const handleImportClick = () => {
    if (duplicateCount > 0 || errorCount > 0) {
      toast.error("กรุณาแก้ไขข้อมูลที่มีปัญหาในไฟล์ Excel ก่อนนำเข้า");
      return;
    }
    setShowConfirmDialog(true);
  };

  // ทำการ Import จริง
  const confirmImport = async () => {
    setShowConfirmDialog(false);
    const validData = previewData.filter(row => 
      (row.status === "new" || row.status === "update") && row.equipment_id
    );
    
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
        const insertData = newRecords.map(({ status, errorMessage, rowNumber, duplicateOfRow, ...rest }) => ({
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
        const { status, errorMessage, equipment_id, rowNumber, duplicateOfRow, ...updateData } = record;
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
      const friendlyMessage = translateDatabaseError(error);
      toast.error(friendlyMessage);
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
  const duplicateCount = previewData.filter(r => r.status === "duplicate").length;
  const hasProblems = errorCount > 0 || duplicateCount > 0;
  const canImport = (newCount > 0 || updateCount > 0) && !hasProblems;

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
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">เพิ่มใหม่: {newCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-sm">อัพเดท: {updateCount}</span>
              </div>
              {duplicateCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">ซ้ำในไฟล์: {duplicateCount}</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">ข้อผิดพลาด: {errorCount}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* แสดง Warning Banner ถ้าพบปัญหา */}
            {hasProblems && (
              <Alert className="bg-destructive/10 border-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>ไม่สามารถนำเข้าได้</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {duplicateCount > 0 && (
                      <li>พบรหัสป้ายซ้ำกัน {duplicateCount} รายการในไฟล์ Excel - กรุณาลบแถวที่ซ้ำออก</li>
                    )}
                    {errorCount > 0 && (
                      <li>พบข้อมูลที่มีปัญหา {errorCount} รายการ - กรุณาตรวจสอบและแก้ไข</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* แสดง Warning ถ้ามี Update จำนวนมาก */}
            {updateCount > 100 && !hasProblems && (
              <Alert className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  <strong>คำเตือน:</strong> มีข้อมูลที่จะถูกอัพเดท {updateCount} รายการ - การอัพเดทจะทับข้อมูลเดิมในระบบ
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-28">สถานะ</TableHead>
                    <TableHead>รหัสป้าย</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>ภูมิภาค</TableHead>
                    <TableHead className="w-48">ปัญหา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((row, index) => (
                    <TableRow key={index} className={row.status === "duplicate" || row.status === "error" ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {row.status === "new" && (
                          <Badge className="bg-success/10 text-success hover:bg-success/20">เพิ่มใหม่</Badge>
                        )}
                        {row.status === "update" && (
                          <Badge className="bg-warning/10 text-warning hover:bg-warning/20">อัพเดท</Badge>
                        )}
                        {row.status === "duplicate" && (
                          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">ซ้ำในไฟล์</Badge>
                        )}
                        {row.status === "error" && (
                          <Badge variant="destructive">ข้อผิดพลาด</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.equipment_id || "-"}</TableCell>
                      <TableCell className="max-w-48 truncate">{row.description || "-"}</TableCell>
                      <TableCell>{row.department || "-"}</TableCell>
                      <TableCell>{row.region || "-"}</TableCell>
                      <TableCell className="text-sm text-destructive">
                        {row.errorMessage || "-"}
                      </TableCell>
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
            onClick={handleImportClick} 
            disabled={isImporting || !canImport}
          >
            {isImporting ? "กำลังนำเข้า..." : `นำเข้า ${newCount + updateCount} รายการ`}
          </Button>
        )}
      </div>

      {/* Confirmation Dialog ก่อน Import */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการนำเข้าข้อมูล</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>คุณกำลังจะดำเนินการดังนี้:</p>
                <ul className="space-y-3">
                  {newCount > 0 && (
                    <li className="flex items-center gap-3 p-2 rounded-lg bg-success/10">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-foreground">เพิ่มป้ายใหม่: <strong>{newCount.toLocaleString()}</strong> รายการ</span>
                    </li>
                  )}
                  {updateCount > 0 && (
                    <li className="flex items-center gap-3 p-2 rounded-lg bg-warning/10">
                      <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                      <span className="text-foreground">อัพเดทป้ายที่มีอยู่: <strong>{updateCount.toLocaleString()}</strong> รายการ</span>
                    </li>
                  )}
                </ul>
                {updateCount > 0 && (
                  <Alert className="bg-warning/10 border-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>หมายเหตุ:</strong> การอัพเดทจะทับข้อมูลเดิมในระบบ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              ยืนยันนำเข้า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillboardImport;
