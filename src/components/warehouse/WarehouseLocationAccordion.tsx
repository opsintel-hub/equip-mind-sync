import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  Trash2,
  Warehouse as WarehouseIcon,
  MapPin,
  ChevronsUpDown,
  ChevronsDownUp,
  Search,
  Layers,
  Plus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WarehouseForm } from "./WarehouseForm";
import { LocationForm } from "@/components/location/LocationForm";
import { LocationImport } from "@/components/location/LocationImport";

interface LocationData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storage_area: string | null;
  warehouse_id: string | null;
  zone_id: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  volume_cm3: number | null;
  used_volume_cm3: number | null;
  is_active: boolean | null;
}

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storage_area: string | null;
  department: string | null;
  is_active: boolean | null;
}

interface ZoneData {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  description: string | null;
}

interface Props {
  canManageWarehouse: boolean;
  canManageLocation: boolean;
}

const STORAGE_KEY = "md:warehouses:expanded";
const ZONE_STORAGE_KEY = "md:zones:expanded";

function areaBadge(area: string | null) {
  switch (area) {
    case "Indoor":
      return <Badge className="bg-blue-500 hover:bg-blue-500/90">ภายในอาคาร</Badge>;
    case "Outdoor":
      return <Badge className="bg-green-500 hover:bg-green-500/90">ภายนอกอาคาร</Badge>;
    case "Semi-outdoor":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500/90">กึ่งภายนอก</Badge>;
    default:
      return <Badge variant="secondary">ไม่ระบุ</Badge>;
  }
}

const M3 = (cm3: number) => (cm3 / 1_000_000).toFixed(2);

export function WarehouseLocationAccordion({ canManageWarehouse, canManageLocation }: Props) {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [zonesExpanded, setZonesExpanded] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(ZONE_STORAGE_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [deleteWH, setDeleteWH] = useState<WarehouseData | null>(null);
  const [deleteLoc, setDeleteLoc] = useState<LocationData | null>(null);
  const [deleteZone, setDeleteZone] = useState<ZoneData | null>(null);
  const [zoneDialog, setZoneDialog] = useState<{ warehouseId: string; zone?: ZoneData } | null>(null);
  const [zoneDraft, setZoneDraft] = useState({ code: "", name: "", description: "" });

  const persistExpanded = (next: Set<string>) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {}
  };
  const persistZones = (next: Set<string>) => {
    setZonesExpanded(next);
    try {
      localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify([...next]));
    } catch {}
  };

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    persistExpanded(next);
  };
  const toggleZone = (id: string) => {
    const next = new Set(zonesExpanded);
    next.has(id) ? next.delete(id) : next.add(id);
    persistZones(next);
  };

  const load = async () => {
    setLoading(true);
    const [wRes, lRes, zRes, dRes] = await Promise.all([
      supabase.from("warehouses").select("*").eq("is_active", true).order("code"),
      supabase
        .from("locations")
        .select(
          "id, code, name, description, storage_area, warehouse_id, zone_id, width_cm, height_cm, depth_cm, volume_cm3, used_volume_cm3, is_active",
        )
        .eq("is_active", true)
        .order("code"),
      supabase.from("zones").select("*").eq("is_active", true).order("code"),
      supabase.from("departments").select("name").eq("is_active", true).order("name"),
    ]);
    if (wRes.error) toast.error(wRes.error.message);
    if (lRes.error) toast.error(lRes.error.message);
    if (zRes.error) toast.error(zRes.error.message);
    if (dRes.error) toast.error(dRes.error.message);
    setWarehouses((wRes.data || []) as WarehouseData[]);
    setLocations((lRes.data || []) as LocationData[]);
    setZones((zRes.data || []) as ZoneData[]);
    setDepartments(((dRes.data || []) as { name: string }[]).map((d) => d.name));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const zonesByWh = useMemo(() => {
    const map: Record<string, ZoneData[]> = {};
    for (const z of zones) (map[z.warehouse_id] ||= []).push(z);
    return map;
  }, [zones]);

  const locsByWh = useMemo(() => {
    const map: Record<string, LocationData[]> = {};
    for (const l of locations) {
      const k = l.warehouse_id || "__orphan__";
      (map[k] ||= []).push(l);
    }
    return map;
  }, [locations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return { warehouses, autoExpand: new Set<string>() };
    const q = search.trim().toLowerCase();
    const autoExpand = new Set<string>();
    const matchedWH = warehouses.filter((w) => {
      const wMatch =
        w.code.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        (w.department || "").toLowerCase().includes(q);
      const kids = locsByWh[w.id] || [];
      const zs = zonesByWh[w.id] || [];
      const kidMatch = kids.some(
        (l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q),
      );
      const zMatch = zs.some((z) => z.code.toLowerCase().includes(q) || z.name.toLowerCase().includes(q));
      if (kidMatch || zMatch) autoExpand.add(w.id);
      return wMatch || kidMatch || zMatch;
    });
    return { warehouses: matchedWH, autoExpand };
  }, [warehouses, locsByWh, zonesByWh, search]);

  const isOpen = (id: string) => expanded.has(id) || filtered.autoExpand.has(id);
  const isZoneOpen = (id: string) => zonesExpanded.has(id) || !!search.trim();

  const expandAll = () => persistExpanded(new Set(filtered.warehouses.map((w) => w.id)));
  const collapseAll = () => persistExpanded(new Set());

  const confirmDeleteWH = async () => {
    if (!deleteWH) return;
    const kidCount = (locsByWh[deleteWH.id] || []).length;
    if (kidCount > 0) {
      toast.error(`ไม่สามารถลบได้ — คลังนี้ยังมี ${kidCount} ตำแหน่งจัดเก็บ`);
      setDeleteWH(null);
      return;
    }
    const { error } = await supabase.from("warehouses").update({ is_active: false }).eq("id", deleteWH.id);
    if (error) return toast.error(error.message);
    toast.success("ลบคลังสินค้าสำเร็จ");
    setDeleteWH(null);
    load();
  };

  const confirmDeleteLoc = async () => {
    if (!deleteLoc) return;
    const { error } = await supabase.from("locations").delete().eq("id", deleteLoc.id);
    if (error) return toast.error(error.message);
    toast.success("ลบตำแหน่งจัดเก็บสำเร็จ");
    setDeleteLoc(null);
    load();
  };

  const confirmDeleteZone = async () => {
    if (!deleteZone) return;
    const { error } = await supabase.from("zones").update({ is_active: false }).eq("id", deleteZone.id);
    if (error) return toast.error(error.message);
    toast.success("ลบโซนสำเร็จ");
    setDeleteZone(null);
    load();
  };

  const openZoneDialog = (warehouseId: string, zone?: ZoneData) => {
    setZoneDraft({
      code: zone?.code || "",
      name: zone?.name || "",
      description: zone?.description || "",
    });
    setZoneDialog({ warehouseId, zone });
  };

  const saveZone = async () => {
    if (!zoneDialog) return;
    if (!zoneDraft.code.trim() || !zoneDraft.name.trim()) {
      toast.error("กรุณาระบุรหัสและชื่อโซน");
      return;
    }
    const code = zoneDraft.code.trim();
    const name = zoneDraft.name.trim();
    const description = zoneDraft.description.trim() || null;
    const { data: { user } } = await supabase.auth.getUser();
    if (zoneDialog.zone) {
      const { data: duplicate } = await supabase
        .from("zones")
        .select("id")
        .eq("warehouse_id", zoneDialog.warehouseId)
        .eq("code", code)
        .neq("id", zoneDialog.zone.id)
        .maybeSingle();
      if (duplicate) {
        toast.error("รหัสโซนนี้มีอยู่แล้วในคลังที่เลือก");
        return;
      }
      const { error } = await supabase
        .from("zones")
        .update({
          code,
          name,
          description,
        })
        .eq("id", zoneDialog.zone.id);
      if (error) return toast.error(error.message);
      toast.success("อัพเดทโซนสำเร็จ");
    } else {
      // Check for existing zone (including soft-deleted) to avoid unique-key violation
      const { data: existing } = await supabase
        .from("zones")
        .select("id, is_active")
        .eq("warehouse_id", zoneDialog.warehouseId)
        .eq("code", code)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("zones")
          .update({
            name,
            description,
            is_active: true,
          })
          .eq("id", existing.id);
        if (error) return toast.error(error.message);
        toast.success(existing.is_active ? "อัพเดทโซนสำเร็จ" : "กู้คืนโซนที่เคยลบสำเร็จ");
      } else {
        const { error } = await supabase.from("zones").insert({
          warehouse_id: zoneDialog.warehouseId,
          code,
          name,
          description,
          is_active: true,
          created_by: user?.id,
        });
        if (error) return toast.error(error.message);
        toast.success("เพิ่มโซนสำเร็จ");
      }
    }
    setZoneDialog(null);
    load();
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา รหัส / ชื่อ / ฝ่าย / โซน / ตำแหน่ง"
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-1.5" />ขยายทั้งหมด
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4 mr-1.5" />ยุบทั้งหมด
          </Button>
          {canManageLocation && <LocationImport onSuccess={load} />}
          {canManageWarehouse && <WarehouseForm onSuccess={load} />}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">กำลังโหลด...</div>
      ) : filtered.warehouses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          {search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีข้อมูลคลังสินค้า"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.warehouses.map((w) => {
            const open = isOpen(w.id);
            const whZones = zonesByWh[w.id] || [];
            const whLocs = locsByWh[w.id] || [];
            const totalVol = whLocs.reduce((s, l) => s + (l.volume_cm3 || 0), 0);
            const usedVol = whLocs.reduce((s, l) => s + (l.used_volume_cm3 || 0), 0);
            const remainVol = totalVol - usedVol;

            // Group locations by zone (null = unzoned)
            const locsByZone = new Map<string | null, LocationData[]>();
            for (const l of whLocs) {
              const k = l.zone_id;
              if (!locsByZone.has(k)) locsByZone.set(k, []);
              locsByZone.get(k)!.push(l);
            }

            return (
              <div key={w.id} className="border rounded-lg bg-card overflow-hidden">
                {/* Warehouse header */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer",
                    open && "bg-muted/30 border-b",
                  )}
                  onClick={() => toggle(w.id)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-90",
                    )}
                  />
                  <WarehouseIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium shrink-0">{w.code}</span>
                  <span className="text-muted-foreground shrink-0">·</span>
                  <span className="truncate flex-1">{w.name}</span>
                  {w.department ? (
                    departments.includes(w.department) ? (
                      <Badge variant="outline" className="shrink-0 gap-1">
                        <span className="text-muted-foreground">ฝ่าย:</span>
                        {w.department}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-destructive text-destructive"
                        title="ชื่อฝ่ายนี้ไม่ตรงกับข้อมูลฝ่ายในระบบ"
                      >
                        ⚠ ฝ่าย: {w.department}
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-muted-foreground italic">
                      ไม่ระบุฝ่าย
                    </Badge>
                  )}
                  <span className="shrink-0 hidden md:inline-flex">{areaBadge(w.storage_area)}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {whZones.length} โซน · {whLocs.length} ตำแหน่ง
                  </Badge>
                  <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <span>{M3(usedVol)}</span>
                    <span>/</span>
                    <span>{M3(totalVol)} m³</span>
                    <span className={cn("ml-2 font-medium", remainVol < 0 ? "text-destructive" : "text-emerald-600")}>
                      เหลือ {M3(remainVol)} m³
                    </span>
                  </span>
                  <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canManageWarehouse && (
                      <>
                        <WarehouseForm editData={w as any} onSuccess={load} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteWH(w)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Zones + locations */}
                {open && (
                  <div className="pl-4 pr-2 py-2 space-y-2">
                    {whZones.length === 0 && whLocs.length === 0 && (
                      <div className="text-sm text-muted-foreground italic px-3 py-2">
                        ยังไม่มีโซนหรือตำแหน่งจัดเก็บในคลังนี้
                      </div>
                    )}

                    {/* Render each zone */}
                    {whZones.map((z) => {
                      const zLocs = locsByZone.get(z.id) || [];
                      const zOpen = isZoneOpen(z.id);
                      return (
                        <div key={z.id} className="border rounded-md bg-muted/20">
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40"
                            onClick={() => toggleZone(z.id)}
                          >
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                zOpen && "rotate-90",
                              )}
                            />
                            <Layers className="h-4 w-4 text-primary/70" />
                            <span className="font-medium">{z.code}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-sm flex-1 truncate">{z.name}</span>
                            {z.description && (
                              <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[220px]">
                                {z.description}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {zLocs.length} ตำแหน่ง
                            </Badge>
                            {canManageLocation && (
                              <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openZoneDialog(w.id, z)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setDeleteZone(z)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {zOpen && (
                            <div className="pl-6 pr-2 pb-2 space-y-1">
                              {zLocs.length === 0 ? (
                                <div className="text-xs text-muted-foreground italic px-3 py-1.5">
                                  ยังไม่มีตำแหน่งในโซนนี้
                                </div>
                              ) : (
                                zLocs.map((l) => renderLocationRow(l))
                              )}
                              {canManageLocation && (
                                <div className="pt-1">
                                  <LocationForm
                                    defaultWarehouseId={w.id}
                                    defaultZoneId={z.id}
                                    onSuccess={load}
                                    triggerLabel={`+ เพิ่มตำแหน่งในโซน ${z.code}`}
                                    triggerVariant="ghost"
                                    triggerClassName="text-primary hover:text-primary h-7 px-2 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Unzoned locations */}
                    {(locsByZone.get(null) || []).length > 0 && (
                      <div className="border rounded-md bg-muted/10">
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>ไม่มีโซน</span>
                          <Badge variant="secondary" className="text-xs ml-1">
                            {(locsByZone.get(null) || []).length}
                          </Badge>
                        </div>
                        <div className="pl-6 pr-2 pb-2 space-y-1">
                          {(locsByZone.get(null) || []).map((l) => renderLocationRow(l))}
                        </div>
                      </div>
                    )}

                    {canManageLocation && (
                      <div className="flex gap-2 pt-1 pl-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary h-8 px-2 gap-1"
                          onClick={() => openZoneDialog(w.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          เพิ่มโซน
                        </Button>
                        <LocationForm
                          defaultWarehouseId={w.id}
                          onSuccess={load}
                          triggerLabel="เพิ่มตำแหน่ง (ไม่มีโซน)"
                          triggerVariant="ghost"
                          triggerClassName="text-primary hover:text-primary h-8 px-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zone Dialog */}
      <Dialog open={!!zoneDialog} onOpenChange={(o) => !o && setZoneDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{zoneDialog?.zone ? "แก้ไขโซน" : "เพิ่มโซน"}</DialogTitle>
            <DialogDescription>
              โซนใช้จัดกลุ่มตำแหน่งจัดเก็บ (เช่น รหัส A, ชื่อ "โซนซ้าย" มีตำแหน่ง A01, A02...)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>รหัสโซน *</Label>
                <Input
                  value={zoneDraft.code}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, code: e.target.value })}
                  placeholder="เช่น A"
                />
              </div>
              <div className="space-y-2">
                <Label>ชื่อโซน *</Label>
                <Input
                  value={zoneDraft.name}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })}
                  placeholder="เช่น โซนซ้าย"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Input
                value={zoneDraft.description}
                onChange={(e) => setZoneDraft({ ...zoneDraft, description: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialog(null)}>
              ยกเลิก
            </Button>
            <Button onClick={saveZone}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteWH} onOpenChange={(o) => !o && setDeleteWH(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคลังสินค้า</AlertDialogTitle>
            <AlertDialogDescription>ต้องการลบคลังสินค้า "{deleteWH?.name}" ใช่หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWH}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteLoc} onOpenChange={(o) => !o && setDeleteLoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบตำแหน่งจัดเก็บ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบตำแหน่ง "{deleteLoc?.code} · {deleteLoc?.name}" ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLoc}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteZone} onOpenChange={(o) => !o && setDeleteZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโซน</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบโซน "{deleteZone?.code} · {deleteZone?.name}"? ตำแหน่งที่อยู่ในโซนนี้จะกลายเป็น "ไม่มีโซน"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteZone}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  function renderLocationRow(l: LocationData) {
    const lRemain = (l.volume_cm3 || 0) - (l.used_volume_cm3 || 0);
    return (
      <div
        key={l.id}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/40 border border-transparent hover:border-border"
      >
        <span className="text-muted-foreground text-xs">└─</span>
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium shrink-0">{l.code}</span>
        <span className="text-muted-foreground shrink-0">·</span>
        <span className="truncate flex-1 text-sm">{l.name}</span>
        {l.storage_area && (
          <Badge variant="outline" className="shrink-0 text-xs hidden md:inline-flex">
            {l.storage_area}
          </Badge>
        )}
        <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <span>{M3(l.used_volume_cm3 || 0)}</span>
          <span>/</span>
          <span>{M3(l.volume_cm3 || 0)} m³</span>
          <span className={cn("ml-1", lRemain < 0 ? "text-destructive" : "text-emerald-600")}>
            (เหลือ {M3(lRemain)})
          </span>
        </span>
        {canManageLocation && (
          <div className="flex gap-0.5 shrink-0">
            <LocationForm location={l as any} onSuccess={load} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteLoc(l)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    );
  }
}
