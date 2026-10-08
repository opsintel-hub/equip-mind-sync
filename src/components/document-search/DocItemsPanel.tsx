import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BillboardDisplay from "@/components/billboard/BillboardDisplay";

interface Row {
  code: string | null; name: string | null; qty: number | null; unit: string | null;
  issued?: number | null; remaining?: number | null; sn?: string | null; billboardId?: string | null; notes?: string | null; installed?: number; returned?: number;
}

const SUPPORTED = ["issue", "delivery_confirm", "direct_shipping"];

export function DocItemsPanel({ source, id, raw }: { source: string; id: string; raw?: any }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [purpose, setPurpose] = useState<{ name: string; bb: boolean; ret: boolean } | null>(null);

  useEffect(() => {
    if (!SUPPORTED.includes(source)) return;
    let active = true;
    (async () => {
      const sb = supabase as any;
      let out: Row[] = [];
      if (source === "direct_shipping") {
        const { data } = await sb.from("direct_shipment_items").select("*").eq("direct_shipment_id", id);
        out = (data || []).map((i: any) => ({ code: i.equipment_code, name: i.equipment_name, qty: i.quantity, unit: i.unit, sn: i.serial_number, notes: i.notes }));
      } else {
        const pendingId = source === "issue" ? id : raw?.goods_issue_pending_id;
        if (pendingId) {
          const [{ data: items }, { data: head }] = await Promise.all([
            sb.from("goods_issue_pending_items").select("*").eq("pending_id", pendingId).order("created_at"),
            sb.from("goods_issue_pending").select("equipment_code, equipment_name, quantity, unit, issued_quantity, serial_number, billboard_id, notes, purpose, purpose_id").eq("id", pendingId).maybeSingle(),
          ]);
          if (head?.purpose_id || head?.purpose) {
            let p = { name: head.purpose || "-", bb: false, ret: false };
            if (head.purpose_id) {
              const { data: ip } = await sb.from("issue_purposes").select("name, requires_billboard, requires_return").eq("id", head.purpose_id).maybeSingle();
              if (ip) p = { name: ip.name, bb: !!ip.requires_billboard, ret: !!ip.requires_return };
            }
            if (active) setPurpose(p);
          }
          out = (items || []).map((i: any) => ({
            code: i.equipment_code, name: i.equipment_name, qty: i.quantity, unit: i.unit,
            issued: i.issued_quantity, installed: i.installed_qty != null ? Number(i.installed_qty) : i.billboard_id ? (i.issued_quantity ?? 0) : 0,
            returned: (i.returned_good_qty || 0) + (i.returned_defective_qty || 0), remaining: i.remaining_quantity, sn: i.serial_number, billboardId: i.billboard_id, notes: i.notes,
          }));
          if (out.length === 0 && head?.equipment_code) {
            out = [{ code: head.equipment_code, name: head.equipment_name, qty: head.quantity, unit: head.unit, issued: head.issued_quantity, sn: head.serial_number, billboardId: head.billboard_id, notes: head.notes }];
          }
        }
      }
      if (active) setRows(out);
    })().catch(() => active && setRows([]));
    return () => { active = false; };
  }, [source, id, raw]);

  if (!SUPPORTED.includes(source)) return null;
  if (rows === null) return <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 pb-3"><Loader2 className="h-3 w-3 animate-spin" />กำลังโหลดรายการสินค้า...</div>;

  const showIssued = source !== "direct_shipping";
  return (
    <div className="px-4 pb-4">
      <div className="rounded-md border bg-background/60 p-3">
        {purpose && (
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
            <span className="text-muted-foreground">วัตถุประสงค์การเบิก:</span>
            <span className="font-medium">{purpose.name}</span>
            {purpose.bb && <Badge variant="outline" className="text-[10px]">ต้องระบุป้าย</Badge>}
            {purpose.ret && <Badge variant="outline" className="text-[10px]">ต้องรับคืน</Badge>}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2 text-sm font-medium"><ShoppingCart className="h-4 w-4 text-primary" />รายการสินค้า ({rows.length} รายการ)</div>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">ไม่พบรายการสินค้า</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-1.5 pr-3 font-medium">รหัส / ชื่อสินค้า</th>
                  <th className="text-right py-1.5 px-2 font-medium">ขอ</th>
                  {showIssued && <th className="text-right py-1.5 px-2 font-medium">จ่ายแล้ว</th>}
                  {showIssued && <th className="text-right py-1.5 px-2 font-medium">ติดตั้ง</th>}
                  {showIssued && <th className="text-right py-1.5 px-2 font-medium">คืน</th>}
                  {showIssued && <th className="text-right py-1.5 px-2 font-medium">ค้าง</th>}
                  <th className="text-left py-1.5 px-2 font-medium">S/N</th>
                  {showIssued && <th className="text-left py-1.5 px-2 font-medium">ป้ายโฆษณา</th>}
                  <th className="text-left py-1.5 pl-2 font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 align-top">
                    <td className="py-1.5 pr-3"><div className="font-medium font-mono">{r.code || "-"}</div><div className="text-muted-foreground">{r.name || "-"}</div></td>
                    <td className="text-right py-1.5 px-2 whitespace-nowrap">{r.qty ?? 0} {r.unit || ""}</td>
                    {showIssued && <td className="text-right py-1.5 px-2 font-medium text-primary">{r.issued ?? 0}</td>}
                    {showIssued && <td className="text-right py-1.5 px-2">{r.installed || "-"}</td>}
                    {showIssued && <td className="text-right py-1.5 px-2">{r.returned || "-"}</td>}
                    {showIssued && <td className="text-right py-1.5 px-2">{(r.remaining ?? 0) > 0 ? r.remaining : "-"}</td>}
                    <td className="py-1.5 px-2 whitespace-pre-line font-mono">{r.sn || <span className="text-muted-foreground font-sans">จ่ายตามจำนวน</span>}</td>
                    {showIssued && <td className="py-1.5 px-2">{r.billboardId ? <BillboardDisplay billboardId={r.billboardId} /> : <Badge variant="outline" className="text-[10px]">ระบุภายหลัง</Badge>}</td>}
                    <td className="py-1.5 pl-2 text-muted-foreground max-w-[220px] break-words">{r.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
