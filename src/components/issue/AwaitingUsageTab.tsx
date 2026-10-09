import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lineIssued, lineInstalled, lineLeft, type IssueQuantities } from "@/lib/issueQuantities";
import { formatMergedSerials, matchesSerialSearch } from "@/lib/serialSearch";

interface UsageLine extends IssueQuantities {
  id: string;
  pending_id: string;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  unit: string | null;
  notes: string | null;
}

interface UsageHeader {
  id: string;
  document_no: string;
  equipment_code: string | null;
  equipment_name: string | null;
  quantity: number;
  issued_quantity: number | null;
  billboard_id: string | null;
  return_quantity: number | null;
  unit: string | null;
  requester_name: string;
  requester_department: string | null;
  purpose: string | null;
  issued_at: string | null;
  created_at: string;
  notes: string | null;
  companies: { name: string } | null;
}

interface UsageRow {
  header: UsageHeader;
  line: UsageLine;
}

const displayDate = (value: string | null) => value ? format(new Date(value), "d MMM yyyy HH:mm", { locale: th }) : "-";

export function AwaitingUsageTab() {
  const { isSuperAdmin, viewableDepts, deptKey, loading: scopeLoading } = useDeptScope();
  const [search, setSearch] = useState("");
  const [serialSearch, setSerialSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: rows = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["awaiting-usage", deptKey],
    enabled: !scopeLoading,
    queryFn: async () => {
      const headers: UsageHeader[] = [];
      // Read every page, not just the Data API's first 1,000 rows.
      for (let offset = 0; ; offset += 500) {
        let query = supabase.from("goods_issue_pending")
          .select("id, document_no, equipment_code, equipment_name, quantity, issued_quantity, billboard_id, return_quantity, unit, requester_name, requester_department, purpose, issued_at, created_at, notes, companies(name)")
          .in("status", ["issued", "partial_return", "partially_issued", "returned"])
          .order("issued_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false })
          .range(offset, offset + 499);
        if (!isSuperAdmin) {
          query = query.in("requester_department", viewableDepts?.length ? viewableDepts : ["__no_dept_permission__"]);
        }
        const { data, error } = await query;
        if (error) throw error;
        headers.push(...(data || []));
        if (!data || data.length < 500) break;
      }

      const grouped = new Map<string, UsageLine[]>();
      for (let start = 0; start < headers.length; start += 100) {
        const ids = headers.slice(start, start + 100).map(header => header.id);
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from("goods_issue_pending_items")
            .select("id, pending_id, equipment_code, equipment_name, serial_number, quantity, issued_quantity, installed_qty, billboard_id, returned_good_qty, returned_defective_qty, written_off_qty, unit, notes")
            .in("pending_id", ids).order("id").range(offset, offset + 499);
          if (error) throw error;
          for (const line of data || []) {
            const group = grouped.get(line.pending_id) || [];
            group.push(line);
            grouped.set(line.pending_id, group);
          }
          if (!data || data.length < 500) break;
        }
      }

      const result: UsageRow[] = [];
      for (const header of headers) {
        const lines = grouped.get(header.id);
        if (lines?.length) {
          // Explicitly issued quantities also cover partially issued lines.
          for (const line of lines) {
            if (Number(line.issued_quantity || 0) > 0 && lineLeft(line) > 0) result.push({ header, line });
          }
        } else {
          const line: UsageLine = {
            id: header.id, pending_id: header.id,
            equipment_code: header.equipment_code, equipment_name: header.equipment_name,
            serial_number: null, unit: header.unit, notes: header.notes,
            quantity: header.quantity, issued_quantity: header.issued_quantity,
            billboard_id: header.billboard_id, returned_good_qty: header.return_quantity,
          };
          if (lineIssued(line) > 0 && lineLeft(line) > 0) result.push({ header, line });
        }
      }
      return result;
    },
  });

  useRealtimeInvalidate({ table: "goods_issue_pending", queryKeys: [["awaiting-usage"]] });
  useRealtimeInvalidate({ table: "goods_issue_pending_items", queryKeys: [["awaiting-usage"]] });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(({ header, line }) =>
      matchesSerialSearch(serialSearch, line.serial_number) &&
      (!term || [header.document_no, header.requester_name, header.requester_department,
        header.companies?.name, header.purpose, line.equipment_code, line.equipment_name]
        .some(value => value?.toLowerCase().includes(term))),
    );
  }, [rows, search, serialSearch]);
  const pagination = useTablePagination(filtered, 20);
  const busy = scopeLoading || isLoading;

  const exportExcel = () => {
    if (!filtered.length || busy || error) return;
    setExporting(true);
    try {
      const sheet = XLSX.utils.json_to_sheet(filtered.map(({ header, line }) => ({
        "เลขที่เอกสาร": header.document_no,
        "วันที่จ่าย": displayDate(header.issued_at),
        "บริษัท": header.companies?.name || "-",
        "ฝ่าย": header.requester_department || "-",
        "ผู้เบิก": header.requester_name,
        "จุดประสงค์การเบิก": header.purpose || "-",
        "รหัสสินค้า": line.equipment_code || "-",
        "ชื่อสินค้า": line.equipment_name || "-",
        "S/N": formatMergedSerials(line.serial_number) || "-",
        "หน่วย": line.unit || "-",
        "จ่ายแล้ว": lineIssued(line),
        "ติดตั้งแล้ว": lineInstalled(line),
        "คืนของดี": Number(line.returned_good_qty || 0),
        "คืนของเสีย": Number(line.returned_defective_qty || 0),
        "ปิดยอดพิเศษ": Number(line.written_off_qty || 0),
        "รอใช้งาน": lineLeft(line),
        "หมายเหตุ": line.notes || "-",
      })));
      sheet["!cols"] = [22, 23, 30, 22, 25, 30, 20, 45, 30, 12, 12, 14, 12, 12, 14, 14, 40].map(wch => ({ wch }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "สินค้ารอใช้งาน");
      XLSX.writeFile(workbook, `สินค้ารอใช้งาน_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
      toast.success(`ส่งออก ${filtered.length.toLocaleString()} รายการสำเร็จ`);
    } catch {
      toast.error("ส่งออกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label="ค้นหา S/N หรือ Alias" placeholder="S/N หรือ Alias" className="pl-9" value={serialSearch}
            onChange={event => { setSerialSearch(event.target.value); pagination.handlePageChange(1); }} />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label="ค้นหาสินค้ารอใช้งาน" placeholder="รหัส, ชื่อสินค้า, เลขเอกสาร, ผู้เบิก, ฝ่าย" className="pl-9" value={search}
            onChange={event => { setSearch(event.target.value); pagination.handlePageChange(1); }} />
        </div>
        <Button variant="outline" onClick={exportExcel} disabled={busy || isFetching || !!error || exporting || !filtered.length} className="gap-2">
          <Download className="h-4 w-4" />{exporting ? "กำลังส่งออก..." : "Export Excel"}
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">{filtered.length.toLocaleString()} รายการ</div>
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader><TableRow>
            <TableHead>เลขที่เอกสาร / วันที่จ่าย</TableHead><TableHead>ผู้เบิก / ฝ่าย / บริษัท</TableHead>
            <TableHead>รหัส / ชื่อสินค้า</TableHead><TableHead>S/N</TableHead><TableHead>จุดประสงค์การเบิก</TableHead>
            <TableHead>หน่วย</TableHead><TableHead className="text-right">จ่ายแล้ว</TableHead>
            <TableHead className="text-right">ติดตั้งแล้ว</TableHead><TableHead className="text-right">คืนของดี</TableHead>
            <TableHead className="text-right">คืนของเสีย</TableHead><TableHead className="text-right">ปิดยอดพิเศษ</TableHead>
            <TableHead className="sticky right-0 bg-background text-right">รอใช้งาน</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {busy || error || !filtered.length ? <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
              {busy ? "กำลังโหลด..." : error ? <div className="space-y-2"><p>โหลดข้อมูลไม่สำเร็จ</p><Button variant="outline" size="sm" onClick={() => void refetch()}>ลองใหม่</Button></div> : "ไม่มีสินค้ารอใช้งาน"}
            </TableCell></TableRow> : pagination.paginatedData.map(({ header, line }) => <TableRow key={line.id}>
              <TableCell><div className="font-mono whitespace-nowrap">{header.document_no}</div><div className="text-xs text-muted-foreground">{displayDate(header.issued_at)}</div></TableCell>
              <TableCell><div>{header.requester_name}</div><div className="text-xs text-muted-foreground">{header.requester_department || "-"}<br />{header.companies?.name || "-"}</div></TableCell>
              <TableCell className="min-w-56 max-w-80 break-words"><div className="font-mono">{line.equipment_code || "-"}</div><div>{line.equipment_name || "-"}</div></TableCell>
              <TableCell className="font-mono whitespace-pre-line break-words max-w-56">{formatMergedSerials(line.serial_number) || "-"}</TableCell>
              <TableCell>{header.purpose || "-"}</TableCell><TableCell>{line.unit || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{lineIssued(line)}</TableCell>
              <TableCell className="text-right tabular-nums">{lineInstalled(line)}</TableCell>
              <TableCell className="text-right tabular-nums">{Number(line.returned_good_qty || 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{Number(line.returned_defective_qty || 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{Number(line.written_off_qty || 0)}</TableCell>
              <TableCell className="sticky right-0 bg-background text-right tabular-nums font-semibold text-warning">{lineLeft(line)}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
      {!busy && !error && <TablePagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} pageSize={pagination.pageSize}
        totalItems={pagination.totalItems} onPageChange={pagination.handlePageChange} onPageSizeChange={pagination.handlePageSizeChange} />}
    </div>
  );
}