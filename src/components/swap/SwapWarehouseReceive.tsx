import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PackageCheck, Truck, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";

interface PendingRow {
  id: string; // swap request id
  document_no: string;
  asset_kind: "media_player" | "equipment";
  item_id: string;
  item_code: string;
  item_name: string;
  serial_number: string | null;
  return_dept: string | null;
  return_warehouse_id: string | null;
  return_location_id: string | null;
  return_location_label: string | null;
  technician_name: string | null;
  completed_at: string | null;
}

export function SwapWarehouseReceive() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<PendingRow | null>(null);
  const [dept, setDept] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Find approved swap_executions whose old unit is still pending_warehouse_return
      const { data: execs, error } = await supabase
        .from("swap_executions")
        .select("swap_request_id, old_media_player_id, old_equipment_id, old_serial_number, return_location_id, swap_requests:swap_request_id(id, document_no, technician_name, completed_at, status)")
        .eq("result", "approved")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const mpIds = Array.from(new Set((execs || []).map((e: any) => e.old_media_player_id).filter(Boolean)));
      const eqIds = Array.from(new Set((execs || []).map((e: any) => e.old_equipment_id).filter(Boolean)));
      const locIds = Array.from(new Set((execs || []).map((e: any) => e.return_location_id).filter(Boolean)));

      const [mpRes, eqRes, locRes] = await Promise.all([
        mpIds.length
          ? supabase.from("media_players").select("id, code, name, serial_number_1, serial_number_2, status").in("id", mpIds as string[])
          : Promise.resolve({ data: [] as any[] }),
        eqIds.length
          ? supabase.from("equipment_serial_numbers").select("serial_number, equipment_id, status, equipment:equipment_id(id, code, name)").in("equipment_id", eqIds as string[])
          : Promise.resolve({ data: [] as any[] }),
        locIds.length
          ? supabase.from("locations").select("id, name, warehouse_id, warehouses:warehouse_id(id, name, department)").in("id", locIds as string[])
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const mpMap = new Map<string, any>(((mpRes as any).data || []).map((x: any) => [x.id, x]));
      const eqSnByEqId = new Map<string, any[]>();
      ((eqRes as any).data || []).forEach((s: any) => {
        const arr = eqSnByEqId.get(s.equipment_id) || [];
        arr.push(s);
        eqSnByEqId.set(s.equipment_id, arr);
      });
      const locMap = new Map<string, any>(((locRes as any).data || []).map((x: any) => [x.id, x]));

      const out: PendingRow[] = [];
      (execs || []).forEach((e: any) => {
        const req = e.swap_requests;
        if (!req) return;
        const loc = e.return_location_id ? locMap.get(e.return_location_id) : null;
        const locLabel = loc ? `${loc.warehouses?.name || ""} / ${loc.name}` : null;

        if (e.old_media_player_id) {
          const mp = mpMap.get(e.old_media_player_id);
          if (mp && mp.status === "pending_warehouse_return") {
            const sn = [mp.serial_number_1, mp.serial_number_2].filter(Boolean).join(" / ");
            out.push({
              id: req.id,
              document_no: req.document_no,
              asset_kind: "media_player",
              item_id: mp.id,
              item_code: mp.code || "",
              item_name: mp.name || "",
              serial_number: sn || null,
              return_dept: loc?.warehouses?.department || null,
              return_warehouse_id: loc?.warehouse_id || null,
              return_location_id: e.return_location_id || null,
              return_location_label: locLabel,
              technician_name: req.technician_name,
              completed_at: req.completed_at,
            });
          }
        } else if (e.old_equipment_id) {
          const sns = eqSnByEqId.get(e.old_equipment_id) || [];
          const matched = sns.find((s: any) => s.serial_number === e.old_serial_number) || sns[0];
          if (matched && matched.status === "pending_warehouse_return") {
            out.push({
              id: req.id,
              document_no: req.document_no,
              asset_kind: "equipment",
              item_id: e.old_equipment_id,
              item_code: matched.equipment?.code || "",
              item_name: matched.equipment?.name || "",
              serial_number: matched.serial_number || e.old_serial_number || null,
              return_dept: loc?.warehouses?.department || null,
              return_warehouse_id: loc?.warehouse_id || null,
              return_location_id: e.return_location_id || null,
              return_location_label: locLabel,
              technician_name: req.technician_name,
              completed_at: req.completed_at,
            });
          }
        }
      });
      setRows(out);
    } catch (e: any) {
      toast.error("โหลดรายการไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.document_no, r.item_code, r.item_name, r.serial_number, r.technician_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const openConfirm = (r: PendingRow) => {
    setTarget(r);
    setDept(r.return_dept || "");
    setWarehouseId(r.return_warehouse_id || "");
    setLocationId(r.return_location_id || "");
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!target) return;
    if (!locationId) {
      toast.error("กรุณาเลือกตำแหน่งจัดเก็บ");
      return;
    }
    setSubmitting(true);
    try {
      const note = `รับเข้าคลังจาก Swap ${target.document_no}`;
      if (target.asset_kind === "media_player") {
        // pending_assessment = quarantine bucket; ยังไม่นับเป็นคลังพร้อมใช้ (quantity=0)
        const { error } = await supabase
          .from("media_players")
          .update({ location_id: locationId, status: "pending_assessment", quantity: 0 } as any)
          .eq("id", target.item_id);
        if (error) throw error;

        await supabase.from("stock_movements").insert({
          equipment_id: target.item_id,
          equipment_code: target.item_code,
          equipment_name: target.item_name,
          movement_type: "pending_assessment_in",
          quantity: 1,
          stock_before: 0,
          stock_after: 0,
          reference_type: "swap",
          reference_id: target.id,
          reference_document: target.document_no,
          location_id: locationId,
          notes: note + " (รอประเมิน — ยังไม่นับเป็นคลังพร้อมใช้)",
          item_condition: "pending_assessment",
          created_by: user?.id ?? null,
        } as any);
      } else {
        if (target.serial_number) {
          const { error } = await supabase
            .from("equipment_serial_numbers")
            .update({ status: "pending_assessment", location_id: locationId } as any)
            .eq("serial_number", target.serial_number);
          if (error) throw error;
        }
        await supabase.from("stock_movements").insert({
          equipment_id: target.item_id,
          equipment_code: target.item_code,
          equipment_name: target.item_name,
          movement_type: "pending_assessment_in",
          quantity: 1,
          stock_before: 0,
          stock_after: 0,
          reference_type: "swap",
          reference_id: target.id,
          reference_document: target.document_no,
          location_id: locationId,
          notes: note + " (รอประเมิน — ยังไม่นับเป็นคลังพร้อมใช้)",
          item_condition: "pending_assessment",
          created_by: user?.id ?? null,
        } as any);
      }

      // Update return_location_id on swap_executions if it changed
      if (locationId !== target.return_location_id) {
        await supabase
          .from("swap_executions")
          .update({ return_location_id: locationId } as any)
          .eq("swap_request_id", target.id);
      }

      toast.success("ยืนยันรับเข้าคลังเรียบร้อย — เครื่องเข้าสถานะรอประเมิน");
      setConfirmOpen(false);
      setTarget(null);
      await load();
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" /> รอรับเข้าคลังจาก Swap
        </CardTitle>
        <CardDescription>
          เครื่องเก่าที่ช่างถอดออกจากป้ายแล้ว — ยังอยู่กับช่างระหว่างทาง • คลังกด "ยืนยันรับเข้าคลัง" เพื่อเข้าสู่ขั้นรอประเมิน
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา: เลขที่/รหัส/ชื่อ/S/N/ช่าง"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>รีเฟรช</Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {rows.length === 0 ? "ไม่มีเครื่องรอเข้าคลัง" : "ไม่พบรายการตามตัวกรอง"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={`${r.id}-${r.item_id}`} className="flex items-center justify-between gap-4 p-4 rounded-lg border hover:bg-accent/50 flex-wrap">
                <div className="flex-1 min-w-[220px] space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold">{r.document_no}</span>
                    <Badge variant="secondary">{r.asset_kind === "media_player" ? "Media Player" : "Equipment"}</Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">รอเข้าคลัง</Badge>
                    {r.serial_number && (
                      <Badge variant="outline" className="font-mono text-xs">S/N: {r.serial_number}</Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    {r.item_code} — {r.item_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    คลังปลายทาง: <span className="font-medium">{r.return_location_label || "ยังไม่ระบุ"}</span>
                    {r.technician_name && <> • ช่าง: {r.technician_name}</>}
                    {r.completed_at && <> • อนุมัติเมื่อ: {format(new Date(r.completed_at), "dd/MM/yy HH:mm")}</>}
                  </div>
                </div>
                <Button onClick={() => openConfirm(r)}>
                  <PackageCheck className="h-4 w-4 mr-2" /> ยืนยันรับเข้าคลัง
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>ยืนยันรับเข้าคลัง</DialogTitle>
              <DialogDescription>
                {target && (
                  <span>
                    {target.document_no} • {target.item_code} {target.item_name}
                    {target.serial_number ? ` • S/N: ${target.serial_number}` : ""}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>ฝ่าย</Label>
                <SimpleDepartmentSelect
                  value={dept}
                  onChange={(v) => {
                    setDept(v);
                    setWarehouseId("");
                    setLocationId("");
                  }}
                />
              </div>
              <WarehouseLocationSelect
                department={dept}
                warehouseId={warehouseId}
                onWarehouseChange={(v) => { setWarehouseId(v); setLocationId(""); }}
                locationId={locationId}
                onLocationChange={setLocationId}
              />
              <p className="text-xs text-muted-foreground">
                เมื่อยืนยัน เครื่องจะเปลี่ยนสถานะเป็น "พักรอประเมิน" ที่ตำแหน่งจัดเก็บที่เลือก และมีรายการ stock movement บันทึกไว้
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>ยกเลิก</Button>
              <Button onClick={handleConfirm} disabled={submitting || !locationId}>
                {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
