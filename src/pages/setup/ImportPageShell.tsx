import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAllRefs, type RefLookups } from "@/lib/importTemplates/refData";
import { type ValidatedRow } from "@/lib/importTemplates/validators";
import { supabase } from "@/integrations/supabase/client";

interface ImportPageShellProps {
  title: string;
  description: string;
  sheetName: string;
  templateDownloader: (refs: RefLookups) => void;
  validator: (rows: any[], refs: RefLookups) => Promise<ValidatedRow[]>;
  rpcName: "import_equipment_row" | "import_media_player_row";
  columnHints: string[]; // columns to display in preview table
}

export default function ImportPageShell({
  title, description, sheetName, templateDownloader, validator, rpcName, columnHints,
}: ImportPageShellProps) {
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [refs, setRefs] = useState<RefLookups | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [results, setResults] = useState<Array<{ rowNumber: number; success: boolean; error?: string }>>([]);

  const ensureRefs = async (): Promise<RefLookups> => {
    if (refs) return refs;
    setLoadingRefs(true);
    try {
      const r = await fetchAllRefs();
      setRefs(r);
      return r;
    } finally {
      setLoadingRefs(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const r = await ensureRefs();
      templateDownloader(r);
      toast.success("ดาวน์โหลด Template สำเร็จ");
    } catch (e: any) {
      toast.error("ดาวน์โหลด Template ไม่สำเร็จ: " + (e?.message || ""));
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResults([]);
    try {
      const r = await ensureRefs();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: false });
      const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "", raw: true });
      if (json.length === 0) {
        toast.error("ไฟล์ว่าง — ไม่มีข้อมูลให้นำเข้า");
        setRows([]);
        return;
      }
      const validated = await validator(json, r);
      setRows(validated);
      const errCount = validated.filter((v) => v.errors.length > 0).length;
      if (errCount > 0) toast.warning(`พบ ${errCount} แถวที่มี error — กรุณาแก้ไขก่อนนำเข้า`);
      else toast.success(`ตรวจสอบผ่าน ${validated.length} แถว — พร้อมนำเข้า`);
    } catch (e: any) {
      toast.error("อ่านไฟล์ไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      event.target.value = "";
    }
  };

  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const canImport = rows.length > 0 && errorCount === 0 && !importing;

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    const out: typeof results = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const { data, error } = await (supabase.rpc as any)(rpcName, { p: r.payload });
      if (error) {
        out.push({ rowNumber: r.rowNumber, success: false, error: error.message });
      } else if (data && data.success === false) {
        out.push({ rowNumber: r.rowNumber, success: false, error: data.error || "unknown" });
      } else {
        out.push({ rowNumber: r.rowNumber, success: true });
      }
      setProgress({ done: i + 1, total: rows.length });
      await new Promise((res) => setTimeout(res, 0));
    }
    setResults(out);
    setImporting(false);
    const ok = out.filter((o) => o.success).length;
    const fail = out.length - ok;
    if (fail === 0) toast.success(`นำเข้าสำเร็จ ${ok} แถว`);
    else toast.error(`สำเร็จ ${ok} แถว / ล้มเหลว ${fail} แถว`);
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          {title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ขั้นตอนที่ 1 — ดาวน์โหลด Template</CardTitle>
          <CardDescription>
            Template จะมีชีต Instructions, ชีตข้อมูลหลัก และชีตอ้างอิง (_ref_*) — กรอกข้อมูลโดยอ้างอิงค่าที่อยู่ในชีต _ref_ เท่านั้น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate} disabled={loadingRefs}>
            {loadingRefs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            ดาวน์โหลด Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ขั้นตอนที่ 2 — อัปโหลดไฟล์ที่กรอกแล้ว</CardTitle>
          <CardDescription>
            ระบบจะตรวจสอบทุกแถวก่อน — ถ้ามี error ใดๆ จะปิดปุ่ม "นำเข้า" จนกว่าจะแก้ไฟล์ Excel แล้วอัปโหลดใหม่
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            disabled={importing}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
          />

          {rows.length > 0 && (
            <Alert variant={errorCount > 0 ? "destructive" : "default"}>
              {errorCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              <AlertDescription>
                ทั้งหมด {rows.length} แถว • ผ่าน {rows.length - errorCount} แถว • Error {errorCount} แถว
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={(progress.done / progress.total) * 100} />
              <p className="text-sm text-muted-foreground">กำลังนำเข้า {progress.done} / {progress.total}</p>
            </div>
          )}

          {rows.length > 0 && !importing && (
            <Button onClick={handleImport} disabled={!canImport} size="lg">
              <Upload className="w-4 h-4 mr-2" />
              นำเข้า {rows.length - errorCount} แถว
            </Button>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview ({rows.length} แถว)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-24">สถานะ</TableHead>
                  {columnHints.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                  <TableHead>ผลลัพธ์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const res = results.find((x) => x.rowNumber === r.rowNumber);
                  return (
                    <TableRow key={r.rowNumber} className={r.errors.length > 0 ? "bg-destructive/5" : ""}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell>
                        {r.errors.length > 0 ? (
                          <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />error</Badge>
                        ) : (
                          <Badge variant="default" className="gap-1 bg-success/90"><CheckCircle className="w-3 h-3" />ok</Badge>
                        )}
                      </TableCell>
                      {columnHints.map((h) => (
                        <TableCell key={h} className="max-w-[180px] truncate">{String(r.payload[h] ?? "")}</TableCell>
                      ))}
                      <TableCell className="text-xs">
                        {r.errors.length > 0 ? (
                          <div className="text-destructive space-y-0.5">
                            {r.errors.map((e, i) => <div key={i}>• {e}</div>)}
                          </div>
                        ) : res ? (
                          res.success ? (
                            <span className="text-success">นำเข้าแล้ว</span>
                          ) : (
                            <span className="text-destructive">{res.error}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">รอนำเข้า</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
