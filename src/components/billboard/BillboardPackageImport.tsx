import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PreviewRow {
  package_name: string;
  media_type: string;
  billboard_old_code: string;
  status: "ok" | "error";
  message?: string;
}

export function BillboardPackageImport({ open, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["package_name", "media_type", "billboard_old_code"],
      ["Cookies Pack 1", "Cookies", "DP1154"],
      ["Cookies Pack 1", "Cookies", "DP1143"],
      ["Flyovr2.0 Pack 1.1", "Flyover2.0", "DP100"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Packages");
    XLSX.writeFile(wb, "billboard_packages_template.xlsx");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    // Fetch all billboards for validation
    const { data: billboards } = await supabase
      .from("billboards")
      .select("id, old_code")
      .limit(10000);

    const bbMap = new Map((billboards || []).map((b) => [b.old_code?.trim().toUpperCase(), b.id]));

    const previewRows: PreviewRow[] = rows.map((row) => {
      const pkgName = String(row.package_name || "").trim();
      const mediaType = String(row.media_type || "").trim();
      const oldCode = String(row.billboard_old_code || "").trim();

      if (!pkgName) return { package_name: pkgName, media_type: mediaType, billboard_old_code: oldCode, status: "error" as const, message: "ไม่มีชื่อ Package" };
      if (!oldCode) return { package_name: pkgName, media_type: mediaType, billboard_old_code: oldCode, status: "error" as const, message: "ไม่มี Old Code" };

      const found = bbMap.has(oldCode.toUpperCase());
      if (!found) return { package_name: pkgName, media_type: mediaType, billboard_old_code: oldCode, status: "error" as const, message: "ไม่พบ Old Code ในระบบ" };

      return { package_name: pkgName, media_type: mediaType, billboard_old_code: oldCode, status: "ok" as const };
    });

    setPreview(previewRows);
    setDone(false);
    setProgress(0);
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.status === "ok");
    if (validRows.length === 0) {
      toast.error("ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch billboards map
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, old_code")
        .limit(10000);
      const bbMap = new Map((billboards || []).map((b) => [b.old_code?.trim().toUpperCase(), b.id]));

      // Group by package name
      const pkgGroups = new Map<string, { media_type: string; billboard_ids: string[] }>();
      for (const row of validRows) {
        const key = row.package_name;
        if (!pkgGroups.has(key)) {
          pkgGroups.set(key, { media_type: row.media_type, billboard_ids: [] });
        }
        const bbId = bbMap.get(row.billboard_old_code.toUpperCase());
        if (bbId) pkgGroups.get(key)!.billboard_ids.push(bbId);
      }

      const totalPkgs = pkgGroups.size;
      let processed = 0;

      for (const [pkgName, info] of pkgGroups.entries()) {
        // Upsert package
        let pkgId: string;
        const { data: existing } = await supabase
          .from("billboard_packages")
          .select("id")
          .eq("name", pkgName)
          .maybeSingle();

        if (existing) {
          pkgId = existing.id;
          await supabase
            .from("billboard_packages")
            .update({ media_type: info.media_type || null, updated_at: new Date().toISOString() })
            .eq("id", pkgId);
        } else {
          const { data: newPkg, error } = await supabase
            .from("billboard_packages")
            .insert({
              name: pkgName,
              media_type: info.media_type || null,
              created_by: user?.id,
            })
            .select("id")
            .single();
          if (error) throw error;
          pkgId = newPkg.id;
        }

        // Batch insert items (skip duplicates)
        const batchSize = 50;
        for (let i = 0; i < info.billboard_ids.length; i += batchSize) {
          const batch = info.billboard_ids.slice(i, i + batchSize).map((bbId) => ({
            package_id: pkgId,
            billboard_id: bbId,
          }));
          // Use upsert to skip duplicates
          await supabase
            .from("billboard_package_items")
            .upsert(batch, { onConflict: "package_id,billboard_id", ignoreDuplicates: true });
        }

        processed++;
        setProgress(Math.round((processed / totalPkgs) * 100));
        // Yield to UI
        await new Promise((r) => setTimeout(r, 10));
      }

      toast.success(`นำเข้าสำเร็จ ${totalPkgs} Package (${validRows.length} ป้าย)`);
      setDone(true);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setPreview([]);
    setProgress(0);
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const okCount = preview.filter((r) => r.status === "ok").length;
  const errCount = preview.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Package ป้ายโฆษณาจาก Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ไฟล์ Excel ต้องมี 3 คอลัมน์: <strong>package_name</strong>, <strong>media_type</strong>, <strong>billboard_old_code</strong>
            <br />โดย 1 ป้าย = 1 แถว, Package เดียวกันใส่ชื่อซ้ำหลายแถวได้
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> ดาวน์โหลด Template
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="text-sm"
            />
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">นำเข้าเสร็จสิ้น</span>
            </div>
          )}

          {preview.length > 0 && !done && (
            <>
              <div className="flex gap-2 items-center">
                <Badge variant="default">{okCount} ถูกต้อง</Badge>
                {errCount > 0 && <Badge variant="destructive">{errCount} ผิดพลาด</Badge>}
                <div className="flex-1" />
                <Button onClick={handleImport} disabled={importing || okCount === 0}>
                  <Upload className="h-4 w-4 mr-1" /> นำเข้า {okCount} รายการ
                </Button>
              </div>

              <div className="max-h-[400px] overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package</TableHead>
                      <TableHead>Media Type</TableHead>
                      <TableHead>Old Code</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 200).map((row, i) => (
                      <TableRow key={i} className={row.status === "error" ? "bg-destructive/5" : ""}>
                        <TableCell>{row.package_name}</TableCell>
                        <TableCell>{row.media_type}</TableCell>
                        <TableCell>{row.billboard_old_code}</TableCell>
                        <TableCell>
                          {row.status === "ok" ? (
                            <Badge variant="default">OK</Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive">{row.message}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 200 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    แสดง 200 จาก {preview.length} แถว
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
