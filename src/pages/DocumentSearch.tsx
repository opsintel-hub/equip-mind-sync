import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { DocumentPreviewDialog, DocumentCategory } from "@/components/DocumentPreviewDialog";

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
const splitUrls = (combined: string | null | undefined): string[] =>
  combined ? String(combined).split(/\s*,\s*/).filter(Boolean) : [];
const splitExtraDocs = (combined: string | null | undefined) => {
  const all = splitUrls(combined);
  const docs: string[] = [];
  const images: string[] = [];
  for (const u of all) {
    if (isImageUrl(u)) images.push(u);
    else docs.push(u);
  }
  return { docs, images };
};

/** Build category list per record source. Always returns the full set of expected categories
 *  for that source — empty ones still show in the preview as disabled tabs. */
function getDocumentCategories(doc: DocumentRecord): DocumentCategory[] {
  const r = doc.raw || {};
  if (doc.source === "pending" || doc.source === "received") {
    // Header upload slots map 1:1 to the 4 fields in DeliveryEntry: PO / PR / Invoice / ใบส่งของ
    const poUrls = splitUrls(r.po_document_url);
    const prUrls = splitUrls(r.pr_document_url);
    const invoiceUrls = splitUrls(r.invoice_document_url);
    const dnUrls = splitUrls(r.delivery_note_document_url);
    const knownUrls = new Set([...poUrls, ...prUrls, ...invoiceUrls, ...dnUrls].map((u) => u.trim()).filter(Boolean));
    const extraUrls = splitUrls(r.document_url ?? doc.document_url).filter((u) => !knownUrls.has(u.trim()));
    const { docs, images } = splitExtraDocs(extraUrls.join(", "));

    const cats: DocumentCategory[] = [];
    if (poUrls.length > 0) cats.push({ label: "เลข PO", urls: poUrls });
    if (prUrls.length > 0) cats.push({ label: "เลข PR", urls: prUrls });
    if (invoiceUrls.length > 0) cats.push({ label: "Invoice No.", urls: invoiceUrls });
    if (dnUrls.length > 0) cats.push({ label: "ใบส่งของ", urls: dnUrls });
    if (docs.length > 0) cats.push({ label: "เอกสารแนบเพิ่มเติม", urls: docs });
    if (images.length > 0) cats.push({ label: "รูปภาพเพิ่มเติม", urls: images });
    return cats;
  }
  if (doc.source === "direct_shipping") {
    return [
      { label: "เอกสาร PO", urls: r.po_document_url },
      { label: "เอกสาร PR", urls: r.pr_document_url },
      { label: "Invoice", urls: r.invoice_document_url },
      { label: "ใบส่งของ", urls: r.delivery_note_document_url },
    ];
  }
  if (doc.source === "advertisement") {
    return [
      { label: "เอกสารประกอบ", urls: r.supporting_doc_url },
      { label: "รูปภาพโฆษณา", urls: Array.isArray(r.photo_urls) ? r.photo_urls : [] },
    ];
  }
  if (doc.source === "delivery_confirm") {
    return [
      { label: "เอกสารแนบ", urls: Array.isArray(r.document_urls) ? r.document_urls.filter((u: string) => !isImageUrl(u)) : [] },
      { label: "รูปภาพหลักฐาน", urls: Array.isArray(r.photo_urls) ? r.photo_urls : [] },
    ];
  }
  return [];
}

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
  source: "pending" | "received" | "issue" | "delivery_confirm" | "direct_shipping" | "advertisement" | "ad_issue" | "defective" | "assessment" | "claim" | "swap" | "stock_movement";
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

  // Delivery confirmation
  if (doc.source === "delivery_confirm") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "สร้างเอกสาร", status: "done", date: raw.created_at },
    ];
    if (status === "confirmed") {
      steps.push({ label: "ยืนยันรับ", status: "done", date: raw.confirmed_at });
    } else if (status === "issue_reported") {
      steps.push({ label: "แจ้งปัญหา", status: "warning" });
    } else {
      steps.push({ label: "รอยืนยัน", status: "current" });
    }
    return steps;
  }

  // Ad issue requests
  if (doc.source === "ad_issue") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "ขอเบิก", status: "done", date: raw.created_at },
    ];
    if (status === "rejected") {
      steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ปฏิเสธ" });
      steps.push({ label: "ส่งมอบ", status: "pending" });
      steps.push({ label: "ยืนยันรับ", status: "pending" });
    } else {
      steps.push({ label: "อนุมัติ", status: status === "pending" ? "current" : "done", date: raw.approved_at });
      if (status === "issued" || status === "confirmed" || status === "completed") {
        steps.push({ label: "ส่งมอบ", status: "done", date: raw.issued_at });
        steps.push({ label: "ยืนยันรับ", status: (status === "confirmed" || status === "completed") ? "done" : "current", date: raw.confirmed_at });
      } else {
        steps.push({ label: "ส่งมอบ", status: status === "approved" ? "current" : "pending" });
        steps.push({ label: "ยืนยันรับ", status: "pending" });
      }
    }
    return steps;
  }

  // Advertisement (รับโฆษณา lifecycle)
  if (doc.source === "advertisement") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "สร้าง", status: "done", date: raw.created_at },
    ];
    if (status === "pending_warehouse_entry" || status === "pending") {
      steps.push({ label: "รอเข้าคลัง", status: "current" });
      steps.push({ label: "อยู่ในคลัง", status: "pending" });
      steps.push({ label: "เบิกใช้", status: "pending" });
    } else if (status === "in_storage") {
      steps.push({ label: "เข้าคลัง", status: "done" });
      steps.push({ label: "อยู่ในคลัง", status: "current" });
      steps.push({ label: "เบิกใช้", status: "pending" });
    } else if (status === "issued" || status === "completed") {
      steps.push({ label: "เข้าคลัง", status: "done" });
      steps.push({ label: "อยู่ในคลัง", status: "done" });
      steps.push({ label: "เบิกใช้", status: "done" });
    } else {
      steps.push({ label: "ดำเนินการ", status: "current" });
    }
    return steps;
  }

  // Defective return
  if (doc.source === "defective") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "แจ้งเสีย", status: "done", date: raw.created_at },
    ];
    if (status === "rejected") {
      steps.push({ label: "อนุมัติ", status: "rejected", sublabel: "ปฏิเสธ" });
      steps.push({ label: "จัดการ", status: "pending" });
    } else if (status === "pending_approval") {
      steps.push({ label: "รออนุมัติ", status: "current" });
      steps.push({ label: "จัดการ", status: "pending" });
    } else if (status === "pending_warehouse_entry") {
      steps.push({ label: "อนุมัติแล้ว", status: "done" });
      steps.push({ label: "รอเข้าคลังของเสีย", status: "current" });
    } else if (status === "completed" || status === "disposed") {
      steps.push({ label: "อนุมัติ", status: "done" });
      steps.push({ label: "จัดการเสร็จ", status: "done" });
    } else {
      steps.push({ label: "ดำเนินการ", status: "current" });
      steps.push({ label: "เสร็จสิ้น", status: "pending" });
    }
    return steps;
  }

  // Assessment
  if (doc.source === "assessment") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "สร้างเอกสาร", status: "done", date: raw.created_at },
    ];
    if (status === "completed") {
      steps.push({ label: "ประเมินแล้ว", status: "done", sublabel: raw.outcome || undefined });
    } else if (status === "rejected") {
      steps.push({ label: "ยกเลิก", status: "rejected" });
    } else {
      steps.push({ label: "รอประเมิน", status: "current" });
    }
    return steps;
  }

  // Claim
  if (doc.source === "claim") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "เปิดเคลม", status: "done", date: raw.created_at },
    ];
    if (status === "rejected") {
      steps.push({ label: "ส่งเคลม", status: "rejected" });
      steps.push({ label: "ปิดงาน", status: "pending" });
    } else if (status === "pending") {
      steps.push({ label: "ส่งเคลม", status: "current" });
      steps.push({ label: "ปิดงาน", status: "pending" });
    } else if (status === "sent" || status === "in_progress") {
      steps.push({ label: "ส่งเคลมแล้ว", status: "done" });
      steps.push({ label: "รอตอบกลับ", status: "current" });
    } else if (status === "replaced" || status === "completed" || status === "closed") {
      steps.push({ label: "ส่งเคลม", status: "done" });
      steps.push({ label: "ปิดงาน", status: "done" });
    } else {
      steps.push({ label: "ดำเนินการ", status: "current" });
    }
    return steps;
  }

  // Swap
  if (doc.source === "swap") {
    const status = doc.status;
    const steps: ProcessStep[] = [
      { label: "สร้างคำขอ", status: "done", date: raw.created_at },
    ];
    if (status === "rejected") {
      steps.push({ label: "อนุมัติ", status: "rejected" });
      steps.push({ label: "สลับเสร็จ", status: "pending" });
    } else if (status === "pending") {
      steps.push({ label: "รออนุมัติ", status: "current" });
      steps.push({ label: "สลับเสร็จ", status: "pending" });
    } else if (status === "approved" || status === "in_progress") {
      steps.push({ label: "อนุมัติ", status: "done" });
      steps.push({ label: "กำลังสลับ", status: "current" });
    } else if (status === "completed") {
      steps.push({ label: "อนุมัติ", status: "done" });
      steps.push({ label: "สลับเสร็จ", status: "done" });
    } else {
      steps.push({ label: "ดำเนินการ", status: "current" });
    }
    return steps;
  }

  // Stock movement (single-step)
  if (doc.source === "stock_movement") {
    return [
      { label: "บันทึก", status: "done", date: raw.created_at },
    ];
  }

  return null;
}

/** Returns Thai-friendly current status badge for any source. */
function getCurrentStatusBadge(doc: DocumentRecord): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple" } {
  const s = doc.status;
  const src = doc.source;

  // Common statuses
  if (s === "rejected") return { label: "ปฏิเสธ", variant: "destructive" };
  if (s === "cancelled") return { label: "ยกเลิก", variant: "destructive" };

  switch (src) {
    case "pending":
      return s === "received" ? { label: "รับเข้าคลังแล้ว", variant: "success" } : { label: "รอตรวจรับ", variant: "warning" };
    case "received":
      return { label: "รับเข้าคลังแล้ว", variant: "success" };
    case "issue":
      if (s === "issued") return { label: "จ่ายแล้ว", variant: "success" };
      if (s === "waiting_stock") return { label: "รอสินค้า", variant: "warning" };
      if (s === "pending_approval") return { label: "รออนุมัติ", variant: "warning" };
      if (s === "approved") return { label: "รอจ่ายสินค้า", variant: "info" };
      if (s === "completed") return { label: "เสร็จสิ้น", variant: "success" };
      return { label: "รอดำเนินการ", variant: "warning" };
    case "delivery_confirm":
      if (s === "confirmed") return { label: "ยืนยันแล้ว", variant: "success" };
      if (s === "issue_reported") return { label: "แจ้งปัญหา", variant: "destructive" };
      return { label: "รอยืนยัน", variant: "warning" };
    case "direct_shipping":
      if (s === "confirmed") return { label: "ยืนยันแล้ว", variant: "success" };
      if (s === "pending_confirmation") return { label: "รอผู้รับยืนยัน", variant: "warning" };
      if (s === "approved") return { label: "อนุมัติ-รอส่ง", variant: "info" };
      if (s === "issue_reported") return { label: "มีปัญหา", variant: "destructive" };
      return { label: "รออนุมัติ", variant: "warning" };
    case "advertisement":
      if (s === "in_storage") return { label: "อยู่ในคลัง", variant: "info" };
      if (s === "pending_warehouse_entry") return { label: "รอเข้าคลัง", variant: "warning" };
      if (s === "issued") return { label: "ถูกเบิกใช้", variant: "purple" };
      if (s === "completed") return { label: "เสร็จสิ้น", variant: "success" };
      return { label: s, variant: "outline" };
    case "ad_issue":
      if (s === "issued") return { label: "ส่งมอบแล้ว", variant: "info" };
      if (s === "confirmed" || s === "completed") return { label: "ยืนยันรับแล้ว", variant: "success" };
      if (s === "approved") return { label: "อนุมัติแล้ว", variant: "info" };
      return { label: "รออนุมัติ", variant: "warning" };
    case "defective":
      if (s === "pending_approval") return { label: "รออนุมัติทำลาย", variant: "warning" };
      if (s === "pending_warehouse_entry") return { label: "รอเข้าคลังของเสีย", variant: "warning" };
      if (s === "completed" || s === "disposed") return { label: "จัดการเสร็จ", variant: "success" };
      return { label: s, variant: "outline" };
    case "assessment":
      if (s === "completed") return { label: "ประเมินแล้ว", variant: "success" };
      return { label: "รอประเมิน", variant: "warning" };
    case "claim":
      if (s === "replaced" || s === "completed" || s === "closed") return { label: "ปิดเคลมแล้ว", variant: "success" };
      if (s === "sent" || s === "in_progress") return { label: "อยู่ระหว่างเคลม", variant: "info" };
      return { label: "รอเคลม", variant: "warning" };
    case "swap":
      if (s === "completed") return { label: "สลับเสร็จ", variant: "success" };
      if (s === "approved" || s === "in_progress") return { label: "กำลังสลับ", variant: "info" };
      return { label: "รออนุมัติ", variant: "warning" };
    case "stock_movement": {
      const mt = (doc.raw?.movement_type || "").toLowerCase();
      const label = doc.raw?._movement_type_label || doc.status;
      if (mt.includes("in") || mt === "receive" || mt === "refurb_back") return { label, variant: "success" };
      if (mt.includes("out") || mt === "issue") return { label, variant: "info" };
      if (mt.includes("transfer")) return { label, variant: "purple" };
      if (mt.includes("adjust")) return { label, variant: "warning" };
      return { label: label || "-", variant: "outline" };
    }
    default:
      return { label: s || "-", variant: "outline" };
  }
}

/** Format relative time in Thai (e.g., "2 ชม.ที่แล้ว"). */
function formatRelativeTimeTh(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "เมื่อสักครู่";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} วันที่แล้ว`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} เดือนที่แล้ว`;
  return `${Math.floor(mo / 12)} ปีที่แล้ว`;
}

type LocationInfo = {
  kind: "billboard" | "warehouse" | "issued" | "defective" | "unknown";
  label: string;
  sublabel?: string;
};

export default function DocumentSearch() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [hasSearched, setHasSearched] = useState(false);
  const [previewState, setPreviewState] = useState<{ title: string; categories: DocumentCategory[] } | null>(null);
  const [hideRedundantStockCard, setHideRedundantStockCard] = useState(true);
  /** Map: serial_number(lowercased) -> current location info */
  const [snLocationMap, setSnLocationMap] = useState<Map<string, LocationInfo>>(new Map());

  /** Map a document record to a route + query params for "ดูรายละเอียด". Returns null when no detail page exists. */
  const getDetailRoute = (doc: DocumentRecord): string | null => {
    const code = doc.equipment_code || "";
    const docNo = doc.document_no || "";
    switch (doc.source) {
      case "pending":
      case "received":
        return `/receive-goods?search=${encodeURIComponent(docNo || code)}`;
      case "issue":
        return `/issue-goods?search=${encodeURIComponent(docNo)}`;
      case "delivery_confirm":
        return `/delivery-confirmation?search=${encodeURIComponent(docNo)}`;
      case "direct_shipping":
        return `/direct-shipping?search=${encodeURIComponent(docNo)}`;
      case "advertisement":
        return `/ad-receive?search=${encodeURIComponent(docNo)}`;
      case "ad_issue":
        return `/ad-issue?search=${encodeURIComponent(docNo)}`;
      case "defective":
        return `/defective-return?search=${encodeURIComponent(docNo)}`;
      case "assessment":
        return `/assessment?search=${encodeURIComponent(docNo)}`;
      case "claim":
        return `/claims?search=${encodeURIComponent(docNo)}`;
      case "swap":
        return `/swap?search=${encodeURIComponent(docNo)}`;
      case "stock_movement":
        return code ? `/stock-card?search=${encodeURIComponent(code)}` : `/stock-card`;
      default:
        return null;
    }
  };

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

      // Map receipt_document_no -> S/Ns (for both equipment serials and media players received under that doc)
      const receiptSnMap = new Map<string, string[]>();
      const { data: esnByReceipt } = await supabase
        .from("equipment_serial_numbers")
        .select("serial_number, receipt_document_no")
        .not("receipt_document_no", "is", null);
      for (const r of (esnByReceipt || []) as any[]) {
        const k = (r.receipt_document_no || "").trim();
        if (!k || !r.serial_number) continue;
        if (!receiptSnMap.has(k)) receiptSnMap.set(k, []);
        receiptSnMap.get(k)!.push(r.serial_number);
      }

      // Fetch from goods_issue_pending (with extended fields for tracker)
      // Note: confirmed_at lives on delivery_confirmations, not on goods_issue_pending
      const { data: issueData, error: issueError } = await supabase
        .from("goods_issue_pending")
        .select("id, document_no, created_at, status, equipment_name, equipment_code, requester_name, requester_department, approval_status, approved_at, issued_at, pickup_type, goods_issue_pending_items(serial_number), delivery_confirmations(confirmed_at)")
        .order("created_at", { ascending: false });
      if (issueError) console.error("issue fetch error", issueError);

      // Fetch from delivery_confirmations
      const { data: dcData } = await supabase
        .from("delivery_confirmations")
        .select("*, goods_issue_pending:goods_issue_pending_id(equipment_code, equipment_name, requester_name, goods_issue_pending_items(serial_number))")
        .order("created_at", { ascending: false });

      // Fetch from direct_shipments (with extended fields for tracker)
      const { data: dsData } = await supabase
        .from("direct_shipments")
        .select("*, direct_shipment_items(equipment_code, equipment_name, serial_number, quantity, unit)")
        .order("created_at", { ascending: false });

      // Fetch from advertisements (เอกสารรับโฆษณา)
      const { data: adData } = await supabase
        .from("advertisements")
        .select("id, code, name, status, total_quantity, created_at, supporting_doc_url, photo_urls, contact_name, entry_type, ad_media_types(name)")
        .order("created_at", { ascending: false });

      // Fetch from ad_issue_requests (เอกสารเบิกโฆษณา)
      const { data: adIssueData } = await supabase
        .from("ad_issue_requests")
        .select("id, document_no, status, issued_quantity, issue_purpose, created_at, issued_at, confirmed_at, advertisements(code, name)")
        .order("created_at", { ascending: false });

      // Fetch from defective_returns (นำของเสียเข้าระบบ)
      const { data: defData } = await supabase
        .from("defective_returns")
        .select("id, document_no, status, dispose_status, disposal_method, quantity, reason, item_condition, source_type, reporter_name, reporter_department, billboard_id, created_at, equipment:equipment_id(code, name, unit), media_player:media_player_id(code, name, serial_number_1, serial_number_2), billboards:billboard_id(code, location_name)")
        .order("created_at", { ascending: false });

      // Fetch from assessment_logs (บันทึกการประเมิน)
      const { data: asmData } = await supabase
        .from("assessment_logs")
        .select("id, document_no, status, outcome, serial_number, assessor_name, diagnosis_notes, created_at, equipment:equipment_id(code, name), media_player:media_player_id(code, name)")
        .order("created_at", { ascending: false });

      // Fetch from claim_records (ติดตามการเคลม)
      const { data: claimData } = await supabase
        .from("claim_records")
        .select("id, document_no, status, supplier_name, serial_number, manufacturer, created_at, equipment:equipment_id(code, name), media_player:media_player_id(code, name)")
        .order("created_at", { ascending: false });

      // Fetch from swap_requests (Swap อุปกรณ์/MP)
      const { data: swapData } = await supabase
        .from("swap_requests")
        .select("id, document_no, status, technician_name, description, created_at, old_serial_number, new_serial_number, reported_serial_number, reported_item_code, reported_item_name, billboard_id, billboards:billboard_id(code, location_name)")
        .order("created_at", { ascending: false })
        .limit(500);

      // Fetch from stock_movements (Stock Card) — limit to recent for performance
      const { data: smData } = await supabase
        .from("stock_movements")
        .select("id, equipment_id, equipment_code, equipment_name, movement_type, quantity, reference_id, reference_document, reference_type, notes, item_condition, location_id, created_at, locations:location_id(code, name, warehouses(name))")
        .order("created_at", { ascending: false })
        .limit(500);

      // Build reference_document -> S/N list (for stock_movements rows)
      const smRefSnMap = new Map<string, string[]>();
      const refDocs = Array.from(new Set((smData || []).map((s: any) => (s.reference_document || "").trim()).filter(Boolean)));
      if (refDocs.length > 0) {
        const { data: snByDoc } = await supabase
          .from("equipment_serial_numbers")
          .select("serial_number, receipt_document_no, issue_document_no")
          .or(`receipt_document_no.in.(${refDocs.map(d => `"${d}"`).join(",")}),issue_document_no.in.(${refDocs.map(d => `"${d}"`).join(",")})`);
        for (const r of (snByDoc || []) as any[]) {
          for (const k of [r.receipt_document_no, r.issue_document_no]) {
            const key = (k || "").trim();
            if (!key || !r.serial_number) continue;
            if (!smRefSnMap.has(key)) smRefSnMap.set(key, []);
            if (!smRefSnMap.get(key)!.includes(r.serial_number)) smRefSnMap.get(key)!.push(r.serial_number);
          }
        }
      }

      // Translate movement_type to Thai
      const movementTypeLabel = (mt: string): string => {
        const m = (mt || "").toLowerCase();
        const map: Record<string, string> = {
          receive: "รับเข้า",
          issue: "จ่ายออก",
          transfer: "โอนคลัง",
          adjustment: "ปรับสต็อก",
          adjust: "ปรับสต็อก",
          install_to_billboard: "ติดตั้งป้าย",
          uninstall_from_billboard: "ถอดจากป้าย",
          return_from_billboard: "คืนคลังจากป้าย",
          defective_in: "เข้าคลังของเสีย",
          defective_out: "จัดการของเสีย",
          pending_assessment_in: "พักรอประเมิน",
          pending_assessment_out: "ออกจากพักประเมิน",
          repair_in: "เข้าซ่อม",
          repair_out: "ซ่อมเสร็จ",
          claim_in: "เข้าเคลม",
          claim_out: "เคลมเสร็จ",
          refurb_back: "Refurbished กลับเข้าคลัง",
          swap_in: "Swap เข้า",
          swap_out: "Swap ออก",
        };
        return map[m] || mt;
      };

      const pendingDocs: DocumentRecord[] = (pendingData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: item.document_url,
        equipment_code: item.equipment_code, equipment_name: item.equipment_name,
        serial_number: item.serial_number || null,
        supplier_name: item.supplier_name, delivery_person_name: item.delivery_person_name,
        quantity: item.quantity, unit: item.unit, created_at: item.created_at,
        status: item.status, source: (item.status === "received" ? "received" : "pending") as "pending" | "received", raw: item,
      }));

      const receiptDocs: DocumentRecord[] = (receiptData || []).map((item: any) => {
        const sns = receiptSnMap.get((item.document_no || "").trim()) || [];
        return {
          id: item.id, document_no: item.document_no, document_url: item.document_url,
          equipment_code: item.equipment?.code || null, equipment_name: item.equipment?.name || null,
          serial_number: sns.length > 0 ? sns.join("\n") : null,
          supplier_name: item.supplier, delivery_person_name: null,
          quantity: item.quantity, unit: "ชิ้น", created_at: item.created_at,
          status: item.status, source: "received" as const, raw: item,
        };
      });

      const issueDocs: DocumentRecord[] = (issueData || []).map((item: any) => {
        const sns = (item.goods_issue_pending_items || [])
          .map((it: any) => it.serial_number?.trim())
          .filter(Boolean);
        const confirmedAt = item.delivery_confirmations?.[0]?.confirmed_at || null;
        return {
          id: item.id, document_no: item.document_no, document_url: null,
          equipment_code: item.equipment_code, equipment_name: item.equipment_name,
          serial_number: sns.length > 0 ? sns.join(", ") : null,
          supplier_name: null, delivery_person_name: item.requester_name,
          quantity: 0, unit: "-", created_at: item.created_at,
          status: item.status, source: "issue" as const,
          raw: { ...item, confirmed_at: confirmedAt },
        };
      });

      const dcDocs: DocumentRecord[] = (dcData || []).map((item: any) => {
        const gip = item.goods_issue_pending;
        const sns = (gip?.goods_issue_pending_items || [])
          .map((it: any) => it.serial_number?.trim()).filter(Boolean);
        return {
          id: item.id, document_no: item.document_no, document_url: null,
          equipment_code: gip?.equipment_code || null,
          equipment_name: gip?.equipment_name || null,
          serial_number: sns.length > 0 ? sns.join("\n") : null,
          supplier_name: null, delivery_person_name: gip?.requester_name || null,
          quantity: item.actual_quantity || 0, unit: "-", created_at: item.created_at,
          status: item.status, source: "delivery_confirm" as const, raw: item,
        };
      });

      const dsDocs: DocumentRecord[] = (dsData || []).map((item: any) => {
        const sns = (item.direct_shipment_items || [])
          .flatMap((i: any) => [i.serial_number, i.serial_number_2])
          .map((s: any) => s?.trim()).filter(Boolean);
        return {
          id: item.id, document_no: item.document_no, document_url: null,
          equipment_code: item.direct_shipment_items?.[0]?.equipment_code || null,
          equipment_name: item.direct_shipment_items?.map((i: any) => i.equipment_name).join(", ") || null,
          serial_number: sns.length > 0 ? sns.join(", ") : null,
          supplier_name: item.supplier_name, delivery_person_name: item.delivery_person_name,
          quantity: item.direct_shipment_items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0,
          unit: item.direct_shipment_items?.[0]?.unit || "-",
          created_at: item.created_at,
          status: item.status, source: "direct_shipping" as const, raw: item,
        };
      });

      const adDocs: DocumentRecord[] = (adData || []).map((item: any) => ({
        id: item.id, document_no: item.code, document_url: item.supporting_doc_url,
        equipment_code: item.code, equipment_name: item.name,
        serial_number: null,
        supplier_name: item.ad_media_types?.name || null, delivery_person_name: item.contact_name,
        quantity: item.total_quantity || 0, unit: "ชิ้น", created_at: item.created_at,
        status: item.status, source: "advertisement" as const, raw: item,
      }));

      const adIssueDocs: DocumentRecord[] = (adIssueData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: null,
        equipment_code: item.advertisements?.code || null, equipment_name: item.advertisements?.name || null,
        serial_number: null,
        supplier_name: null, delivery_person_name: item.issue_purpose,
        quantity: item.issued_quantity || 0, unit: "ชิ้น", created_at: item.created_at,
        status: item.status, source: "ad_issue" as const, raw: item,
      }));

      const defectiveDocs: DocumentRecord[] = (defData || []).map((item: any) => {
        const mp = item.media_player;
        const sns = mp ? [mp.serial_number_1, mp.serial_number_2].map((s: any) => (s || "").trim()).filter(Boolean) : [];
        const bb = item.billboards;
        return {
          id: item.id, document_no: item.document_no, document_url: null,
          equipment_code: item.equipment?.code || mp?.code || null,
          equipment_name: item.equipment?.name || mp?.name || null,
          serial_number: sns.length > 0 ? sns.join("\n") : null,
          supplier_name: bb ? `ป้าย ${bb.code || ""} ${bb.location_name || ""}`.trim() : (item.reporter_department || null),
          delivery_person_name: item.reporter_name || null,
          quantity: item.quantity || 0, unit: item.equipment?.unit || "ชิ้น",
          created_at: item.created_at, status: item.status,
          source: "defective" as const, raw: item,
        };
      });

      const assessmentDocs: DocumentRecord[] = (asmData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: null,
        equipment_code: item.equipment?.code || item.media_player?.code || null,
        equipment_name: item.equipment?.name || item.media_player?.name || null,
        serial_number: item.serial_number || null,
        supplier_name: null, delivery_person_name: item.assessor_name,
        quantity: 1, unit: "-", created_at: item.created_at, status: item.status,
        source: "assessment" as const, raw: item,
      }));

      const claimDocs: DocumentRecord[] = (claimData || []).map((item: any) => ({
        id: item.id, document_no: item.document_no, document_url: null,
        equipment_code: item.equipment?.code || item.media_player?.code || null,
        equipment_name: item.equipment?.name || item.media_player?.name || null,
        serial_number: item.serial_number || null,
        supplier_name: item.supplier_name || item.manufacturer || null, delivery_person_name: null,
        quantity: 1, unit: "-", created_at: item.created_at, status: item.status,
        source: "claim" as const, raw: item,
      }));

      const swapDocs: DocumentRecord[] = (swapData || []).map((item: any) => {
        const sns = [item.reported_serial_number, item.old_serial_number, item.new_serial_number]
          .map((s: any) => (s || "").trim()).filter(Boolean);
        const bb = item.billboards;
        return {
          id: item.id, document_no: item.document_no, document_url: null,
          equipment_code: item.reported_item_code || null,
          equipment_name: item.reported_item_name || item.description || null,
          serial_number: sns.length > 0 ? Array.from(new Set(sns)).join("\n") : null,
          supplier_name: bb ? `ป้าย ${bb.code || ""} ${bb.location_name || ""}`.trim() : null,
          delivery_person_name: item.technician_name,
          quantity: 0, unit: "-", created_at: item.created_at, status: item.status,
          source: "swap" as const, raw: item,
        };
      });

      const stockMoveDocs: DocumentRecord[] = (smData || []).map((item: any) => {
        const refDoc = (item.reference_document || "").trim();
        const sns = refDoc ? (smRefSnMap.get(refDoc) || []) : [];
        const loc = item.locations;
        const locLabel = loc
          ? `${loc.warehouses?.name ? loc.warehouses.name + " / " : ""}${loc.code || ""} ${loc.name || ""}`.trim()
          : null;
        return {
          id: item.id,
          document_no: refDoc || `SM-${item.id.slice(0, 8)}`,
          document_url: null,
          equipment_code: item.equipment_code,
          equipment_name: item.equipment_name,
          serial_number: sns.length > 0 ? sns.join("\n") : null,
          supplier_name: locLabel,
          delivery_person_name: item.notes || null,
          quantity: Math.abs(item.quantity || 0), unit: "-",
          created_at: item.created_at,
          status: movementTypeLabel(item.movement_type),
          source: "stock_movement" as const,
          raw: { ...item, _movement_type_label: movementTypeLabel(item.movement_type) },
        };
      });

      const merged = [
        ...pendingDocs, ...receiptDocs, ...issueDocs, ...dcDocs, ...dsDocs,
        ...adDocs, ...adIssueDocs,
        ...defectiveDocs, ...assessmentDocs, ...claimDocs, ...swapDocs, ...stockMoveDocs,
      ];
      // Sort newest first across all sources
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDocuments(merged);

      // Build S/N -> current location map (equipment serials + media players)
      const [esnRes, mpRes] = await Promise.all([
        supabase.from("equipment_serial_numbers")
          .select("serial_number, status, billboard_id, location_id, billboards(code, name, location_name), locations(code, name, warehouses(name))"),
        supabase.from("media_players")
          .select("serial_number_1, serial_number_2, status, billboard_id, location_id, billboards(code, name, location_name), locations(code, name, warehouses(name))"),
      ]);
      const map = new Map<string, LocationInfo>();
      const buildInfo = (row: any): LocationInfo => {
        const status = (row.status || "").toLowerCase();
        if (row.billboard_id && row.billboards) {
          const bb = row.billboards;
          return {
            kind: "billboard",
            label: `ป้าย ${bb.code || ""}`.trim(),
            sublabel: bb.location_name || bb.name || undefined,
          };
        }
        if (row.location_id && row.locations) {
          const loc = row.locations;
          const wh = loc.warehouses?.name;
          const isDefect = (loc.code || "").toUpperCase().includes("DEFECT") || (loc.name || "").includes("ของเสีย");
          return {
            kind: isDefect ? "defective" : "warehouse",
            label: isDefect ? "คลังของเสีย" : `คลัง ${wh || ""}`.trim(),
            sublabel: `${loc.code || ""} ${loc.name || ""}`.trim() || undefined,
          };
        }
        if (status === "issued" || status === "out") return { kind: "issued", label: "ถูกเบิกออกแล้ว" };
        return { kind: "unknown", label: "ไม่ทราบตำแหน่ง" };
      };
      for (const r of (esnRes.data || []) as any[]) {
        const sn = (r.serial_number || "").trim();
        if (sn) map.set(sn.toLowerCase(), buildInfo(r));
      }
      for (const r of (mpRes.data || []) as any[]) {
        const info = buildInfo(r);
        for (const sn of [r.serial_number_1, r.serial_number_2]) {
          const k = (sn || "").trim();
          if (k) map.set(k.toLowerCase(), info);
        }
      }
      setSnLocationMap(map);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("ไม่สามารถโหลดเอกสารได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  // Pre-compute set of reference_documents owned by a primary source (so we can hide redundant Stock Card rows)
  const primaryDocNos = new Set(
    documents.filter((d) => d.source !== "stock_movement").map((d) => (d.document_no || "").trim()).filter(Boolean)
  );

  const filteredDocuments = documents.filter((doc) => {
    if (hideRedundantStockCard && doc.source === "stock_movement" && primaryDocNos.has((doc.document_no || "").trim())) {
      return false;
    }
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
      case "advertisement": return <Badge variant="outline" className="border-pink-300 text-pink-700 dark:border-pink-700 dark:text-pink-400">รับโฆษณา</Badge>;
      case "ad_issue": return <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">เบิกโฆษณา</Badge>;
      case "defective": return <Badge variant="outline" className="border-destructive/40 text-destructive">นำของเสียเข้า</Badge>;
      case "assessment": return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">บันทึกประเมิน</Badge>;
      case "claim": return <Badge variant="outline" className="border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400">ส่งเคลม</Badge>;
      case "swap": return <Badge variant="outline" className="border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-400">Swap</Badge>;
      case "stock_movement": return <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-400">Stock Card</Badge>;
      default: return <Badge variant="outline">{source}</Badge>;
    }
  };

  // อธิบายที่มาของเอกสาร (เช่น DR สร้างจาก Swap หรือจาก Assessment) เพื่อไม่ให้ดูซ้ำกัน
  const getOriginLabel = (doc: DocumentRecord): string | null => {
    const r: any = doc.raw || {};
    if (doc.source === "defective") {
      const reason: string = r.reason || "";
      // ดึงเลขเอกสารต้นทางจาก reason เช่น "จากการ Swap (SWP-...)" หรือ "จากการประเมิน ASM-..."
      const swapMatch = reason.match(/SWP-[\d-]+/);
      const asmMatch = reason.match(/ASM-[\d-]+/);
      if (r.source_type === "from_assessment" || asmMatch) {
        return `สร้างอัตโนมัติจากผลประเมิน ${asmMatch?.[0] || ""}`.trim();
      }
      if (r.swap_request_id || swapMatch) {
        return `สร้างอัตโนมัติจาก Swap ${swapMatch?.[0] || ""}`.trim();
      }
      if (r.source_type === "billboard") return "ถอดจากป้ายโฆษณา";
      return "สร้างด้วยตนเอง";
    }
    if (doc.source === "assessment" && r.outcome) {
      const map: Record<string, string> = {
        defective: "ผล: ซ่อมไม่ได้ → ส่งเข้าคลังของเสีย",
        claim: "ผล: ส่งเคลม",
        self_repair: "ผล: ซ่อมเอง → คืนคลัง",
        return_refurb: "ผล: คืนคลังเป็นของ Refurb",
      };
      return map[r.outcome] || null;
    }
    return null;
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
                  <SelectItem value="advertisement">รับโฆษณา</SelectItem>
                  <SelectItem value="ad_issue">เบิกโฆษณา</SelectItem>
                  <SelectItem value="defective">นำของเสียเข้าระบบ</SelectItem>
                  <SelectItem value="assessment">บันทึกการประเมิน</SelectItem>
                  <SelectItem value="claim">ส่งเคลม</SelectItem>
                  <SelectItem value="swap">Swap</SelectItem>
                  <SelectItem value="stock_movement">Stock Card</SelectItem>
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
            <>
            <div className="max-w-full overflow-auto rounded-lg border" style={{ maxHeight: "70vh" }}>
              <Table className="min-w-[2400px]">
                <TableHeader className="sticky top-0 z-20 bg-background">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-xs font-semibold text-muted-foreground pl-6 min-w-[180px] sticky left-0 z-30 bg-background shadow-[1px_0_0_0_hsl(var(--border))]">เลขที่เอกสาร</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[140px]">ประเภท</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[140px]">สถานะปัจจุบัน</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[260px]">รหัส/ชื่ออุปกรณ์</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[220px]">Serial Number</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[220px]" title="ตำแหน่งปัจจุบันของอุปกรณ์/S/N">ตำแหน่งปัจจุบัน</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[200px]">ผู้จำหน่าย/ผู้ขอ</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right min-w-[140px]" title="จำนวนรวมในเอกสารนี้">จำนวนในเอกสาร</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[140px]">วันที่สร้าง</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[280px]">ความคืบหน้า</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground min-w-[140px]">อัปเดตล่าสุด</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-center pr-6 min-w-[120px]">เอกสาร</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((doc) => {
                    const trackerSteps = getDocumentProcessSteps(doc);
                    const snList = doc.serial_number
                      ? doc.serial_number.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
                      : [];
                    const statusInfo = getCurrentStatusBadge(doc);
                    const r = doc.raw || {};
                    const lastUpdate = r.confirmed_at || r.issued_at || r.approved_at || r.received_at || r.updated_at || doc.created_at;
                    return (
                      <TableRow key={`${doc.source}-${doc.id}`} className="border-border/30 hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-medium pl-6 whitespace-nowrap sticky left-0 z-10 bg-background shadow-[1px_0_0_0_hsl(var(--border))]">{doc.document_no}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getSourceBadge(doc.source)}
                            {(() => {
                              const origin = getOriginLabel(doc);
                              return origin ? (
                                <div className="text-[10px] text-muted-foreground leading-tight max-w-[180px]">{origin}</div>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                        <TableCell>
                          {doc.equipment_code || doc.equipment_name ? (
                            <div className="space-y-0.5">
                              {doc.equipment_code && <div className="font-semibold text-sm leading-tight">{doc.equipment_code}</div>}
                              {doc.equipment_name && <div className="text-xs text-muted-foreground leading-tight">{doc.equipment_name}</div>}
                            </div>
                          ) : <span className="text-muted-foreground/40">-</span>}
                        </TableCell>
                        <TableCell>
                          {snList.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[260px]">
                              {snList.map((sn, i) => (
                                <Badge
                                  key={`${sn}-${i}`}
                                  variant="outline"
                                  className="font-mono text-[10px] px-1.5 py-0 h-[18px] bg-accent/50 text-accent-foreground/80 border-border"
                                >
                                  {sn}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {(() => {
                            const colorFor = (k: LocationInfo["kind"]) =>
                              k === "billboard" ? "info"
                              : k === "warehouse" ? "success"
                              : k === "defective" ? "destructive"
                              : k === "issued" ? "warning"
                              : "outline";

                            if (snList.length > 0) {
                              const infos = snList.map((sn) => ({ sn, info: snLocationMap.get(sn.toLowerCase()) }));
                              const groups = new Map<string, { info: LocationInfo; sns: string[] }>();
                              for (const { sn, info } of infos) {
                                if (!info) continue;
                                const key = `${info.kind}|${info.label}|${info.sublabel || ""}`;
                                if (!groups.has(key)) groups.set(key, { info, sns: [] });
                                groups.get(key)!.sns.push(sn);
                              }
                              if (groups.size > 0) {
                                return (
                                  <div className="space-y-1 max-w-[220px]">
                                    {Array.from(groups.values()).map((g, i) => (
                                      <div key={i} className="space-y-0.5">
                                        <Badge variant={colorFor(g.info.kind) as any} className="text-[10px]">{g.info.label}</Badge>
                                        {g.info.sublabel && <div className="text-[10px] text-muted-foreground leading-tight">{g.info.sublabel}</div>}
                                        {groups.size > 1 && (
                                          <div className="text-[9px] text-muted-foreground/70 font-mono">{g.sns.join(", ")}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                            }

                            const r: any = doc.raw || {};
                            const bb = r.billboards;
                            if (bb && (doc.source === "swap" || doc.source === "defective")) {
                              return (
                                <div className="space-y-0.5">
                                  <Badge variant="info" className="text-[10px]">ป้าย {bb.code || ""}</Badge>
                                  {bb.location_name && <div className="text-[10px] text-muted-foreground leading-tight">{bb.location_name}</div>}
                                </div>
                              );
                            }
                            if (doc.source === "defective") {
                              const s = doc.status;
                              if (s === "completed" || s === "disposed") return <Badge variant="destructive" className="text-[10px]">จัดการเสร็จ (คลังของเสีย)</Badge>;
                              return <Badge variant="warning" className="text-[10px]">รอเข้าคลังของเสีย</Badge>;
                            }
                            if (doc.source === "assessment") {
                              return <Badge variant="purple" className="text-[10px]">พักรอประเมิน</Badge>;
                            }
                            if (doc.source === "claim") {
                              return <Badge variant="destructive" className="text-[10px]">รอเคลม</Badge>;
                            }
                            if (doc.source === "advertisement") {
                              if (doc.status === "in_storage") return <Badge variant="success" className="text-[10px]">อยู่ในคลัง</Badge>;
                              if (doc.status === "issued") return <Badge variant="warning" className="text-[10px]">ถูกเบิกใช้</Badge>;
                            }
                            if (doc.source === "received" || (doc.source === "pending" && doc.status === "received")) {
                              return <Badge variant="success" className="text-[10px]">เข้าคลังแล้ว</Badge>;
                            }
                            if (doc.source === "issue" && doc.status === "issued") {
                              return <Badge variant="warning" className="text-[10px]">จ่ายออกแล้ว</Badge>;
                            }
                            return <span className="text-muted-foreground/40">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-sm">{doc.supplier_name || doc.delivery_person_name || <span className="text-muted-foreground/40">-</span>}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">{doc.quantity > 0 ? `${doc.quantity} ${doc.unit}` : <span className="text-muted-foreground/40">-</span>}</TableCell>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: th })}</TableCell>
                        <TableCell className="py-3">
                          {trackerSteps ? (
                            <ProcessTracker steps={trackerSteps} size="sm" />
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="text-foreground tabular-nums">{format(new Date(lastUpdate), "dd/MM/yy HH:mm", { locale: th })}</div>
                          <div className="text-muted-foreground">{formatRelativeTimeTh(lastUpdate)}</div>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          {(() => {
                            const cats = getDocumentCategories(doc);
                            if (cats.length === 0) {
                              return <span className="text-muted-foreground/30">-</span>;
                            }
                            const fileCount = cats.reduce((sum, c) => {
                              const urls = Array.isArray(c.urls)
                                ? c.urls.filter(Boolean)
                                : c.urls
                                  ? splitUrls(c.urls)
                                  : [];
                              return sum + urls.length;
                            }, 0);
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                                title={`ดูเอกสาร (${fileCount} ไฟล์ใน ${cats.length} หมวด)`}
                                onClick={() => setPreviewState({ title: `เอกสาร ${doc.document_no}`, categories: cats })}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="text-xs tabular-nums">{fileCount}/{cats.length}</span>
                              </Button>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="px-6 pt-2">
              <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
            </div>
            </>
          )}
        </CardContent>
      </Card>
      <DocumentPreviewDialog
        open={!!previewState}
        onOpenChange={(open) => { if (!open) setPreviewState(null); }}
        title={previewState?.title || "ดูเอกสาร"}
        categories={previewState?.categories}
      />
    </div>
  );
}
