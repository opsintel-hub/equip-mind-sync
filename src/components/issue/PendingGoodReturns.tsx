import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { logStockMovement } from "@/lib/stockMovement";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { PackageCheck } from "lucide-react";

export function usePendingGoodReturns() {
  return useQuery({
    queryKey: ["issue-good-returns-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_good_returns")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function PendingGoodReturns() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: rows = [] } = usePendingGoodReturns();
  useRealtimeInvalidate({ table: "issue_good_returns", queryKeys: [["issue-good-returns-pending"]] });

  const { data: canReceive = false } = useQuery({
    queryKey: ["can-receive-good-returns", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return (data || []).some((r: any) => ["warehouse_staff", "admin", "super_admin"].includes(r.role));
    },
  });

  const [target, setTarget] = useState<any | null>(null);
  const [department, setDepartment] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);

  const openFor = (r: any) => {
    setTarget(r);
    setDepartment(r.department || "");
    setWarehouseId("");
    setLocationId("");
  };

  const confirm = async () => {
    if (!target || !locationId) return;
    setSaving(true);
    try {
      const qty = Number(target.quantity);
      if (target.media_player_id) {
        const { data: mp } = await supabase.from("media_players").select("code, name, quantity").eq("id", target.media_player_id).maybeSingle();
        const before = mp?.quantity || 0;
        const { error } = await supabase
          .from("media_players")
          .update({ quantity: 1, status: "active", billboard_id: null, location_id: locationId })
          .eq("id", target.media_player_id);
        if (error) throw error;
        await logStockMovement({
          equipment_id: target.media_player_id,
          equipment_code: mp?.code || target.equipment_code || "",
          equipment_name: mp?.name || target.equipment_name || "",
          movement_type: "receive",
          quantity: qty,
          stock_before: before,
          stock_after: 1,
          reference_type: "route_return",
          reference_document: target.document_no,
          location_id: locationId,
          notes: target.notes || "คืนของดีจากหน้างาน (คลังรับเข้า)",
          item_condition: "good",
        });
      } else if (target.equipment_id) {
        const { data: eq } = await supabase.from("equipment").select("quantity_in_stock").eq("id", target.equipment_id).maybeSingle();
        const before = eq?.quantity_in_stock || 0;
        const after = before + qty;
        const { error } = await supabase.from("equipment").update({ quantity_in_stock: after }).eq("id", target.equipment_id);
        if (error) throw error;
        await logStockMovement({
          equipment_id: target.equipment_id,
          equipment_code: target.equipment_code || "",
          equipment_name: target.equipment_name || "",
          movement_type: "receive",
          quantity: qty,
          stock_before: before,
          stock_after: after,
          reference_type: "route_return",
          reference_document: target.document_no,
          location_id: locationId,
          notes: target.notes || "คืนของดีจากหน้างาน (คลังรับเข้า)",
          item_condition: "good",
        });
      }
      const { error: uErr } = await supabase
        .from("issue_good_returns")
        .update({ status: "received", received_by: user?.id, received_at: new Date().toISOString(), warehouse_id: warehouseId || null, location_id: locationId })
        .eq("id", target.id);
      if (uErr) throw uErr;
      await supabase.from("goods_issue_pending_items").update({ return_location_id: locationId } as any).eq("id", target.pending_item_id);
      toast.success(`รับของดี ${qty} เข้าคลังแล้ว`);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["issue-good-returns-pending"] });
      qc.invalidateQueries({ queryKey: ["stock-card-items"] });
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium">
        <PackageCheck className="w-4 h-4 text-primary" /> ของดีรอคลังรับเข้า ({rows.length})
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่เอกสาร</TableHead>
              <TableHead>สินค้า</TableHead>
              <TableHead>S/N</TableHead>
              <TableHead>จำนวน</TableHead>
              <TableHead>ผู้ส่งคืน / ฝ่าย</TableHead>
              <TableHead>วันที่ส่ง</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">ไม่มีของดีรอรับเข้า</TableCell>
              </TableRow>
            ) : (
              rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.document_no}</TableCell>
                  <TableCell>
                    {r.equipment_code} {r.equipment_name}
                    {Array.isArray((r as any).photos) && (r as any).photos.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {(r as any).photos.map((u: string) => (
                          <a key={u} href={u} target="_blank" rel="noreferrer">
                            <img src={u} alt="รูปของคืน" className="w-10 h-10 rounded object-cover border" />
                          </a>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-pre-line font-mono text-xs">{r.serial_number || "-"}</TableCell>
                  <TableCell>{r.quantity} {r.unit}</TableCell>
                  <TableCell className="text-sm">{r.submitted_by_name || "-"}<div className="text-xs text-muted-foreground">{r.department || ""}</div></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "d MMM yy HH:mm", { locale: th })}</TableCell>
                  <TableCell>
                    {canReceive ? (
                      <Button size="sm" onClick={() => openFor(r)}>รับเข้าคลัง</Button>
                    ) : (
                      <Badge variant="secondary">รอคลัง</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>รับของดีเข้าคลัง</DialogTitle>
            <DialogDescription>
              {target?.document_no} · {target?.equipment_code} {target?.equipment_name} · {target?.quantity} {target?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>ฝ่าย</Label>
              <SimpleDepartmentSelect value={department} onChange={(v) => { setDepartment(v); setWarehouseId(""); setLocationId(""); }} />
            </div>
            <WarehouseLocationSelect
              department={department}
              warehouseId={warehouseId}
              onWarehouseChange={setWarehouseId}
              locationId={locationId}
              onLocationChange={setLocationId}
            />
            {!locationId && <p className="text-sm text-destructive">กรุณาเลือกตำแหน่งจัดเก็บ</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>ยกเลิก</Button>
            <Button onClick={confirm} disabled={saving || !locationId}>{saving ? "กำลังบันทึก..." : "ยืนยันรับเข้าคลัง"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
