import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TablePagination } from "@/components/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { Download, RefreshCw, Search, ShieldCheck, History, Eye, FilterX, Lock } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import {
  AUDIT_ACTION_LABEL_MAP,
  AUDIT_MODULE_LABEL,
  auditActionBadge,
  auditActionIcon,
  auditActionLabel,
  auditModuleLabel,
  auditRolesLabel,
  deviceLabel,
  summarizeChanges,
  type ActivityAuditRow,
} from "@/lib/activityAudit";

const AuditTrail = () => {
  const { hasFunctionAccess, loading: permLoading } = useFunctionPermissions();
  const { isSuperAdmin, permissions, allDepartmentNames, loading: deptLoading } = useDepartmentPermissions();
  const allowed = hasFunctionAccess("activity_audit_view");

  const myDepartments = useMemo(
    () => (permissions || []).filter((p) => p.can_view).map((p) => p.department),
    [permissions],
  );
  const departmentOptions = isSuperAdmin ? allDepartmentNames : myDepartments;
  const deptLocked = !isSuperAdmin && departmentOptions.length <= 1;

  const [rows, setRows] = useState<ActivityAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [superOnly, setSuperOnly] = useState(false);
  const [detail, setDetail] = useState<ActivityAuditRow | null>(null);

  useEffect(() => {
    if (deptLocked && departmentOptions.length === 1) setDeptFilter(departmentOptions[0]);
  }, [deptLocked, departmentOptions]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("activity_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      toast.error("โหลดประวัติไม่สำเร็จ: " + error.message);
      setLoading(false);
      return;
    }
    setRows((data as ActivityAuditRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) fetchData();
    else setLoading(false);
  }, [allowed]);

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.actor_id) map.set(r.actor_id, r.actor_name || r.actor_email || r.actor_id);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "th"));
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (moduleFilter !== "all") r = r.filter((x) => x.module === moduleFilter);
    if (actionFilter !== "all") r = r.filter((x) => x.action === actionFilter);
    if (actorFilter !== "all") r = r.filter((x) => x.actor_id === actorFilter);
    if (deptFilter !== "all") r = r.filter((x) => x.department === deptFilter);
    if (superOnly) r = r.filter((x) => x.is_super_admin_action);
    if (from) r = r.filter((x) => new Date(x.created_at) >= new Date(from + "T00:00:00"));
    if (to) r = r.filter((x) => new Date(x.created_at) <= new Date(to + "T23:59:59"));
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(
        (x) =>
          (x.doc_number || "").toLowerCase().includes(s) ||
          (x.actor_name || "").toLowerCase().includes(s) ||
          (x.actor_email || "").toLowerCase().includes(s) ||
          (x.department || "").toLowerCase().includes(s) ||
          (x.ip_address || "").toLowerCase().includes(s) ||
          auditActionLabel(x.action).toLowerCase().includes(s) ||
          (x.notes || "").toLowerCase().includes(s) ||
          JSON.stringify(x.changed_fields || {}).toLowerCase().includes(s),
      );
    }
    return r;
  }, [rows, search, moduleFilter, actionFilter, actorFilter, deptFilter, superOnly, from, to]);

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } =
    useTablePagination<ActivityAuditRow>(filtered, 20);

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("all");
    setActionFilter("all");
    setActorFilter("all");
    setDeptFilter(deptLocked && departmentOptions.length === 1 ? departmentOptions[0] : "all");
    setFrom("");
    setTo("");
    setSuperOnly(false);
  };

  const exportExcel = () => {
    const out = filtered.map((r) => ({
      "วันที่-เวลา": format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      ผู้ใช้งาน: r.actor_name || "ระบบ",
      อีเมล: r.actor_email || "",
      สิทธิ์ที่ถือ: auditRolesLabel(r.actor_roles),
      การกระทำ: auditActionLabel(r.action),
      "ฝ่าย/แผนก": r.department || "",
      โมดูล: auditModuleLabel(r.module),
      เลขที่เอกสาร: r.doc_number || "",
      "IP Address": r.ip_address || "",
      อุปกรณ์: deviceLabel(r.user_agent),
      สถานะเดิม: r.status_before || "",
      สถานะใหม่: r.status_after || "",
      "ค่าที่เปลี่ยน": summarizeChanges(r.changed_fields, 30),
      หมายเหตุ: r.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติการใช้งาน");
    XLSX.writeFile(wb, `AuditLog_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  const exportCsv = () => {
    const header = ["วันที่-เวลา", "ผู้ใช้งาน", "อีเมล", "การกระทำ", "ฝ่าย/แผนก", "โมดูล", "เลขที่เอกสาร", "IP", "อุปกรณ์", "รายละเอียด"];
    const lines = filtered.map((r) =>
      [
        format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
        r.actor_name || "ระบบ",
        r.actor_email || "",
        auditActionLabel(r.action),
        r.department || "",
        auditModuleLabel(r.module),
        r.doc_number || "",
        r.ip_address || "",
        deviceLabel(r.user_agent),
        (summarizeChanges(r.changed_fields, 30) || r.notes || "").replace(/"/g, "'"),
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AuditLog_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ส่งออก CSV สำเร็จ");
  };

  if (permLoading || deptLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">กำลังโหลด...</div>;
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="w-14 h-14 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-1">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-sm text-muted-foreground">เมนูนี้สำหรับ Super Admin และผู้ดูแลที่ได้รับสิทธิ์เท่านั้น</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          ประวัติการใช้งานระบบ
        </h1>
        <p className="text-muted-foreground flex flex-wrap items-center gap-2">
          <span>บันทึกทุกขั้นตอนของเอกสารสำคัญ — ใครทำ ถือสิทธิ์อะไร เปลี่ยนอะไร เมื่อไร</span>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> อ่านอย่างเดียว · เก็บย้อนหลัง 120 วัน
          </Badge>
          {!isSuperAdmin && <Badge variant="secondary">เห็นเฉพาะฝ่ายที่ได้รับสิทธิ์</Badge>}
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">พบ {totalItems.toLocaleString()} รายการ</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> โหลดใหม่
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button onClick={exportExcel} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Excel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="ค้นหาผู้ใช้ / การกระทำ / รายละเอียด / เลขที่เอกสาร"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

            <Select value={deptFilter} onValueChange={setDeptFilter} disabled={deptLocked}>
              <SelectTrigger><SelectValue placeholder="ฝ่าย/แผนก" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="การกระทำ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกการกระทำ</SelectItem>
                {Object.entries(AUDIT_ACTION_LABEL_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue placeholder="โมดูล" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกโมดูล</SelectItem>
                {Object.entries(AUDIT_MODULE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger><SelectValue placeholder="ผู้ใช้" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกผู้ใช้</SelectItem>
                {actors.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 border rounded-md px-3 h-10">
              <Switch id="super-only" checked={superOnly} onCheckedChange={setSuperOnly} />
              <Label htmlFor="super-only" className="text-xs cursor-pointer">เฉพาะ Super Admin</Label>
            </div>
            <Button variant="ghost" onClick={clearFilters} className="justify-start">
              <FilterX className="h-4 w-4 mr-2" /> ล้างตัวกรอง
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[1250px]">
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่-เวลา</TableHead>
                  <TableHead>ผู้ใช้งาน</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead>ฝ่าย/แผนก</TableHead>
                  <TableHead>โมดูล</TableHead>
                  <TableHead>IP / อุปกรณ์</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="text-right">ดู</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">ไม่มีประวัติ</TableCell></TableRow>
                ) : paginatedData.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(r.created_at), "dd MMM yy HH:mm", { locale: th })}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          {r.actor_name || "ระบบ"}
                          {r.is_super_admin_action && <Badge variant="secondary" className="text-[10px]">Super Admin</Badge>}
                        </span>
                        <span className="text-muted-foreground">{r.actor_email || auditRolesLabel(r.actor_roles)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <Badge variant="outline" className={cn("font-normal", auditActionBadge(r.action))}>
                        {auditActionIcon(r.action)} {auditActionLabel(r.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.department || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span>{auditModuleLabel(r.module)}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{r.doc_number || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono">{r.ip_address || "—"}</span>
                        <span className="text-muted-foreground">{deviceLabel(r.user_agent)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate">
                      {summarizeChanges(r.changed_fields) || r.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดการใช้งาน</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["วันที่-เวลา", format(new Date(detail.created_at), "dd MMM yyyy HH:mm:ss", { locale: th })],
                  ["ผู้ใช้งาน", detail.actor_name || "ระบบ"],
                  ["อีเมล", detail.actor_email || "—"],
                  ["สิทธิ์ที่ถือ", auditRolesLabel(detail.actor_roles)],
                  ["การกระทำ", auditActionLabel(detail.action)],
                  ["ฝ่าย/แผนก", detail.department || "—"],
                  ["โมดูล", auditModuleLabel(detail.module)],
                  ["เลขที่เอกสาร", detail.doc_number || "—"],
                  ["IP Address", detail.ip_address || "—"],
                  ["อุปกรณ์", deviceLabel(detail.user_agent)],
                  ["สถานะ", `${detail.status_before || "—"} → ${detail.status_after || "—"}`],
                  ["ตาราง", detail.entity_table],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <div className="break-all">{v}</div>
                  </div>
                ))}
              </div>
              {detail.notes && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">หมายเหตุ</div>
                  <div>{detail.notes}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">ข้อมูลที่เปลี่ยนแปลง (JSON)</div>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(detail.changed_fields ?? {}, null, 2)}
                </pre>
              </div>
              {detail.user_agent && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">User Agent</div>
                  <div className="font-mono text-xs break-all">{detail.user_agent}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrail;
