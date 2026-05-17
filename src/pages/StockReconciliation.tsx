import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wrench,
  Package, ClipboardList, Monitor, MapPin, FileSearch, ArrowLeftRight,
  ClipboardCheck, FileCheck2, Truck, Inbox, Send, ShieldAlert,
} from "lucide-react";
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
  tone?: "default" | "warn" | "danger";
}

interface QtyGroup {
  label: string;
  rows: QtyRow[];
}

interface StatusBucket {
  status: string;
  count: number;
}

interface StatusGroup {
  key: string;
  label: string;
  icon: any;
  link?: string;
  total: number;
  buckets: StatusBucket[];
}

interface MPMismatch {
  id: string;
  code: string;
  name: string;
  status: string | null;
  billboard_id: string | null;
  location_id: string | null;
  quantity: number;
  expected: number;
  reason: string;
}

/* ============================================================
 * Helpers
 * ============================================================ */
function expectedMpQuantity(row: { billboard_id: string | null; location_id: string | null; status: string | null }) {
  if (!row.billboard_id && row.location_id && (row.status === "active" || row.status === "in_stock")) return 1;
  return 0;
}

const STATUS_LABEL: Record<string, string> = {
  // generic
  pending: "รออนุมัติ",
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
  completed: "เสร็จสิ้น",
  in_progress: "กำลังดำเนินการ",
  cancelled: "ยกเลิก",
  // stock
  in_stock: "อยู่ในคลัง",
  installed: "ติดตั้งแล้ว",
  active: "พร้อมใช้งาน",
  in_transit: "อยู่ระหว่างเคลื่อนย้าย",
  defective: "ของเสีย",
  pending_assessment: "รอประเมิน",
  under_repair: "ซ่อม",
  in_claim: "อยู่ระหว่างเคลม",
  pending_warehouse_return: "รอคืนเข้าคลัง",
  pending_warehouse_entry: "รอรับเข้าคลัง",
  // issue / receipt
  issued: "จ่ายแล้ว",
  received: "รับแล้ว",
  waiting_stock: "รอสินค้า",
  returned: "คืนของ",
  // ad
  in_storage: "เก็บในคลัง",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  pending_approval: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  in_stock: "bg-green-100 text-green-800 border-green-200",
  installed: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-green-100 text-green-800 border-green-200",
  in_transit: "bg-amber-100 text-amber-800 border-amber-200",
  defective: "bg-red-100 text-red-800 border-red-200",
  pending_assessment: "bg-purple-100 text-purple-800 border-purple-200",
  under_repair: "bg-orange-100 text-orange-800 border-orange-200",
  in_claim: "bg-orange-100 text-orange-800 border-orange-200",
  pending_warehouse_return: "bg-amber-100 text-amber-800 border-amber-200",
  pending_warehouse_entry: "bg-amber-100 text-amber-800 border-amber-200",
  issued: "bg-blue-100 text-blue-800 border-blue-200",
  received: "bg-green-100 text-green-800 border-green-200",
  waiting_stock: "bg-amber-100 text-amber-800 border-amber-200",
  returned: "bg-gray-100 text-gray-700 border-gray-200",
  in_storage: "bg-green-100 text-green-800 border-green-200",
};

function statusLabel(s: string) {
  return STATUS_LABEL[s] ?? s;
}
function statusClass(s: string) {
  return STATUS_TONE[s] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

/* ============================================================
 * Page
 * ============================================================ */
export default function StockReconciliation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const [qtyGroups, setQtyGroups] = useState<QtyGroup[]>([]);
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
  const [mpMismatches, setMpMismatches] = useState<MPMismatch[]>([]);
  const [snDiff, setSnDiff] = useState<{ id: string; code: string; name: string; qty: number; sn: number }[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      /* ---------------- Quantity data ---------------- */
      const [
        eqRes, snRes, mpRes, bbRes, defRes, grRes, giRes, gipRes,
      ] = await Promise.all([
        supabase.from("equipment").select("id, code, name, quantity_in_stock, is_active"),
        supabase.from("equipment_serial_numbers").select("equipment_id, status, billboard_id, location_id"),
        supabase.from("media_players").select("id, code, name, status, billboard_id, location_id, quantity, is_active"),
        supabase.from("billboards").select("id, status"),
        supabase.from("defective_returns").select("id, status, quantity"),
        supabase.from("goods_receipt").select("id, status"),
        supabase.from("goods_issue").select("id, status"),
        supabase.from("goods_issue_pending").select("id, status"),
      ]);

      if (eqRes.error) throw eqRes.error;
      if (snRes.error) throw snRes.error;
      if (mpRes.error) throw mpRes.error;

      const eqActive = (eqRes.data || []).filter((e: any) => e.is_active);
      const sns = snRes.data || [];
      const mps = (mpRes.data || []).filter((m: any) => m.is_active);
      const bbs = bbRes.data || [];

      const eqQtySum = eqActive.reduce((s: number, e: any) => s + (e.quantity_in_stock || 0), 0);
      const snInStock = sns.filter((s: any) => s.status === "in_stock").length;
      const snInstalled = sns.filter((s: any) => s.status === "installed").length;
      const snDefective = sns.filter((s: any) => s.status === "defective").length;

      const mpInStockRule = mps.filter((m: any) => expectedMpQuantity(m) === 1).length;
      const mpInstalled = mps.filter((m: any) => !!m.billboard_id).length;
      const mpDefective = mps.filter((m: any) => m.status === "defective").length;
      const mpPendingAssessment = mps.filter((m: any) => m.status === "pending_assessment").length;
      const mpUnderRepair = mps.filter((m: any) => m.status === "under_repair").length;
      const mpInClaim = mps.filter((m: any) => m.status === "in_claim").length;
      const mpInTransit = mps.filter((m: any) => m.status === "pending_warehouse_return").length;
      const mpQuantitySum = mps.reduce((s: number, m: any) => s + (m.quantity || 0), 0);

      const bbActive = bbs.filter((b: any) => b.status === "active").length;
      const defWaiting = (defRes.data || []).filter((d: any) => d.status === "pending_warehouse_entry").length;

      // MP mismatches (rule violations)
      const mismatches: MPMismatch[] = [];
      mps.forEach((m: any) => {
        const exp = expectedMpQuantity(m);
        if ((m.quantity ?? 0) !== exp) {
          mismatches.push({
            ...m,
            quantity: m.quantity ?? 0,
            expected: exp,
            reason:
              exp === 1
                ? "ควรนับ 1 (อยู่ในคลัง)"
                : m.billboard_id
                ? "ติดตั้งบนป้าย → 0"
                : !m.location_id
                ? "ไม่ระบุคลัง / in-transit → 0"
                : `สถานะ ${m.status} → 0`,
          });
        }
      });
      setMpMismatches(mismatches);

      // SN vs equipment.quantity_in_stock
      const snCount = new Map<string, number>();
      const snHas = new Set<string>();
      sns.forEach((s: any) => {
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

      const groups: QtyGroup[] = [
        {
          label: "อุปกรณ์ทั่วไป (Equipment)",
          rows: [
            { key: "eq_total", label: "รายการอุปกรณ์ทั้งหมด", description: "นับจาก Master Data (is_active)", count: eqActive.length, link: "/inventory-report", icon: Package },
            { key: "eq_qty", label: "ยอดรวม Stock (Inventory Report)", description: "ผลรวม equipment.quantity_in_stock", count: eqQtySum, link: "/inventory-report", icon: ClipboardList },
            { key: "sn_in_stock", label: "S/N อยู่ในคลัง", description: "equipment_serial_numbers.status = in_stock", count: snInStock, link: "/stock-card", icon: FileSearch },
            { key: "sn_installed", label: "S/N ติดตั้งบนป้าย", description: "equipment_serial_numbers.status = installed", count: snInstalled, link: "/equipment-tracking", icon: MapPin },
            { key: "sn_defective", label: "S/N ของเสีย", description: "equipment_serial_numbers.status = defective", count: snDefective, link: "/incomplete-issues", icon: ShieldAlert, tone: snDefective > 0 ? "warn" : "default" },
          ],
        },
        {
          label: "Media Player",
          rows: [
            { key: "mp_total", label: "Media Player ทั้งหมด", description: "media_players (is_active)", count: mps.length, link: "/media-player-report", icon: Monitor },
            { key: "mp_qty_sum", label: "ผลรวม media_players.quantity", description: "ใช้คำนวณยอดคงคลัง", count: mpQuantitySum, link: "/media-player-report", icon: ClipboardList },
            { key: "mp_in_stock", label: "อยู่ในคลังพร้อมใช้ (rule)", description: "billboard_id=null และ status=active/in_stock", count: mpInStockRule, link: "/media-player-report", icon: Inbox },
            { key: "mp_installed", label: "ติดตั้งบนป้าย", description: "billboard_id ≠ null", count: mpInstalled, link: "/equipment-tracking", icon: MapPin },
            { key: "mp_pending_assess", label: "รอประเมิน", description: "status=pending_assessment", count: mpPendingAssessment, link: "/assessment", icon: ClipboardCheck, tone: mpPendingAssessment > 0 ? "warn" : "default" },
            { key: "mp_repair", label: "อยู่ระหว่างซ่อม", description: "status=under_repair", count: mpUnderRepair, link: "/assessment", icon: Wrench },
            { key: "mp_claim", label: "อยู่ระหว่างเคลม", description: "status=in_claim", count: mpInClaim, link: "/claims", icon: FileCheck2 },
            { key: "mp_transit", label: "In-transit (รอคืนคลัง)", description: "status=pending_warehouse_return", count: mpInTransit, link: "/swap", icon: Truck },
            { key: "mp_defective", label: "ของเสีย (Defective)", description: "status=defective", count: mpDefective, link: "/incomplete-issues", icon: ShieldAlert, tone: mpDefective > 0 ? "warn" : "default" },
          ],
        },
        {
          label: "ป้ายโฆษณา / Defective",
          rows: [
            { key: "bb_active", label: "ป้ายใช้งาน", description: "billboards.status = active", count: bbActive, link: "/billboards", icon: MapPin },
            { key: "def_wait", label: "รอรับเข้าคลังของเสีย", description: "defective_returns.status = pending_warehouse_entry", count: defWaiting, link: "/incomplete-issues", icon: ShieldAlert, tone: defWaiting > 0 ? "warn" : "default" },
          ],
        },
        {
          label: "เอกสาร / ธุรกรรม (รวม)",
          rows: [
            { key: "gr", label: "เอกสารรับเข้าคลัง", description: "goods_receipt ทั้งหมด", count: (grRes.data || []).length, link: "/document-search", icon: Inbox },
            { key: "gi", label: "เอกสารจ่ายสินค้า", description: "goods_issue ทั้งหมด", count: (giRes.data || []).length, link: "/document-search", icon: Send },
            { key: "gip", label: "ใบขอเบิก (ทั้งหมด)", description: "goods_issue_pending ทุกสถานะ", count: (gipRes.data || []).length, link: "/issue-request", icon: ClipboardList },
          ],
        },
      ];
      setQtyGroups(groups);

      /* ---------------- Status data ---------------- */
      const [
        swRes, asRes, clRes, dsRes, elRes, prRes, adRes, airRes,
      ] = await Promise.all([
        supabase.from("swap_requests").select("status"),
        supabase.from("assessment_logs").select("status"),
        supabase.from("claim_records").select("status"),
        supabase.from("direct_shipments").select("status"),
        supabase.from("equipment_loans").select("status"),
        supabase.from("purchase_requests").select("status"),
        supabase.from("advertisements").select("status"),
        supabase.from("ad_issue_requests").select("status"),
      ]);

      const bucketize = (rows: any[] | null | undefined): StatusBucket[] => {
        const m = new Map<string, number>();
        (rows || []).forEach((r) => {
          const s = r.status || "unknown";
          m.set(s, (m.get(s) || 0) + 1);
        });
        return Array.from(m.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count);
      };

      const sGroups: StatusGroup[] = [
        { key: "gr", label: "การรับเข้าคลัง (Goods Receipt)", icon: Inbox, link: "/document-search", total: (grRes.data || []).length, buckets: bucketize(grRes.data) },
        { key: "gip", label: "ใบขอเบิก / รออนุมัติ (Issue Request)", icon: ClipboardList, link: "/issue-request", total: (gipRes.data || []).length, buckets: bucketize(gipRes.data) },
        { key: "gi", label: "การจ่ายสินค้า (Goods Issue)", icon: Send, link: "/document-search", total: (giRes.data || []).length, buckets: bucketize(giRes.data) },
        { key: "swap", label: "Swap อุปกรณ์ / MP", icon: ArrowLeftRight, link: "/swap", total: (swRes.data || []).length, buckets: bucketize(swRes.data) },
        { key: "as", label: "บันทึกการประเมิน (Assessment)", icon: ClipboardCheck, link: "/assessment", total: (asRes.data || []).length, buckets: bucketize(asRes.data) },
        { key: "cl", label: "การเคลม (Claim)", icon: FileCheck2, link: "/claims", total: (clRes.data || []).length, buckets: bucketize(clRes.data) },
        { key: "def", label: "คืนของเสีย (Defective Returns)", icon: ShieldAlert, link: "/incomplete-issues", total: (defRes.data || []).length, buckets: bucketize(defRes.data) },
        { key: "ds", label: "จัดส่งตรง (Direct Shipping)", icon: Truck, link: "/direct-shipping-approval", total: (dsRes.data || []).length, buckets: bucketize(dsRes.data) },
        { key: "el", label: "ยืม-คืนอุปกรณ์ (Loans)", icon: ArrowLeftRight, link: "/equipment-loans", total: (elRes.data || []).length, buckets: bucketize(elRes.data) },
        { key: "pr", label: "ใบขอซื้อ (PR)", icon: ClipboardList, link: "/purchase-requests", total: (prRes.data || []).length, buckets: bucketize(prRes.data) },
        { key: "ad", label: "งานสื่อโฆษณา (Advertisements)", icon: MapPin, link: "/ad-management", total: (adRes.data || []).length, buckets: bucketize(adRes.data) },
        { key: "air", label: "ใบขอเบิกสื่อ (Ad Issue)", icon: Send, link: "/ad-issue", total: (airRes.data || []).length, buckets: bucketize(airRes.data) },
      ];
      setStatusGroups(sGroups);
    } catch (e: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const fixMediaPlayers = async () => {
    if (mpMismatches.length === 0) return;
    setFixing(true);
    try {
      let ok = 0, fail = 0;
      for (const r of mpMismatches) {
        const { error } = await supabase.from("media_players").update({ quantity: r.expected }).eq("id", r.id);
        if (error) fail++;
        else ok++;
      }
      toast.success(`แก้ไขสำเร็จ ${ok}${fail ? ` / ผิดพลาด ${fail}` : ""}`);
      await loadAll();
    } finally {
      setFixing(false);
    }
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
            เครื่องมือสำหรับเจ้าหน้าที่คลัง เปรียบเทียบยอดคงคลังข้ามทุกรายงาน
            และตรวจสอบสถานะรายการธุรกรรมทั้งหมดในระบบ
          </p>
        </div>
        <Button onClick={loadAll} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          ตรวจซ้ำ
        </Button>
      </div>

      <Tabs defaultValue="qty" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2">
          <TabsTrigger value="qty" className="gap-2">
            <Package className="h-4 w-4" />
            จำนวนตามรายงาน
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            สถานะรายการ
          </TabsTrigger>
        </TabsList>

        {/* ====================== TAB 1: QUANTITIES ====================== */}
        <TabsContent value="qty" className="space-y-5">
          {/* Alerts */}
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
                      r.tone === "danger"
                        ? "border-red-300 bg-red-50/40"
                        : r.tone === "warn"
                        ? "border-amber-300 bg-amber-50/40"
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

          {/* Mismatch tables */}
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

        {/* ====================== TAB 2: STATUS ====================== */}
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
