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
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { deviceLabel, isMonitor } from "@/lib/deviceTypes";

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

const RESULT_LABEL: Record<string, { label: string; className: string; icon: any }> = {
  repaired: { label: "ซ่อมสำเร็จ", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  failed_defective: { label: "ซ่อมไม่ได้ → ของเสีย", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  failed_claim: { label: "ซ่อมไม่ได้ → ส่งเคลม", className: "bg-primary/15 text-primary border-primary/30", icon: AlertTriangle },
};

export default function RepairReport() {
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(new Date(today.getFullYear(), today.getMonth() - 5, 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(today, "yyyy-MM-dd"));
  const [deviceFilter, setDeviceFilter] = useState<"all" | "MEDIA_PLAYER" | "MONITOR">("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [serialSearch, setSerialSearch] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

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

      setRows(list);
      setPage(1);
    } catch (e: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [dateFrom, dateTo]);

  // Client-side filters
  const filtered = useMemo(() => {
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
        const hay = [r.mp_code, r.mp_name, r.mp_brand, r.assessor_name, r.document_no, r.repair_description,
          ...(r.repair_actions_snapshot || []).map((a) => a.name)].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, deviceFilter, resultFilter, scopeFilter, serialSearch, generalSearch]);

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

  const repeatUnits = useMemo(() => {
    const counts = new Map<string, { code: string; name: string; sn: string; count: number }>();
    filtered.forEach((r) => {
      if (!r.media_player_id) return;
      const key = r.media_player_id;
      const prev = counts.get(key);
      counts.set(key, {
        code: r.mp_code || "-", name: r.mp_name || "-", sn: r.serial_number || "-",
        count: (prev?.count || 0) + 1,
      });
    });
    return Array.from(counts.values()).filter((v) => v.count >= 2).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

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

  const handleExport = () => {
    const data = filtered.map((r) => ({
      "เลขที่ ASM": r.document_no,
      "วันที่ซ่อมเสร็จ": r.repair_completed_at ? format(parseISO(r.repair_completed_at), "dd/MM/yyyy HH:mm") : "-",
      "ประเภทเครื่อง": deviceLabel(r.mp_device_type),
      "รหัสอุปกรณ์": r.mp_code || "-",
      "ชื่ออุปกรณ์": r.mp_name || "-",
      "ยี่ห้อ": r.mp_brand || "-",
      "ฝ่าย": r.mp_department || "-",
      "Remote Name": r.mp_remote_name || "-",
      "S/N": r.serial_number || "-",
      "ประเภทงานซ่อม": (r.repair_scope || []).map((s) => s === "hardware" ? "Hardware" : "Software").join(", "),
      "รายการซ่อม": (r.repair_actions_snapshot || []).map((a) => a.name).join(", "),
      "รายละเอียด": r.repair_description || "",
      "ผู้ซ่อม": r.assessor_name || "-",
      "ค่าใช้จ่าย (บาท)": r.repair_cost || 0,
      "ผลการซ่อม": RESULT_LABEL[r.repair_result || ""]?.label || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานงานซ่อมเอง");
    XLSX.writeFile(wb, `repair-report-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
    toast.success("ส่งออกไฟล์เรียบร้อย");
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> โหลดใหม่
          </Button>
          <Button onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> ส่งออก Excel
          </Button>
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
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Hardware</span>
                  <span className="font-mono">{scopePie.hw} ({scopePie.hwPct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: `${scopePie.hwPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1"><Code2 className="h-3.5 w-3.5" /> Software</span>
                  <span className="font-mono">{scopePie.sw} ({scopePie.swPct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${scopePie.swPct}%` }} />
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
              <AlertTriangle className="h-4 w-4 text-warning" /> เครื่องที่ซ่อมซ้ำ (≥ 2 ครั้ง)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repeatUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">—</p>
            ) : (
              <div className="space-y-1.5">
                {repeatUnits.map((u) => (
                  <div key={u.sn} className="flex items-center justify-between text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{u.code}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">S/N: {u.sn}</div>
                    </div>
                    <Badge variant="destructive">{u.count} ครั้ง</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการงานซ่อม ({filtered.length})</CardTitle>
          <CardDescription>1 บรรทัดต่อ 1 งานซ่อม</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASM</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>อุปกรณ์</TableHead>
                  <TableHead>S/N</TableHead>
                  <TableHead>ประเภทงาน</TableHead>
                  <TableHead>รายการซ่อม</TableHead>
                  <TableHead>ผู้ซ่อม</TableHead>
                  <TableHead className="text-right">ค่าใช้จ่าย</TableHead>
                  <TableHead>ผล</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</TableCell></TableRow>
                ) : paged.map((r) => {
                  const meta = RESULT_LABEL[r.repair_result || ""];
                  const Icon = meta?.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.document_no}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.repair_completed_at ? format(parseISO(r.repair_completed_at), "dd MMM yy HH:mm", { locale: th }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isMonitor(r.mp_device_type) ? "outline" : "secondary"} className="text-[10px]">
                          {deviceLabel(r.mp_device_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.mp_code || "-"}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.mp_name || ""}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.serial_number || "-"}</TableCell>
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
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(r.repair_actions_snapshot || []).map((a) => (
                            <Badge key={a.id} variant="outline" className="text-[10px] px-1.5 py-0">{a.name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{r.assessor_name || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(r.repair_cost || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        {meta && (
                          <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        )}
                      </TableCell>
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
