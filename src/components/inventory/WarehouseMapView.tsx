import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exportMapExcel, exportMapPdf, type MapExportRow } from "@/lib/warehouseMapExport";
import { Download, Boxes, Grid3X3, LayoutList, MapPin, Package, Search, Warehouse as WarehouseIcon } from "lucide-react";

export interface MapItem {
  id: string;
  code: string;
  name: string;
  serial_number?: string | null;
  quantity_in_stock: number;
  unit?: string;
  item_type: "equipment" | "tools" | "media_player";
  item_condition?: string;
  location_id: string | null;
  category?: string | null;
}

interface LocationRow {
  id: string;
  code: string;
  name: string;
  warehouse_id: string | null;
  zone_id: string | null;
  volume_cm3: number | null;
  used_volume_cm3: number | null;
  is_active: boolean | null;
}

const UNASSIGNED = "__unassigned__";

const typeLabel = (t: MapItem["item_type"]) =>
  t === "media_player" ? "MP/จอภาพ" : t === "tools" ? "เครื่องมือ" : "อะไหล่";

const typeClass = (t: MapItem["item_type"]) =>
  t === "media_player"
    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
    : t === "tools"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

export function WarehouseMapView({ items }: { items: MapItem[] }) {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"rack" | "grid">("rack");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [slotStatus, setSlotStatus] = useState<"all" | "occupied" | "empty" | "near_full">("all");
  const [spaceOnly, setSpaceOnly] = useState(false);
  const [serialOnly, setSerialOnly] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportWh, setExportWh] = useState<string>("__current__");
  const [exportRange, setExportRange] = useState<"filtered" | "all" | "occupied" | "available">("filtered");
  const [exporting, setExporting] = useState(false);
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category || "").filter(Boolean))).sort((a, b) => a.localeCompare(b, "th")),
    [items],
  );

  const { data: warehouses = [] } = useQuery({
    queryKey: ["map-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, code, name, departments")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["map-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("id, code, name, warehouse_id")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["map-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name, warehouse_id, zone_id, volume_cm3, used_volume_cm3, is_active")
        .order("code");
      if (error) throw error;
      return (data || []) as LocationRow[];
    },
  });

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const { data: allocations = [] } = useQuery({
    queryKey: ["map-allocations", itemIds.length],
    enabled: itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_location_allocations")
        .select("location_id, quantity, equipment_id, media_player_id, tool_id");
      if (error) throw error;
      return data || [];
    },
  });

  // itemId -> [{locationId, qty}]
  const allocByItem = useMemo(() => {
    const map = new Map<string, { locationId: string; qty: number }[]>();
    allocations.forEach((a: any) => {
      const key = a.equipment_id || a.media_player_id || a.tool_id;
      if (!key || !a.location_id) return;
      const list = map.get(key) || [];
      list.push({ locationId: a.location_id, qty: Number(a.quantity) || 0 });
      map.set(key, list);
    });
    return map;
  }, [allocations]);

  interface SlotEntry extends MapItem {
    slotQty: number;
  }

  // locationId -> items
  const bySlot = useMemo(() => {
    const map = new Map<string, SlotEntry[]>();
    const push = (locId: string, entry: SlotEntry) => {
      const list = map.get(locId) || [];
      list.push(entry);
      map.set(locId, list);
    };
    items.forEach((item) => {
      const allocs = allocByItem.get(item.id);
      if (allocs && allocs.length > 0) {
        allocs.forEach((a) => push(a.locationId, { ...item, slotQty: a.qty }));
      } else if (item.location_id) {
        push(item.location_id, { ...item, slotQty: item.quantity_in_stock });
      } else {
        push(UNASSIGNED, { ...item, slotQty: item.quantity_in_stock });
      }
    });
    return map;
  }, [items, allocByItem]);

  // ค่าจริงในฐานข้อมูลอาจเป็น 'new' (ค่าเริ่มต้นเก่า) — ถือเป็น 'normal'
  const normCond = (c?: string) =>
    c === "defective" || c === "pending_inspection" ? c : "normal";

  const matches = (e: SlotEntry) => {
    const q = search.trim().toLowerCase();
    const condOk = conditionFilter === "all" || normCond(e.item_condition) === conditionFilter;
    if (!condOk) return false;
    if (categoryFilter !== "all" && (e.category || "") !== categoryFilter) return false;
    if (serialOnly && !e.serial_number) return false;
    if (!q) return true;
    return (
      e.code.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      (e.serial_number || "").toLowerCase().includes(q)
    );
  };

  const warehouseStats = useMemo(() => {
    return warehouses.map((w: any) => {
      const locs = locations.filter((l) => l.warehouse_id === w.id);
      const used = locs.filter((l) => (bySlot.get(l.id) || []).length > 0).length;
      const qty = locs.reduce(
        (s, l) => s + (bySlot.get(l.id) || []).reduce((a, e) => a + e.slotQty, 0),
        0,
      );
      return { ...w, locCount: locs.length, usedCount: used, qty };
    });
  }, [warehouses, locations, bySlot]);

  const defaultWarehouse = useMemo(() => {
    const withItems = warehouseStats.filter((w: any) => w.qty > 0).sort((a: any, b: any) => b.qty - a.qty);
    return withItems[0]?.id || warehouseStats[0]?.id || "";
  }, [warehouseStats]);
  const activeWarehouse = warehouseId || defaultWarehouse;
  const unassigned = bySlot.get(UNASSIGNED) || [];

  const visibleLocations = useMemo(() => {
    if (activeWarehouse === UNASSIGNED) return [];
    return locations.filter((l) => l.warehouse_id === activeWarehouse);
  }, [locations, activeWarehouse]);

  // group locations by zone
  const grouped = useMemo(() => {
    const zoneMap = new Map<string, { code: string; name: string; locs: LocationRow[] }>();
    visibleLocations.forEach((l) => {
      const z = zones.find((zz: any) => zz.id === l.zone_id);
      const key = z?.id || "__nozone__";
      if (!zoneMap.has(key)) {
        zoneMap.set(key, { code: z?.code || "ไม่ระบุโซน", name: z?.name || "ช่องที่ยังไม่จัดโซน", locs: [] });
      }
      zoneMap.get(key)!.locs.push(l);
    });
    return Array.from(zoneMap.entries())
      .map(([id, v]) => ({
        id,
        ...v,
        occupied: v.locs.filter((l) => (bySlot.get(l.id) || []).length > 0).length,
      }))
      .sort((a, b) => b.occupied - a.occupied || a.code.localeCompare(b.code));
  }, [visibleLocations, zones, bySlot]);

  const fillPct = (l: LocationRow) => {
    if (!l.volume_cm3 || l.volume_cm3 <= 0) return null;
    return Math.min(100, Math.round(((l.used_volume_cm3 || 0) / l.volume_cm3) * 100));
  };

  const slotColor = (l: LocationRow) => {
    const entries = (bySlot.get(l.id) || []).filter(matches);
    if (entries.length === 0) return "border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground";
    const pct = fillPct(l);
    if (pct !== null && pct >= 80) return "border-amber-500/50 bg-amber-500/10";
    return "border-emerald-500/50 bg-emerald-500/10";
  };

  const filtersActive = search.trim() !== "" || conditionFilter !== "all" || categoryFilter !== "all" || serialOnly;
  const hasSpace = (l: LocationRow) => {
    const pct = fillPct(l);
    return pct === null ? true : pct < 80;
  };
  const locOk = (l: LocationRow) => {
    const entries = (bySlot.get(l.id) || []).filter(matches);
    const occupied = entries.length > 0;
    if (slotStatus === "occupied" && !occupied) return false;
    if (slotStatus === "empty" && occupied) return false;
    if (slotStatus === "near_full" && !(occupied && !hasSpace(l))) return false;
    if (spaceOnly && !hasSpace(l)) return false;
    if (filtersActive && slotStatus === "all" && !spaceOnly && !occupied) return false;
    return true;
  };
  const displayGroups = grouped
    .map((z) => ({ ...z, locs: z.locs.filter(locOk) }))
    .filter((z) => z.locs.length > 0);

  const conditionLabel = (c?: string) =>
    normCond(c) === "defective" ? "เสีย/ชำรุด" : normCond(c) === "pending_inspection" ? "รอตรวจสอบ" : "ปกติ";

  const buildRows = (): { rows: MapExportRow[]; title: string } => {
    const whId = exportWh === "__current__" ? activeWarehouse : exportWh;
    const whList = whId === "__all__" ? warehouses : warehouses.filter((w: any) => w.id === whId);
    const rows: MapExportRow[] = [];
    const useFilter = exportRange === "filtered";
    whList.forEach((w: any) => {
      locations
        .filter((l) => l.warehouse_id === w.id)
        .sort((a, b) => a.code.localeCompare(b.code))
        .forEach((l) => {
          if (useFilter && !locOk(l)) return;
          const entries = (bySlot.get(l.id) || []).filter((e) => (useFilter ? matches(e) : true));
          const pct = fillPct(l);
          const status = entries.length === 0 ? "ช่องว่าง" : hasSpace(l) ? "มีของ/ยังมีพื้นที่" : "ใกล้เต็ม";
          if (exportRange === "occupied" && entries.length === 0) return;
          if (exportRange === "available" && !hasSpace(l)) return;
          const z = zones.find((zz: any) => zz.id === l.zone_id) as any;
          const base = {
            warehouse: w.code,
            zone: z?.code || "-",
            locationCode: l.code,
            locationName: l.name,
            usedPct: pct === null ? "-" : `${pct}`,
            slotStatus: status,
          };
          if (entries.length === 0) {
            rows.push({ ...base, itemType: "", category: "", code: "", name: "", serial: "", qty: "", unit: "", condition: "" });
          } else {
            entries.forEach((e) =>
              rows.push({
                ...base,
                itemType: typeLabel(e.item_type),
                category: e.category || "",
                code: e.code,
                name: e.name,
                serial: e.serial_number || "",
                qty: e.slotQty,
                unit: e.unit || "",
                condition: conditionLabel(e.item_condition),
              }),
            );
          }
        });
    });
    if (whId === UNASSIGNED || whId === "__all__") {
      unassigned
        .filter((e) => (useFilter ? matches(e) : true))
        .forEach((e) =>
          rows.push({
            warehouse: "ยังไม่ระบุตำแหน่ง", zone: "-", locationCode: "-", locationName: "-", usedPct: "-", slotStatus: "-",
            itemType: typeLabel(e.item_type), category: e.category || "", code: e.code, name: e.name,
            serial: e.serial_number || "", qty: e.slotQty, unit: e.unit || "", condition: conditionLabel(e.item_condition),
          }),
        );
    }
    const title = whId === "__all__" ? "ทุกคลัง" : whId === UNASSIGNED ? "ยังไม่ระบุตำแหน่ง" : (whList[0] as any)?.code || "คลัง";
    return { rows, title };
  };

  const rangeLabel = { filtered: "ตามตัวกรองปัจจุบัน", all: "ทุกช่อง", occupied: "เฉพาะช่องที่มีของ", available: "เฉพาะช่องที่ยังมีพื้นที่ว่าง" };

  const doExport = async (fmt: "excel" | "pdf") => {
    const { rows, title } = buildRows();
    if (rows.length === 0) {
      toast.error("ไม่มีข้อมูลในช่วงที่เลือก");
      return;
    }
    setExporting(true);
    try {
      if (fmt === "excel") exportMapExcel(rows, title);
      else await exportMapPdf(rows, title, rangeLabel[exportRange]);
      toast.success(`ส่งออก ${rows.length} แถวแล้ว`);
      setExportOpen(false);
    } catch (err: any) {
      toast.error("ส่งออกไม่สำเร็จ: " + (err?.message || err));
    } finally {
      setExporting(false);
    }
  };

  const openLoc = locations.find((l) => l.id === openSlot) || null;
  const openEntries = openSlot ? (bySlot.get(openSlot) || []).filter(matches) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Warehouse list */}
      <Card className="h-fit">
        <CardContent className="p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-1 pb-1">คลังสินค้า</p>
          <div className="max-h-[420px] overflow-y-auto space-y-1">
            {warehouseStats.map((w: any) => (
              <button
                key={w.id}
                onClick={() => setWarehouseId(w.id)}
                className={cn(
                  "w-full text-left rounded-md px-2 py-2 text-sm transition-colors",
                  activeWarehouse === w.id ? "bg-primary/10 border border-primary/40" : "hover:bg-muted border border-transparent",
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  <WarehouseIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{w.code}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{w.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  ช่องใช้งาน {w.usedCount}/{w.locCount} • รวม {w.qty.toLocaleString()} ชิ้น
                </div>
              </button>
            ))}
            {unassigned.length > 0 && (
              <button
                onClick={() => setWarehouseId(UNASSIGNED)}
                className={cn(
                  "w-full text-left rounded-md px-2 py-2 text-sm transition-colors",
                  activeWarehouse === UNASSIGNED ? "bg-primary/10 border border-primary/40" : "hover:bg-muted border border-transparent",
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  ยังไม่ระบุตำแหน่ง
                </div>
                <div className="text-[11px] text-muted-foreground">{unassigned.length} รายการ</div>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map area */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา S/N, ชื่อสินค้า, รหัส..."
              className="pl-8"
            />
          </div>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสภาพ</SelectItem>
              <SelectItem value="normal">ปกติ</SelectItem>
              <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
              <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4 mr-1" /> ส่งออก
          </Button>
          <div className="flex rounded-md border overflow-hidden shrink-0">
            <Button variant={mode === "rack" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setMode("rack")}>
              <LayoutList className="h-4 w-4 mr-1" /> ชั้นวาง
            </Button>
            <Button variant={mode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setMode("grid")}>
              <Grid3X3 className="h-4 w-4 mr-1" /> ตารางช่อง
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดอุปกรณ์</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={slotStatus} onValueChange={(v) => setSlotStatus(v as any)}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะการจัดเก็บ</SelectItem>
              <SelectItem value="occupied">มีของจัดเก็บ</SelectItem>
              <SelectItem value="empty">ช่องว่าง</SelectItem>
              <SelectItem value="near_full">ใกล้เต็มความจุ</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={spaceOnly} onCheckedChange={(v) => setSpaceOnly(!!v)} />
            เฉพาะช่องที่ยังมีพื้นที่ว่าง
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={serialOnly} onCheckedChange={(v) => setSerialOnly(!!v)} />
            เฉพาะสินค้าที่มี S/N
          </label>
          {(categoryFilter !== "all" || slotStatus !== "all" || spaceOnly || serialOnly) && (
            <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter("all"); setSlotStatus("all"); setSpaceOnly(false); setSerialOnly(false); }}>
              ล้างตัวกรอง
            </Button>
          )}
        </div>

        {activeWarehouse === UNASSIGNED ? (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium">รายการที่ยังไม่ระบุตำแหน่งจัดเก็บ</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {unassigned.filter(matches).map((e, idx) => (
                  <div key={`${e.id}-${idx}`} className="rounded-md border p-2 text-sm">
                    {e.serial_number && (
                      <div className="text-xs font-mono font-semibold whitespace-pre-line break-all">
                        {e.serial_number}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{e.code}</span>
                      <Badge variant="outline" className={cn("text-[10px]", typeClass(e.item_type))}>{typeLabel(e.item_type)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{e.name}</div>
                    <div className="text-xs mt-1">จำนวน {e.slotQty}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : displayGroups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {grouped.length === 0 ? "คลังนี้ยังไม่มีตำแหน่งจัดเก็บ" : "ไม่พบช่องที่ตรงกับตัวกรอง"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayGroups.map((zone) => (
              <Card key={zone.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{zone.code}</span>
                    <span className="text-sm text-muted-foreground truncate">{zone.name}</span>
                    <Badge variant="secondary" className="ml-auto">มีของ {zone.occupied}/{zone.locs.length} ช่อง</Badge>
                  </div>

                  {mode === "grid" ? (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-6">
                      {zone.locs.map((l) => {
                        const entries = (bySlot.get(l.id) || []).filter(matches);
                        const qty = entries.reduce((s, e) => s + e.slotQty, 0);
                        const pct = fillPct(l);
                        return (
                          <button
                            key={l.id}
                            onClick={() => setOpenSlot(l.id)}
                            className={cn("rounded-md border p-2 text-left transition-transform hover:scale-[1.02]", slotColor(l))}
                          >
                            <div className="font-mono text-sm font-semibold truncate">{l.code}</div>
                            {entries.length === 1 && entries[0].serial_number ? (
                              <div className="text-[11px] font-mono font-semibold whitespace-pre-line break-all truncate">
                                {entries[0].serial_number}
                              </div>
                            ) : (
                              <div className="text-[11px] truncate opacity-80">{l.name}</div>
                            )}
                            <div className="text-xs mt-1">
                              {entries.length > 0 ? `${entries.length} รายการ • ${qty} ชิ้น` : "ช่องว่าง"}
                            </div>
                            {pct !== null && (
                              <div className="text-[10px] mt-0.5 opacity-80">ใช้พื้นที่ {pct}%</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {zone.locs.map((l) => {
                        const entries = (bySlot.get(l.id) || []).filter(matches);
                        const pct = fillPct(l);
                        return (
                          <div key={l.id} className="rounded-md border bg-card">
                            <button
                              onClick={() => setOpenSlot(l.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 border-b hover:bg-muted/50 text-left"
                            >
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-mono text-sm font-semibold">{l.code}</span>
                              <span className="text-xs text-muted-foreground truncate">{l.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                                {pct !== null ? `ใช้พื้นที่ ${pct}%` : ""}
                              </span>
                            </button>
                            <div className="p-2 flex flex-wrap gap-2">
                              {entries.length === 0 ? (
                                <div className="w-full rounded border border-dashed border-muted-foreground/30 py-3 text-center text-xs text-muted-foreground">
                                  [ + ช่องว่าง ]
                                </div>
                              ) : (
                                  entries.map((e, idx) => (
                                    <button
                                      key={`${e.id}-${idx}`}
                                      onClick={() => setOpenSlot(l.id)}
                                      className={cn("rounded-md border px-2 py-1.5 text-left min-w-[150px] max-w-[220px]", typeClass(e.item_type))}
                                    >
                                      {e.serial_number && (
                                        <div className="text-[11px] font-mono font-semibold whitespace-pre-line break-all leading-tight">
                                          {e.serial_number}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-xs font-semibold truncate">{e.code}</span>
                                        <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">{e.slotQty}</Badge>
                                      </div>
                                      <div className="text-[11px] opacity-80 truncate">{e.name}</div>
                                    </button>
                                  ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-emerald-500/50 bg-emerald-500/10" /> มีของ/ยังมีพื้นที่</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-amber-500/50 bg-amber-500/10" /> ใกล้เต็มความจุ</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-dashed border-muted-foreground/40 bg-muted/30" /> ช่องว่าง</span>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>ส่งออกผังตำแหน่งจัดเก็บ</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>คลัง</Label>
              <Select value={exportWh} onValueChange={setExportWh}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__current__">คลังที่เลือกอยู่</SelectItem>
                  <SelectItem value="__all__">ทุกคลัง</SelectItem>
                  {warehouses.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}
                  {unassigned.length > 0 && <SelectItem value={UNASSIGNED}>ยังไม่ระบุตำแหน่ง</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ช่วงข้อมูล</Label>
              <Select value={exportRange} onValueChange={(v) => setExportRange(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(rangeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={exporting} onClick={() => doExport("excel")}>Excel</Button>
            <Button disabled={exporting} onClick={() => doExport("pdf")}>{exporting ? "กำลังสร้าง..." : "PDF"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick peek */}
      <Sheet open={!!openSlot} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono">{openLoc?.code}</SheetTitle>
            <SheetDescription>{openLoc?.name}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {openEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">ช่องนี้ยังไม่มีสินค้า</p>
            ) : (
              openEntries.map((e, idx) => (
                <div key={`${e.id}-${idx}`} className="rounded-md border p-3 space-y-1">
                  {e.serial_number && (
                    <div className="text-sm font-mono font-semibold whitespace-pre-line break-all">
                      {e.serial_number}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{e.code}</span>
                    <Badge variant="outline" className={cn("text-[10px]", typeClass(e.item_type))}>{typeLabel(e.item_type)}</Badge>
                    <Badge variant="secondary" className="ml-auto">{e.slotQty} {e.unit || ""}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{e.name}</div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default WarehouseMapView;
