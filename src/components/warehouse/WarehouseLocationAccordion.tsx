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
  ChevronRight,
  Trash2,
  Warehouse as WarehouseIcon,
  MapPin,
  ChevronsUpDown,
  ChevronsDownUp,
  Search,
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

interface Props {
  canManageWarehouse: boolean;
  canManageLocation: boolean;
}

const STORAGE_KEY = "md:warehouses:expanded";

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
  const [deleteWH, setDeleteWH] = useState<WarehouseData | null>(null);
  const [deleteLoc, setDeleteLoc] = useState<LocationData | null>(null);

  const persistExpanded = (next: Set<string>) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  };

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    persistExpanded(next);
  };

  const load = async () => {
    setLoading(true);
    const [wRes, lRes, dRes] = await Promise.all([
      supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("code"),
      supabase
        .from("locations")
        .select(
          "id, code, name, description, storage_area, warehouse_id, width_cm, height_cm, depth_cm, volume_cm3, used_volume_cm3, is_active",
        )
        .eq("is_active", true)
        .order("code"),
      supabase
        .from("departments")
        .select("name")
        .eq("is_active", true)
        .order("name"),
    ]);
    if (wRes.error) toast.error(wRes.error.message);
    if (lRes.error) toast.error(lRes.error.message);
    if (dRes.error) toast.error(dRes.error.message);
    setWarehouses((wRes.data || []) as WarehouseData[]);
    setLocations((lRes.data || []) as LocationData[]);
    setDepartments(((dRes.data || []) as { name: string }[]).map((d) => d.name));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const locsByWh = useMemo(() => {
    const map: Record<string, LocationData[]> = {};
    for (const l of locations) {
      const k = l.warehouse_id || "__orphan__";
      (map[k] ||= []).push(l);
    }
    return map;
  }, [locations]);

  // Auto-expand warehouses whose children match the search
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
      const kidMatch = kids.some(
        (l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q),
      );
      if (kidMatch) autoExpand.add(w.id);
      return wMatch || kidMatch;
    });
    return { warehouses: matchedWH, autoExpand };
  }, [warehouses, locsByWh, search]);

  const filteredLocs = (whId: string) => {
    const kids = locsByWh[whId] || [];
    if (!search.trim()) return kids;
    const q = search.trim().toLowerCase();
    // If warehouse itself matches, show all children; otherwise filter
    const w = warehouses.find((x) => x.id === whId);
    const whMatches =
      w &&
      (w.code.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        (w.department || "").toLowerCase().includes(q));
    if (whMatches) return kids;
    return kids.filter(
      (l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q),
    );
  };

  const isOpen = (id: string) => expanded.has(id) || filtered.autoExpand.has(id);

  const expandAll = () =>
    persistExpanded(new Set(filtered.warehouses.map((w) => w.id)));
  const collapseAll = () => persistExpanded(new Set());

  const confirmDeleteWH = async () => {
    if (!deleteWH) return;
    const kidCount = (locsByWh[deleteWH.id] || []).length;
    if (kidCount > 0) {
      toast.error(`ไม่สามารถลบได้ — คลังนี้ยังมี ${kidCount} ตำแหน่งจัดเก็บ กรุณาย้าย/ลบตำแหน่งก่อน`);
      setDeleteWH(null);
      return;
    }
    const { error } = await supabase
      .from("warehouses")
      .update({ is_active: false })
      .eq("id", deleteWH.id);
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

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา รหัส / ชื่อ / ฝ่าย / ตำแหน่ง"
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-1.5" />
            ขยายทั้งหมด
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4 mr-1.5" />
            ยุบทั้งหมด
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
            const kids = filteredLocs(w.id);
            const totalVol = kids.reduce((s, l) => s + (l.volume_cm3 || 0), 0);
            const usedVol = kids.reduce((s, l) => s + (l.used_volume_cm3 || 0), 0);
            const remainVol = totalVol - usedVol;

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
                        title="ชื่อฝ่ายนี้ไม่ตรงกับข้อมูลฝ่ายในระบบ อาจสะกดผิดหรือฝ่ายถูกลบ"
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
                    {kids.length} ตำแหน่ง
                  </Badge>
                  <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <span>{M3(usedVol)}</span>
                    <span>/</span>
                    <span>{M3(totalVol)} m³</span>
                    <span
                      className={cn(
                        "ml-2 font-medium",
                        remainVol < 0 ? "text-destructive" : "text-emerald-600",
                      )}
                    >
                      เหลือ {M3(remainVol)} m³
                    </span>
                  </span>
                  <div
                    className="flex gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canManageWarehouse && (
                      <>
                        <WarehouseForm editData={w as any} onSuccess={load} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteWH(w)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Locations */}
                {open && (
                  <div className="pl-6 pr-2 py-2 space-y-1">
                    {kids.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic px-3 py-2">
                        ยังไม่มีตำแหน่งจัดเก็บในคลังนี้
                      </div>
                    ) : (
                      kids.map((l) => {
                        const lRemain = (l.volume_cm3 || 0) - (l.used_volume_cm3 || 0);
                        return (
                          <div
                            key={l.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border"
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
                              <span
                                className={cn(
                                  "ml-1",
                                  lRemain < 0 ? "text-destructive" : "text-emerald-600",
                                )}
                              >
                                (เหลือ {M3(lRemain)})
                              </span>
                            </span>
                            {canManageLocation && (
                              <div className="flex gap-0.5 shrink-0">
                                <LocationForm
                                  location={l as any}
                                  onSuccess={load}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setDeleteLoc(l)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {canManageLocation && (
                      <div className="pl-6 pt-1">
                        <LocationForm
                          defaultWarehouseId={w.id}
                          onSuccess={load}
                          triggerLabel="เพิ่มตำแหน่งจัดเก็บในคลังนี้"
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

      <AlertDialog open={!!deleteWH} onOpenChange={(o) => !o && setDeleteWH(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคลังสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบคลังสินค้า "{deleteWH?.name}" ใช่หรือไม่?
            </AlertDialogDescription>
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
              การลบนี้จะลบข้อมูลถาวร (hard delete)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLoc}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
