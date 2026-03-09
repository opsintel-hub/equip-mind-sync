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
        .from("goods_receipt_pending").select("*").not("document_url", "is", null).order("created_at", { ascending: false });

      // Fetch from goods_receipt
      const { data: receiptData } = await supabase
        .from("goods_receipt").select("*, equipment:equipment_id(code, name)").not("document_url", "is", null).order("created_at", { ascending: false });

      // Fetch from goods_issue_pending (with extended fields for tracker)
      const { data: issueData } = await supabase
        .from("goods_issue_pending")
        .select("id, document_no, created_at, status, equipment_name, equipment_code, requester_name, requester_department, approval_status, approved_at, issued_at, pickup_type, serial_number")
        .order("created_at", { ascending: false }).limit(500);

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
        status: item.status, source: "pending" as const, raw: item,
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
      case "document": return doc.document_no.toLowerCase().includes(term);
      default:
        return doc.supplier_name?.toLowerCase().includes(term) || doc.equipment_code?.toLowerCase().includes(term) ||
          doc.equipment_name?.toLowerCase().includes(term) || doc.document_no.toLowerCase().includes(term) ||
          doc.delivery_person_name?.toLowerCase().includes(term) || doc.serial_number?.toLowerCase().includes(term);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ค้นหาเอกสาร</h1>
        <p className="text-muted-foreground">ค้นหาเอกสารจากการรับสินค้า, เบิกสินค้า และยืนยันรับสินค้า พร้อมติดตามความคืบหน้า</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />ค้นหาเอกสาร</CardTitle>
          <CardDescription>ค้นหาจากผู้จำหน่าย รหัสอุปกรณ์ เลขที่เอกสาร หรือ Serial Number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="พิมพ์คำค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ประเภทการค้นหา</Label>
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
            <div className="space-y-2">
              <Label>ประเภทเอกสาร</Label>
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
            <div className="space-y-2">
              <Label>ช่วงวันที่</Label>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchDocuments} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                รีเฟรช
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />รายการเอกสาร</CardTitle>
          <CardDescription>พบ {filteredDocuments.length} รายการ — แสดงความคืบหน้าแบบเรียลไทม์</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {hasSearched ? (searchTerm ? <p>ไม่พบเอกสารที่ตรงกับคำค้นหา "{searchTerm}"</p> : <p>ไม่พบเอกสารในระบบ</p>) : <p>กำลังโหลด...</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>รหัส/ชื่ออุปกรณ์</TableHead>
                    <TableHead>ผู้จำหน่าย/ผู้ขอ</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead className="min-w-[260px]">ความคืบหน้า</TableHead>
                    <TableHead className="text-center">เอกสาร</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((doc) => {
                    const trackerSteps = getDocumentProcessSteps(doc);
                    return (
                      <TableRow key={`${doc.source}-${doc.id}`}>
                        <TableCell className="font-medium font-mono text-sm">{doc.document_no}</TableCell>
                        <TableCell>{getSourceBadge(doc.source)}</TableCell>
                        <TableCell>
                          {doc.equipment_code || doc.equipment_name ? (
                            <div>
                              {doc.equipment_code && <div className="font-medium text-sm">{doc.equipment_code}</div>}
                              {doc.equipment_name && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{doc.equipment_name}</div>}
                              {doc.serial_number && (
                                <Badge variant="outline" className="font-mono text-[10px] mt-0.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                                  S/N: {doc.serial_number}
                                </Badge>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">{doc.supplier_name || doc.delivery_person_name || "-"}</TableCell>
                        <TableCell className="text-right text-sm">{doc.quantity > 0 ? `${doc.quantity} ${doc.unit}` : "-"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: th })}</TableCell>
                        <TableCell>
                          {trackerSteps ? (
                            <ProcessTracker steps={trackerSteps} size="sm" />
                          ) : (
                            getStatusBadgeFallback(doc.status, doc.source)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.document_url ? (
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="sm" asChild><a href={doc.document_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                              <Button variant="ghost" size="sm" asChild><a href={doc.document_url} download><Download className="h-4 w-4" /></a></Button>
                            </div>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
