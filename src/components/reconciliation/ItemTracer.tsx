import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search, Loader2, Monitor, Package, MapPin, FileText, ArrowLeftRight,
  ClipboardCheck, ShieldAlert, Truck, Inbox, Send, History, AlertTriangle,
  CheckCircle2, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/**
 * ItemTracer
 * — ป้อน S/N หรือรหัส MP/อุปกรณ์ แล้วระบบจะรวมข้อมูลจากทุกเมนูมาเทียบสถานะ
 *   เพื่อให้เจ้าหน้าที่คลังเช็คได้เร็วว่าจำนวน/สถานะ/ตำแหน่งตรงกันทุกหน้าหรือยัง
 */

interface MPRow {
  id: string; code: string; name: string;
  status: string | null;
  quantity: number | null;
  billboard_id: string | null;
  location_id: string | null;
  warehouse_id?: string | null;
  serial_number_1?: string | null;
  serial_number_2?: string | null;
  is_refurbished?: boolean | null;
  is_active?: boolean | null;
}
interface SNRow {
  id: string; serial_number: string; status: string | null;
  equipment_id: string; location_id: string | null;
  equipment?: { code: string; name: string; quantity_in_stock: number | null } | null;
}
interface BillboardLink {
  billboard_id: string;
  billboards?: { code: string | null; old_code: string | null; location_name: string | null } | null;
}

const statusTone = (s: string | null | undefined): string => {
  if (!s) return "bg-muted text-muted-foreground";
  if (["active", "in_stock", "completed", "approved", "received"].includes(s)) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (["installed"].includes(s)) return "bg-blue-100 text-blue-800 border-blue-300";
  if (["pending", "pending_approval", "waiting_stock", "pending_warehouse_return"].includes(s)) return "bg-amber-100 text-amber-800 border-amber-300";
  if (["pending_assessment"].includes(s)) return "bg-purple-100 text-purple-800 border-purple-300";
  if (["under_repair"].includes(s)) return "bg-cyan-100 text-cyan-800 border-cyan-300";
  if (["in_claim", "claim"].includes(s)) return "bg-rose-100 text-rose-800 border-rose-300";
  if (["defective", "damaged", "lost", "rejected", "cancelled"].includes(s)) return "bg-red-100 text-red-800 border-red-300";
  return "bg-slate-100 text-slate-800 border-slate-300";
};

const STATUS_TH: Record<string, string> = {
  active: "พร้อมใช้งาน", in_stock: "อยู่ในคลัง", installed: "ติดตั้งบนป้าย",
  pending: "รออนุมัติ", pending_approval: "รออนุมัติ", approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ", cancelled: "ยกเลิก", completed: "เสร็จสิ้น",
  received: "รับเข้าแล้ว", waiting_stock: "รอสินค้าเข้า",
  pending_warehouse_return: "รอเข้าคลัง (Swap)", pending_assessment: "พักรอประเมิน",
  under_repair: "กำลังซ่อม", in_claim: "รอเคลม", claim: "เคลม",
  defective: "ของเสีย", damaged: "ชำรุด", lost: "สูญหาย",
};
const tr = (s: string | null | undefined) => (s ? STATUS_TH[s] || s : "—");

function expectedQty(row: { billboard_id: string | null; location_id: string | null; status: string | null }) {
  if (!row.billboard_id && row.location_id && (row.status === "active" || row.status === "in_stock")) return 1;
  return 0;
}

export default function ItemTracer() {
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [mps, setMps] = useState<MPRow[]>([]);
  const [sns, setSns] = useState<SNRow[]>([]);
  const [billboardLinks, setBillboardLinks] = useState<Record<string, BillboardLink[]>>({});
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [movements, setMovements] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [defective, setDefective] = useState<any[]>([]);

  const reset = () => {
    setMps([]); setSns([]); setBillboardLinks({}); setLocationMap({});
    setMovements([]); setReceipts([]); setIssues([]); setSwaps([]);
    setAssessments([]); setClaims([]); setDefective([]);
  };

  async function run() {
    const q = term.trim();
    if (!q) { toast.error("กรุณาใส่ S/N หรือรหัส"); return; }
    setLoading(true); setSearched(true); reset();
    try {
      const like = `%${q}%`;
      // 1) media_players — by code, serial_number_1, serial_number_2
      const { data: mpData } = await supabase
        .from("media_players")
        .select("id, code, name, status, quantity, billboard_id, location_id, serial_number_1, serial_number_2, is_refurbished, is_active")
        .or(`code.ilike.${like},name.ilike.${like},serial_number_1.ilike.${like},serial_number_2.ilike.${like}`)
        .limit(50);

      // 2) equipment_serial_numbers — by serial_number
      const { data: snData } = await supabase
        .from("equipment_serial_numbers")
        .select("id, serial_number, status, equipment_id, location_id, equipment:equipment(code, name, quantity_in_stock)")
        .ilike("serial_number", like)
        .limit(100);

      // also pick equipment by code
      const { data: eqByCode } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock")
        .or(`code.ilike.${like},name.ilike.${like}`)
        .limit(20);

      // expand SN list with any S/N belonging to matched equipment codes
      let snAll = snData || [];
      if (eqByCode && eqByCode.length) {
        const ids = eqByCode.map(e => e.id);
        const { data: extraSn } = await supabase
          .from("equipment_serial_numbers")
          .select("id, serial_number, status, equipment_id, location_id, equipment:equipment(code, name, quantity_in_stock)")
          .in("equipment_id", ids)
          .limit(200);
        const seen = new Set(snAll.map((s: any) => s.id));
        (extraSn || []).forEach((s: any) => { if (!seen.has(s.id)) snAll.push(s); });
      }

      setMps(mpData || []);
      setSns(snAll as any);

      const mpIds = (mpData || []).map(m => m.id);
      const eqIds = Array.from(new Set([
        ...(snAll || []).map((s: any) => s.equipment_id),
        ...(eqByCode || []).map(e => e.id),
      ]));
      const locIds = Array.from(new Set([
        ...(mpData || []).map(m => m.location_id).filter(Boolean),
        ...(snAll || []).map((s: any) => s.location_id).filter(Boolean),
      ])) as string[];

      // locations lookup
      if (locIds.length) {
        const { data: locs } = await supabase
          .from("locations").select("id, code, name").in("id", locIds);
        const map: Record<string, string> = {};
        (locs || []).forEach((l: any) => { map[l.id] = `${l.code || ""} ${l.name || ""}`.trim(); });
        setLocationMap(map);
      }

      // billboard installations for MPs
      if (mpIds.length) {
        const { data: be } = await (supabase as any)
          .from("billboard_equipment")
          .select("media_player_id, billboard_id, billboards:billboards(code, old_code, location_name)")
          .in("media_player_id", mpIds);
        const grouped: Record<string, BillboardLink[]> = {};
        (be || []).forEach((row: any) => {
          if (!row.media_player_id) return;
          (grouped[row.media_player_id] ||= []).push(row);
        });
        setBillboardLinks(grouped);
      }

      // stock movements (latest 30) for related equipment OR by reference matching code
      if (eqIds.length) {
        const { data: mv } = await supabase
          .from("stock_movements")
          .select("id, equipment_id, equipment_code, equipment_name, movement_type, quantity, stock_before, stock_after, reference_document, reference_type, created_at, notes")
          .in("equipment_id", eqIds)
          .order("created_at", { ascending: false })
          .limit(30);
        setMovements(mv || []);
      }

      // รวบรวม S/N จริงทั้งหมดที่เจอจาก MP + equipment_serial_numbers
      // หมายเหตุ: ไม่รวม q (search term) เข้าไปตรงๆ เพราะอาจมีเว้นวรรค/อักขระพิเศษ
      // ที่จะทำให้ PostgREST .or() parser พัง — ใช้เฉพาะ S/N จริงที่ดึงมาได้
      const realSerials = Array.from(new Set([
        ...(mpData || []).flatMap((m: any) => [m.serial_number_1, m.serial_number_2]).filter(Boolean),
        ...(snAll || []).map((s: any) => s.serial_number).filter(Boolean),
      ])) as string[];
      // ครอบค่าด้วย " เพื่อกัน comma/space/() ใน serial ทำให้ or() parser พัง
      const quote = (v: string) => `"${String(v).replace(/"/g, '\\"')}"`;
      const snParts = realSerials.length
        ? realSerials.map(s => `serial_number.eq.${quote(s)}`)
        : [`serial_number.ilike.${quote(q)}`];

      // helper: union OR query by serial + media_player_id + equipment_id
      const buildOr = (extra: string[] = []) => {
        const parts = [...snParts, ...extra];
        if (mpIds.length) parts.push(`media_player_id.in.(${mpIds.join(",")})`);
        if (eqIds.length) parts.push(`equipment_id.in.(${eqIds.join(",")})`);
        return parts.join(",");
      };

      // goods_receipt_pending
      const { data: rcp } = await supabase
        .from("goods_receipt_pending")
        .select("id, document_no, status, serial_number, equipment_id, media_player_id, received_at, created_at, quantity")
        .or(buildOr())
        .order("created_at", { ascending: false })
        .limit(30);
      setReceipts(rcp || []);

      // goods_issue_pending_items
      const { data: isu } = await supabase
        .from("goods_issue_pending_items")
        .select("id, serial_number, status, issued_quantity, equipment_id, media_player_id, billboard_id, created_at, goods_issue_pending:goods_issue_pending(document_no, status)")
        .or(buildOr())
        .order("created_at", { ascending: false })
        .limit(30);
      setIssues(isu || []);

      // swap_requests (uses old/new_serial_number, no equipment_id)
      const swapParts: string[] = [`document_no.ilike.${quote(q)}`];
      realSerials.forEach(s => {
        swapParts.push(`old_serial_number.eq.${quote(s)}`);
        swapParts.push(`new_serial_number.eq.${quote(s)}`);
      });
      if (mpIds.length) {
        swapParts.push(`old_media_player_id.in.(${mpIds.join(",")})`);
        swapParts.push(`new_media_player_id.in.(${mpIds.join(",")})`);
      }
      const { data: sw } = await supabase
        .from("swap_requests")
        .select("id, document_no, status, old_serial_number, new_serial_number, created_at")
        .or(swapParts.join(","))
        .order("created_at", { ascending: false })
        .limit(20);
      setSwaps(sw || []);

      // assessment_logs
      const asParts = [...snParts];
      if (mpIds.length) asParts.push(`media_player_id.in.(${mpIds.join(",")})`);
      const { data: as } = await supabase
        .from("assessment_logs")
        .select("id, document_no, status, outcome, serial_number, media_player_id, created_at")
        .or(asParts.join(","))
        .order("created_at", { ascending: false })
        .limit(20);
      setAssessments(as || []);

      // claim_records
      const clParts = [snFilter];
      if (mpIds.length) clParts.push(`media_player_id.in.(${mpIds.join(",")})`);
      const { data: cl } = await supabase
        .from("claim_records")
        .select("id, document_no, status, serial_number, media_player_id, created_at")
        .or(clParts.join(","))
        .order("created_at", { ascending: false })
        .limit(20);
      setClaims(cl || []);

      // defective_returns
      const { data: df } = await supabase
        .from("defective_returns")
        .select("id, document_no, status, serial_number, equipment_id, media_player_id, created_at")
        .or(buildOr())
        .order("created_at", { ascending: false })
        .limit(20);
      setDefective(df || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const hasAny = mps.length || sns.length || receipts.length || issues.length ||
    swaps.length || assessments.length || claims.length || defective.length || movements.length;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            ตรวจสอบรายตัว (S/N หรือ รหัส)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="พิมพ์ S/N หรือรหัส MP / รหัสอุปกรณ์ เช่น MP 0001, EQ 0023, ABC123456"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              className="md:flex-1"
            />
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              ค้นหาแบบรวม
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ระบบจะดึงข้อมูลจากทุกเมนูที่เกี่ยวข้อง: Media Player / S/N อุปกรณ์ / การติดตั้งบนป้าย /
            เคลื่อนไหวสต็อก / รับเข้า–เบิกจ่าย / Swap / รอประเมิน / เคลม / ของเสีย — เพื่อตรวจสอบว่าทุกเมนูสถานะตรงกันหรือไม่
          </p>
        </CardContent>
      </Card>

      {searched && !loading && !hasAny && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          ไม่พบข้อมูลที่ตรงกับ "{term}"
        </CardContent></Card>
      )}

      {/* Media Player rows */}
      {mps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Media Player ({mps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mps.map((mp) => {
              const exp = expectedQty(mp);
              const mismatch = (mp.quantity ?? 0) !== exp;
              const bbs = billboardLinks[mp.id] || [];
              return (
                <div key={mp.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{mp.code}</span>
                    <span className="text-muted-foreground">— {mp.name}</span>
                    <Badge className={statusTone(mp.status)} variant="outline">{tr(mp.status)}</Badge>
                    {mp.is_refurbished && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Refurbished</Badge>}
                    <Link to={`/media-player-profile/${mp.id}`} className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
                      เปิดโปรไฟล์ <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">S/N 1:</span> {mp.serial_number_1 || "—"}</div>
                    <div><span className="text-muted-foreground">S/N 2:</span> {mp.serial_number_2 || "—"}</div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {mp.location_id ? (locationMap[mp.location_id] || mp.location_id) : "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">จำนวน:</span>{" "}
                      <span className={mismatch ? "text-red-600 font-bold" : "text-emerald-700 font-medium"}>
                        {mp.quantity ?? 0}
                      </span>{" "}
                      / คาดหวัง {exp}
                      {mismatch
                        ? <AlertTriangle className="inline h-3 w-3 text-red-600 ml-1" />
                        : <CheckCircle2 className="inline h-3 w-3 text-emerald-600 ml-1" />}
                    </div>
                  </div>
                  {bbs.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">ติดตั้งบนป้าย:</span>{" "}
                      {bbs.map((b, i) => (
                        <span key={i} className="ml-1">
                          <Link to={`/billboards/${b.billboard_id}`} className="text-primary hover:underline">
                            {b.billboards?.old_code || b.billboards?.code || b.billboard_id.slice(0, 8)}
                          </Link>
                          {b.billboards?.location_name ? ` (${b.billboards.location_name})` : ""}
                          {i < bbs.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Equipment serial numbers */}
      {sns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              S/N อุปกรณ์ ({sns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sns.map((sn) => (
              <div key={sn.id} className="rounded-lg border p-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono font-semibold">{sn.serial_number}</span>
                <span className="text-muted-foreground">— {sn.equipment?.code} {sn.equipment?.name}</span>
                <Badge className={statusTone(sn.status)} variant="outline">{tr(sn.status)}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <MapPin className="h-3 w-3" />
                  {sn.location_id ? (locationMap[sn.location_id] || sn.location_id.slice(0, 8)) : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cross-menu transaction sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TxSection title="รับเข้าคลัง (Goods Receipt)" icon={Inbox} rows={receipts}
          render={(r) => `${r.document_no || "—"} | จำนวน ${r.quantity ?? "—"} | ${tr(r.status)}`} link="/receive-goods" />
        <TxSection title="เบิก/จ่ายออก (Goods Issue)" icon={Send} rows={issues}
          render={(r) => `${r.goods_issue_pending?.document_no || "—"} | เบิก ${r.issued_quantity ?? "—"} | ${tr(r.status)}`} link="/goods-issue" />
        <TxSection title="Swap" icon={ArrowLeftRight} rows={swaps}
          render={(r) => `${r.document_no} | เก่า ${r.old_serial_number || "—"} → ใหม่ ${r.new_serial_number || "—"} | ${tr(r.status)}`} link="/swap-wizard" />
        <TxSection title="ประเมิน (Assessment)" icon={ClipboardCheck} rows={assessments}
          render={(r) => `${r.document_no} | ${tr(r.status)}${r.outcome ? ` → ${tr(r.outcome)}` : ""}`} link="/assessment-log" />
        <TxSection title="เคลม (Claim)" icon={ShieldAlert} rows={claims}
          render={(r) => `${r.document_no} | ${tr(r.status)}`} link="/claim-tracker" />
        <TxSection title="ของเสีย / รับคืน" icon={Truck} rows={defective}
          render={(r) => `${r.document_no || "—"} | ${tr(r.status)}`} link="/defective-return-entry" />
      </div>

      {/* Stock movements timeline */}
      {movements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Stock Card – เคลื่อนไหวล่าสุด ({movements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs font-mono">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center gap-2 border-b border-dashed py-1">
                  <span className="text-muted-foreground w-32">{new Date(m.created_at).toLocaleString("th-TH")}</span>
                  <Badge variant="outline" className="text-[10px]">{m.movement_type}</Badge>
                  <span className="w-16 text-right">{m.quantity > 0 ? "+" : ""}{m.quantity}</span>
                  <span className="text-muted-foreground">→ คงเหลือ {m.stock_after}</span>
                  <span className="ml-2 truncate text-muted-foreground">{m.reference_document || m.notes || ""}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <Link to="/stock-card" className="text-xs text-primary hover:underline">เปิด Stock Card →</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TxSection({ title, icon: Icon, rows, render, link }: {
  title: string; icon: any; rows: any[]; render: (r: any) => string; link?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          <Badge variant="secondary" className="ml-auto">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">— ไม่พบรายการ —</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {rows.slice(0, 8).map((r) => (
              <li key={r.id} className="border-b border-dashed py-1">{render(r)}</li>
            ))}
          </ul>
        )}
        {link && (
          <div className="mt-2 text-right">
            <Link to={link} className="text-xs text-primary hover:underline">เปิดเมนู →</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
