import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Images, Upload, Loader2, FileDown, Play, Square } from "lucide-react";
import { buildKeyIndex, compressImage, parseImageFileName, type TargetRecord } from "@/lib/importTemplates/imageMatcher";
import * as XLSX from "xlsx";

type Kind = "media_player" | "tool";

const CONFIG: Record<Kind, { label: string; bucket: string; table: string; fk: string; maxImages: number; publicUrl: boolean }> = {
  media_player: { label: "Media Player / จอภาพ", bucket: "media-player-images", table: "media_player_images", fk: "media_player_id", maxImages: 5, publicUrl: true },
  tool: { label: "เครื่องมือ", bucket: "tool-images", table: "tool_images", fk: "tool_id", maxImages: 4, publicUrl: false },
};

type RowStatus = "matched" | "not_found" | "ambiguous" | "too_large" | "full" | "uploaded" | "skipped" | "error";

interface PlanRow {
  file: File;
  fileName: string;
  key: string;
  sequence: number;
  target: TargetRecord | null;
  status: RowStatus;
  note: string;
}

const STATUS_LABEL: Record<RowStatus, string> = {
  matched: "พร้อมอัปโหลด",
  not_found: "ไม่พบ S/N ในระบบ",
  ambiguous: "S/N ซ้ำหลายรายการ",
  too_large: "ไฟล์ใหญ่เกิน 10MB",
  full: "รูปครบจำนวนแล้ว",
  uploaded: "อัปโหลดแล้ว",
  skipped: "มีรูปนี้อยู่แล้ว",
  error: "ผิดพลาด",
};

function statusVariant(s: RowStatus) {
  if (s === "uploaded") return "default" as const;
  if (s === "matched") return "secondary" as const;
  if (s === "skipped" || s === "full") return "outline" as const;
  return "destructive" as const;
}

export default function BulkImageImportPage() {
  const [kind, setKind] = useState<Kind>("media_player");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const stopRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg = CONFIG[kind];

  const summary = useMemo(() => {
    const acc: Record<string, number> = {};
    rows.forEach((r) => { acc[r.status] = (acc[r.status] || 0) + 1; });
    return acc;
  }, [rows]);

  const readyCount = rows.filter((r) => r.status === "matched").length;

  const loadTargets = async () => {
    if (kind === "media_player") {
      const out: any[] = [];
      let from = 0;
      const size = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("media_players")
          .select("id, code, name, serial_number_1, serial_number_2")
          .range(from, from + size - 1);
        if (error) throw error;
        if (!data?.length) break;
        out.push(...data);
        if (data.length < size) break;
        from += size;
      }
      return out.map((m) => ({
        id: m.id,
        label: `${m.code || "-"} ${m.name || ""} (${m.serial_number_1 || m.serial_number_2 || "ไม่มี S/N"})`.trim(),
        keys: [m.serial_number_1, m.serial_number_2, m.code],
      }));
    }
    const out: any[] = [];
    let from = 0;
    const size = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("tools")
        .select("id, code, name, serial_number")
        .range(from, from + size - 1);
      if (error) throw error;
      if (!data?.length) break;
      out.push(...data);
      if (data.length < size) break;
      from += size;
    }
    return out.map((t) => ({
      id: t.id,
      label: `${t.code || "-"} ${t.name || ""} (${t.serial_number || "ไม่มี S/N"})`.trim(),
      keys: [t.serial_number, t.code],
    }));
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("ไม่พบไฟล์รูปภาพในรายการที่เลือก");
      return;
    }

    setAnalyzing(true);
    try {
      const records = await loadTargets();
      const index = buildKeyIndex(records);

      // existing image counts
      const { data: existing, error: exErr } = await supabase
        .from(cfg.table as any)
        .select(`${cfg.fk}, image_url`);
      if (exErr) throw exErr;
      const counts = new Map<string, number>();
      const urls = new Set<string>();
      (existing || []).forEach((row: any) => {
        const id = row[cfg.fk];
        counts.set(id, (counts.get(id) || 0) + 1);
        if (row.image_url) urls.add(String(row.image_url));
      });

      const planned: PlanRow[] = [];
      const plannedPerTarget = new Map<string, number>();

      files
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .forEach((file) => {
          const { key, sequence } = parseImageFileName(file.name);
          const found = index.has(key) ? index.get(key) : undefined;
          let status: RowStatus = "matched";
          let note = "";
          let target: TargetRecord | null = null;

          if (found === undefined) {
            status = "not_found";
            note = `ไม่พบ ${key || file.name} ใน${cfg.label}`;
          } else if (found === null) {
            status = "ambiguous";
            note = `${key} ตรงกับหลายรายการ`;
          } else {
            target = found;
            if (file.size > 10 * 1024 * 1024) {
              status = "too_large";
              note = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
            } else if (urls.has(storagePathFor(target.id, key, sequence))) {
              status = "skipped";
              note = "มีรูปชื่อเดียวกันอยู่แล้ว";
            } else {
              const used = (counts.get(target.id) || 0) + (plannedPerTarget.get(target.id) || 0);
              if (used >= cfg.maxImages) {
                status = "full";
                note = `มีรูปครบ ${cfg.maxImages} รูปแล้ว`;
              } else {
                plannedPerTarget.set(target.id, (plannedPerTarget.get(target.id) || 0) + 1);
              }
            }
          }

          planned.push({ file, fileName: file.name, key, sequence, target, status, note });
        });

      setRows(planned);
      setProgress(0);
      toast.success(`ตรวจไฟล์แล้ว ${planned.length} ไฟล์ • จับคู่ได้ ${planned.filter((p) => p.status === "matched").length} ไฟล์`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "อ่านข้อมูลไม่สำเร็จ");
    } finally {
      setAnalyzing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  function storagePathFor(targetId: string, key: string, sequence: number) {
    const name = `bulk-${key || "img"}-${sequence}.jpg`;
    if (kind === "media_player") {
      const path = `${targetId}/${name}`;
      return supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
    }
    return `tools/${targetId}/${name}`;
  }

  const startUpload = async () => {
    stopRef.current = false;
    setUploading(true);
    const work = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.status === "matched");
    let done = 0;

    // records that already have a primary image
    const { data: primaryRows } = await supabase
      .from(cfg.table as any)
      .select(`${cfg.fk}, is_primary`)
      .eq("is_primary", true);
    const hasPrimary = new Set<string>((primaryRows || []).map((r: any) => r[cfg.fk]));

    const BATCH = 5;
    for (let b = 0; b < work.length; b += BATCH) {
      if (stopRef.current) break;
      const slice = work.slice(b, b + BATCH);
      const results = await Promise.all(
        slice.map(async ({ r, i }) => {
          try {
            const targetId = r.target!.id;
            const name = `bulk-${r.key || "img"}-${r.sequence}.jpg`;
            const path = kind === "media_player" ? `${targetId}/${name}` : `tools/${targetId}/${name}`;
            const blob = await compressImage(r.file);
            const { error: upErr } = await supabase.storage
              .from(cfg.bucket)
              .upload(path, blob, { contentType: "image/jpeg", upsert: true });
            if (upErr) throw upErr;

            const imageUrl = cfg.publicUrl
              ? supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl
              : path;

            const makePrimary = !hasPrimary.has(targetId);
            if (makePrimary) hasPrimary.add(targetId);

            const { error: insErr } = await supabase.from(cfg.table as any).insert({
              [cfg.fk]: targetId,
              image_url: imageUrl,
              display_order: r.sequence - 1,
              is_primary: makePrimary,
            } as any);
            if (insErr) throw insErr;
            return { i, status: "uploaded" as RowStatus, note: makePrimary ? "ตั้งเป็นรูปหลัก" : "" };
          } catch (e: any) {
            return { i, status: "error" as RowStatus, note: e.message || "อัปโหลดไม่สำเร็จ" };
          }
        }),
      );

      setRows((prev) => {
        const next = [...prev];
        results.forEach((res) => { next[res.i] = { ...next[res.i], status: res.status, note: res.note }; });
        return next;
      });
      done += slice.length;
      setProgress(Math.round((done / work.length) * 100));
      await new Promise((r) => setTimeout(r, 0));
    }

    setUploading(false);
    toast.success(stopRef.current ? "หยุดการอัปโหลดแล้ว" : "อัปโหลดเสร็จสิ้น");
  };

  const exportResult = () => {
    const data = rows.map((r) => ({
      ชื่อไฟล์: r.fileName,
      "S/N ที่อ่านได้": r.key,
      ลำดับรูป: r.sequence,
      รายการที่จับคู่: r.target?.label || "",
      สถานะ: STATUS_LABEL[r.status],
      หมายเหตุ: r.note,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ผลการนำเข้ารูป");
    XLSX.writeFile(wb, `import-images-${kind}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Images className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">นำเข้ารูปภาพจำนวนมาก</h1>
            <p className="text-sm text-muted-foreground">
              จับคู่รูปกับ S/N จากชื่อไฟล์อัตโนมัติ — เช่น <code>SN12345.jpg</code>, <code>SN12345_2.jpg</code>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. เลือกประเภทและไฟล์รูป</CardTitle>
            <CardDescription>
              เลือกได้ทั้งโฟลเดอร์ ระบบจะย่อรูปให้อัตโนมัติก่อนอัปโหลด (สูงสุด {cfg.maxImages} รูปต่อรายการ)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={kind} onValueChange={(v) => { setKind(v as Kind); setRows([]); setProgress(0); }}>
              <TabsList>
                <TabsTrigger value="media_player">Media Player / จอภาพ</TabsTrigger>
                <TabsTrigger value="tool">เครื่องมือ</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => inputRef.current?.click()} disabled={analyzing || uploading}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                เลือกรูปภาพ / โฟลเดอร์
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                // @ts-expect-error non-standard folder picker attributes
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {rows.length > 0 && (
                <Button variant="outline" onClick={exportResult} disabled={analyzing}>
                  <FileDown className="h-4 w-4 mr-2" /> ส่งออกผลเป็น Excel
                </Button>
              )}
            </div>

            {rows.length > 0 && (
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.entries(summary).map(([s, n]) => (
                  <Badge key={s} variant={statusVariant(s as RowStatus)}>
                    {STATUS_LABEL[s as RowStatus]}: {n}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>2. ตรวจสอบและอัปโหลด</CardTitle>
                <CardDescription>พร้อมอัปโหลด {readyCount} ไฟล์ จากทั้งหมด {rows.length} ไฟล์</CardDescription>
              </div>
              <div className="flex gap-2">
                {uploading ? (
                  <Button variant="destructive" onClick={() => { stopRef.current = true; }}>
                    <Square className="h-4 w-4 mr-2" /> หยุด
                  </Button>
                ) : (
                  <Button onClick={startUpload} disabled={readyCount === 0}>
                    <Play className="h-4 w-4 mr-2" /> เริ่มอัปโหลด ({readyCount})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(uploading || progress > 0) && <Progress value={progress} />}
              <div className="max-h-[520px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อไฟล์</TableHead>
                      <TableHead>S/N ที่อ่านได้</TableHead>
                      <TableHead>ลำดับ</TableHead>
                      <TableHead>รายการที่จับคู่</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.fileName}-${i}`}>
                        <TableCell className="font-mono text-xs">{r.fileName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.key}</TableCell>
                        <TableCell>{r.sequence}</TableCell>
                        <TableCell className="text-xs">{r.target?.label || "-"}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>รูปที่อยู่บน Google Drive</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>ติดตั้ง Google Drive for desktop → คลิกขวาที่โฟลเดอร์รูป → Offline access → Available offline</p>
            <p>จากนั้นเลือกโฟลเดอร์นั้นในปุ่มด้านบนได้เลย ไม่ต้องดาวน์โหลดทีละไฟล์</p>
          </CardContent>
        </Card>
    </div>
  );
}
