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
import { templateVersion, verifyWorkbook, TEMPLATE_DEFS, type TemplateKind, type TemplateCheck } from "@/lib/importTemplates/templateVersion";
import { parseCode, syncPrefixCounters } from "@/lib/codePrefix";

const PREFIX_TABLE = {
  equipment: "equipment_code_prefixes",
  media_player: "media_player_code_prefixes",
  tool: "tool_code_prefixes",
} as const;

interface PrefixLine {
  prefix: string;
  rows: number;
  maxNum: number;
  existing: boolean;
  currentNext: number | null;
}

interface ImportPageShellProps {
  title: string;
  description: string;
  sheetName: string;
  templateKind: TemplateKind;
  templateDownloader: (refs: RefLookups) => void;
  validator: (rows: any[], refs: RefLookups) => Promise<ValidatedRow[]>;
  rpcName: "import_equipment_row" | "import_media_player_row" | "import_tool_row";
  columnHints: string[]; // columns to display in preview table
}

export default function ImportPageShell({
  title, description, sheetName, templateKind, templateDownloader, validator, rpcName, columnHints,
}: ImportPageShellProps) {
  const [check, setCheck] = useState<TemplateCheck | null>(null);
  const currentVersion = templateVersion(templateKind);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [refs, setRefs] = useState<RefLookups | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [results, setResults] = useState<Array<{ rowNumber: number; success: boolean; error?: string }>>([]);
  const [prefixLines, setPrefixLines] = useState<PrefixLine[]>([]);

  const buildPrefixSummary = async (validated: ValidatedRow[]) => {
    const agg = new Map<string, { rows: number; maxNum: number }>();
    validated.forEach((r) => {
      const parsed = parseCode(String(r.payload.code ?? ""));
      if (!parsed) return;
      const cur = agg.get(parsed.prefix) || { rows: 0, maxNum: 0 };
      agg.set(parsed.prefix, { rows: cur.rows + 1, maxNum: Math.max(cur.maxNum, parsed.num) });
    });
    if (agg.size === 0) { setPrefixLines([]); return; }
    const { data } = await supabase.from(PREFIX_TABLE[templateKind]).select("prefix,next_number");
    const existing = new Map((data || []).map((d: any) => [d.prefix, d.next_number as number]));
    setPrefixLines(
      Array.from(agg.entries())
        .map(([prefix, v]) => ({
          prefix,
          rows: v.rows,
          maxNum: v.maxNum,
          existing: existing.has(prefix),
          currentNext: existing.get(prefix) ?? null,
        }))
        .sort((a, b) => a.prefix.localeCompare(b.prefix))
    );
  };

  const copyIssues = async () => {
    const text = rows
      .filter((r) => r.errors.length > 0)
      .map((r) => `แถวที่ ${r.rowNumber} (code: ${r.payload.code || "-"}) → ${r.errors.join(" | ")}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("คัดลอกรายการปัญหาแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

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
    setCheck(null);
    setPrefixLines([]);
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
      const headerRow = (XLSX.utils.sheet_to_json<any>(ws, { header: 1 })[0] || []) as any[];
      const fileHeaders = headerRow.map((h) => String(h ?? "").trim()).filter(Boolean);
      const verdict = verifyWorkbook(wb, templateKind, fileHeaders);
      setCheck(verdict);
      if (verdict.blocking) {
        setRows([]);
        toast.error(verdict.message);
        return;
      }
      if (verdict.status !== "ok") toast.warning(verdict.message);
      const validated = await validator(json, r);
      setRows(validated);
      await buildPrefixSummary(validated);
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
    if (ok > 0) {
      try {
        await syncPrefixCounters(templateKind);
        await buildPrefixSummary(rows);
      } catch (e: any) {
        toast.warning("นำเข้าสำเร็จ แต่ปรับเลขรัน Prefix ไม่สำเร็จ: " + (e?.message || ""));
      }
    }
    if (fail === 0) toast.success(`นำเข้าสำเร็จ ${ok} แถว — ปรับเลขรัน Prefix ให้อัตโนมัติแล้ว`);
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
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            ขั้นตอนที่ 1 — ดาวน์โหลด Template
            <Badge variant="outline">เวอร์ชันล่าสุด {currentVersion}</Badge>
            <Badge variant="secondary">{TEMPLATE_DEFS[templateKind].headers.length} คอลัมน์</Badge>
          </CardTitle>
          <CardDescription>
            Template สร้างสดจากโครงสร้างข้อมูลปัจจุบันทุกครั้งที่กดดาวน์โหลด (ชีต Instructions, ชีตข้อมูลหลัก, ชีตอ้างอิง _ref_* และชีตเวอร์ชัน _template_meta)
            — ระบบจะตรวจเวอร์ชันของไฟล์ที่อัปโหลดเสมอ ถ้าใช้ไฟล์เก่าที่คอลัมน์ไม่ตรงจะถูกบล็อกก่อนนำเข้า
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate} disabled={loadingRefs}>
            {loadingRefs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            ดาวน์โหลด Template นำเข้าข้อมูล (อัพเดทล่าสุด)
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

          {check && (
            <Alert variant={check.blocking ? "destructive" : "default"}>
              {check.status === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <AlertDescription className="space-y-1">
                <div>
                  <strong>ตรวจสอบเวอร์ชัน Template:</strong> {check.message}
                </div>
                <div className="text-xs text-muted-foreground">
                  ไฟล์: {check.fileVersion || "ไม่ระบุ"} • ล่าสุด: {check.currentVersion}
                  {check.extra.length > 0 && ` • คอลัมน์เกิน: ${check.extra.join(", ")}`}
                </div>
                {check.blocking && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={handleDownloadTemplate}>
                    <Download className="w-4 h-4 mr-2" /> ดาวน์โหลด Template อัพเดทล่าสุด
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <Alert variant={errorCount > 0 ? "destructive" : "default"}>
              {errorCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              <AlertDescription>
                ทั้งหมด {rows.length} แถว • ผ่าน {rows.length - errorCount} แถว • Error {errorCount} แถว
              </AlertDescription>
            </Alert>
          )}

          {prefixLines.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-sm font-medium">สรุป Prefix รหัสในไฟล์</div>
              <ul className="text-sm space-y-1">
                {prefixLines.map((p) => (
                  <li key={p.prefix} className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{p.prefix}</Badge>
                    <span className="text-muted-foreground">{p.rows} แถว</span>
                    {p.existing ? (
                      <span className="text-muted-foreground">
                        • มีในทะเบียนแล้ว (เลขรันปัจจุบัน {String(p.currentNext ?? 1).padStart(4, "0")})
                        {(p.currentNext ?? 1) <= p.maxNum && ` → จะปรับเป็น ${String(p.maxNum + 1).padStart(4, "0")}`}
                      </span>
                    ) : (
                      <span className="text-warning-foreground">
                        • ยังไม่มีในทะเบียน — ระบบจะสร้างให้อัตโนมัติ แล้วตั้งเลขรันถัดไปเป็น {String(p.maxNum + 1).padStart(4, "0")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                รูปแบบรหัสมาตรฐานของระบบคือ "PREFIX 0000" (เว้นวรรค) — รหัสเดิมที่ไม่เว้นวรรคยังใช้งานได้ตามปกติ
              </p>
            </div>
          )}

          {errorCount > 0 && (
            <div className="rounded-lg border border-destructive/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-destructive">
                  รายการที่ต้องแก้ก่อนนำเข้า ({errorCount} แถว)
                </div>
                <Button size="sm" variant="outline" onClick={copyIssues}>คัดลอกรายการปัญหา</Button>
              </div>
              <ul className="text-xs space-y-1 max-h-60 overflow-y-auto">
                {rows.filter((r) => r.errors.length > 0).map((r) => (
                  <li key={r.rowNumber}>
                    <span className="font-medium">แถวที่ {r.rowNumber}</span>
                    {" "}(code: {String(r.payload.code || "-")}) — {r.errors.join(" | ")}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                วิธีแก้: เปิดไฟล์ Excel ไปที่แถวตามเลขด้านบน แก้ค่าตามข้อความที่ระบุ (เช่น เปลี่ยนรหัสที่ซ้ำ หรือแก้ค่าที่ไม่อยู่ในชีตอ้างอิง) แล้วอัปโหลดไฟล์ใหม่อีกครั้ง
              </p>
            </div>
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
