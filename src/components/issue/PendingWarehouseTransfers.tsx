import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { warehouseDepts } from "@/lib/warehouseDepartments";
import { transferReceiptQuantity } from "@/lib/receiptStorage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Batch = Tables<"warehouse_transfer_batches">;

export function usePendingWarehouseTransfers() {
  const { user } = useAuth();
  const { deptKey, loading } = useDeptScope();
  return useQuery({
    queryKey: ["warehouse-transfer-pending", user?.id, deptKey],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouse_transfer_batches")
        .select("*").eq("status", "in_transit").order("dispatched_at", { ascending: false });
      if (error) throw error;
      const warehouseIds = [...new Set((data || []).map(b => b.destination_warehouse_id))];
      const permitted = await Promise.all(warehouseIds.map(async id => {
        const { data: allowed, error: permissionError } = await supabase.rpc("transfer_warehouse_allowed", { _warehouse_id: id, _permission: "view" });
        if (permissionError) throw permissionError;
        return allowed ? id : null;
      }));
      return (data || []).filter(b => permitted.includes(b.destination_warehouse_id));
    },
  });
}

export function PendingWarehouseTransfers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: rows = [], isError } = usePendingWarehouseTransfers();
  const [target, setTarget] = useState<Batch | null>(null);
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  useRealtimeInvalidate({ table: "warehouse_transfer_batches", queryKeys: [["warehouse-transfer-pending"]] });
  const { data: warehouse } = useQuery({
    queryKey: ["transfer-receipt-warehouse", target?.destination_warehouse_id],
    enabled: !!target,
    queryFn: async () => {
      if (!target) return null;
      const { data, error } = await supabase.from("warehouses").select("code, name, department, departments")
        .eq("id", target.destination_warehouse_id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: canReceive = false } = useQuery({
    queryKey: ["transfer-receipt-permission", target?.destination_warehouse_id, user?.id],
    enabled: !!target && !!user,
    queryFn: async () => {
      if (!target) return false;
      const { data, error } = await supabase.rpc("transfer_warehouse_allowed", { _warehouse_id: target.destination_warehouse_id, _permission: "edit" });
      if (error) throw error;
      return data;
    },
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["transfer-receipt-locations", target?.destination_warehouse_id],
    enabled: !!target,
    queryFn: async () => {
      if (!target) return [];
      const { data, error } = await supabase.from("locations").select("id, code, name")
        .eq("warehouse_id", target.destination_warehouse_id).eq("is_active", true).order("code");
      if (error) throw error;
      return data || [];
    },
  });
  const confirm = async () => {
    if (!target || !locationId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("receive_warehouse_transfer", { _batch_id: target.id, _location_id: locationId });
      if (error) throw error;
      toast.success("รับโอนเข้าคลังแล้ว");
      setTarget(null);
      for (const key of ["warehouse-transfer-pending", "equipment-active", "equipment-active-details", "available-media-player-units", "stock-card-items", "stock-movements", "inventory-report"]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "รับโอนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium"><ArrowRightLeft className="h-4 w-4 text-primary" /> สินค้าโอนย้ายรอรับเข้า ({rows.length})</div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>เลขที่เอกสาร</TableHead><TableHead>สินค้า</TableHead><TableHead>S/N</TableHead><TableHead>จำนวน</TableHead><TableHead>สถานะ</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{isError ? "โหลดรายการรับโอนไม่สำเร็จ" : "ไม่มีสินค้าโอนย้ายรอรับเข้า"}</TableCell></TableRow> : rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.document_no}</TableCell>
                <TableCell>{row.equipment_code} {row.equipment_name}</TableCell>
                <TableCell className="whitespace-pre-line font-mono text-xs">{row.serial_number || "-"}</TableCell>
                <TableCell>{transferReceiptQuantity(row.quantity, 0)} {row.unit}</TableCell>
                <TableCell>ระหว่างโอนย้าย</TableCell>
                <TableCell><Button size="sm" onClick={() => { setLocationId(""); setTarget(row); }}>รับโอนเข้าคลัง</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!target} onOpenChange={open => { if (!open && !saving) setTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>รับโอนเข้าคลัง</DialogTitle><DialogDescription>{target?.document_no} · {target?.equipment_code} · {target?.quantity} {target?.unit}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>คลังปลายทาง</Label><p className="font-medium">{warehouse ? `${warehouse.code} — ${warehouse.name}` : "กำลังโหลด..."}</p><p className="text-sm text-muted-foreground">{warehouse ? warehouseDepts(warehouse).join(", ") : ""}</p></div>
            <div className="space-y-2"><Label>ตำแหน่งจัดเก็บ *</Label><SearchableSelect value={locationId} onValueChange={setLocationId} options={locations.map(l => ({ value: l.id, label: `${l.code} — ${l.name}` }))} placeholder="เลือกตำแหน่งจัดเก็บ" searchPlaceholder="ค้นหาตำแหน่ง..." disabled={saving || !canReceive} /></div>
            {!canReceive && <p className="text-sm text-destructive">ไม่มีสิทธิ์รับเข้าในคลังปลายทาง</p>}
          </div>
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setTarget(null)}>ยกเลิก</Button><Button onClick={confirm} disabled={saving || !canReceive || !locationId}>{saving ? "กำลังบันทึก..." : "ยืนยันรับโอน"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}