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
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, AlertTriangle, HelpCircle, ChevronDown } from "lucide-react";
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
  notes?: string;
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
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; phase: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all old_codes with pagination to bypass 1000 row limit
  const fetchAllOldCodes = async (): Promise<Set<string>> => {
    const allCodes: string[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("billboards")
        .select("old_code")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allCodes.push(...data.map(b => b.old_code).filter(Boolean) as string[]);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return new Set(allCodes);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Get ALL existing old_codes from database (paginated)
      const existingOldCodes = await fetchAllOldCodes();

      // Step 1: ตรวจหา OldCode + Location ที่ซ้ำกันในไฟล์ Excel
      // ใช้ OldCode + Location เป็น key - ถ้า OldCode เหมือนกันแต่ Location ต่างกัน ถือว่าคนละป้าย
      const oldCodeLocationMap = new Map<string, number>();
      const duplicateInfo = new Map<number, number>(); // index -> duplicateOfRowNumber

      jsonData.forEach((row: any, index: number) => {
        const oldCode = row["OldCode"] || row["old_code"] || "";
        const location = row["Location"] || row["location_name"] || "";
        const rowNumber = index + 2; // +2 เพราะ Excel Header = แถว 1, และ index เริ่มจาก 0
        
        if (oldCode) {
          // สร้าง key จาก OldCode + Location
          const uniqueKey = `${oldCode}|||${location}`;
          
          if (oldCodeLocationMap.has(uniqueKey)) {
            // OldCode + Location ซ้ำกัน → duplicate
            duplicateInfo.set(index, oldCodeLocationMap.get(uniqueKey)!);
          } else {
            oldCodeLocationMap.set(uniqueKey, rowNumber);
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
            errorMessage: "ช่อง OldCode ในไฟล์ Excel ว่างเปล่า - กรุณากรอกข้อมูล",
            rowNumber,
          };
        }

        // ตรวจสอบว่า OldCode + Location ซ้ำในไฟล์หรือไม่
        if (duplicateInfo.has(index)) {
          const duplicateOfRow = duplicateInfo.get(index)!;
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
            errorMessage: `OldCode และ Location ซ้ำกับแถวที่ ${duplicateOfRow} ในไฟล์ - ต้องแก้ไข`,
            rowNumber,
            duplicateOfRow,
          };
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
          notes: row["Notes"] || row["notes"] || "",
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
    const validData = previewData.filter(row => 
      (row.status === "new" || row.status === "update") && row.old_code
    );
    
    if (validData.length === 0) {
      toast.error("ไม่มีข้อมูลที่สามารถนำเข้าได้");
      return;
    }

    setIsImporting(true);
    const totalItems = validData.length;
    setImportProgress({ current: 0, total: totalItems, phase: "กำลังเตรียมข้อมูล..." });
    
    // Helper to yield to UI thread for re-render
    const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));
    await yieldToUI();
    
    try {
      const newRecords = validData.filter(row => row.status === "new");
      const updateRecords = validData.filter(row => row.status === "update");

      let processedCount = 0;
      let insertedCount = 0;
      let updatedCount = 0;
      const INSERT_BATCH_SIZE = 50;
      const UPDATE_BATCH_SIZE = 10;

      // Insert new records in batches
      if (newRecords.length > 0) {
        const insertData = newRecords.map(({ status, errorMessage, rowNumber, duplicateOfRow, ...rest }) => ({
          ...rest,
          status: "active",
        }));
        
        for (let i = 0; i < insertData.length; i += INSERT_BATCH_SIZE) {
          const batch = insertData.slice(i, i + INSERT_BATCH_SIZE);
          const { error: insertError } = await supabase
            .from("billboards")
            .insert(batch);
          
          if (insertError) throw insertError;
          insertedCount += batch.length;
          processedCount += batch.length;
          setImportProgress({ current: processedCount, total: totalItems, phase: `กำลังเพิ่มข้อมูลใหม่ (${insertedCount}/${newRecords.length})...` });
          await yieldToUI();
        }
      }

      // Update existing records in parallel batches
      if (updateRecords.length > 0) {
        for (let i = 0; i < updateRecords.length; i += UPDATE_BATCH_SIZE) {
          const batch = updateRecords.slice(i, i + UPDATE_BATCH_SIZE);
          const promises = batch.map(record => {
            const { status, errorMessage, old_code, rowNumber, duplicateOfRow, ...updateData } = record;
            return supabase
              .from("billboards")
              .update(updateData)
              .eq("old_code", old_code);
          });
          
          const results = await Promise.all(promises);
          for (const result of results) {
            if (result.error) throw result.error;
          }
          
          updatedCount += batch.length;
          processedCount += batch.length;
          setImportProgress({ current: processedCount, total: totalItems, phase: `กำลังอัพเดทข้อมูล (${updatedCount}/${updateRecords.length})...` });
          await yieldToUI();
        }
      }

      setImportProgress({ current: totalItems, total: totalItems, phase: "เสร็จสิ้น!" });
      await yieldToUI();
      toast.success(`นำเข้าสำเร็จ: เพิ่มใหม่ ${insertedCount} รายการ, อัพเดท ${updatedCount} รายการ`);
      setShowConfirmDialog(false);
      onSuccess();
    } catch (error: any) {
      const friendlyMessage = translateDatabaseError(error);
      toast.error(friendlyMessage);
      setShowConfirmDialog(false);
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(null), 3000);
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
  
  // Block เฉพาะ error และ duplicate
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
                  <li>ถ้าช่อง OldCode ในไฟล์ Excel ว่างเปล่า → <Badge variant="destructive" className="text-xs">ข้อผิดพลาด</Badge> (ต้องกรอกข้อมูลก่อน)</li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground">ขั้นตอนที่ 2: ตรวจสอบข้อมูลซ้ำในไฟล์ Excel</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>ถ้า OldCode เหมือนกัน แต่ Location ต่างกัน → <span className="text-success">อนุญาต</span> (ถือว่าเป็นป้ายคนละตัว นำเข้าทั้งคู่)</li>
                  <li>ถ้า OldCode และ Location เหมือนกันทั้งคู่ → <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 text-xs">ซ้ำในไฟล์</Badge> (ต้องลบแถวที่ซ้ำออก)</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">สรุป:</strong> ระบบใช้ OldCode + Location เป็นรหัสหลักในการระบุป้ายแต่ละตัว หากมี OldCode เหมือนกันแต่ Location ต่างกัน ระบบจะถือว่าเป็นป้ายคนละตัวและนำเข้าทั้งหมด
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
            {/* แสดง Error Banner ถ้าพบปัญหา Blocking */}
            {hasBlockingProblems && (
              <Alert className="bg-destructive/10 border-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>ไม่สามารถนำเข้าได้</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {duplicateCount > 0 && (
                      <li>พบ OldCode และ Location ซ้ำกัน {duplicateCount} รายการในไฟล์ Excel - กรุณาลบแถวที่ซ้ำออก</li>
                    )}
                    {errorCount > 0 && (
                      <li>พบช่อง OldCode ว่างเปล่า {errorCount} รายการ - กรุณากรอกข้อมูลในไฟล์ Excel</li>
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
                        : ""
                    }>
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

      {/* Progress Bar - แสดงเหนือปุ่มกด */}
      {importProgress && !showConfirmDialog && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{importProgress.phase}</span>
              <span className="text-muted-foreground font-mono">
                {importProgress.current}/{importProgress.total} ({importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%)
              </span>
            </div>
            <Progress value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} className="h-3" />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
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

      {/* Confirmation Dialog - แสดง progress ระหว่างนำเข้า */}
      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => { if (!isImporting) setShowConfirmDialog(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isImporting ? "กำลังนำเข้าข้อมูล..." : "ยืนยันการนำเข้าข้อมูล"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {!isImporting ? (
                  <>
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
                      <Alert className="bg-muted/50 border-muted">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>หมายเหตุ:</strong> การอัพเดทจะทับข้อมูลเดิมในระบบตาม OldCode
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="space-y-4 py-4">
                    {importProgress && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{importProgress.phase}</span>
                          <span className="text-muted-foreground font-mono">
                            {importProgress.current}/{importProgress.total} ({importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%)
                          </span>
                        </div>
                        <Progress value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} className="h-4" />
                      </>
                    )}
                    <p className="text-sm text-muted-foreground text-center">กรุณาอย่าปิดหน้าต่างนี้ระหว่างการนำเข้า</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isImporting && (
              <>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmImport(); }}>
                  ยืนยันนำเข้า
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillboardImport;
