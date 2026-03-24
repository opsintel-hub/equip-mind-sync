import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { Package, Search, Check, X } from "lucide-react";

interface BillboardPackageSelectProps {
  selectedBillboardIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  department?: string;
}

export function BillboardPackageSelect({
  selectedBillboardIds,
  onChange,
  disabled,
  department,
}: BillboardPackageSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");

  // Fetch active packages
  const { data: packages } = useQuery({
    queryKey: ["billboard-packages-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_packages")
        .select("id, name, media_type")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch package items when a package is selected
  const { data: packageItems } = useQuery({
    queryKey: ["billboard-package-items-select", selectedPackageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_package_items")
        .select("billboard_id, billboards(id, equipment_id, old_code, location_name, department, size)")
        .eq("package_id", selectedPackageId);
      if (error) throw error;
      return (data || []).map((d: any) => d.billboards).filter(Boolean);
    },
    enabled: !!selectedPackageId,
  });

  // Fetch all billboards for manual add
  const { data: allBillboards } = useQuery({
    queryKey: ["billboards-for-pkg-select", department],
    queryFn: async () => {
      let q = supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department, size")
        .eq("status", "active")
        .order("old_code")
        .limit(5000);
      if (department) q = q.eq("department", department);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const packageOptions = (packages || []).map((p) => ({
    value: p.id,
    label: p.name,
    description: p.media_type || undefined,
  }));

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
  };

  const handleSelectAll = () => {
    if (!packageItems) return;
    const newIds = new Set(selectedBillboardIds);
    packageItems.forEach((b: any) => newIds.add(b.id));
    onChange(Array.from(newIds));
  };

  const handleDeselectAll = () => {
    if (!packageItems) return;
    const pkgIds = new Set(packageItems.map((b: any) => b.id));
    onChange(selectedBillboardIds.filter((id) => !pkgIds.has(id)));
  };

  const handleToggle = (id: string) => {
    if (selectedBillboardIds.includes(id)) {
      onChange(selectedBillboardIds.filter((x) => x !== id));
    } else {
      onChange([...selectedBillboardIds, id]);
    }
  };

  // Filter for manual add
  const manualOptions = (allBillboards || [])
    .filter((b) => !selectedBillboardIds.includes(b.id))
    .map((b) => ({
      value: b.id,
      label: formatBillboardLabel(b.old_code, b.location_name, b.equipment_id),
      description: b.department || undefined,
    }));

  const selectedBillboardsInfo = (allBillboards || []).filter((b) =>
    selectedBillboardIds.includes(b.id)
  );

  const filteredSelected = selectedBillboardsInfo.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (b.old_code && b.old_code.toLowerCase().includes(s)) ||
      (b.location_name && b.location_name.toLowerCase().includes(s))
    );
  });

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={disabled}
            className="gap-1.5 shadow-sm"
          >
            <Package className="h-4 w-4" />
            เลือกจาก Package ({selectedBillboardIds.length} ป้าย)
          </Button>
          {selectedBillboardIds.length > 0 && (
            <Badge variant="secondary">{selectedBillboardIds.length} ป้ายที่เลือก</Badge>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เลือกป้ายโฆษณาจาก Package</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Package selector */}
            <div className="space-y-3">
              <Label className="font-medium">1. เลือก Package</Label>
              <SearchableSelect
                options={packageOptions}
                value={selectedPackageId}
                onValueChange={handleSelectPackage}
                placeholder="ค้นหา Package..."
                searchPlaceholder="พิมพ์ชื่อ Package..."
                emptyMessage="ไม่พบ Package"
              />

              {packageItems && packageItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {packageItems.length} ป้ายใน Package
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" onClick={handleSelectAll}>
                        <Check className="h-3 w-3 mr-1" /> เลือกทั้งหมด
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                        <X className="h-3 w-3 mr-1" /> ยกเลิกทั้งหมด
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Old Code</TableHead>
                          <TableHead>สถานที่</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packageItems.map((bb: any) => (
                          <TableRow key={bb.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedBillboardIds.includes(bb.id)}
                                onCheckedChange={() => handleToggle(bb.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{bb.old_code || "-"}</TableCell>
                            <TableCell>{bb.location_name || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Manual add */}
              <div className="pt-2 border-t">
                <Label className="text-sm">เพิ่มป้ายเพิ่มเติม (นอก Package)</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <SearchableSelect
                      options={manualOptions}
                      value=""
                      onValueChange={(id) => id && handleToggle(id)}
                      placeholder="ค้นหาป้าย..."
                      searchPlaceholder="พิมพ์ Old Code..."
                      emptyMessage="ไม่พบป้าย"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Selected billboards */}
            <div className="space-y-3">
              <Label className="font-medium">
                ป้ายที่เลือกแล้ว ({selectedBillboardIds.length})
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาป้ายที่เลือก..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedBillboardIds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  ยังไม่ได้เลือกป้าย
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Old Code</TableHead>
                        <TableHead>สถานที่</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSelected.map((bb) => (
                        <TableRow key={bb.id}>
                          <TableCell className="font-medium">{bb.old_code || "-"}</TableCell>
                          <TableCell>{bb.location_name || "-"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleToggle(bb.id)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setOpen(false)}>
              ยืนยัน ({selectedBillboardIds.length} ป้าย)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
