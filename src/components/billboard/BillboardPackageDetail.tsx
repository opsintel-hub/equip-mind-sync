import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Trash2, X } from "lucide-react";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Props {
  pkg: { id: string; name: string; media_type: string | null };
  open: boolean;
  onClose: () => void;
}

export function BillboardPackageDetail({ pkg, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addBillboardId, setAddBillboardId] = useState("");

  // Fetch package items with billboard info
  const { data: items, isLoading } = useQuery({
    queryKey: ["billboard-package-items", pkg.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_package_items")
        .select("id, billboard_id, billboards(id, equipment_id, old_code, location_name, department, size)")
        .eq("package_id", pkg.id)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch all billboards for add dropdown
  const { data: allBillboards } = useQuery({
    queryKey: ["billboards-for-package"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department")
        .eq("status", "active")
        .order("old_code")
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const existingBillboardIds = new Set((items || []).map((i: any) => i.billboard_id));

  const addMutation = useMutation({
    mutationFn: async (billboardId: string) => {
      const { error } = await supabase
        .from("billboard_package_items")
        .insert({ package_id: pkg.id, billboard_id: billboardId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("เพิ่มป้ายสำเร็จ");
      setAddBillboardId("");
      queryClient.invalidateQueries({ queryKey: ["billboard-package-items", pkg.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("billboard_package_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบป้ายออกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["billboard-package-items", pkg.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("billboard_package_items")
        .delete()
        .eq("package_id", pkg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบป้ายทั้งหมดสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["billboard-package-items", pkg.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const availableBillboards = (allBillboards || []).filter(
    (b) => !existingBillboardIds.has(b.id)
  );

  const billboardOptions = availableBillboards.map((b) => ({
    value: b.id,
    label: formatBillboardLabel(b.old_code, b.location_name, b.equipment_id),
    description: b.department || undefined,
  }));

  const filteredItems = (items || []).filter((item: any) => {
    if (!search) return true;
    const bb = item.billboards;
    if (!bb) return false;
    const s = search.toLowerCase();
    return (
      (bb.old_code && bb.old_code.toLowerCase().includes(s)) ||
      (bb.location_name && bb.location_name.toLowerCase().includes(s)) ||
      (bb.equipment_id && bb.equipment_id.toLowerCase().includes(s))
    );
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pkg.name}
            {pkg.media_type && <Badge variant="outline">{pkg.media_type}</Badge>}
            <Badge variant="secondary">{items?.length || 0} ป้าย</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Add billboard */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <SearchableSelect
              options={billboardOptions}
              value={addBillboardId}
              onValueChange={setAddBillboardId}
              placeholder="เลือกป้ายเพื่อเพิ่มเข้า Package..."
              searchPlaceholder="ค้นหา Old Code / Location..."
              emptyMessage="ไม่พบป้าย"
            />
          </div>
          <Button
            size="sm"
            onClick={() => addBillboardId && addMutation.mutate(addBillboardId)}
            disabled={!addBillboardId || addMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> เพิ่ม
          </Button>
        </div>

        {/* Search + Clear All */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาป้ายใน Package..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {(items?.length || 0) > 0 && (
            <Button variant="destructive" size="sm" onClick={() => removeAllMutation.mutate()} disabled={removeAllMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> ลบทั้งหมด
            </Button>
          )}
        </div>

        {/* Items table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "ไม่พบป้ายที่ค้นหา" : "ยังไม่มีป้ายใน Package นี้"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Old Code</TableHead>
                <TableHead>สถานที่</TableHead>
                <TableHead>ฝ่าย</TableHead>
                <TableHead>ขนาด</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item: any, idx: number) => {
                const bb = item.billboards || {};
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{bb.old_code || "-"}</TableCell>
                    <TableCell>{bb.location_name || "-"}</TableCell>
                    <TableCell>{bb.department || "-"}</TableCell>
                    <TableCell>{bb.size || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate(item.id)}
                        disabled={removeMutation.isPending}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
