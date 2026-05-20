import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wrench,
  Package, ClipboardList, Monitor, MapPin, FileSearch, ArrowLeftRight,
  ClipboardCheck, FileCheck2, Truck, Inbox, Send, ShieldAlert, Layers,
  Hourglass, Hammer, Boxes, Archive, Search,
} from "lucide-react";
import ItemTracer from "@/components/reconciliation/ItemTracer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ============================================================
 * Types
 * ============================================================ */
interface QtyRow {
  key: string;
  label: string;
  description: string;
  count: number;
  link?: string;
  icon: any;
  tone?: "default" | "warn" | "danger" | "good";
}
interface QtyGroup { label: string; rows: QtyRow[]; }
interface StatusBucket { status: string; count: number; }
interface StatusGroup {
  key: string; label: string; icon: any; link?: string;
  total: number; buckets: StatusBucket[];
}
interface MPMismatch {
  id: string; code: string; name: string;
  status: string | null; billboard_id: string | null;
  location_id: string | null; quantity: number;
  expected: number; reason: string;
}
interface CrossRow {
  metric: string;
  description: string;
  values: { menu: string; value: number; link?: string }[];
}

/* ============================================================
 * Helpers
 * ============================================================ */
function expectedMpQuantity(row: { billboard_id: string | null; location_id: string | null; status: string | null }) {
  if (!row.billboard_id && row.location_id && (row.status === "active" || row.status === "in_stock")) return 1;
  return 0;
}

/** Mapping มาตรฐานของชื่อสถานะ — ใช้ร่วมทั้งระบบ ป้องกัน label ไม่ตรงกันข้ามเมนู */
const STATUS_LABEL: Record<string, string> = {
  // generic workflow
  draft: "ฉบับร่าง",
  pending: "รออนุมัติ",
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
  completed: "เสร็จสิ้น",
  in_progress: "กำลังดำเนินการ",
  cancelled: "ยกเลิก",
  unknown: "ไม่ระบุ",
  // stock state
  in_stock: "อยู่ในคลัง",
  out_of_stock: "หมดสต๊อก",
  installed: "ติดตั้งแล้ว",
  active: "พร้อมใช้งาน",
  inactive: "ไม่ใช้งาน",
  in_transit: "อยู่ระหว่างเคลื่อนย้าย",
  defective: "ของเสีย",
  damaged: "ชำรุด",
  lost: "สูญหาย",
  // assessment workflow (Media Player)
  pending_assessment: "พักรอประเมิน",
  under_repair: "กำลังซ่อม",
  in_claim: "รอเคลม",
  claim: "เคลม",
  refurbished: "Refurbished",
  pending_warehouse_return: "รอเข้าคลัง (Swap)",
  pending_warehouse_entry: "รอรับเข้าคลังของเสีย",
  // issue / receipt
  issued: "จ่ายแล้ว / รอระบุป้าย",
  partial_issued: "จ่ายบางส่วน",
  received: "รับแล้ว",
  partial_received: "รับบางส่วน",
  waiting_stock: "รอสินค้า",
  returned: "คืนของแล้ว",
  return_pending: "รอคืนของ",
  // direct shipping
  procurement: "จัดซื้อ",
  shipped: "ส่งของแล้ว",
  delivered: "ส่งถึงปลายทาง",
  // ad
  in_storage: "เก็บในคลัง",
  in_use: "ใช้งานอยู่",
  expired: "หมดอายุ",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  in_stock: "bg-green-100 text-green-800 border-green-200",
  out_of_stock: "bg-red-100 text-red-800 border-red-200",
  installed: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  in_transit: "bg-amber-100 text-amber-800 border-amber-200",
  defective: "bg-red-100 text-red-800 border-red-200",
  damaged: "bg-red-100 text-red-800 border-red-200",
  lost: "bg-red-100 text-red-800 border-red-200",
  pending_assessment: "bg-purple-100 text-purple-800 border-purple-200",
  under_repair: "bg-cyan-100 text-cyan-800 border-cyan-200",
  in_claim: "bg-rose-100 text-rose-800 border-rose-200",
  claim: "bg-rose-100 text-rose-800 border-rose-200",
  refurbished: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending_warehouse_return: "bg-amber-100 text-amber-800 border-amber-200",
  pending_warehouse_entry: "bg-amber-100 text-amber-800 border-amber-200",
  issued: "bg-amber-100 text-amber-800 border-amber-200",
  partial_issued: "bg-amber-100 text-amber-800 border-amber-200",
  received: "bg-green-100 text-green-800 border-green-200",
  partial_received: "bg-amber-100 text-amber-800 border-amber-200",
  waiting_stock: "bg-amber-100 text-amber-800 border-amber-200",
  returned: "bg-gray-100 text-gray-700 border-gray-200",
  return_pending: "bg-amber-100 text-amber-800 border-amber-200",
  procurement: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  in_storage: "bg-green-100 text-green-800 border-green-200",
  in_use: "bg-blue-100 text-blue-800 border-blue-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  unknown: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;
const statusClass = (s: string) => STATUS_TONE[s] ?? "bg-gray-100 text-gray-700 border-gray-200";

/** count helpers — bypass Supabase 1000-row cap */
async function countAll(table: string, filter?: (q: any) => any): Promise<number> {
  let q: any = supabase.from(table as any).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) { console.error(`count ${table} error`, error); return 0; }
  return count || 0;
}

/** fetch all rows of one column (paginated) — for status grouping */
async function fetchAllColumn(table: string, col: string): Promise<any[]> {
  const out: any[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await (supabase.from(table as any) as any)
      .select(col)
      .range(from, from + pageSize - 1);
    if (error) { console.error(`fetch ${table}.${col}`, error); break; }
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

const bucketize = (rows: any[], col = "status"): StatusBucket[] => {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const s = r?.[col] || "unknown";
    m.set(s, (m.get(s) || 0) + 1);
  });
  return Array.from(m.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
};

/* ============================================================
 * Page
 * ============================================================ */
export default function StockReconciliation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const [summary, setSummary] = useState({
    eqStockSum: 0,
    mpInStock: 0,
    mpInstalled: 0,
    mpQuarantine: 0,
    bbActive: 0,
    defWaiting: 0,
    docsTotal: 0,
    pendingDocs: 0,
  });
  const [qtyGroups, setQtyGroups] = useState<QtyGroup[]>([]);
  const [crossRows, setCrossRows] = useState<CrossRow[]>([]);
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
  const [mpMismatches, setMpMismatches] = useState<MPMismatch[]>([]);
  const [snDiff, setSnDiff] = useState<{ id: string; code: string; name: string; qty: number; sn: number }[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      /* ---------------- Master data (full rows, may be small) ---------------- */
      const [eqRes, mpRes] = await Promise.all([
        supabase.from("equipment").select("id, code, name, quantity_in_stock, is_active").range(0, 49999),
        supabase.from("media_players").select("id, code, name, status, billboard_id, location_id, quantity, is_active").range(0, 49999),
      ]);
      if (eqRes.error) throw eqRes.error;
      if (mpRes.error) throw mpRes.error;

      const eqActive = (eqRes.data || []).filter((e: any) => e.is_active);
      const mps = (mpRes.data || []).filter((m: any) => m.is_active);

      /* ---------------- Counts (exact, bypass 1000 cap) ---------------- */
      const [
        snTotal, snInStock, snInstalled, snDefective,
        bbActive, bbTotal,
        defWaiting, defTotal,
        grTotal, giTotal, gipTotal,
        gipPending, gipWaiting,
        swTotal, asTotal, clTotal, dsTotal, elTotal, prTotal, adTotal, airTotal,
      ] = await Promise.all([
        countAll("equipment_serial_numbers"),
        countAll("equipment_serial_numbers", (q) => q.eq("status", "in_stock")),
        countAll("equipment_serial_numbers", (q) => q.eq("status", "installed")),
        countAll("equipment_serial_numbers", (q) => q.eq("status", "defective")),
        countAll("billboards", (q) => q.eq("status", "active")),
        countAll("billboards"),
        countAll("defective_returns", (q) => q.eq("status", "pending_warehouse_entry")),
        countAll("defective_returns"),
        countAll("goods_receipt"),
        countAll("goods_issue"),
        countAll("goods_issue_pending"),
        countAll("goods_issue_pending", (q) => q.in("status", ["pending", "pending_approval"])),
        countAll("goods_issue_pending", (q) => q.eq("status", "waiting_stock")),
        countAll("swap_requests"),
        countAll("assessment_logs"),
        countAll("claim_records"),
        countAll("direct_shipments"),
        countAll("equipment_loans"),
        countAll("purchase_requests"),
        countAll("advertisements"),
        countAll("ad_issue_requests"),
      ]);

      /* ---------------- MP rule check ---------------- */
      const mpQuantitySum = mps.reduce((s: number, m: any) => s + (m.quantity || 0), 0);
      const mpInStockRule = mps.filter((m: any) => expectedMpQuantity(m) === 1).length;
      const mpInstalled = mps.filter((m: any) => !!m.billboard_id).length;
      const mpDefective = mps.filter((m: any) => m.status === "defective").length;
      const mpPendingAssess = mps.filter((m: any) => m.status === "pending_assessment").length;
      const mpUnderRepair = mps.filter((m: any) => m.status === "under_repair").length;
      const mpInClaim = mps.filter((m: any) => m.status === "in_claim").length;
      const mpTransit = mps.filter((m: any) => m.status === "pending_warehouse_return").length;
      const mpIssuedPending = mps.filter((m: any) => !m.billboard_id && (m.status === "issued" || m.status === "in_transit")).length;

      const mismatches: MPMismatch[] = [];
      mps.forEach((m: any) => {
        const exp = expectedMpQuantity(m);
        if ((m.quantity ?? 0) !== exp) {
          mismatches.push({
            ...m,
            quantity: m.quantity ?? 0,
            expected: exp,
            reason:
              exp === 1 ? "ควรนับ 1 (อยู่ในคลัง)"
              : m.billboard_id ? "ติดตั้งบนป้าย → 0"
              : !m.location_id ? "ไม่ระบุคลัง / in-transit → 0"
              : `สถานะ ${m.status} → 0`,
          });
        }
      });
      setMpMismatches(mismatches);

      /* ---------------- equipment vs S/N ---------------- */
      // อ่าน S/N เฉพาะที่ in_stock เพื่อเทียบรายอุปกรณ์
      const snRows = await fetchAllColumn("equipment_serial_numbers", "equipment_id, status");
      const snCount = new Map<string, number>();
      const snHas = new Set<string>();
      snRows.forEach((s: any) => {
        snHas.add(s.equipment_id);
        if (s.status === "in_stock") snCount.set(s.equipment_id, (snCount.get(s.equipment_id) || 0) + 1);
      });
      const snDiffList: { id: string; code: string; name: string; qty: number; sn: number }[] = [];
      eqActive.forEach((e: any) => {
        if (!snHas.has(e.id)) return;
        const c = snCount.get(e.id) || 0;
        const q = e.quantity_in_stock ?? 0;
        if (c !== q) snDiffList.push({ id: e.id, code: e.code, name: e.name, qty: q, sn: c });
      });
      setSnDiff(snDiffList);

      const eqQtySum = eqActive.reduce((s: number, e: any) => s + (e.quantity_in_stock || 0), 0);

      /* ---------------- Summary cards ---------------- */
      setSummary({
        eqStockSum: eqQtySum,
        mpInStock: mpInStockRule,
        mpInstalled,
        mpQuarantine: mpPendingAssess + mpUnderRepair + mpInClaim + mpTransit,
        bbActive,
        defWaiting,
        docsTotal: grTotal + giTotal + gipTotal,
        pendingDocs: gipPending + gipWaiting + defWaiting,
      });

      /* ---------------- Quantity groups ---------------- */
      const groups: QtyGroup[] = [
        {
          label: "อุปกรณ์ทั่วไป (Equipment)",
          rows: [
            { key: "eq_total", label: "รายการอุปกรณ์ทั้งหมด", description: "Master Data (is_active)", count: eqActive.length, link: "/inventory-report", icon: Package },
            { key: "eq_qty", label: "ยอดรวม Stock (Inventory)", description: "Σ equipment.quantity_in_stock", count: eqQtySum, link: "/inventory-report", icon: ClipboardList, tone: "good" },
            { key: "sn_total", label: "S/N ทั้งหมด", description: "equipment_serial_numbers", count: snTotal, link: "/stock-card", icon: FileSearch },
            { key: "sn_in_stock", label: "S/N อยู่ในคลัง", description: "status = in_stock", count: snInStock, link: "/stock-card", icon: Boxes, tone: "good" },
            { key: "sn_installed", label: "S/N ติดตั้งบนป้าย", description: "status = installed", count: snInstalled, link: "/equipment-tracking", icon: MapPin },
            { key: "sn_defective", label: "S/N ของเสีย", description: "status = defective", count: snDefective, link: "/incomplete-issues", icon: ShieldAlert, tone: snDefective > 0 ? "warn" : "default" },
          ],
        },
        {
          label: "Media Player",
          rows: [
            { key: "mp_total", label: "Media Player ทั้งหมด", description: "media_players (is_active)", count: mps.length, link: "/media-player-report", icon: Monitor },
            { key: "mp_qty_sum", label: "Σ media_players.quantity", description: "ยอดคงคลัง MP (single source)", count: mpQuantitySum, link: "/media-player-report", icon: ClipboardList, tone: "good" },
            { key: "mp_in_stock", label: "อยู่ในคลังพร้อมใช้ (rule)", description: "billboard=null & status=active/in_stock", count: mpInStockRule, link: "/media-player-report", icon: Inbox, tone: "good" },
            { key: "mp_installed", label: "ติดตั้งบนป้าย", description: "billboard_id ≠ null", count: mpInstalled, link: "/equipment-tracking", icon: MapPin },
            { key: "mp_issued_pending", label: "จ่ายแล้ว / รอระบุป้าย", description: "status=issued/in_transit & ยังไม่มี billboard", count: mpIssuedPending, link: "/incomplete-issues", icon: Send, tone: mpIssuedPending > 0 ? "warn" : "default" },
            { key: "mp_pending_assess", label: "พักรอประเมิน", description: "status = pending_assessment", count: mpPendingAssess, link: "/assessment", icon: Hourglass, tone: mpPendingAssess > 0 ? "warn" : "default" },
            { key: "mp_repair", label: "กำลังซ่อม", description: "status = under_repair", count: mpUnderRepair, link: "/assessment", icon: Hammer },
            { key: "mp_claim", label: "รอเคลม", description: "status = in_claim", count: mpInClaim, link: "/claims", icon: FileCheck2 },
            { key: "mp_transit", label: "รอเข้าคลัง (Swap)", description: "status = pending_warehouse_return", count: mpTransit, link: "/swap", icon: Truck, tone: mpTransit > 0 ? "warn" : "default" },
            { key: "mp_defective", label: "ของเสีย (Defective)", description: "status = defective", count: mpDefective, link: "/incomplete-issues", icon: ShieldAlert, tone: mpDefective > 0 ? "warn" : "default" },
          ],
        },
        {
          label: "ป้ายโฆษณา / ของเสีย",
          rows: [
            { key: "bb_active", label: "ป้ายใช้งาน", description: "billboards.status = active", count: bbActive, link: "/billboards", icon: MapPin, tone: "good" },
            { key: "bb_total", label: "ป้ายทั้งหมด", description: "billboards (ทุกสถานะ)", count: bbTotal, link: "/billboards", icon: Layers },
            { key: "def_wait", label: "รอรับเข้าคลังของเสีย", description: "defective_returns = pending_warehouse_entry", count: defWaiting, link: "/incomplete-issues", icon: ShieldAlert, tone: defWaiting > 0 ? "warn" : "default" },
            { key: "def_total", label: "รายการของเสียทั้งหมด", description: "defective_returns ทุกสถานะ", count: defTotal, link: "/incomplete-issues", icon: Archive },
          ],
        },
        {
          label: "เอกสาร / ธุรกรรม (รวม)",
          rows: [
            { key: "gr", label: "เอกสารรับเข้าคลัง", description: "goods_receipt", count: grTotal, link: "/document-search", icon: Inbox },
            { key: "gi", label: "เอกสารจ่ายสินค้า", description: "goods_issue", count: giTotal, link: "/document-search", icon: Send },
            { key: "gip", label: "ใบขอเบิก (ทั้งหมด)", description: "goods_issue_pending", count: gipTotal, link: "/issue-request", icon: ClipboardList },
            { key: "gip_pending", label: "ใบขอเบิกค้างอนุมัติ", description: "status = pending/pending_approval", count: gipPending, link: "/manager-approval", icon: Hourglass, tone: gipPending > 0 ? "warn" : "default" },
            { key: "gip_wait", label: "ใบขอเบิกรอสินค้า", description: "status = waiting_stock", count: gipWaiting, link: "/waiting-stock", icon: Hourglass, tone: gipWaiting > 0 ? "warn" : "default" },
          ],
        },
      ];
      setQtyGroups(groups);

      /* ---------------- Cross-menu comparison ---------------- */
      // ตัวเลขเดียวกันที่ "ควร" ตรงกันข้ามเมนู — เปิด review ให้คลังเช็คได้
      const cross: CrossRow[] = [
        {
          metric: "Equipment Stock (ยอดคงคลังอุปกรณ์)",
          description: "ค่าที่แสดงในรายงานสินค้าคงคลัง / ผลรวม S/N in_stock / ผลรวม Stock Card ล่าสุด",
          values: [
            { menu: "รายงานสินค้าคงคลัง", value: eqQtySum, link: "/inventory-report" },
            { menu: "S/N in_stock", value: snInStock, link: "/stock-card" },
          ],
        },
        {
          metric: "Media Player พร้อมใช้",
          description: "ตัวเลข MP ที่อยู่ในคลังพร้อมใช้งาน — ทุกเมนูควรตรงกัน",
          values: [
            { menu: "Σ media_players.quantity", value: mpQuantitySum, link: "/media-player-report" },
            { menu: "อยู่ในคลังพร้อมใช้ (rule)", value: mpInStockRule, link: "/media-player-report" },
            { menu: "Global Search (อ่าน quantity)", value: mpQuantitySum, link: "/" },
          ],
        },
        {
          metric: "อุปกรณ์ติดตั้งบนป้าย",
          description: "เทียบ S/N installed กับ MP ติดตั้ง และยอดป้ายใช้งาน",
          values: [
            { menu: "S/N ติดตั้ง (Equipment)", value: snInstalled, link: "/equipment-tracking" },
            { menu: "Media Player ติดตั้ง", value: mpInstalled, link: "/equipment-tracking" },
            { menu: "ป้ายใช้งาน (Billboards)", value: bbActive, link: "/billboards" },
          ],
        },
        {
          metric: "เอกสารธุรกรรม (รวม)",
          description: "ค้นหาเอกสาร = รับเข้า + จ่ายออก + ใบขอเบิก",
          values: [
            { menu: "รับเข้าคลัง", value: grTotal, link: "/document-search" },
            { menu: "จ่ายสินค้า", value: giTotal, link: "/document-search" },
            { menu: "ใบขอเบิก", value: gipTotal, link: "/issue-request" },
          ],
        },
      ];
      setCrossRows(cross);

      /* ---------------- Status data (full rows for grouping) ---------------- */
      const [
        grStatuses, giStatuses, gipStatuses, swStatuses, asStatuses,
        clStatuses, defStatuses, dsStatuses, elStatuses, prStatuses,
        adStatuses, airStatuses,
      ] = await Promise.all([
        fetchAllColumn("goods_receipt", "status"),
        fetchAllColumn("goods_issue", "status"),
        fetchAllColumn("goods_issue_pending", "status"),
        fetchAllColumn("swap_requests", "status"),
        fetchAllColumn("assessment_logs", "status"),
        fetchAllColumn("claim_records", "status"),
        fetchAllColumn("defective_returns", "status"),
        fetchAllColumn("direct_shipments", "status"),
        fetchAllColumn("equipment_loans", "status"),
        fetchAllColumn("purchase_requests", "status"),
        fetchAllColumn("advertisements", "status"),
        fetchAllColumn("ad_issue_requests", "status"),
      ]);

      const sGroups: StatusGroup[] = [
        { key: "gr", label: "การรับเข้าคลัง (Goods Receipt)", icon: Inbox, link: "/document-search", total: grTotal, buckets: bucketize(grStatuses) },
        { key: "gip", label: "ใบขอเบิก (Issue Request)", icon: ClipboardList, link: "/issue-request", total: gipTotal, buckets: bucketize(gipStatuses) },
        { key: "gi", label: "การจ่ายสินค้า (Goods Issue)", icon: Send, link: "/document-search", total: giTotal, buckets: bucketize(giStatuses) },
        { key: "swap", label: "Swap (เปลี่ยน MP)", icon: ArrowLeftRight, link: "/swap", total: swTotal, buckets: bucketize(swStatuses) },
        { key: "as", label: "บันทึกการประเมิน (Assessment)", icon: ClipboardCheck, link: "/assessment", total: asTotal, buckets: bucketize(asStatuses) },
        { key: "cl", label: "การเคลม (Claim)", icon: FileCheck2, link: "/claims", total: clTotal, buckets: bucketize(clStatuses) },
        { key: "def", label: "คืนของเสีย (Defective Returns)", icon: ShieldAlert, link: "/incomplete-issues", total: defTotal, buckets: bucketize(defStatuses) },
        { key: "ds", label: "จัดส่งตรง (Direct Shipping)", icon: Truck, link: "/direct-shipping-approval", total: dsTotal, buckets: bucketize(dsStatuses) },
        { key: "el", label: "ยืม-คืนอุปกรณ์ (Loans)", icon: ArrowLeftRight, link: "/equipment-loans", total: elTotal, buckets: bucketize(elStatuses) },
        { key: "pr", label: "ใบขอซื้อ (PR)", icon: ClipboardList, link: "/purchase-requests", total: prTotal, buckets: bucketize(prStatuses) },
        { key: "ad", label: "งานสื่อโฆษณา (Advertisements)", icon: MapPin, link: "/ad-management", total: adTotal, buckets: bucketize(adStatuses) },
        { key: "air", label: "ใบขอเบิกสื่อ (Ad Issue)", icon: Send, link: "/ad-issue", total: airTotal, buckets: bucketize(airStatuses) },
      ];
      setStatusGroups(sGroups);
    } catch (e: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const fixMediaPlayers = async () => {
    if (mpMismatches.length === 0) return;
    setFixing(true);
    try {
      let ok = 0, fail = 0;
      for (const r of mpMismatches) {
        const { error } = await supabase.from("media_players").update({ quantity: r.expected }).eq("id", r.id);
        if (error) fail++; else ok++;
      }
      toast.success(`แก้ไขสำเร็จ ${ok}${fail ? ` / ผิดพลาด ${fail}` : ""}`);
      await loadAll();
    } finally { setFixing(false); }
  };

  const totalIssues = mpMismatches.length + snDiff.length;

  /* ============================================================ */

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-7 w-7 text-primary" />
            ตรวจสอบยอด & สถานะ Stock
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            หน้ารวมเปรียบเทียบยอดคงคลังข้ามทุกรายงาน (รายงานสินค้าคงคลัง · Stock Card · MP Report · ค้นหาเอกสาร · รายงานเบิกตามป้าย · ค้นหาอุปกรณ์)
            พร้อมตรวจสอบความสอดคล้องระหว่างเมนู และใช้คำสถานะมาตรฐานเดียวกันทั้งระบบ
          </p>
        </div>
        <Button onClick={loadAll} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          ตรวจซ้ำ
        </Button>
      </div>

      {/* ====================== SUMMARY CARDS (always visible) ====================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: "ยอดคลัง (อุปกรณ์)", v: summary.eqStockSum, icon: Boxes, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "MP พร้อมใช้", v: summary.mpInStock, icon: Monitor, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "MP ติดตั้งบนป้าย", v: summary.mpInstalled, icon: MapPin, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { label: "MP รอ workflow", v: summary.mpQuarantine, icon: Hourglass, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
          { label: "ป้ายใช้งาน", v: summary.bbActive, icon: MapPin, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { label: "รอเข้าคลังของเสีย", v: summary.defWaiting, icon: ShieldAlert, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "เอกสารทั้งหมด", v: summary.docsTotal, icon: FileSearch, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "รายการค้างดำเนินการ", v: summary.pendingDocs, icon: Hourglass, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className={`border ${c.bg}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className={`h-3.5 w-3.5 ${c.color}`} />
                  {c.label}
                </div>
                <div className={`text-2xl font-bold mt-1 ${c.color}`}>{c.v.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="tracer" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="tracer" className="gap-2">
            <Search className="h-4 w-4" />
            ตรวจสอบรายตัว
          </TabsTrigger>
          <TabsTrigger value="qty" className="gap-2">
            <Package className="h-4 w-4" />
            จำนวนตามรายงาน
          </TabsTrigger>
          <TabsTrigger value="cross" className="gap-2">
            <Layers className="h-4 w-4" />
            เปรียบเทียบข้ามเมนู
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            สถานะรายการ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracer">
          <ItemTracer />
        </TabsContent>


        {/* ====================== TAB 1: QUANTITIES ====================== */}
        <TabsContent value="qty" className="space-y-5">
          {totalIssues > 0 && (
            <Card className="border-amber-300 bg-amber-50/40">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-amber-900">พบความไม่สอดคล้อง {totalIssues} รายการ</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Media Player quantity ผิด rule: <b>{mpMismatches.length}</b> รายการ
                      &nbsp;·&nbsp; equipment.quantity_in_stock ≠ S/N in_stock: <b>{snDiff.length}</b> รายการ
                    </div>
                  </div>
                  {mpMismatches.length > 0 && (
                    <Button onClick={fixMediaPlayers} disabled={fixing} size="sm">
                      {fixing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
                      แก้ MP อัตโนมัติ
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {totalIssues === 0 && !loading && (
            <Card className="border-green-300 bg-green-50/40">
              <CardContent className="pt-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">ยอดคงคลังตรงกันทุกแหล่ง ไม่มีรายการขัดแย้ง</span>
              </CardContent>
            </Card>
          )}

          {qtyGroups.map((g) => (
            <Card key={g.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{g.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {g.rows.map((r) => {
                    const Icon = r.icon;
                    const tone =
                      r.tone === "danger" ? "border-red-300 bg-red-50/40"
                      : r.tone === "warn" ? "border-amber-300 bg-amber-50/40"
                      : r.tone === "good" ? "border-emerald-300 bg-emerald-50/40"
                      : "border-border bg-card";
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => r.link && navigate(r.link)}
                        className={`text-left rounded-lg border p-3 transition hover:shadow-md hover:border-primary/50 ${tone}`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {r.label}
                        </div>
                        <div className="text-2xl font-bold mt-1.5">{r.count.toLocaleString()}</div>
                        <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description}</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {mpMismatches.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Media Player ที่ quantity ไม่ตรง rule ({mpMismatches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส / ชื่อ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">ปัจจุบัน</TableHead>
                      <TableHead className="text-right">ที่ถูกต้อง</TableHead>
                      <TableHead>เหตุผล</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mpMismatches.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.code}</div>
                          <div className="text-xs text-muted-foreground">{r.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass(r.status || "")}>
                            {statusLabel(r.status || "-")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">{r.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-green-700">{r.expected}</TableCell>
                        <TableCell className="text-xs">{r.reason}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/media-player/${r.id}`)}>เปิด</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {snDiff.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  equipment.quantity_in_stock ≠ S/N in_stock ({snDiff.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส / ชื่อ</TableHead>
                      <TableHead className="text-right">quantity_in_stock</TableHead>
                      <TableHead className="text-right">S/N in_stock</TableHead>
                      <TableHead className="text-right">ส่วนต่าง</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snDiff.map((r) => {
                      const diff = r.qty - r.sn;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{r.code}</div>
                            <div className="text-xs text-muted-foreground">{r.name}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{r.qty}</TableCell>
                          <TableCell className="text-right font-mono">{r.sn}</TableCell>
                          <TableCell className={`text-right font-mono ${diff === 0 ? "" : "text-red-600"}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/stock-card?equipmentId=${r.id}`)}>เปิด</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ====================== TAB 2: CROSS-MENU ====================== */}
        <TabsContent value="cross" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">เปรียบเทียบตัวเลขเดียวกันข้ามเมนู</CardTitle>
              <p className="text-xs text-muted-foreground">
                แต่ละแถวคือ "ตัวเลขที่ควรจะตรงกันทุกเมนู" — ถ้าเลขในแต่ละช่องเท่ากัน แปลว่าระบบตัด Stock / Update สถานะถูกต้อง
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {crossRows.map((row) => {
                  const vals = row.values.map((v) => v.value);
                  const consistent = vals.every((v) => v === vals[0]);
                  return (
                    <div key={row.metric} className={`rounded-lg border p-3 ${consistent ? "bg-emerald-50/30 border-emerald-200" : "bg-amber-50/40 border-amber-300"}`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {consistent
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                            {row.metric}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
                        </div>
                        <Badge variant="outline" className={consistent ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}>
                          {consistent ? "ตรงกัน" : "ไม่ตรง"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        {row.values.map((v, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => v.link && navigate(v.link)}
                            className="text-left rounded-md border bg-background p-2 hover:border-primary/50 hover:shadow-sm transition"
                          >
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{v.menu}</div>
                            <div className="text-xl font-bold mt-0.5 font-mono">{v.value.toLocaleString()}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">คำสถานะมาตรฐาน (ใช้ร่วมทั้งระบบ)</CardTitle>
              <p className="text-xs text-muted-foreground">
                อ้างอิงคำเรียกสถานะให้เหมือนกันทุกเมนู — ลด confusion เวลา cross-check
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                {Object.keys(STATUS_LABEL).map((k) => (
                  <div key={k} className="flex items-center justify-between gap-2 rounded border p-2">
                    <code className="text-[11px] text-muted-foreground">{k}</code>
                    <Badge variant="outline" className={statusClass(k)}>{statusLabel(k)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================== TAB 3: STATUS ====================== */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {statusGroups.map((g) => {
              const Icon = g.icon;
              return (
                <Card key={g.key} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {g.label}
                      </span>
                      <Badge variant="secondary">{g.total.toLocaleString()}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-3">
                    {g.buckets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">ไม่มีข้อมูล</p>
                    ) : (
                      <div className="space-y-1.5">
                        {g.buckets.map((b) => (
                          <div key={b.status} className="flex items-center justify-between text-sm">
                            <Badge variant="outline" className={statusClass(b.status)}>
                              {statusLabel(b.status)}
                            </Badge>
                            <span className="font-mono font-semibold">{b.count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {g.link && (
                      <Button size="sm" variant="ghost" className="self-end" onClick={() => navigate(g.link!)}>
                        เปิดเมนู →
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
