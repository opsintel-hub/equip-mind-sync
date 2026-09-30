import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Link2, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { auditActionIcon, auditActionLabel } from "@/lib/activityAudit";

interface LinkedDoc { no: string; kind: string; at?: string | null }
interface EventItem { at: string; icon: string; title: string; detail?: string; who?: string | null }

const MOVE_LABEL: Record<string, string> = {
  in: "รับเข้าคลัง", out: "จ่ายออก/ตัดสต็อก", adjustment: "ปรับยอด", transfer: "โอนย้าย", return: "รับคืน",
};

interface Props {
  source: string;
  id: string;
  documentNo: string;
  raw?: any;
  onOpenDoc?: (no: string) => void;
}

export function LinkedDocsPanel({ source, id, documentNo, raw, onOpenDoc }: Props) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<LinkedDoc[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sb = supabase as any;
      const linked = new Map<string, LinkedDoc>();
      const ev: EventItem[] = [];
      const add = (d: LinkedDoc) => { if (d.no && d.no !== documentNo && !linked.has(d.no)) linked.set(d.no, d); };

      // Resolve the "root" issue request for issue/DC documents
      let pendingId: string | null = null;
      if (source === "issue") pendingId = id;
      if (source === "delivery_confirm") pendingId = raw?.goods_issue_pending_id || null;

      const ids = Array.from(new Set([id, pendingId].filter(Boolean))) as string[];
      const nos = new Set<string>([documentNo]);

      if (pendingId) {
        const [{ data: req }, { data: dcs }] = await Promise.all([
          sb.from("goods_issue_pending").select("document_no, created_at, requester_name").eq("id", pendingId).maybeSingle(),
          sb.from("delivery_confirmations").select("document_no, created_at, confirmed_at").eq("goods_issue_pending_id", pendingId),
        ]);
        if (req?.document_no) { add({ no: req.document_no, kind: "ใบขอเบิก", at: req.created_at }); nos.add(req.document_no); }
        (dcs || []).forEach((d: any) => {
          if (d.document_no) { add({ no: d.document_no, kind: "ยืนยันรับ (DC)", at: d.confirmed_at || d.created_at }); nos.add(d.document_no); }
          if (d.confirmed_at) ev.push({ at: d.confirmed_at, icon: "✅", title: "ปลายทางยืนยันรับของ", detail: d.document_no });
        });
      }

      // PO / PR / Invoice references on the raw record
      const r = raw || {};
      [["po_number", "PO"], ["pr_number", "PR"], ["invoice_number", "Invoice"], ["swap_request_id", ""]].forEach(([k, label]) => {
        if (label && r[k]) add({ no: String(r[k]), kind: label });
      });

      // Stock movements (issue / receive / return...) referencing this document
      const orParts = [
        ...ids.map((x) => `reference_id.eq.${x}`),
        ...Array.from(nos).map((n) => `reference_document.eq.${n}`),
      ];
      const [{ data: moves }, { data: audits }] = await Promise.all([
        sb.from("stock_movements")
          .select("movement_type, quantity, reference_document, equipment_code, created_at, notes")
          .or(orParts.join(","))
          .order("created_at", { ascending: true })
          .limit(200),
        sb.from("activity_audit")
          .select("action, actor_name, status_before, status_after, notes, created_at, doc_number")
          .in("entity_id", ids)
          .order("created_at", { ascending: true })
          .limit(200),
      ]);

      (moves || []).forEach((m: any) => {
        if (m.reference_document) add({ no: m.reference_document, kind: "เอกสารเคลื่อนไหวสต็อก", at: m.created_at });
        ev.push({
          at: m.created_at, icon: "📦",
          title: MOVE_LABEL[m.movement_type] || m.movement_type,
          detail: [m.equipment_code, m.quantity != null ? `จำนวน ${m.quantity}` : null, m.reference_document].filter(Boolean).join(" · "),
        });
      });
      (audits || []).forEach((a: any) => {
        ev.push({
          at: a.created_at, icon: auditActionIcon(a.action), title: auditActionLabel(a.action),
          detail: [a.status_before && a.status_after ? `${a.status_before} → ${a.status_after}` : null, a.notes].filter(Boolean).join(" · "),
          who: a.actor_name,
        });
      });

      if (!ev.some((e) => e.title === "สร้างรายการ") && r.created_at) {
        ev.push({ at: r.created_at, icon: "🆕", title: "สร้างเอกสาร", detail: documentNo, who: r.requester_name || r.created_by_name || null });
      }

      ev.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      if (active) { setDocs(Array.from(linked.values())); setEvents(ev); setLoading(false); }
    })().catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [source, id, documentNo, raw]);

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground p-4"><Loader2 className="h-3 w-3 animate-spin" />กำลังโหลดเอกสารที่เกี่ยวข้อง...</div>;
  }

  return (
    <div className="grid gap-4 p-4 pt-0 md:grid-cols-2">
      <div className="rounded-md border bg-background/60 p-3">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium"><Link2 className="h-4 w-4 text-primary" />เอกสารที่ผูกกัน</div>
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">ยังไม่มีเอกสารอื่นเชื่อมกับรายการนี้</p>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li key={d.no} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] shrink-0">{d.kind}</Badge>
                  <button type="button" className="font-mono text-primary hover:underline truncate" onClick={() => onOpenDoc?.(d.no)}>{d.no}</button>
                </span>
                {d.at && <span className="text-muted-foreground shrink-0">{format(new Date(d.at), "dd MMM yy HH:mm", { locale: th })}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-md border bg-background/60 p-3">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium"><History className="h-4 w-4 text-primary" />เหตุการณ์ที่ผ่านมา (ล่าสุดก่อน)</div>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">ยังไม่มีเหตุการณ์ที่บันทึกไว้</p>
        ) : (
          <ol className="space-y-2 max-h-64 overflow-auto pr-1">
            {events.map((e, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span>{e.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(e.at), "dd MMM yyyy HH:mm", { locale: th })}{e.who ? ` · ${e.who}` : ""}
                  </div>
                  {e.detail && <div className="text-muted-foreground/80 break-words">{e.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
