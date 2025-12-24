import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportRow {
  billboard_code: string;
  title: string;
  schedule_type: string;
  next_due_date: string;
  advance_notice_days: number;
  description?: string;
  status: "valid" | "error" | "warning";
  message?: string;
  billboard_id?: string;
}

const SCHEDULE_TYPE_MAP: Record<string, string> = {
  "รายวัน": "daily",
  "รายสัปดาห์": "weekly",
  "รายเดือน": "monthly",
  "รายไตรมาส": "quarterly",
  "รายปี": "yearly",
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
};

interface PMScheduleImportProps {
  onSuccess: () => void;
}

export function PMScheduleImport({ onSuccess }: PMScheduleImportProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);

  const downloadTemplate = () => {
    const template = [
      {
        billboard_code: "BB-001",
        title: "ตรวจสอบโครงสร้าง",
        schedule_type: "รายเดือน",
        next_due_date: "2025-01-15",
        advance_notice_days: 7,
        description: "ตรวจสอบสภาพโครงสร้างป้ายประจำเดือน",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM Schedule Template");

    // Add column widths
    ws["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 40 },
    ];

    XLSX.writeFile(wb, "pm_schedule_template.xlsx");
    toast.success("ดาวน์โหลดเทมเพลตสำเร็จ");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      // Fetch all billboards for validation
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, equipment_id, location_name");

      const billboardMap = new Map(
        billboards?.map((b) => [b.equipment_id.toLowerCase(), b]) || []
      );

      // Validate and transform data
      const rows: ImportRow[] = jsonData.map((row) => {
        const billboardCode = String(row.billboard_code || "").trim();
        const title = String(row.title || "").trim();
        const scheduleTypeRaw = String(row.schedule_type || "").trim();
        const nextDueDate = String(row.next_due_date || "").trim();
        const advanceNoticeDays = Number(row.advance_notice_days) || 7;
        const description = String(row.description || "").trim();

        const scheduleType = SCHEDULE_TYPE_MAP[scheduleTypeRaw] || scheduleTypeRaw;
        const billboardRecord = billboardMap.get(billboardCode.toLowerCase());

        // Validate
        const errors: string[] = [];
        if (!billboardCode) errors.push("ไม่มีรหัสป้าย");
        if (!billboardRecord) errors.push("ไม่พบป้ายในระบบ");
        if (!title) errors.push("ไม่มีชื่องาน PM");
        if (!SCHEDULE_TYPE_MAP[scheduleTypeRaw]) errors.push("รูปแบบ schedule_type ไม่ถูกต้อง");
        if (!nextDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
          errors.push("รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)");
        }

        return {
          billboard_code: billboardCode,
          title,
          schedule_type: scheduleType,
          next_due_date: nextDueDate,
          advance_notice_days: advanceNoticeDays,
          description,
          billboard_id: billboardRecord?.id,
          status: errors.length > 0 ? "error" : "valid",
          message: errors.length > 0 ? errors.join(", ") : "พร้อมนำเข้า",
        };
      });

      setPreviewData(rows);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("ไม่สามารถอ่านไฟล์ได้");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    const validRows = previewData.filter((row) => row.status === "valid");
    if (validRows.length === 0) {
      toast.error("ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    setImporting(true);
    try {
      const records = validRows.map((row) => ({
        billboard_id: row.billboard_id!,
        title: row.title,
        schedule_type: row.schedule_type,
        next_due_date: row.next_due_date,
        advance_notice_days: row.advance_notice_days,
        description: row.description || null,
        created_by: user?.id,
        is_active: true,
      }));

      const { error } = await supabase
        .from("pm_schedules")
        .insert(records);

      if (error) throw error;

      toast.success(`นำเข้าข้อมูลสำเร็จ ${validRows.length} รายการ`);
      setPreviewData([]);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("ไม่สามารถนำเข้าข้อมูลได้");
    } finally {
      setImporting(false);
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: "รายวัน",
      weekly: "รายสัปดาห์",
      monthly: "รายเดือน",
      quarterly: "รายไตรมาส",
      yearly: "รายปี",
    };
    return labels[type] || type;
  };

  const validCount = previewData.filter((r) => r.status === "valid").length;
  const errorCount = previewData.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          นำเข้า Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>นำเข้าแผน PM ป้ายโฆษณาจาก Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลดเทมเพลต
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="pm-excel-upload"
              />
              <label htmlFor="pm-excel-upload">
                <Button variant="default" asChild disabled={loading}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {loading ? "กำลังอ่านไฟล์..." : "เลือกไฟล์"}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {previewData.length > 0 && (
            <>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  พร้อมนำเข้า: {validCount} รายการ
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    ข้อผิดพลาด: {errorCount} รายการ
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>รหัสป้าย</TableHead>
                      <TableHead>งาน PM</TableHead>
                      <TableHead>รอบ</TableHead>
                      <TableHead>วันที่ถัดไป</TableHead>
                      <TableHead>แจ้งเตือนล่วงหน้า</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow
                        key={index}
                        className={
                          row.status === "error" ? "bg-red-50" : "bg-green-50"
                        }
                      >
                        <TableCell>
                          {row.status === "valid" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>{row.billboard_code}</TableCell>
                        <TableCell>{row.title}</TableCell>
                        <TableCell>{getScheduleTypeLabel(row.schedule_type)}</TableCell>
                        <TableCell>{row.next_due_date}</TableCell>
                        <TableCell>{row.advance_notice_days} วัน</TableCell>
                        <TableCell className="text-xs">{row.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewData([])}
                  disabled={importing}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || importing}
                >
                  {importing
                    ? "กำลังนำเข้า..."
                    : `นำเข้า ${validCount} รายการ`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
