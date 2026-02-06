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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, AlertTriangle, HelpCircle, ChevronDown, SkipForward } from "lucide-react";
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
  status: "new" | "update" | "error" | "duplicate" | "warning";
  errorMessage?: string;
  rowNumber?: number;
  duplicateOfRow?: number;
}

interface BillboardImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// แปลง Technical Error เป็นข้อความภาษาไทยที่เข้าใจง่าย
const translateDatabaseError = (error: any, oldCode?: string): string => {
  const message = error?.message || error?.toString() || "";
  
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    if (oldCode) {
      return `รหัส OldCode "${oldCode}" ซ้ำกับข้อมูลในระบบ - กรุณาตรวจสอบว่ารหัสนี้มีอยู่แล้วหรือไม่`;
    }
    return "พบรหัส OldCode ซ้ำกับข้อมูลในระบบ - กรุณาตรวจสอบรหัสในไฟล์";
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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

      // Get existing old_codes from database
      const { data: existingBillboards } = await supabase
        .from("billboards")
        .select("old_code");
      
      const existingOldCodes = new Set(existingBillboards?.map(b => b.old_code).filter(Boolean) || []);

      // Step 1: ตรวจหา OldCode ที่ซ้ำกันในไฟล์ Excel พร้อมเก็บ Location
      const oldCodeDataMap = new Map<string, { rowNumber: number; location: string }>();
      const duplicateInfo = new Map<number, { 
        duplicateOfRow: number; 
        sameLocation: boolean;
        firstRowLocation: string;
      }>();

      jsonData.forEach((row: any, index: number) => {
        const oldCode = row["OldCode"] || row["old_code"] || "";
        const location = row["Location"] || row["location_name"] || "";
        const rowNumber = index + 2; // +2 เพราะ Excel Header = แถว 1, และ index เริ่มจาก 0
        
        if (oldCode) {
          if (oldCodeDataMap.has(oldCode)) {
            const firstRow = oldCodeDataMap.get(oldCode)!;
            // ตรวจสอบว่า Location ซ้ำด้วยหรือไม่
            const sameLocation = location === firstRow.location;
            duplicateInfo.set(index, {
              duplicateOfRow: firstRow.rowNumber,
              sameLocation,
              firstRowLocation: firstRow.location,
            });
          } else {
            oldCodeDataMap.set(oldCode, { rowNumber, location });
          }
        }
      });

      // Step 2: Map Excel columns to our schema and check status
      const mappedData: ImportRow[] = jsonData.map((row: any, index: number) => {
        const equipmentId = row["EquipmentID"] || row["equipment_id"] || "";
        const oldCode = row["OldCode"] || row["old_code"] || "";
        const locationName = row["Location"] || row["location_name"] || "";
        const rowNumber = index + 2;
        
        // ตรวจสอบ OldCode ว่างเปล่า (ใช้ OldCode เป็น key หลักในการตรวจสอบซ้ำ)
        if (!oldCode) {
          return {
            equipment_id: equipmentId,
            old_code: "",
            location_name: locationName,
            status: "error" as const,
            errorMessage: "ไม่มีรหัส OldCode",
            rowNumber,
          };
        }

        // ตรวจสอบว่าซ้ำในไฟล์หรือไม่
        if (duplicateInfo.has(index)) {
          const info = duplicateInfo.get(index)!;
          
          if (info.sameLocation) {
            // OldCode + Location ซ้ำกัน → Block (duplicate)
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
              location_name: locationName,
              old_code: oldCode,
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
              errorMessage: `OldCode และ Location ซ้ำกับแถวที่ ${info.duplicateOfRow} - ต้องแก้ไขไฟล์`,
              rowNumber,
              duplicateOfRow: info.duplicateOfRow,
            };
          } else {
            // OldCode ซ้ำ แต่ Location ต่างกัน → Warning (อนุญาตให้นำเข้าได้)
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
              location_name: locationName,
              old_code: oldCode,
              extra_1: row["Extra_1"] || "",
              extra_2: row["Extra_2"] || "",
              extra_3: row["Extra_3"] || "",
              target_monitoring: row["TargetMonitoring"] || "",
              bkk_upc: row["BKKUPC"] || "",
              route_monitoring: row["RouteMonitoring"] || "",
              route_install_demolish: row["RouteInstallAndDemolish"] || "",
              route_report_photo: row["RouteReportPhoto"] || "",
              route_pm: row["RoutePM"] || "",
              status: "warning" as const,
              errorMessage: `OldCode ซ้ำกับแถวที่ ${info.duplicateOfRow} (Location ต่างกัน - จะใช้แถว ${info.duplicateOfRow})`,
              rowNumber,
              duplicateOfRow: info.duplicateOfRow,
            };
          }
        }

        const isExisting = existingOldCodes.has(oldCode);
        
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
          location_name: locationName,
          old_code: oldCode,
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

  // ทำการ Import จริง (ไม่นำเข้าแถวที่มี status = warning)
  const confirmImport = async () => {
    setShowConfirmDialog(false);
    const validData = previewData.filter(row => 
      (row.status === "new" || row.status === "update") && row.old_code
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

      // Update existing records by old_code
      for (const record of updateRecords) {
        const { status, errorMessage, old_code, rowNumber, duplicateOfRow, ...updateData } = record;
        const { error: updateError } = await supabase
          .from("billboards")
          .update(updateData)
          .eq("old_code", old_code);
        
        if (updateError) throw updateError;
        updatedCount++;
      }

      toast.success(`นำเข้าสำเร็จ: เพิ่มใหม่ ${insertedCount} รายการ, อัพเดท ${updatedCount} รายการ${warningCount > 0 ? `, ข้าม ${warningCount} รายการ` : ""}`);
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
  const warningCount = previewData.filter(r => r.status === "warning").length;
  
  // Block เฉพาะ error และ duplicate (OldCode+Location ซ้ำ)
  // Warning (OldCode ซ้ำ แต่ Location ต่าง) ไม่ Block - อนุญาตให้นำเข้าได้
  const hasBlockingProblems = errorCount > 0 || duplicateCount > 0;
  const canImport = (newCount > 0 || updateCount > 0) && !hasBlockingProblems;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            นำเข้าข้อมูลจาก Excel
          </CardTitle>
          <CardDescription>
            ระบบจะตรวจสอบรหัส OldCode อัตโนมัติ - ถ้ามีแล้วจะ Update, ถ้าไม่มีจะเพิ่มใหม่
          </CardDescription>
          
          {/* Collapsible Help Section */}
          <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-4 w-4" />
                วิธีการตรวจสอบของระบบ
                <ChevronDown className={`h-4 w-4 transition-transform ${isHelpOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 p-4 bg-muted/50 rounded-lg text-sm space-y-4">
              <div>
                <strong className="text-foreground">ขั้นตอนที่ 1: ตรวจสอบ OldCode กับฐานข้อมูล</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>ถ้า OldCode มีในฐานข้อมูลแล้ว → <Badge className="bg-warning/10 text-warning hover:bg-warning/20 text-xs">อัพเดท</Badge> (ทับข้อมูลเดิม)</li>
                  <li>ถ้า OldCode ไม่มีในฐานข้อมูล → <Badge className="bg-success/10 text-success hover:bg-success/20 text-xs">เพิ่มใหม่</Badge></li>
                  <li>ถ้า OldCode ว่าง → <Badge variant="destructive" className="text-xs">ข้อผิดพลาด</Badge> (ต้องแก้ไขไฟล์)</li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground">ขั้นตอนที่ 2: ตรวจสอบ OldCode ซ้ำในไฟล์ Excel</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>ถ้า OldCode ซ้ำ แต่ Location ต่างกัน → <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs">คำเตือน</Badge> (ใช้ข้อมูลจากแถวแรก ข้ามแถวที่เหลือ)</li>
                  <li>ถ้า OldCode ซ้ำ และ Location เหมือนกัน → <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 text-xs">ซ้ำในไฟล์</Badge> (ไม่อนุญาต ต้องแก้ไขไฟล์)</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">หมายเหตุ:</strong> ระบบใช้ OldCode เป็นรหัสหลักในการระบุป้ายแต่ละตัว หากมี OldCode ซ้ำแต่ Location ต่างกัน ระบบจะถือว่าเป็นคนละป้ายและอนุญาตให้นำเข้าได้ โดยใช้ข้อมูลจากแถวแรกที่พบ
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
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
              {warningCount > 0 && (
                <div className="flex items-center gap-2">
                  <SkipForward className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-600">ข้าม (OldCode ซ้ำ): {warningCount}</span>
                </div>
              )}
              {duplicateCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">OldCode+Location ซ้ำ: {duplicateCount}</span>
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
            {/* แสดง Warning Banner สำหรับแถวที่จะข้าม */}
            {warningCount > 0 && !hasBlockingProblems && (
              <Alert className="border-amber-500 bg-amber-500/10">
                <SkipForward className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  <strong>พบ OldCode ซ้ำกัน {warningCount} รายการ (Location ต่างกัน)</strong>
                  <p className="mt-1">ระบบจะใช้ข้อมูลจากแถวแรกที่พบ และข้ามแถวที่ซ้ำ หากต้องการใช้ข้อมูลจากแถวอื่น กรุณาแก้ไขไฟล์</p>
                </AlertDescription>
              </Alert>
            )}

            {/* แสดง Error Banner ถ้าพบปัญหา Blocking */}
            {hasBlockingProblems && (
              <Alert className="bg-destructive/10 border-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>ไม่สามารถนำเข้าได้</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {duplicateCount > 0 && (
                      <li>พบ OldCode และ Location ซ้ำกัน {duplicateCount} รายการ - กรุณาลบแถวที่ซ้ำออกจากไฟล์</li>
                    )}
                    {errorCount > 0 && (
                      <li>พบข้อมูลที่มีปัญหา {errorCount} รายการ - กรุณาตรวจสอบและแก้ไข</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* แสดง Warning ถ้ามี Update จำนวนมาก */}
            {updateCount > 100 && !hasBlockingProblems && (
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
                    <TableHead>OldCode</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>EquipmentID</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead className="w-64">ปัญหา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((row, index) => (
                    <TableRow key={index} className={
                      row.status === "duplicate" || row.status === "error" 
                        ? "bg-destructive/5" 
                        : row.status === "warning" 
                          ? "bg-amber-500/5" 
                          : ""
                    }>
                      <TableCell>
                        {row.status === "new" && (
                          <Badge className="bg-success/10 text-success hover:bg-success/20">เพิ่มใหม่</Badge>
                        )}
                        {row.status === "update" && (
                          <Badge className="bg-warning/10 text-warning hover:bg-warning/20">อัพเดท</Badge>
                        )}
                        {row.status === "warning" && (
                          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">ข้าม</Badge>
                        )}
                        {row.status === "duplicate" && (
                          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">ซ้ำในไฟล์</Badge>
                        )}
                        {row.status === "error" && (
                          <Badge variant="destructive">ข้อผิดพลาด</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.old_code || "-"}</TableCell>
                      <TableCell>{row.location_name || "-"}</TableCell>
                      <TableCell>{row.equipment_id || "-"}</TableCell>
                      <TableCell className="max-w-48 truncate">{row.description || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
                  {warningCount > 0 && (
                    <li className="flex items-center gap-3 p-2 rounded-lg bg-amber-500/10">
                      <SkipForward className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <span className="text-foreground">ข้ามแถวที่ OldCode ซ้ำ: <strong>{warningCount.toLocaleString()}</strong> รายการ</span>
                    </li>
                  )}
                </ul>
                {(updateCount > 0 || warningCount > 0) && (
                  <Alert className="bg-muted/50 border-muted">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="space-y-1 text-sm">
                        {updateCount > 0 && (
                          <li>• การอัพเดทจะทับข้อมูลเดิมในระบบตาม OldCode</li>
                        )}
                        {warningCount > 0 && (
                          <li>• แถวที่มี OldCode ซ้ำจะใช้ข้อมูลจากแถวแรกเท่านั้น</li>
                        )}
                      </ul>
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
