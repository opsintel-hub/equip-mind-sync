import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, X, Info, ChevronsUpDown } from "lucide-react";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type CompatibilityMode = "unrestricted" | "multi_partial" | "specific";

export interface CompatibilityValue {
  mode: CompatibilityMode;
  packageIds: string[];
  billboardIds: string[];
  notes: string;
}

interface Props {
  value: CompatibilityValue;
  onChange: (v: CompatibilityValue) => void;
  disabled?: boolean;
  /** ฝ่ายเจ้าของอุปกรณ์ — ใช้กรองให้เลือกได้เฉพาะป้ายของฝ่ายเดียวกันเท่านั้น */
  department?: string;
}

export function BillboardCompatibilityField({ value, onChange, disabled, department }: Props) {
  const [pkgDialog, setPkgDialog] = useState(false);
  const [bbDialog, setBbDialog] = useState(false);
  const [pkgSearch, setPkgSearch] = useState("");
  const [bbSearch, setBbSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const deptKey = department || "__none__";

  const { data: allBillboards = [] } = useQuery({
    queryKey: ["billboards-compat-all", deptKey],
    queryFn: async () => {
      let q = supabase
        .from("billboards")
        .select("id, old_code, location_name, equipment_id, department")
        .eq("status", "active");
      if (department) q = q.eq("department", department);
      const { data, error } = await q.order("old_code").limit(5000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!department && value.mode !== "unrestricted",
  });

  // Packages: fetch all active packages + their billboard department to filter by dept
  const { data: packagesRaw = [] } = useQuery({
    queryKey: ["billboard-packages-compat-with-items", deptKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_packages")
        .select("id, name, media_type, billboard_package_items(billboard_id, billboards(department))")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!department,
  });

  // Only include packages that have ≥1 billboard belonging to the selected department
  const packages = useMemo(() => {
    if (!department) return [] as any[];
    return (packagesRaw as any[]).filter((p) =>
      (p.billboard_package_items || []).some(
        (it: any) => it?.billboards?.department === department
      )
    );
  }, [packagesRaw, department]);

  const { data: pkgItems = [] } = useQuery({
    queryKey: ["billboard-package-items-compat", value.packageIds, deptKey],
    queryFn: async () => {
      if (value.packageIds.length === 0) return [];
      let q = supabase
        .from("billboard_package_items")
        .select("package_id, billboard_id, billboards!inner(id, old_code, location_name, equipment_id, department)")
        .in("package_id", value.packageIds);
      if (department) q = q.eq("billboards.department", department);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: value.packageIds.length > 0 && !!department,
  });

  // Resolved billboard ids (from packages + manual)
  const resolvedBillboardIds = useMemo(() => {
    const set = new Set<string>();
    pkgItems.forEach((p: any) => set.add(p.billboard_id));
    value.billboardIds.forEach((id) => set.add(id));
    return Array.from(set);
  }, [pkgItems, value.billboardIds]);

  const resolvedFromPkg = pkgItems.length;
  const resolvedManual = value.billboardIds.length;
  const totalResolved = resolvedBillboardIds.length;

  const setMode = (mode: CompatibilityMode) => {
    if (mode === "unrestricted") {
      onChange({ mode, packageIds: [], billboardIds: [], notes: value.notes });
    } else {
      onChange({ ...value, mode });
    }
  };

  const togglePackage = (id: string) => {
    const has = value.packageIds.includes(id);
    onChange({
      ...value,
      packageIds: has ? value.packageIds.filter((x) => x !== id) : [...value.packageIds, id],
    });
  };

  const toggleBillboard = (id: string) => {
    const has = value.billboardIds.includes(id);
    onChange({
      ...value,
      billboardIds: has ? value.billboardIds.filter((x) => x !== id) : [...value.billboardIds, id],
    });
  };

  const selectedPackages = packages.filter((p) => value.packageIds.includes(p.id));
  const selectedBillboards = allBillboards.filter((b) => value.billboardIds.includes(b.id));
  const resolvedBillboards = allBillboards.filter((b) => resolvedBillboardIds.includes(b.id));

  const filteredPackages = packages.filter((p) => {
    if (!pkgSearch) return true;
    const s = pkgSearch.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.media_type || "").toLowerCase().includes(s);
  });

  const filteredBillboards = allBillboards.filter((b) => {
    if (!bbSearch) return true;
    const s = bbSearch.toLowerCase();
    return (
      (b.old_code || "").toLowerCase().includes(s) ||
      (b.location_name || "").toLowerCase().includes(s) ||
      (b.department || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
      <div className="flex items-center gap-2">
        <Label className="text-base font-semibold">ป้ายที่รองรับ (Compatibility)</Label>
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">ระบุว่าอุปกรณ์/อะไหล่นี้ใช้ได้กับป้ายใดบ้าง (จอ/MP ไม่ต้องระบุ)</span>
      </div>

      <RadioGroup
        value={value.mode}
        onValueChange={(v) => setMode(v as CompatibilityMode)}
        disabled={disabled}
        className="grid grid-cols-1 md:grid-cols-3 gap-2"
      >
        <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="unrestricted" id="compat-unrestricted" className="mt-0.5" />
          <div>
            <div className="font-medium">🟢 ใช้ได้ทุกป้าย</div>
            <div className="text-xs text-muted-foreground">ไม่จำเป็นต้องระบุ</div>
          </div>
        </label>
        <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="multi_partial" id="compat-multi" className="mt-0.5" />
          <div>
            <div className="font-medium">🟡 ใช้ได้หลายป้ายแต่ไม่ใช่ทุกป้าย</div>
            <div className="text-xs text-muted-foreground">เลือก Package หรือป้ายรายตัว</div>
          </div>
        </label>
        <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="specific" id="compat-specific" className="mt-0.5" />
          <div>
            <div className="font-medium">🔵 เฉพาะป้าย</div>
            <div className="text-xs text-muted-foreground">ใช้ได้กับป้ายที่ระบุเท่านั้น</div>
          </div>
        </label>
      </RadioGroup>

      {value.mode !== "unrestricted" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Package picker */}
            <div className="space-y-2">
              <Label className="text-sm">Package ป้ายโฆษณา</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" onClick={() => setPkgDialog(true)} disabled={disabled}>
                  <Package className="h-4 w-4 mr-1" />
                  เลือก Package ({value.packageIds.length})
                </Button>
                {selectedPackages.slice(0, 3).map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1">
                    {p.name}
                    <button type="button" onClick={() => togglePackage(p.id)} disabled={disabled}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedPackages.length > 3 && (
                  <Badge variant="outline">+{selectedPackages.length - 3}</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">จาก Package: {resolvedFromPkg} ป้าย</div>
            </div>

            {/* Individual billboard picker */}
            <div className="space-y-2">
              <Label className="text-sm">ป้ายรายตัว (นอก Package)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" onClick={() => setBbDialog(true)} disabled={disabled}>
                  <Package className="h-4 w-4 mr-1" />
                  เลือกป้ายรายตัว ({value.billboardIds.length})
                </Button>
                {selectedBillboards.slice(0, 2).map((b) => (
                  <Badge key={b.id} variant="secondary" className="gap-1">
                    {b.old_code}
                    <button type="button" onClick={() => toggleBillboard(b.id)} disabled={disabled}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedBillboards.length > 2 && (
                  <Badge variant="outline">+{selectedBillboards.length - 2}</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">เพิ่มรายตัว: {resolvedManual} ป้าย</div>
            </div>
          </div>

          <div className="rounded border bg-background p-2">
            <Collapsible open={showPreview} onOpenChange={setShowPreview}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                  <span className="font-medium">
                    รวมทั้งสิ้น <span className="text-primary">{totalResolved}</span> ป้าย (Package: {resolvedFromPkg}, รายตัว: {resolvedManual})
                  </span>
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-[200px] overflow-y-auto mt-2 text-xs space-y-1">
                  {resolvedBillboards.length === 0 ? (
                    <div className="text-muted-foreground text-center py-2">
                      ⚠️ ยังไม่มีป้าย — กรุณาเลือก Package หรือป้ายรายตัวอย่างน้อย 1
                    </div>
                  ) : (
                    resolvedBillboards.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 py-1 border-b last:border-0">
                        <span className="font-medium">{b.old_code || "-"}</span>
                        <span className="text-muted-foreground">{b.location_name || ""}</span>
                        {b.department && <Badge variant="outline" className="text-[10px]">{b.department}</Badge>}
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div>
            <Label className="text-sm">หมายเหตุความเข้ากันได้</Label>
            <Textarea
              value={value.notes}
              onChange={(e) => onChange({ ...value, notes: e.target.value })}
              placeholder="เช่น ใช้ได้เฉพาะป้ายรุ่น XYZ / ต้องต่อ Adapter รุ่น..."
              disabled={disabled}
              rows={2}
            />
          </div>
        </>
      )}

      {/* Package selection dialog */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>เลือก Package ที่รองรับ ({value.packageIds.length} เลือก)</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหา Package..." value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>ชื่อ Package</TableHead>
                  <TableHead>Media Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => togglePackage(p.id)}>
                    <TableCell>
                      <Checkbox checked={value.packageIds.includes(p.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.media_type || "-"}</TableCell>
                  </TableRow>
                ))}
                {filteredPackages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">ไม่พบ Package</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setPkgDialog(false)}>เสร็จสิ้น</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Billboard selection dialog */}
      <Dialog open={bbDialog} onOpenChange={setBbDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>เลือกป้ายรายตัว ({value.billboardIds.length} เลือก)</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหา Old Code / สถานที่ / ฝ่าย..." value={bbSearch} onChange={(e) => setBbSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Old Code</TableHead>
                  <TableHead>สถานที่</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBillboards.slice(0, 500).map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => toggleBillboard(b.id)}>
                    <TableCell>
                      <Checkbox checked={value.billboardIds.includes(b.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{b.old_code || "-"}</TableCell>
                    <TableCell>{b.location_name || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.department || "-"}</TableCell>
                  </TableRow>
                ))}
                {filteredBillboards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">ไม่พบป้าย</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {filteredBillboards.length > 500 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                แสดง 500 รายการแรก — พิมพ์คำค้นเพื่อกรอง
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setBbDialog(false)}>เสร็จสิ้น</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Helper: load current compatibility for an equipment id */
export async function loadEquipmentCompatibility(equipmentId: string): Promise<CompatibilityValue> {
  const [{ data: eq }, { data: pkgs }, { data: bbs }] = await Promise.all([
    supabase.from("equipment").select("billboard_compatibility_mode, compatibility_notes").eq("id", equipmentId).maybeSingle(),
    supabase.from("equipment_compatibility_packages").select("package_id").eq("equipment_id", equipmentId),
    supabase.from("equipment_billboard_compatibility").select("billboard_id, source").eq("equipment_id", equipmentId).eq("source", "manual"),
  ]);
  return {
    mode: ((eq as any)?.billboard_compatibility_mode as CompatibilityMode) || "unrestricted",
    packageIds: (pkgs || []).map((p: any) => p.package_id),
    billboardIds: (bbs || []).map((b: any) => b.billboard_id),
    notes: (eq as any)?.compatibility_notes || "",
  };
}

/** Helper: save via RPC */
export async function saveEquipmentCompatibility(equipmentId: string, v: CompatibilityValue) {
  const { data, error } = await supabase.rpc("save_equipment_compatibility", {
    _equipment_id: equipmentId,
    _mode: v.mode,
    _package_ids: v.packageIds,
    _billboard_ids: v.billboardIds,
    _notes: v.notes,
  });
  if (error) throw error;
  const result = data as any;
  if (result && result.success === false) throw new Error(result.error || "save failed");
  return result;
}

/** Read badge props for display */
export function getCompatibilityBadge(
  mode: string | null | undefined,
  count?: number
): { label: string; className: string; icon: string } {
  if (!mode || mode === "unrestricted") {
    return { label: "ทุกป้าย", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30", icon: "🟢" };
  }
  if (mode === "multi_partial") {
    return {
      label: count != null ? `บางป้าย (${count})` : "บางป้าย",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      icon: "🟡",
    };
  }
  return {
    label: count != null ? `เฉพาะป้าย (${count})` : "เฉพาะป้าย",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: "🔵",
  };
}
