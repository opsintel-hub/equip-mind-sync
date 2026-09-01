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
import { TablePagination } from "@/components/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { Download, RefreshCw, Search, ShieldCheck, History } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import {
  AUDIT_ACTION_LABEL_MAP,
  AUDIT_MODULE_LABEL,
  auditActionIcon,
  auditActionLabel,
  auditModuleLabel,
  auditRolesLabel,
  summarizeChanges,
  type ActivityAuditRow,
} from "@/lib/activityAudit";

const AuditTrail = () => {
  const { hasFunctionAccess, loading: permLoading } = useFunctionPermissions();
  const allowed = hasFunctionAccess("activity_audit_view");

  const [rows, setRows] = useState<ActivityAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [superOnly, setSuperOnly] = useState(false);

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
      if (r.actor_id) map.set(r.actor_id, r.actor_name || r.actor_id);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "th"));
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (moduleFilter !== "all") r = r.filter((x) => x.module === moduleFilter);
    if (actionFilter !== "all") r = r.filter((x) => x.action === actionFilter);
    if (actorFilter !== "all") r = r.filter((x) => x.actor_id === actorFilter);
    if (superOnly) r = r.filter((x) => x.is_super_admin_action);
    if (from) r = r.filter((x) => new Date(x.created_at) >= new Date(from + "T00:00:00"));
    if (to) r = r.filter((x) => new Date(x.created_at) <= new Date(to + "T23:59:59"));
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(
        (x) =>
          (x.doc_number || "").toLowerCase().includes(s) ||
          (x.actor_name || "").toLowerCase().includes(s) ||
          (x.department || "").toLowerCase().includes(s) ||
          (x.notes || "").toLowerCase().includes(s),
      );
    }
    return r;
  }, [rows, search, moduleFilter, actionFilter, actorFilter, superOnly, from, to]);

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } =
    useTablePagination<ActivityAuditRow>(filtered, 20);

  const exportExcel = () => {
    const out = filtered.map((r) => ({
      "วันที่-เวลา": format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      โมดูล: auditModuleLabel(r.module),
      เลขที่เอกสาร: r.doc_number || "",
      การกระทำ: auditActionLabel(r.action),
      ผู้ดำเนินการ: r.actor_name || "ระบบ",
      สิทธิ์ที่ถือ: auditRolesLabel(r.actor_roles),
      "Super Admin": r.is_super_admin_action ? "ใช่" : "ไม่ใช่",
      ฝ่าย: r.department || "",
      สถานะเดิม: r.status_before || "",
      สถานะใหม่: r.status_after || "",
      "ค่าที่เปลี่ยน": summarizeChanges(r.changed_fields, 20),
      หมายเหตุ: r.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติการใช้งาน");
    XLSX.writeFile(wb, `AuditTrail_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  if (permLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">กำลังโหลด...</div>;
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="w-14 h-14 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-1">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-sm text-muted-foreground">ต้องมีสิทธิ์ "ดูประวัติการใช้งานระบบ"</p>
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
          ประวัติการใช้งานระบบ (Audit Trail)
        </h1>
        <p className="text-muted-foreground">
          บันทึกทุกขั้นตอนของเอกสารสำคัญ — ใครทำ ถือสิทธิ์อะไร เปลี่ยนอะไร เมื่อไร (ไม่สามารถแก้ไขหรือลบได้)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              พบ {totalItems.toLocaleString()} รายการ
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="ค้นหาเลขที่/ผู้ใช้/ฝ่าย..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="โมดูล" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกโมดูล</SelectItem>
                  {Object.entries(AUDIT_MODULE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="การกระทำ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกการกระทำ</SelectItem>
                  {Object.entries(AUDIT_ACTION_LABEL_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="ผู้ใช้" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกผู้ใช้</SelectItem>
                  {actors.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
              <div className="flex items-center gap-2 border rounded-md px-3 h-10">
                <Switch id="super-only" checked={superOnly} onCheckedChange={setSuperOnly} />
                <Label htmlFor="super-only" className="text-xs cursor-pointer">เฉพาะ Super Admin</Label>
              </div>
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> โหลดใหม่
              </Button>
              <Button onClick={exportExcel} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่-เวลา</TableHead>
                  <TableHead>โมดูล</TableHead>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead>ผู้ดำเนินการ</TableHead>
                  <TableHead>สิทธิ์ที่ถือ</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ค่าที่เปลี่ยน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">ไม่มีประวัติ</TableCell></TableRow>
                ) : paginatedData.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(r.created_at), "dd MMM yy HH:mm", { locale: th })}
                    </TableCell>
                    <TableCell className="text-xs">{auditModuleLabel(r.module)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.doc_number || "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {auditActionIcon(r.action)} {auditActionLabel(r.action)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{r.actor_name || "ระบบ"}</span>
                        {r.is_super_admin_action && (
                          <Badge variant="secondary" className="text-[10px]">Super Admin</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{auditRolesLabel(r.actor_roles)}</TableCell>
                    <TableCell className="text-xs">{r.department || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.status_before ? `${r.status_before} → ` : ""}{r.status_after || "—"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate" title={summarizeChanges(r.changed_fields, 30) || r.notes || ""}>
                      {summarizeChanges(r.changed_fields) || r.notes || "—"}
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
    </div>
  );
};

export default AuditTrail;
