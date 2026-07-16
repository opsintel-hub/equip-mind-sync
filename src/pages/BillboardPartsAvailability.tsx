import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Package, MapPin } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  fetchEquipmentCompatMap,
  fetchEquipmentCompatModes,
  getCompatibilityBadge,
} from "@/lib/compatibility";
import { useDeptScope } from "@/hooks/useDeptScope";

/**
 * "อะไหล่พร้อมเบิกตามป้าย"
 * Tab 1: pick a billboard → list all compatible equipment + stock available.
 * Tab 2: pick an equipment → list all billboards it supports.
 */
const BillboardPartsAvailability = () => {
  const [tab, setTab] = useState<"by-billboard" | "by-equipment">("by-billboard");
  const [selectedBillboardId, setSelectedBillboardId] = useState<string>("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [billboardSearch, setBillboardSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true);
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();
  const scopeDepts = isSuperAdmin ? null : ((viewableDepts && viewableDepts.length > 0) ? viewableDepts : ["__no_dept_permission__"]);

  // ── Data ──
  const { data: billboards = [] } = useQuery({
    queryKey: ["bpa-billboards", deptKey],
    queryFn: async () => {
      let q = supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, region, department")
        .eq("status", "active")
        .order("old_code");
      if (scopeDepts) q = q.in("department", scopeDepts);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["bpa-equipment", deptKey],
    queryFn: async () => {
      let q = supabase
        .from("equipment")
        .select(
          "id, code, name, category, brand, unit, quantity_in_stock, department, billboard_compatibility_mode, compatibility_notes, locations:location_id(code, name, warehouses:warehouse_id(code, name))"
        )
        .eq("is_active", true)
        .order("code");
      if (scopeDepts) q = q.in("department", scopeDepts);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: compatMap = {} } = useQuery({
    queryKey: ["equipment-compat-map"],
    queryFn: fetchEquipmentCompatMap,
    staleTime: 60_000,
  });
  const { data: modeMap = {} } = useQuery({
    queryKey: ["equipment-compat-modes"],
    queryFn: fetchEquipmentCompatModes,
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    (equipment as any[]).forEach((e) => e.category && s.add(e.category));
    return Array.from(s).sort();
  }, [equipment]);

  const billboardMap = useMemo(() => {
    const m: Record<string, any> = {};
    (billboards as any[]).forEach((b) => (m[b.id] = b));
    return m;
  }, [billboards]);

  const filteredBillboardOptions = useMemo(() => {
    const t = billboardSearch.trim().toLowerCase();
    return (billboards as any[]).filter((b) => {
      if (!t) return true;
      return (
        (b.old_code || "").toLowerCase().includes(t) ||
        (b.equipment_id || "").toLowerCase().includes(t) ||
        (b.location_name || "").toLowerCase().includes(t)
      );
    });
  }, [billboards, billboardSearch]);

  const filteredEquipmentOptions = useMemo(() => {
    const t = equipmentSearch.trim().toLowerCase();
    return (equipment as any[]).filter((e) => {
      if (!t) return true;
      return (
        (e.code || "").toLowerCase().includes(t) ||
        (e.name || "").toLowerCase().includes(t) ||
        (e.brand || "").toLowerCase().includes(t)
      );
    });
  }, [equipment, equipmentSearch]);

  // ── Tab 1: compatible equipment for the picked billboard ──
  const partsForBillboard = useMemo(() => {
    if (!selectedBillboardId) return [];
    return (equipment as any[])
      .filter((e) => {
        const mode = e.billboard_compatibility_mode || "unrestricted";
        if (mode === "unrestricted") return true;
        return compatMap[e.id]?.has(selectedBillboardId);
      })
      .filter((e) => (categoryFilter === "all" ? true : e.category === categoryFilter))
      .filter((e) => (onlyInStock ? (e.quantity_in_stock || 0) > 0 : true))
      .sort((a, b) => (b.quantity_in_stock || 0) - (a.quantity_in_stock || 0));
  }, [selectedBillboardId, equipment, compatMap, categoryFilter, onlyInStock]);

  // ── Tab 2: billboards for the picked equipment ──
  const billboardsForEquipment = useMemo(() => {
    if (!selectedEquipmentId) return { mode: "unrestricted" as string, items: [] as any[] };
    const info = modeMap[selectedEquipmentId];
    const mode = info?.mode || "unrestricted";
    if (mode === "unrestricted") return { mode, items: billboards as any[] };
    const ids = compatMap[selectedEquipmentId] || new Set<string>();
    return { mode, items: (billboards as any[]).filter((b) => ids.has(b.id)) };
  }, [selectedEquipmentId, billboards, compatMap, modeMap]);

  const selectedEquipment = useMemo(
    () => (equipment as any[]).find((e) => e.id === selectedEquipmentId),
    [equipment, selectedEquipmentId]
  );

  const handleExportByBillboard = () => {
    if (!selectedBillboardId || partsForBillboard.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับ Export");
      return;
    }
    const b = billboardMap[selectedBillboardId];
    const rows = partsForBillboard.map((e) => {
      const mode = e.billboard_compatibility_mode || "unrestricted";
      const badge = getCompatibilityBadge(mode, compatMap[e.id]?.size);
      return {
        รหัสอะไหล่: e.code,
        ชื่ออะไหล่: e.name,
        หมวดหมู่: e.category || "-",
        ยี่ห้อ: e.brand || "-",
        คงเหลือในคลัง: e.quantity_in_stock || 0,
        หน่วย: e.unit || "-",
        คลัง: e.locations?.warehouses ? `${e.locations.warehouses.code} - ${e.locations.warehouses.name}` : "-",
        ตำแหน่งจัดเก็บ: e.locations ? `${e.locations.code} - ${e.locations.name}` : "-",
        ป้ายที่รองรับ: badge.label,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "อะไหล่พร้อมเบิก");
    XLSX.writeFile(
      wb,
      `parts-for-billboard-${b?.old_code || b?.equipment_id || "billboard"}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
  };

  const handleExportByEquipment = () => {
    if (!selectedEquipmentId || billboardsForEquipment.items.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับ Export");
      return;
    }
    const rows = billboardsForEquipment.items.map((b: any) => ({
      OldCode: b.old_code || "-",
      EquipmentID: b.equipment_id || "-",
      ตำแหน่ง: b.location_name || "-",
      ภูมิภาค: b.region || "-",
      ฝ่าย: b.department || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ป้ายที่รองรับ");
    XLSX.writeFile(
      wb,
      `billboards-for-${selectedEquipment?.code || "equipment"}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">อะไหล่พร้อมเบิกตามป้าย</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ค้นหาว่าป้ายใดมีอะไหล่อะไรพร้อมเบิก หรือดูว่าอะไหล่ชิ้นหนึ่งใช้ได้กับป้ายใดบ้าง
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="by-billboard" className="gap-2">
            <MapPin className="w-4 h-4" /> เลือกป้าย → ดูอะไหล่ที่พร้อมเบิก
          </TabsTrigger>
          <TabsTrigger value="by-equipment" className="gap-2">
            <Package className="w-4 h-4" /> เลือกอะไหล่ → ดูป้ายที่รองรับ
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 */}
        <TabsContent value="by-billboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เลือกป้าย</CardTitle>
              <CardDescription>
                ค้นหาด้วย Old Code, Equipment ID หรือชื่อสถานที่
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาป้าย..."
                    value={billboardSearch}
                    onChange={(e) => setBillboardSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedBillboardId} onValueChange={setSelectedBillboardId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`เลือกป้าย (${filteredBillboardOptions.length})`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBillboardOptions.slice(0, 200).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.old_code || b.equipment_id} — {b.location_name || "-"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="หมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={onlyInStock ? "yes" : "no"} onValueChange={(v) => setOnlyInStock(v === "yes")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">เฉพาะที่มีของในคลัง</SelectItem>
                    <SelectItem value="no">แสดงทั้งหมด</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExportByBillboard} className="gap-2">
                  <Download className="w-4 h-4" /> Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedBillboardId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  อะไหล่ที่ใช้ได้กับป้าย {billboardMap[selectedBillboardId]?.old_code || billboardMap[selectedBillboardId]?.equipment_id}
                </CardTitle>
                <CardDescription>
                  พบทั้งหมด {partsForBillboard.length} รายการ • รวมคงเหลือ{" "}
                  {partsForBillboard.reduce((s, e) => s + (e.quantity_in_stock || 0), 0)} ชิ้น
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่ออะไหล่</TableHead>
                        <TableHead>หมวดหมู่</TableHead>
                        <TableHead>ยี่ห้อ</TableHead>
                        <TableHead className="text-center">คงเหลือในคลัง</TableHead>
                        <TableHead>คลัง / ตำแหน่ง</TableHead>
                        <TableHead>ป้ายที่รองรับ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partsForBillboard.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            ไม่พบอะไหล่ที่ตรงเงื่อนไข
                          </TableCell>
                        </TableRow>
                      ) : (
                        partsForBillboard.map((e) => {
                          const mode = e.billboard_compatibility_mode || "unrestricted";
                          const b = getCompatibilityBadge(mode, compatMap[e.id]?.size);
                          const qty = e.quantity_in_stock || 0;
                          return (
                            <TableRow key={e.id}>
                              <TableCell className="font-mono text-xs">{e.code}</TableCell>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-xs">{e.category || "-"}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">{e.brand || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  className={
                                    qty > 0
                                      ? "bg-green-500/15 text-green-700 border-green-500/30"
                                      : "bg-red-500/15 text-red-700 border-red-500/30"
                                  }
                                >
                                  {qty} {e.unit || ""}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {e.locations
                                  ? `${e.locations.warehouses?.code || ""} / ${e.locations.code} - ${e.locations.name}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${b.className} text-xs`}>
                                  {b.icon} {b.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2 */}
        <TabsContent value="by-equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เลือกอะไหล่</CardTitle>
              <CardDescription>ค้นหาด้วย รหัส / ชื่อ / ยี่ห้อ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาอะไหล่..."
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`เลือกอะไหล่ (${filteredEquipmentOptions.length})`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEquipmentOptions.slice(0, 200).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.code} — {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleExportByEquipment} className="gap-2">
                  <Download className="w-4 h-4" /> Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedEquipmentId && selectedEquipment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  ป้ายที่รองรับ {selectedEquipment.code} — {selectedEquipment.name}
                </CardTitle>
                <CardDescription>
                  คงเหลือในคลัง{" "}
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {selectedEquipment.quantity_in_stock || 0} {selectedEquipment.unit || ""}
                  </Badge>
                  {"  "}
                  {(() => {
                    const b = getCompatibilityBadge(
                      billboardsForEquipment.mode,
                      compatMap[selectedEquipmentId]?.size
                    );
                    return (
                      <Badge variant="outline" className={`${b.className} text-xs ml-2`}>
                        {b.icon} {b.label}
                      </Badge>
                    );
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Old Code</TableHead>
                        <TableHead>Equipment ID</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead>ภูมิภาค</TableHead>
                        <TableHead>ฝ่าย</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billboardsForEquipment.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            ไม่มีป้ายที่รองรับ
                          </TableCell>
                        </TableRow>
                      ) : (
                        billboardsForEquipment.items.map((b: any) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono font-medium">{b.old_code || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{b.equipment_id || "-"}</TableCell>
                            <TableCell className="text-sm">{b.location_name || "-"}</TableCell>
                            <TableCell className="text-sm">{b.region || "-"}</TableCell>
                            <TableCell className="text-sm">{b.department || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 py-2 border-t text-sm text-muted-foreground">
                  รวม {billboardsForEquipment.items.length} ป้าย
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillboardPartsAvailability;
