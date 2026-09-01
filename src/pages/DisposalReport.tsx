import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/TablePagination";
import type { PageSize } from "@/hooks/useTablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { ColumnChooser } from "@/components/ColumnChooser";
import { FileBarChart2, Download, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";

interface DisposalRow {
  id: string;
  document_no: string;
  is_media_player: boolean;
  quantity: number;
  reason: string | null;
  source_type: string;
  dispose_status: string;
  swap_request_id: string | null;
  disposal_method: string | null;
  created_at: string;
  is_expired: boolean;
  total_value: number | null;
  unit_price_snapshot: number | null;
  reporter_department: string | null;
  l1_approved_at: string | null;
  l2_approved_at: string | null;
  finance_ack_at: string | null;
  equipment?: { code: string; name: string; brand: string | null; department: string | null } | null;
  media_player?: { code: string; name: string; department: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_disposal_review: "รออนุมัติชั้น 1",
  l1_approved: "รออนุมัติชั้น 2",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  completed: "ดำเนินการเสร็จ",
};

const METHOD_LABEL: Record<string, string> = {
  destroy: "ทำลายทิ้ง",
  sell_scrap: "จำหน่ายเป็นซาก",
  csr: "นำไปทำ CSR",
  repair_return: "ซ่อมและคืนคลัง",
};

type ColKey =
  | "document_no" | "created_at" | "code" | "name" | "type" | "department"
  | "qty" | "unit_price" | "total_value" | "source" | "method" | "status"
  | "l1_at" | "l2_at" | "fin_at";

const COLUMN_DEFS: { key: ColKey; label: string; locked?: boolean; defaultVisible: boolean }[] = [
  { key: "document_no", label: "เลขที่", defaultVisible: true, locked: true },
  { key: "created_at", label: "วันที่แจ้ง", defaultVisible: true },
  { key: "code", label: "รหัส", defaultVisible: true },
  { key: "name", label: "ชื่อ", defaultVisible: true },
  { key: "type", label: "ประเภท", defaultVisible: true },
  { key: "department", label: "ฝ่าย", defaultVisible: true },
  { key: "qty", label: "จำนวน", defaultVisible: true },
  { key: "unit_price", label: "ราคา/หน่วย", defaultVisible: true },
  { key: "total_value", label: "มูลค่ารวม", defaultVisible: true },
  { key: "source", label: "ที่มา", defaultVisible: true },
  { key: "method", label: "วิธีจัดการ", defaultVisible: true },
  { key: "status", label: "สถานะ", defaultVisible: true, locked: true },
  { key: "l1_at", label: "อนุมัติชั้น 1", defaultVisible: false },
  { key: "l2_at", label: "อนุมัติชั้น 2", defaultVisible: false },
  { key: "fin_at", label: "บัญชีรับทราบ", defaultVisible: false },
];

const fmtMoney = (n: number | null | undefined) =>
  n == null ? "" : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DisposalReport() {
  const { hasFunctionAccess } = useFunctionPermissions();
  const { user } = useAuth();
  const [rows, setRows] = useState<DisposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [visible, setVisible] = useState<ColKey[]>(COLUMN_DEFS.filter(c => c.defaultVisible).map(c => c.key));

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("defective_returns")
      .select(`
        id, document_no, is_media_player, quantity, reason, source_type, dispose_status,
        disposal_method, created_at, is_expired, total_value, unit_price_snapshot,
        reporter_department, l1_approved_at, l2_approved_at, finance_ack_at,
        equipment:equipment_id(code, name, brand, department),
        media_player:media_player_id(code, name, department)
      `)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) { toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message); setLoading(false); return; }
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter(x => x.dispose_status === statusFilter);
    if (methodFilter !== "all") r = r.filter(x => x.disposal_method === methodFilter);
    if (sourceFilter !== "all") {
      if (sourceFilter === "billboard") r = r.filter(x => x.source_type === "billboard");
      else if (sourceFilter === "expired") r = r.filter(x => x.is_expired);
      else r = r.filter(x => x.source_type !== "billboard" && !x.is_expired);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(x =>
        x.document_no.toLowerCase().includes(s) ||
        x.equipment?.code?.toLowerCase().includes(s) ||
        x.equipment?.name?.toLowerCase().includes(s) ||
        x.media_player?.code?.toLowerCase().includes(s) ||
        x.media_player?.name?.toLowerCase().includes(s) ||
        x.reason?.toLowerCase().includes(s)
      );
    }
    return r;
  }, [rows, search, statusFilter, methodFilter, sourceFilter]);

  const summary = useMemo(() => {
    const active = filtered.filter(x => x.dispose_status !== "rejected");
    const totalValue = active.reduce((a, x) => a + (Number(x.total_value) || 0), 0);
    const totalQty = active.reduce((a, x) => a + (x.quantity || 0), 0);
    const byMethod: Record<string, number> = {};
    active.forEach(x => { const m = x.disposal_method || "pending"; byMethod[m] = (byMethod[m] || 0) + (Number(x.total_value) || 0); });
    return {
      count: active.length,
      totalQty,
      totalValue,
      pendingL1: filtered.filter(x => x.dispose_status === "pending_disposal_review").length,
      pendingL2: filtered.filter(x => x.dispose_status === "l1_approved").length,
      approved: filtered.filter(x => x.dispose_status === "approved").length,
      completed: filtered.filter(x => x.dispose_status === "completed").length,
      pendingFinance: filtered.filter(x => !x.finance_ack_at && x.dispose_status !== "rejected").length,
      byMethod,
    };
  }, [filtered]);

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } =
    useTablePagination<DisposalRow>(filtered, 20);

  const sourceLabel = (r: DisposalRow) =>
    r.swap_request_id ? "จาก Swap" : r.source_type === "billboard" ? "ถอดจากป้าย" : r.is_expired ? "หมดอายุในคลัง" : "คลัง/ภาคสนาม";

  const exportExcel = () => {
    const out = filtered.map((r) => ({
      "เลขที่": r.document_no,
      "วันที่แจ้ง": r.created_at ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm") : "",
      "ประเภท": r.is_media_player ? "Media Player" : "สินค้า/อะไหล่",
      "รหัส": r.is_media_player ? r.media_player?.code : r.equipment?.code,
      "ชื่อ": r.is_media_player ? r.media_player?.name : r.equipment?.name,
      "ฝ่าย": r.reporter_department || r.equipment?.department || r.media_player?.department || "",
      "จำนวน": r.quantity,
      "ราคา/หน่วย": r.unit_price_snapshot ?? "",
      "มูลค่ารวม": r.total_value ?? "",
      "ที่มา": sourceLabel(r),
      "วิธีจัดการ": r.disposal_method ? METHOD_LABEL[r.disposal_method] : "",
      "สถานะ": STATUS_LABEL[r.dispose_status] || r.dispose_status,
      "อนุมัติชั้น 1": r.l1_approved_at ? format(new Date(r.l1_approved_at), "dd/MM/yyyy HH:mm") : "",
      "อนุมัติชั้น 2": r.l2_approved_at ? format(new Date(r.l2_approved_at), "dd/MM/yyyy HH:mm") : "",
      "บัญชีรับทราบ": r.finance_ack_at ? format(new Date(r.finance_ack_at), "dd/MM/yyyy HH:mm") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานของเสีย");
    XLSX.writeFile(wb, `รายงานของเสีย_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  const visibleSet = useMemo(() => new Set(visible), [visible]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-8 w-8 text-primary" />
            รายงานของเสีย / จำหน่าย
          </h1>
          <p className="text-muted-foreground mt-1">
            สรุปการจัดการของเสีย/ชำรุด แยกตามวิธีจัดการ ฝ่าย และมูลค่า (รองรับ 2 ชั้นอนุมัติ + ฝ่ายบัญชี)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> โหลดใหม่
          </Button>
          <Button onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>จำนวนรายการ (ไม่นับปฏิเสธ)</CardDescription><CardTitle className="text-2xl">{summary.count}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>จำนวนชิ้นรวม</CardDescription><CardTitle className="text-2xl">{summary.totalQty}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>มูลค่ารวม</CardDescription><CardTitle className="text-2xl text-primary">฿{fmtMoney(summary.totalValue)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>รอบัญชีรับทราบ</CardDescription><CardTitle className="text-2xl text-purple-600">{summary.pendingFinance}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardDescription>รออนุมัติชั้น 1</CardDescription><CardTitle className="text-xl text-warning">{summary.pendingL1}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>รออนุมัติชั้น 2</CardDescription><CardTitle className="text-xl text-amber-600">{summary.pendingL2}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>อนุมัติแล้ว</CardDescription><CardTitle className="text-xl text-blue-600">{summary.approved}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>ดำเนินการเสร็จ</CardDescription><CardTitle className="text-xl text-emerald-600">{summary.completed}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>รายละเอียด</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="สถานะ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="วิธีจัดการ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกวิธี</SelectItem>
                  {Object.entries(METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="ที่มา" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกที่มา</SelectItem>
                  <SelectItem value="billboard">ถอดจากป้าย</SelectItem>
                  <SelectItem value="expired">หมดอายุในคลัง</SelectItem>
                  <SelectItem value="warehouse">คลัง/ภาคสนาม</SelectItem>
                </SelectContent>
              </Select>
              <ColumnChooser columns={COLUMN_DEFS} visible={visible} onChange={setVisible} defaults={COLUMN_DEFS.filter(c => c.defaultVisible).map(c => c.key)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  {COLUMN_DEFS.filter(c => visibleSet.has(c.key)).map(c => (
                    <TableHead key={c.key} className="min-w-[120px]">{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={visible.length} className="text-center py-12 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={visible.length} className="text-center py-12 text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                ) : paginatedData.map((r) => (
                  <TableRow key={r.id}>
                    {visibleSet.has("document_no") && <TableCell className="font-mono text-xs">{r.document_no}</TableCell>}
                    {visibleSet.has("created_at") && <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM yy HH:mm", { locale: th })}</TableCell>}
                    {visibleSet.has("code") && <TableCell className="font-mono text-xs">{r.is_media_player ? r.media_player?.code : r.equipment?.code || "—"}</TableCell>}
                    {visibleSet.has("name") && <TableCell className="text-xs">{r.is_media_player ? r.media_player?.name : r.equipment?.name || "—"}</TableCell>}
                    {visibleSet.has("type") && <TableCell className="text-xs">{r.is_media_player ? "MP" : "อะไหล่"}</TableCell>}
                    {visibleSet.has("department") && <TableCell className="text-xs">{r.reporter_department || r.equipment?.department || r.media_player?.department || "—"}</TableCell>}
                    {visibleSet.has("qty") && <TableCell className="text-right font-mono">{r.quantity}</TableCell>}
                    {visibleSet.has("unit_price") && <TableCell className="text-right font-mono text-xs">{fmtMoney(r.unit_price_snapshot) || "—"}</TableCell>}
                    {visibleSet.has("total_value") && <TableCell className="text-right font-mono text-xs">{r.total_value != null ? fmtMoney(r.total_value) : "—"}</TableCell>}
                    {visibleSet.has("source") && <TableCell className="text-xs">{sourceLabel(r)}</TableCell>}
                    {visibleSet.has("method") && <TableCell className="text-xs">{r.disposal_method ? METHOD_LABEL[r.disposal_method] : "—"}</TableCell>}
                    {visibleSet.has("status") && <TableCell><Badge variant="outline" className="text-xs">{STATUS_LABEL[r.dispose_status] || r.dispose_status}</Badge></TableCell>}
                    {visibleSet.has("l1_at") && <TableCell className="text-xs">{r.l1_approved_at ? format(new Date(r.l1_approved_at), "dd MMM yy", { locale: th }) : "—"}</TableCell>}
                    {visibleSet.has("l2_at") && <TableCell className="text-xs">{r.l2_approved_at ? format(new Date(r.l2_approved_at), "dd MMM yy", { locale: th }) : "—"}</TableCell>}
                    {visibleSet.has("fin_at") && <TableCell className="text-xs">{r.finance_ack_at ? format(new Date(r.finance_ack_at), "dd MMM yy", { locale: th }) : "—"}</TableCell>}
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
}
