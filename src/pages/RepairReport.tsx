import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/TablePagination";
import type { PageSize } from "@/hooks/useTablePagination";
import { Wrench, Download, RefreshCw, Cpu, Code2, CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";
import { ColumnChooser } from "@/components/ColumnChooser";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { deviceLabel, isMonitor } from "@/lib/deviceTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type ColKey =
  | "document_no" | "completed_at" | "device_type" | "device" | "department"
  | "serial" | "repeat" | "scope" | "actions" | "description"
  | "assessor" | "cost" | "result" | "bb_history";

const COLUMN_DEFS: { key: ColKey; label: string; locked?: boolean; defaultVisible: boolean }[] = [
  { key: "document_no",  label: "ASM",                        defaultVisible: true },
  { key: "completed_at", label: "วันที่ซ่อม",                  defaultVisible: true, locked: true },
  { key: "device_type",  label: "ประเภทเครื่อง",              defaultVisible: true },
  { key: "device",       label: "อุปกรณ์ (รหัส / ชื่อ)",       defaultVisible: true, locked: true },
  { key: "department",   label: "ฝ่าย",                        defaultVisible: true },
  { key: "serial",       label: "S/N",                        defaultVisible: true },
  { key: "repeat",       label: "ครั้งที่ซ่อม",                 defaultVisible: true },
  { key: "scope",        label: "ประเภทงาน (HW/SW)",         defaultVisible: true },
  { key: "actions",      label: "รายการซ่อม",                 defaultVisible: true },
  { key: "description",  label: "รายละเอียด",                  defaultVisible: true },
  { key: "assessor",     label: "ผู้ซ่อม",                     defaultVisible: true },
  { key: "cost",         label: "ค่าใช้จ่าย",                   defaultVisible: true },
  { key: "result",       label: "ผลการซ่อม",                  defaultVisible: true },
  { key: "bb_history",   label: "ประวัติป้ายที่เคยติดตั้ง",     defaultVisible: true },
];

const COL_LS_KEY = "repair-report.visible-cols.v1";
const defaultVisibleKeys = COLUMN_DEFS.filter((c) => c.defaultVisible).map((c) => c.key);
const loadVisibleCols = (): ColKey[] => {
  try {
    const raw = localStorage.getItem(COL_LS_KEY);
    if (!raw) return defaultVisibleKeys;
    const arr = JSON.parse(raw) as ColKey[];
    const valid = COLUMN_DEFS.map((c) => c.key);
    const kept = arr.filter((k) => valid.includes(k));
    // Always include locked columns
    COLUMN_DEFS.filter((c) => c.locked).forEach((c) => {
      if (!kept.includes(c.key)) kept.push(c.key);
    });
    return kept.length ? kept : defaultVisibleKeys;
  } catch {
    return defaultVisibleKeys;
  }
};

interface RepairRow {
  id: string;
  document_no: string;
  media_player_id: string | null;
  serial_number: string | null;
  assessor_name: string | null;
  repair_completed_at: string | null;
  repair_completed_by: string | null;
  repair_result: string | null;
  repair_status: string | null;
  repair_scope: string[] | null;
  repair_actions_snapshot: Array<{ id: string; name: string; scope: string }> | null;
  repair_description: string | null;
  repair_cost: number | null;
  outcome: string | null;
  assessed_at: string;
  // enriched
  mp_code?: string;
  mp_name?: string;
  mp_brand?: string;
  mp_department?: string;
  mp_device_type?: string;
  mp_remote_name?: string;
}

interface BillboardHist {
  billboard_id: string;
  billboard_label: string;
  installation_date: string | null;
  uninstall_date: string | null;
  uninstall_reason: string | null;
}

type RepeatBucket = "all" | "1-2" | "3-4" | "5-6" | ">6";

const bucketOf = (n: number): Exclude<RepeatBucket, "all"> => {
  if (n <= 2) return "1-2";
  if (n <= 4) return "3-4";
  if (n <= 6) return "5-6";
  return ">6";
};

const BUCKET_META: Record<Exclude<RepeatBucket, "all">, { label: string; color: string }> = {
  "1-2": { label: "ซ่อม 1-2 ครั้ง", color: "bg-success" },
  "3-4": { label: "ซ่อม 3-4 ครั้ง", color: "bg-primary" },
  "5-6": { label: "ซ่อม 5-6 ครั้ง", color: "bg-warning" },
  ">6": { label: "ซ่อม > 6 ครั้ง", color: "bg-destructive" },
};

const daysBetween = (a?: string | null, b?: string | null) => {
  if (!a) return null;
  const start = new Date(a).getTime();
  const end = b ? new Date(b).getTime() : Date.now();
  if (isNaN(start) || isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 86400000));
};

const formatDuration = (days: number | null) => {
  if (days == null) return "-";
  if (days < 30) return `${days} วัน`;
  const months = Math.floor(days / 30);
  const rest = days % 30;
  if (months < 12) return rest ? `${months} ด. ${rest} วัน` : `${months} เดือน`;
  const years = Math.floor(months / 12);
  const rm = months % 12;
  return rm ? `${years} ปี ${rm} ด.` : `${years} ปี`;
};

const RESULT_LABEL: Record<string, { label: string; className: string; icon: any }> = {
  repaired: { label: "ซ่อมสำเร็จ", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  failed_defective: { label: "ซ่อมไม่ได้ → ของเสีย", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  failed_claim: { label: "ซ่อมไม่ได้ → ส่งเคลม", className: "bg-primary/15 text-primary border-primary/30", icon: AlertTriangle },
};

export default function RepairReport() {
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [bbHistMap, setBbHistMap] = useState<Map<string, BillboardHist[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filters
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(new Date(today.getFullYear(), today.getMonth() - 5, 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(today, "yyyy-MM-dd"));
  const [deviceFilter, setDeviceFilter] = useState<"all" | "MEDIA_PLAYER" | "MONITOR">("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [repeatFilter, setRepeatFilter] = useState<RepeatBucket>("all");
  const [serialSearch, setSerialSearch] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(() => loadVisibleCols());
  useEffect(() => {
    try { localStorage.setItem(COL_LS_KEY, JSON.stringify(visibleCols)); } catch {}
  }, [visibleCols]);
  const isVisible = (k: ColKey) => visibleCols.includes(k);
  const toggleCol = (k: ColKey) => {
    const def = COLUMN_DEFS.find((c) => c.key === k);
    if (def?.locked) return;
    setVisibleCols((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assessment_logs")
        .select("id, document_no, media_player_id, serial_number, assessor_name, repair_completed_at, repair_completed_by, repair_result, repair_status, repair_scope, repair_actions_snapshot, repair_description, repair_cost, outcome, assessed_at")
        .eq("outcome", "self_repair")
        .not("repair_status", "is", null)
        .gte("repair_completed_at", dateFrom + "T00:00:00")
        .lte("repair_completed_at", dateTo + "T23:59:59")
        .order("repair_completed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      let list = ((data as unknown) as RepairRow[]) || [];

      // Enrich MP details
      const mpIds = Array.from(new Set(list.map((r) => r.media_player_id).filter(Boolean))) as string[];
      if (mpIds.length > 0) {
        const { data: mps } = await supabase
          .from("media_players")
          .select("id, code, name, brand, department, device_type, remote_name")
          .in("id", mpIds);
        const map = new Map((mps || []).map((m: any) => [m.id, m]));
        list = list.map((r) => {
          const mp = r.media_player_id ? map.get(r.media_player_id) : null;
          return mp ? {
            ...r,
            mp_code: mp.code, mp_name: mp.name, mp_brand: mp.brand,
            mp_department: mp.department, mp_device_type: mp.device_type,
            mp_remote_name: mp.remote_name,
          } : r;
        });
      }
      // Fetch billboard install history for units in view
      const hmap = new Map<string, BillboardHist[]>();
      if (mpIds.length > 0) {
        const { data: hist } = await supabase
          .from("media_player_billboard_history")
          .select("media_player_id, billboard_id, installation_date, uninstall_date, uninstall_reason")
          .in("media_player_id", mpIds)
          .order("installation_date", { ascending: false });
        const bbIds = Array.from(new Set((hist || []).map((h: any) => h.billboard_id).filter(Boolean))) as string[];
        const bbMap = new Map<string, string>();
        if (bbIds.length > 0) {
          const { data: bbs } = await supabase.from("billboards").select("id, old_code, location_name").in("id", bbIds);
          (bbs || []).forEach((b: any) => {
            bbMap.set(b.id, [b.old_code, b.location_name].filter(Boolean).join(" - ") || b.id.slice(0, 8));
          });
        }
        (hist || []).forEach((h: any) => {
          const list = hmap.get(h.media_player_id) || [];
          list.push({
            billboard_id: h.billboard_id,
            billboard_label: bbMap.get(h.billboard_id) || "(ไม่พบป้าย)",
            installation_date: h.installation_date,
            uninstall_date: h.uninstall_date,
            uninstall_reason: h.uninstall_reason,
          });
          hmap.set(h.media_player_id, list);
        });
      }
      setBbHistMap(hmap);

      setRows(list);
      setPage(1);
    } catch (e: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [dateFrom, dateTo]);

  // Base filter (everything except repeat bucket) — used to compute per-unit repeat counts
  const baseFiltered = useMemo(() => {
    return rows.filter((r) => {
      if (deviceFilter !== "all" && (r.mp_device_type || "MEDIA_PLAYER") !== deviceFilter) return false;
      if (resultFilter !== "all" && r.repair_result !== resultFilter) return false;
      if (scopeFilter !== "all" && !(r.repair_scope || []).includes(scopeFilter)) return false;
      if (serialSearch.trim()) {
        const q = serialSearch.trim().toLowerCase();
        if (!(r.serial_number || "").toLowerCase().includes(q)) return false;
      }
      if (generalSearch.trim()) {
        const q = generalSearch.trim().toLowerCase();
        const bbLabels = (bbHistMap.get(r.media_player_id || "") || []).map((h) => h.billboard_label).join(" ");
        const hay = [
          r.mp_code, r.mp_name, r.mp_brand, r.mp_department, r.mp_remote_name,
          r.assessor_name, r.repair_completed_by, r.document_no,
          r.repair_description, r.repair_result, r.serial_number,
          ...(r.repair_scope || []),
          ...(r.repair_actions_snapshot || []).map((a) => a.name),
          bbLabels,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, deviceFilter, resultFilter, scopeFilter, serialSearch, generalSearch, bbHistMap]);

  // Count per MP within baseFiltered
  const repeatCountByMp = useMemo(() => {
    const m = new Map<string, number>();
    baseFiltered.forEach((r) => {
      if (!r.media_player_id) return;
      m.set(r.media_player_id, (m.get(r.media_player_id) || 0) + 1);
    });
    return m;
  }, [baseFiltered]);

  // Apply repeat bucket filter
  const filtered = useMemo(() => {
    if (repeatFilter === "all") return baseFiltered;
    return baseFiltered.filter((r) => {
      const n = r.media_player_id ? (repeatCountByMp.get(r.media_player_id) || 0) : 0;
      return n > 0 && bucketOf(n) === repeatFilter;
    });
  }, [baseFiltered, repeatCountByMp, repeatFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const success = filtered.filter((r) => r.repair_result === "repaired").length;
    const defective = filtered.filter((r) => r.repair_result === "failed_defective").length;
    const claim = filtered.filter((r) => r.repair_result === "failed_claim").length;
    const cost = filtered.reduce((s, r) => s + (r.repair_cost || 0), 0);
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { total, success, defective, claim, cost, successRate };
  }, [filtered]);

  const actionRanking = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((r) => {
      (r.repair_actions_snapshot || []).forEach((a) => {
        counts.set(a.name, (counts.get(a.name) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  // Bucket distribution (units per bucket) — based on baseFiltered so switching bucket filter doesn't collapse the chart
  const repeatBuckets = useMemo(() => {
    const b: Record<Exclude<RepeatBucket, "all">, { units: number; sample: Array<{ code: string; sn: string; count: number }> }> = {
      "1-2": { units: 0, sample: [] },
      "3-4": { units: 0, sample: [] },
      "5-6": { units: 0, sample: [] },
      ">6":  { units: 0, sample: [] },
    };
    // Build a code/sn lookup per MP
    const info = new Map<string, { code: string; sn: string }>();
    baseFiltered.forEach((r) => {
      if (r.media_player_id && !info.has(r.media_player_id)) {
        info.set(r.media_player_id, { code: r.mp_code || "-", sn: r.serial_number || "-" });
      }
    });
    repeatCountByMp.forEach((count, mpId) => {
      const bk = bucketOf(count);
      b[bk].units += 1;
      const meta = info.get(mpId);
      if (meta && b[bk].sample.length < 5) b[bk].sample.push({ code: meta.code, sn: meta.sn, count });
    });
    Object.values(b).forEach((v) => v.sample.sort((a, z) => z.count - a.count));
    const max = Math.max(1, ...Object.values(b).map((v) => v.units));
    return { data: b, max };
  }, [baseFiltered, repeatCountByMp]);


  const scopePie = useMemo(() => {
    let hwOnly = 0, swOnly = 0, both = 0, none = 0;
    filtered.forEach((r) => {
      const hasHW = (r.repair_scope || []).includes("hardware");
      const hasSW = (r.repair_scope || []).includes("software");
      if (hasHW && hasSW) both++;
      else if (hasHW) hwOnly++;
      else if (hasSW) swOnly++;
      else none++;
    });
    const total = hwOnly + swOnly + both || 1;
    const pct = (n: number) => Math.round((n / total) * 100);
    return {
      hwOnly, swOnly, both, none,
      hwOnlyPct: pct(hwOnly), swOnlyPct: pct(swOnly), bothPct: pct(both),
      // Aggregate "involves HW" / "involves SW" (each repair counted at most once per axis)
      involvesHW: hwOnly + both,
      involvesSW: swOnly + both,
      involvesHWPct: pct(hwOnly + both),
      involvesSWPct: pct(swOnly + both),
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const buildExportRow = (r: RepairRow, includeHidden: boolean) => {
    const show = (k: ColKey) => includeHidden || isVisible(k);
    const bbHist = r.media_player_id ? (bbHistMap.get(r.media_player_id) || []) : [];
    const bbSummary = bbHist.slice(0, 4).map((h) => {
      const start = h.installation_date ? format(parseISO(h.installation_date), "dd/MM/yy") : "-";
      const end = h.uninstall_date ? format(parseISO(h.uninstall_date), "dd/MM/yy") : "ยังติดตั้งอยู่";
      const dur = formatDuration(daysBetween(h.installation_date, h.uninstall_date));
      const reason = h.uninstall_reason ? ` [เหตุ: ${h.uninstall_reason}]` : "";
      return `${h.billboard_label} — ${start} → ${end} (${dur})${reason}`;
    }).join("\n") + (bbHist.length > 4 ? `\n+ อีก ${bbHist.length - 4} รายการ` : "");
    const repeatN = r.media_player_id ? (repeatCountByMp.get(r.media_player_id) || 0) : 0;
    const row: Record<string, any> = {};
    if (show("document_no"))  row["เลขที่ ASM"] = r.document_no;
    if (show("completed_at")) row["วันที่ซ่อมเสร็จ"] = r.repair_completed_at ? format(parseISO(r.repair_completed_at), "dd/MM/yyyy HH:mm") : "-";
    if (show("device_type"))  row["ประเภทเครื่อง"] = deviceLabel(r.mp_device_type);
    if (show("device")) {
      row["รหัสอุปกรณ์"] = r.mp_code || "-";
      row["ชื่ออุปกรณ์"] = r.mp_name || "-";
      row["ยี่ห้อ"] = r.mp_brand || "-";
      row["Remote Name"] = r.mp_remote_name || "-";
    }
    if (show("department"))   row["ฝ่าย"] = r.mp_department || "-";
    if (show("serial"))       row["S/N"] = r.serial_number || "-";
    if (show("repeat"))       row["ครั้งที่ซ่อม"] = repeatN || 0;
    if (show("scope"))        row["ประเภทงานซ่อม"] = (r.repair_scope || []).map((s) => s === "hardware" ? "Hardware" : "Software").join(", ");
    if (show("actions"))      row["รายการซ่อม"] = (r.repair_actions_snapshot || []).map((a) => a.name).join(", ");
    if (show("description"))  row["รายละเอียด"] = r.repair_description || "";
    if (show("assessor"))     row["ผู้ซ่อม"] = r.assessor_name || "-";
    if (show("cost"))         row["ค่าใช้จ่าย (บาท)"] = r.repair_cost || 0;
    if (show("result"))       row["ผลการซ่อม"] = RESULT_LABEL[r.repair_result || ""]?.label || "-";
    if (show("bb_history"))   row["ประวัติป้ายที่เคยติดตั้ง"] = bbSummary || "-";
    return row;
  };

  const handleExport = (includeHidden = false) => {
    if (filtered.length === 0) return;
    const data = filtered.map((r) => buildExportRow(r, includeHidden));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานงานซ่อมเอง");
    XLSX.writeFile(wb, `repair-report_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`);
    toast.success(`ส่งออก ${data.length} รายการ${includeHidden ? " (ทุกคอลัมน์)" : ""} เรียบร้อย`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            รายงานงานซ่อมเอง (Self-Repair Report)
          </h1>
          <p className="text-muted-foreground mt-1">สถิติการซ่อมเอง — Media Player และ จอภาพ (Monitor) รวมในหน้าเดียว</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> โหลดใหม่
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-2" /> ส่งออก Excel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleExport(false)}>
                ส่งออกเฉพาะคอลัมน์ที่แสดง
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport(true)}>
                ส่งออกทุกคอลัมน์
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">งานซ่อมทั้งหมด</p>
            <p className="text-3xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">รวมค่าใช้จ่าย {stats.cost.toLocaleString()} บาท</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">ซ่อมสำเร็จ</p>
            <p className="text-3xl font-bold mt-1 text-success">{stats.success}</p>
            <p className="text-xs text-success mt-1">Success rate {stats.successRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">ซ่อมไม่ได้ → ของเสีย</p>
            <p className="text-3xl font-bold mt-1 text-destructive">{stats.defective}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">ซ่อมไม่ได้ → ส่งเคลม</p>
            <p className="text-3xl font-bold mt-1 text-primary">{stats.claim}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ตั้งแต่วันที่</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ถึงวันที่</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ประเภทเครื่อง</Label>
              <Select value={deviceFilter} onValueChange={(v: any) => setDeviceFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="MEDIA_PLAYER">Media Player</SelectItem>
                  <SelectItem value="MONITOR">จอภาพ (Monitor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ผลการซ่อม</Label>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="repaired">ซ่อมสำเร็จ</SelectItem>
                  <SelectItem value="failed_defective">ซ่อมไม่ได้ → ของเสีย</SelectItem>
                  <SelectItem value="failed_claim">ซ่อมไม่ได้ → ส่งเคลม</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ประเภทงาน</Label>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ความถี่การซ่อม (ต่อเครื่อง)</Label>
              <Select value={repeatFilter} onValueChange={(v: any) => setRepeatFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="1-2">ซ่อม 1-2 ครั้ง</SelectItem>
                  <SelectItem value="3-4">ซ่อม 3-4 ครั้ง</SelectItem>
                  <SelectItem value="5-6">ซ่อม 5-6 ครั้ง</SelectItem>
                  <SelectItem value=">6">ซ่อม &gt; 6 ครั้ง</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ค้นหา S/N</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={serialSearch} onChange={(e) => setSerialSearch(e.target.value)} placeholder="S/N..." className="pl-7" />
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">ค้นหาทั่วไป (รหัส / ชื่อ / ยี่ห้อ / รายการซ่อม / ผู้ซ่อม)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={generalSearch} onChange={(e) => setGeneralSearch(e.target.value)} placeholder="ค้นหา..." className="pl-7" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สัดส่วนประเภทงาน</CardTitle>
            <CardDescription className="text-xs">
              นับ 1 งานซ่อม = 1 หน่วย · 1 งานสามารถทำได้ทั้ง HW และ SW พร้อมกัน (นับเป็น "ทั้ง 2 ประเภท")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Breakdown: mutually exclusive buckets */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">แบ่งตามชนิดของงาน (ไม่ทับซ้อน)</p>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Hardware อย่างเดียว</span>
                    <span className="font-mono">{scopePie.hwOnly} ({scopePie.hwOnlyPct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: `${scopePie.hwOnlyPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1"><Code2 className="h-3.5 w-3.5" /> Software อย่างเดียว</span>
                    <span className="font-mono">{scopePie.swOnly} ({scopePie.swOnlyPct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${scopePie.swOnlyPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" /><Code2 className="h-3.5 w-3.5" /> ทั้ง HW และ SW
                    </span>
                    <span className="font-mono">{scopePie.both} ({scopePie.bothPct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-warning" style={{ width: `${scopePie.bothPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Aggregate: overlap allowed */}
              <div className="pt-2 border-t space-y-1 text-xs">
                <p className="font-medium text-muted-foreground mb-1">งานที่เกี่ยวข้อง (นับซ้ำได้)</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> มี Hardware</span>
                  <span className="font-mono">{scopePie.involvesHW} งาน ({scopePie.involvesHWPct}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Code2 className="h-3 w-3" /> มี Software</span>
                  <span className="font-mono">{scopePie.involvesSW} งาน ({scopePie.involvesSWPct}%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 รายการซ่อมบ่อย</CardTitle>
          </CardHeader>
          <CardContent>
            {actionRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">—</p>
            ) : (
              <div className="space-y-1.5">
                {actionRanking.map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1"><span className="text-muted-foreground mr-1">#{i + 1}</span> {name}</span>
                    <Badge variant="secondary" className="ml-2">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-warning" /> ความถี่การซ่อมต่อเครื่อง
            </CardTitle>
            <CardDescription className="text-xs">
              จำนวนเครื่องที่ถูกซ่อมในแต่ละช่วงความถี่ · คลิกเพื่อกรองตาราง
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {(Object.keys(BUCKET_META) as Array<Exclude<RepeatBucket, "all">>).map((bk) => {
                const meta = BUCKET_META[bk];
                const bd = repeatBuckets.data[bk];
                const pct = Math.round((bd.units / repeatBuckets.max) * 100);
                const active = repeatFilter === bk;
                return (
                  <button
                    key={bk}
                    onClick={() => setRepeatFilter(active ? "all" : bk)}
                    className={`w-full text-left rounded-md p-2 transition ${active ? "bg-accent ring-1 ring-primary" : "hover:bg-accent/50"}`}
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{meta.label}</span>
                      <span className="font-mono text-xs">{bd.units} เครื่อง</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className={`h-full ${meta.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    {bd.sample.length > 0 && (
                      <div className="mt-1 text-[11px] text-muted-foreground truncate">
                        เช่น {bd.sample.slice(0, 3).map((s) => `${s.code} (${s.count})`).join(", ")}
                      </div>
                    )}
                  </button>
                );
              })}
              {repeatFilter !== "all" && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setRepeatFilter("all")}>
                  ล้างตัวกรองความถี่
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>รายการงานซ่อม ({filtered.length})</CardTitle>
              <CardDescription>1 บรรทัดต่อ 1 งานซ่อม · เลื่อนแนวนอนด้วยแถบเลื่อนด้านล่าง · ใช้ลูกกลิ้งเมาส์เลื่อนขึ้น-ลงในตาราง</CardDescription>
            </div>
            <ColumnChooser
              columns={COLUMN_DEFS}
              visible={visibleCols}
              onChange={setVisibleCols}
              defaults={defaultVisibleKeys}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[640px] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  {isVisible("document_no")  && <TableHead className="whitespace-nowrap">ASM</TableHead>}
                  {isVisible("completed_at") && <TableHead className="whitespace-nowrap">วันที่ซ่อม</TableHead>}
                  {isVisible("device_type")  && <TableHead className="whitespace-nowrap">ประเภท</TableHead>}
                  {isVisible("device")       && <TableHead className="whitespace-nowrap">อุปกรณ์</TableHead>}
                  {isVisible("department")   && <TableHead className="whitespace-nowrap">ฝ่าย</TableHead>}
                  {isVisible("serial")       && <TableHead className="whitespace-nowrap">S/N</TableHead>}
                  {isVisible("repeat")       && <TableHead className="whitespace-nowrap text-center">ครั้งที่ซ่อม</TableHead>}
                  {isVisible("scope")        && <TableHead className="whitespace-nowrap">ประเภทงาน</TableHead>}
                  {isVisible("actions")      && <TableHead className="whitespace-nowrap">รายการซ่อม</TableHead>}
                  {isVisible("description")  && <TableHead className="whitespace-nowrap">รายละเอียด</TableHead>}
                  {isVisible("assessor")     && <TableHead className="whitespace-nowrap">ผู้ซ่อม</TableHead>}
                  {isVisible("cost")         && <TableHead className="whitespace-nowrap text-right">ค่าใช้จ่าย</TableHead>}
                  {isVisible("result")       && <TableHead className="whitespace-nowrap">ผล</TableHead>}
                  {isVisible("bb_history")   && <TableHead className="whitespace-nowrap min-w-[320px]">ประวัติป้ายที่เคยติดตั้ง</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={visibleCols.length} className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</TableCell></TableRow>
                ) : paged.map((r) => {
                  const meta = RESULT_LABEL[r.repair_result || ""];
                  const Icon = meta?.icon;
                  const repeatN = r.media_player_id ? (repeatCountByMp.get(r.media_player_id) || 0) : 0;
                  const repeatBk = repeatN > 0 ? bucketOf(repeatN) : null;
                  const bbHist = r.media_player_id ? (bbHistMap.get(r.media_player_id) || []) : [];
                  return (
                    <TableRow key={r.id}>
                      {isVisible("document_no") && (
                        <TableCell className="font-mono text-xs whitespace-nowrap">{r.document_no}</TableCell>
                      )}
                      {isVisible("completed_at") && (
                        <TableCell className="text-xs whitespace-nowrap">
                          {r.repair_completed_at ? format(parseISO(r.repair_completed_at), "dd MMM yy HH:mm", { locale: th }) : "-"}
                        </TableCell>
                      )}
                      {isVisible("device_type") && (
                        <TableCell>
                          <Badge variant={isMonitor(r.mp_device_type) ? "outline" : "secondary"} className="text-[10px]">
                            {deviceLabel(r.mp_device_type)}
                          </Badge>
                        </TableCell>
                      )}
                      {isVisible("device") && (
                        <TableCell>
                          <div className="font-medium text-sm whitespace-nowrap">{r.mp_code || "-"}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.mp_name || ""}</div>
                          {r.mp_brand && <div className="text-[10px] text-muted-foreground">{r.mp_brand}</div>}
                        </TableCell>
                      )}
                      {isVisible("department") && (
                        <TableCell className="text-xs whitespace-nowrap">{r.mp_department || "-"}</TableCell>
                      )}
                      {isVisible("serial") && (
                        <TableCell className="font-mono text-xs whitespace-nowrap">{r.serial_number || "-"}</TableCell>
                      )}
                      {isVisible("repeat") && (
                        <TableCell className="text-center">
                          {repeatBk ? (
                            <Badge
                              variant={repeatN > 6 ? "destructive" : repeatN > 4 ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {repeatN} ครั้ง
                            </Badge>
                          ) : "-"}
                        </TableCell>
                      )}
                      {isVisible("scope") && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(r.repair_scope || []).map((s) => (
                              <Badge key={s} variant={s === "hardware" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 gap-0.5">
                                {s === "hardware" ? <Cpu className="h-2.5 w-2.5" /> : <Code2 className="h-2.5 w-2.5" />}
                                {s === "hardware" ? "HW" : "SW"}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      {isVisible("actions") && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {(r.repair_actions_snapshot || []).map((a) => (
                              <Badge key={a.id} variant="outline" className="text-[10px] px-1.5 py-0">{a.name}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      {isVisible("description") && (
                        <TableCell>
                          <div className="text-xs text-muted-foreground max-w-[240px] whitespace-pre-line line-clamp-3">
                            {r.repair_description || "-"}
                          </div>
                        </TableCell>
                      )}
                      {isVisible("assessor") && (
                        <TableCell className="text-xs whitespace-nowrap">{r.assessor_name || "-"}</TableCell>
                      )}
                      {isVisible("cost") && (
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">{(r.repair_cost || 0).toLocaleString()}</TableCell>
                      )}
                      {isVisible("result") && (
                        <TableCell>
                          {meta && (
                            <Badge variant="outline" className={`text-[10px] gap-1 whitespace-nowrap ${meta.className}`}>
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {isVisible("bb_history") && (
                        <TableCell className="min-w-[320px]">
                          {bbHist.length === 0 ? (
                            <span className="text-xs text-muted-foreground">— ไม่พบประวัติ —</span>
                          ) : (
                            <div className="space-y-1">
                              {bbHist.slice(0, 4).map((h, i) => {
                                const dur = daysBetween(h.installation_date, h.uninstall_date);
                                const isCurrent = !h.uninstall_date;
                                return (
                                  <div key={i} className="text-[11px] leading-tight border-l-2 pl-2 py-0.5"
                                    style={{ borderColor: isCurrent ? "hsl(var(--success))" : "hsl(var(--border))" }}>
                                    <div className="font-medium truncate max-w-[300px]">{h.billboard_label}</div>
                                    <div className="text-muted-foreground">
                                      {h.installation_date ? format(parseISO(h.installation_date), "dd/MM/yy") : "-"}
                                      {" → "}
                                      {isCurrent ? <span className="text-success font-medium">ยังติดตั้งอยู่</span> :
                                        (h.uninstall_date ? format(parseISO(h.uninstall_date), "dd/MM/yy") : "-")}
                                      <span className="ml-1 font-mono">({formatDuration(dur)})</span>
                                    </div>
                                    {h.uninstall_reason && (
                                      <div className="text-muted-foreground italic truncate max-w-[300px]">เหตุ: {h.uninstall_reason}</div>
                                    )}
                                  </div>
                                );
                              })}
                              {bbHist.length > 4 && (
                                <div className="text-[10px] text-muted-foreground">+ อีก {bbHist.length - 4} รายการ</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
