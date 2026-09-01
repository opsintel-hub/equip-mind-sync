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
import { Download, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { AUDIT_ACTION_ICON, AUDIT_ACTION_LABEL, AUDIT_METHOD_LABEL, type DisposalAuditRow } from "./disposalAudit";

interface EnrichedAudit extends DisposalAuditRow {
  document_no: string;
  actor_name: string;
}

export function DisposalAuditTable() {
  const [rows, setRows] = useState<EnrichedAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selfOnly, setSelfOnly] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [auditRes, drRes, usersRes] = await Promise.all([
      (supabase as any)
        .from("defective_disposal_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase.from("defective_returns").select("id, document_no").limit(2000),
      supabase.rpc("get_users_emails" as any),
    ]);
    if (auditRes.error) {
      toast.error("โหลด Audit Log ไม่สำเร็จ: " + auditRes.error.message);
      setLoading(false);
      return;
    }
    const docMap = new Map<string, string>(((drRes.data as any[]) || []).map((d: any) => [d.id, d.document_no]));
    const userMap = new Map<string, string>(((usersRes.data as any[]) || []).map((u: any) => [u.id, u.email]));
    setRows(((auditRes.data as DisposalAuditRow[]) || []).map((r) => ({
      ...r,
      document_no: docMap.get(r.defective_return_id) || "—",
      actor_name: (r.actor_id ? userMap.get(r.actor_id) : null) || "ระบบ",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (actionFilter !== "all") r = r.filter((x) => x.action === actionFilter);
    if (selfOnly) r = r.filter((x) => x.is_self_approval);
    if (from) r = r.filter((x) => new Date(x.created_at) >= new Date(from + "T00:00:00"));
    if (to) r = r.filter((x) => new Date(x.created_at) <= new Date(to + "T23:59:59"));
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter((x) =>
        x.document_no.toLowerCase().includes(s) ||
        x.actor_name.toLowerCase().includes(s) ||
        (x.notes || "").toLowerCase().includes(s)
      );
    }
    return r;
  }, [rows, search, actionFilter, selfOnly, from, to]);

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } =
    useTablePagination<EnrichedAudit>(filtered, 20);

  const exportExcel = () => {
    const out = filtered.map((r) => ({
      "เลขที่": r.document_no,
      "วันที่-เวลา": format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      "การกระทำ": AUDIT_ACTION_LABEL[r.action] || r.action,
      "ผู้ดำเนินการ": r.actor_name,
      "สถานะเดิม": r.from_status || "",
      "สถานะใหม่": r.to_status || "",
      "วิธีจัดการ": r.disposal_method ? AUDIT_METHOD_LABEL[r.disposal_method] || r.disposal_method : "",
      "หมายเหตุ": r.notes || "",
      "Super Admin": r.is_super_admin_action ? "ใช่" : "ไม่ใช่",
      "อนุมัติข้ามชั้นโดยคนเดียวกัน": r.is_self_approval ? "ใช่" : "ไม่ใช่",
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติการดำเนินการ");
    XLSX.writeFile(wb, `AuditLog_ของเสีย_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>ประวัติการดำเนินการ (Audit)</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="ค้นหาเลขที่/ผู้ใช้..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="การกระทำ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกการกระทำ</SelectItem>
                {Object.entries(AUDIT_ACTION_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
            <div className="flex items-center gap-2 border rounded-md px-3 h-10">
              <Switch id="self-only" checked={selfOnly} onCheckedChange={setSelfOnly} />
              <Label htmlFor="self-only" className="text-xs cursor-pointer">เฉพาะอนุมัติข้ามชั้นคนเดียวกัน</Label>
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
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่</TableHead>
                <TableHead>วันที่-เวลา</TableHead>
                <TableHead>การกระทำ</TableHead>
                <TableHead>ผู้ดำเนินการ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วิธีจัดการ</TableHead>
                <TableHead>หมายเหตุ</TableHead>
                <TableHead>ธง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">ไม่มีประวัติ</TableCell></TableRow>
              ) : paginatedData.map((r) => (
                <TableRow key={r.id} className={r.is_self_approval ? "bg-warning/5" : undefined}>
                  <TableCell className="font-mono text-xs">{r.document_no}</TableCell>
                  <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM yy HH:mm", { locale: th })}</TableCell>
                  <TableCell className="text-xs">{AUDIT_ACTION_ICON[r.action] || "•"} {AUDIT_ACTION_LABEL[r.action] || r.action}</TableCell>
                  <TableCell className="text-xs">{r.actor_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.from_status ? `${r.from_status} → ` : ""}{r.to_status || "—"}</TableCell>
                  <TableCell className="text-xs">{r.disposal_method ? AUDIT_METHOD_LABEL[r.disposal_method] || r.disposal_method : "—"}</TableCell>
                  <TableCell className="text-xs max-w-[240px] truncate" title={r.notes || ""}>{r.notes || "—"}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {r.is_super_admin_action && <Badge variant="secondary" className="text-[10px]">Super Admin</Badge>}
                    {r.is_self_approval && <Badge variant="outline" className="text-[10px] border-warning text-warning">ข้ามชั้น</Badge>}
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
  );
}
