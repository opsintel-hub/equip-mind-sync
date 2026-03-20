import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Search, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";

interface DocumentRecord {
  id: string;
  document_no: string;
  document_url: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  supplier_name: string | null;
  delivery_person_name: string | null;
  quantity: number;
  unit: string;
  created_at: string;
  status: string;
  source: "pending" | "received" | "issue" | "delivery_confirm" | "direct_shipping";
  // Extended fields for ProcessTracker
  raw?: any;
}

function getDocumentProcessSteps(doc: DocumentRecord): ProcessStep[] | null {
  const raw = doc.raw;
  if (!raw) return null;

  if (doc.source === "issue") {
    const status = doc.status;
    const hasApproval = status === "pending_approval" || raw.approval_status === "pending" || raw.approved_at;

    const steps: ProcessStep[] = [
      { label: "ส่งคำขอ", status: "done", date: raw.created_at },
    ];

    if (hasApproval || status === "pending_approval") {
      if (status === "rejected") {
        steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ไม่อนุมัติ" });
      } else if (raw.approved_at || status === "issued" || status === "approved") {
        steps.push({ label: "อนุมัติ", status: "done", date: raw.approved_at });
      } else {
        steps.push({ label: "รออนุมัติ", status: "current" });
      }
    }

    if (status === "rejected") {
      steps.push({ label: "จ่ายสินค้า", status: "pending" });
    } else if (status === "issued") {
      steps.push({ label: "จ่ายสินค้า", status: "done", date: raw.issued_at });
    } else if (status === "waiting_stock") {
      steps.push({ label: "รอสินค้า", status: "warning" });
    } else if (status === "approved" || (status === "pending" && !hasApproval)) {
      steps.push({ label: "จ่ายสินค้า", status: "current" });
    } else {
      steps.push({ label: "จ่ายสินค้า", status: "pending" });
    }

    if (status === "issued") {
      steps.push({ label: "ยืนยันรับ", status: raw.confirmed_at ? "done" : "current", date: raw.confirmed_at });
    } else {
      steps.push({ label: "ยืนยันรับ", status: "pending" });
    }

    return steps;
  }

  if (doc.source === "direct_shipping") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "สร้างคำขอ", status: "done", date: raw.created_at },
    ];

    if (status === "rejected") {
      steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ไม่อนุมัติ" });
    } else if (status === "cancelled") {
      steps.push({ label: "ยกเลิก", status: "rejected", date: raw.cancelled_at });
    } else if (["approved", "pending_confirmation", "confirmed", "issue_reported"].includes(status)) {
      steps.push({ label: "อนุมัติ", status: "done", date: raw.approved_at });
    } else {
      steps.push({ label: "รออนุมัติ", status: "current" });
    }

    if (status === "rejected" || status === "cancelled") {
      steps.push({ label: "จัดซื้อ-ส่งของ", status: "pending" });
    } else if (["pending_confirmation", "confirmed", "issue_reported"].includes(status)) {
      steps.push({ label: "จัดซื้อ-ส่งของ", status: "done", date: raw.processed_at || raw.shipping_date });
    } else if (status === "approved") {
      steps.push({ label: "จัดซื้อ-ส่งของ", status: "current" });
    } else {
      steps.push({ label: "จัดซื้อ-ส่งของ", status: "pending" });
    }

    if (status === "confirmed") {
      steps.push({ label: "ผู้รับยืนยัน", status: "done", date: raw.confirmed_at });
    } else if (status === "issue_reported") {
      steps.push({ label: "มีปัญหา", status: "warning" });
    } else if (status === "pending_confirmation") {
      steps.push({ label: "ผู้รับยืนยัน", status: "current" });
    } else {
      steps.push({ label: "ผู้รับยืนยัน", status: "pending" });
    }

    return steps;
  }

  // Goods receipt flow (pending/received)
  if (doc.source === "pending" || doc.source === "received") {
    const steps: ProcessStep[] = [
      { label: "สร้างเอกสาร", status: "done", date: raw.created_at },
    ];

    if (doc.source === "received" || doc.status === "received") {
      steps.push({ label: "ตรวจรับ", status: "done", date: raw.received_at || raw.created_at });
      steps.push({ label: "เข้าคลัง", status: "done" });
    } else if (doc.status === "rejected") {
      steps.push({ label: "ตรวจรับ", status: "rejected", sublabel: "ปฏิเสธ" });
      steps.push({ label: "เข้าคลัง", status: "pending" });
    } else {
      steps.push({ label: "รอตรวจรับ", status: "current" });
      steps.push({ label: "เข้าคลัง", status: "pending" });
    }

    return steps;
  }

  return null;
}

export default function DocumentSearch() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Fetch from goods_receipt_pending
      const { data: pendingData } = await supabase
        .from("goods_receipt_pending").select("*").order("created_at", { ascending: false });

      // Fetch from goods_receipt
      const { data: receiptData } = await supabase
        .from("goods_receipt").select("*, equipment:equipment_id(code, name)").order("created_at", { ascending: false });

      // Fetch from goods_issue_pending (with extended fields for tracker)
      const { data: issueData } = await supabase
        .from("goods_issue_pending")
        .select("id, document_no, created_at, status, equipment_name, equipment_code, requester_name, requester_department, approval_status, approved_at, issued_at, pickup_type, serial_number")
        .order("created_at", { ascending: false });

      // Fetch from delivery_confirmations
      const { data: dcData } = await supabase
        .from("delivery_confirmations").select("*").order("created_at", { ascending: false });

      // Fetch from direct_shipments (with extended fields for tracker)
      const { data: dsData } = await supabase
        .from("direct_shipments")
        .select("*, direct_shipment_items(equipment_code, equipment_name, serial_number, quantity, unit)")
        .order("created_at", { ascending: false });

      const pendingDocs: DocumentRecord[] = (pendingData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: item.document_url,
        equipment_code: item.equipment_code, equipment_name: item.equipment_name,
        serial_number: item.serial_number || null,
        supplier_name: item.supplier_name, delivery_person_name: item.delivery_person_name,
        quantity: item.quantity, unit: item.unit, created_at: item.created_at,
        status: item.status, source: (item.status === "received" ? "received" : "pending") as "pending" | "received", raw: item,
      }));

      const receiptDocs: DocumentRecord[] = (receiptData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: item.document_url,
        equipment_code: item.equipment?.code || null, equipment_name: item.equipment?.name || null,
        serial_number: null,
        supplier_name: item.supplier, delivery_person_name: null,
        quantity: item.quantity, unit: "ชิ้น", created_at: item.created_at,
        status: item.status, source: "received" as const, raw: item,
      }));

      const issueDocs: DocumentRecord[] = (issueData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: null,
        equipment_code: item.equipment_code, equipment_name: item.equipment_name,
        serial_number: item.serial_number || null,
        supplier_name: null, delivery_person_name: item.requester_name,
        quantity: 0, unit: "-", created_at: item.created_at,
        status: item.status, source: "issue" as const, raw: item,
      }));

      const dcDocs: DocumentRecord[] = (dcData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: null,
        equipment_code: null, equipment_name: null,
        serial_number: null,
        supplier_name: null, delivery_person_name: null,
        quantity: 0, unit: "-", created_at: item.created_at,
        status: item.status, source: "delivery_confirm" as const, raw: item,
      }));

      const dsDocs: DocumentRecord[] = (dsData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: null,
        equipment_code: item.direct_shipment_items?.[0]?.equipment_code || null,
        equipment_name: item.direct_shipment_items?.map((i: any) => i.equipment_name).join(", ") || null,
        serial_number: item.direct_shipment_items?.[0]?.serial_number || null,
        supplier_name: item.supplier_name, delivery_person_name: item.delivery_person_name,
        quantity: item.direct_shipment_items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0,
        unit: item.direct_shipment_items?.[0]?.unit || "-",
        created_at: item.created_at,
        status: item.status, source: "direct_shipping" as const, raw: item,
      }));

      setDocuments([...pendingDocs, ...receiptDocs, ...issueDocs, ...dcDocs, ...dsDocs]);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("ไม่สามารถโหลดเอกสารได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const filteredDocuments = documents.filter((doc) => {
    if (sourceFilter !== "all" && doc.source !== sourceFilter) return false;

    if (dateRange?.from) {
      const d = new Date(doc.created_at);
      if (d < dateRange.from) return false;
      if (dateRange.to && d > new Date(dateRange.to.getTime() + 86400000)) return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    switch (searchType) {
      case "supplier": return doc.supplier_name?.toLowerCase().includes(term);
      case "equipment": return doc.equipment_code?.toLowerCase().includes(term) || doc.equipment_name?.toLowerCase().includes(term) || doc.serial_number?.toLowerCase().includes(term);
      case "document": return doc.document_no.toLowerCase().includes(term) || doc.raw?.po_number?.toLowerCase().includes(term) || doc.raw?.pr_number?.toLowerCase().includes(term);
      default:
        return doc.supplier_name?.toLowerCase().includes(term) || doc.equipment_code?.toLowerCase().includes(term) ||
          doc.equipment_name?.toLowerCase().includes(term) || doc.document_no.toLowerCase().includes(term) ||
          doc.delivery_person_name?.toLowerCase().includes(term) || doc.serial_number?.toLowerCase().includes(term) ||
          doc.raw?.po_number?.toLowerCase().includes(term) || doc.raw?.pr_number?.toLowerCase().includes(term);
    }
  });

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredDocuments);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "pending": return <Badge variant="outline">รอรับเข้าคลัง</Badge>;
      case "received": return <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">รับเข้าคลัง</Badge>;
      case "issue": return <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">เอกสารเบิก</Badge>;
      case "delivery_confirm": return <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">ยืนยันรับ</Badge>;
      case "direct_shipping": return <Badge variant="outline" className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-400">Direct Shipping</Badge>;
      default: return <Badge variant="outline">{source}</Badge>;
    }
  };

  const getStatusBadgeFallback = (status: string, source: string) => {
    if (source === "delivery_confirm") {
      if (status === "confirmed") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">ยืนยันแล้ว</Badge>;
      if (status === "issue_reported") return <Badge variant="destructive">แจ้งปัญหา</Badge>;
      return <Badge variant="secondary">{status}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ค้นหาเอกสาร</h1>
        <p className="text-sm text-muted-foreground mt-1">ค้นหาจากผู้จำหน่าย รหัสอุปกรณ์ เลขที่เอกสาร เลขที่ PO/PR หรือ Serial Number</p>
      </div>

      {/* Search filters */}
      <Card className="border-border/60">
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="พิมพ์คำค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ประเภทการค้นหา</Label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="supplier">ผู้จำหน่าย</SelectItem>
                  <SelectItem value="equipment">รหัส/ชื่ออุปกรณ์</SelectItem>
                  <SelectItem value="document">เลขที่เอกสาร</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ประเภทเอกสาร</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="pending">รอรับเข้าคลัง</SelectItem>
                  <SelectItem value="received">รับเข้าคลังแล้ว</SelectItem>
                  <SelectItem value="issue">เอกสารเบิก</SelectItem>
                  <SelectItem value="delivery_confirm">เอกสารยืนยันรับ</SelectItem>
                  <SelectItem value="direct_shipping">Direct Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ช่วงวันที่</Label>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
            <Button onClick={fetchDocuments} disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              รีเฟรช
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">รายการเอกสาร</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">พบ {filteredDocuments.length} รายการ</span>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {hasSearched ? (searchTerm ? <p>ไม่พบเอกสารที่ตรงกับคำค้นหา "{searchTerm}"</p> : <p>ไม่พบเอกสารในระบบ</p>) : <p>กำลังโหลด...</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-xs font-semibold text-muted-foreground pl-6">เลขที่เอกสาร</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">ประเภท</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">รหัส/ชื่ออุปกรณ์</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">ผู้จำหน่าย/ผู้ขอ</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">จำนวน</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">วันที่</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[240px]">ความคืบหน้า</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-center pr-6">เอกสาร</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((doc) => {
                    const trackerSteps = getDocumentProcessSteps(doc);
                    return (
                      <TableRow key={`${doc.source}-${doc.id}`} className="border-border/30 hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-medium pl-6 whitespace-nowrap">{doc.document_no}</TableCell>
                        <TableCell>{getSourceBadge(doc.source)}</TableCell>
                        <TableCell>
                          {doc.equipment_code || doc.equipment_name ? (
                            <div className="space-y-0.5">
                              {doc.equipment_code && <div className="font-semibold text-sm leading-tight">{doc.equipment_code}</div>}
                              {doc.equipment_name && <div className="text-xs text-muted-foreground truncate max-w-[160px] leading-tight">{doc.equipment_name}</div>}
                              {doc.serial_number && (
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-[18px] bg-accent/50 text-accent-foreground/70 border-border">
                                  S/N: {doc.serial_number}
                                </Badge>
                              )}
                            </div>
                          ) : <span className="text-muted-foreground/40">-</span>}
                        </TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate">{doc.supplier_name || doc.delivery_person_name || <span className="text-muted-foreground/40">-</span>}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">{doc.quantity > 0 ? `${doc.quantity} ${doc.unit}` : <span className="text-muted-foreground/40">-</span>}</TableCell>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: th })}</TableCell>
                        <TableCell className="py-3">
                          {trackerSteps ? (
                            <ProcessTracker steps={trackerSteps} size="sm" />
                          ) : (
                            getStatusBadgeFallback(doc.status, doc.source)
                          )}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          {doc.document_url ? (
                            <div className="flex gap-0.5 justify-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                <a href={doc.document_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                <a href={doc.document_url} download><Download className="h-3.5 w-3.5" /></a>
                              </Button>
                            </div>
                          ) : <span className="text-muted-foreground/30">-</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-6 pt-2">
                <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
