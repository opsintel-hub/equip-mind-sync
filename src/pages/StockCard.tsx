import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import {
  Search, Package, Monitor, Wrench, MapPin, ChevronDown,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Hammer, RotateCcw, AlertTriangle,
  Fingerprint, Hash, Clock, BarChart3, FileSpreadsheet, FileText, Loader2, History, ClipboardList
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "@/hooks/use-toast";
import { exportStockCardExcel, exportStockCardPDF } from "@/lib/stockCardExport";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { StockMovementGroupRow, GroupedMovement } from "@/components/stock-movement/StockMovementGroupRow";
import { StockMovementDocumentDialog } from "@/components/stock-movement/StockMovementDocumentDialog";
import { buildReceivedSerialAliasMap, formatMergedSerials, matchesSerialSearch } from "@/lib/serialSearch";

// ── Types ──────────────────────────────────────────────────────
interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  serial_number?: string | null;
  category?: string;
  brand?: string | null;
  unit: string;
  department?: string | null;
  quantity_in_stock?: number;
  item_condition: string;
  type: "equipment" | "media_player" | "tool";
  serial_number_2?: string | null;
}

interface TimelineEvent {
  date: string;
  type: string;
  detail: string;
  quantity: number;
  stock_before?: number;
  stock_after?: number;
  condition?: string | null;
  document?: string | null;
  duration_days?: number | null;
  billboard_name?: string | null;
}

interface BillboardJourney {
  billboard_id: string;
  billboard_name: string;
  installation_date: string | null;
  uninstall_date: string | null;
  duration_days: number | null;
  uninstall_reason: string | null;
  quantity: number;
}

// ── Movement type helpers ──────────────────────────────────────
const MOVEMENT_TYPES = [
  { value: "receive", label: "รับเข้า", icon: ArrowDownToLine, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "issue", label: "จ่ายออก", icon: ArrowUpFromLine, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "transfer_in", label: "โอนเข้า", icon: ArrowLeftRight, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "transfer_out", label: "โอนออก", icon: ArrowLeftRight, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "install_to_billboard", label: "ติดตั้งป้าย", icon: Hammer, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "return_from_billboard", label: "ถอดจากป้าย", icon: RotateCcw, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { value: "defective_return", label: "ของเสียเข้า", icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

const CONDITIONS = [
  { value: "normal", label: "ปกติ", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "defective", label: "เสีย/ชำรุด", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "pending_inspection", label: "รอตรวจสอบ", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
];

const ITEM_TYPES = [
  { value: "equipment", label: "อุปกรณ์/อะไหล่", icon: Package },
  { value: "media_player", label: "Media Player", icon: Monitor },
  { value: "tool", label: "เครื่องมือ", icon: Wrench },
];

function getMovementMeta(type: string) {
  return MOVEMENT_TYPES.find(m => m.value === type) || MOVEMENT_TYPES[0];
}

function getConditionMeta(cond: string | null | undefined) {
  return CONDITIONS.find(c => c.value === cond) || CONDITIONS[0];
}

// ── Multi-select filter component ──────────────────────────────
function MultiSelectFilter({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between text-left font-normal h-9 text-sm">
            <span className="truncate">
              {selected.length === 0 ? "ทั้งหมด" : `${selected.length} รายการ`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 z-[200]" align="start">
          <div className="max-h-52 overflow-y-auto pr-1">
            <div className="space-y-1">
              {options.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                  <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => onChange([])}>
              ล้างทั้งหมด
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function StockCard() {
  const [activeTab, setActiveTab] = useState("stock-card");
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"equipment" | "media_player" | "tool" | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterMovements, setFilterMovements] = useState<string[]>([]);
  const [filterConditions, setFilterConditions] = useState<string[]>([]);
  const [filterDepartments, setFilterDepartments] = useState<string[]>([]);
  const [filterBrands, setFilterBrands] = useState<string[]>([]);
  const { getViewableDepartments, isAdmin, isSuperAdmin } = useDepartmentPermissions();
  
  // All Movements tab state
  const [movSearchTerm, setMovSearchTerm] = useState("");
  const [movSnSearchTerm, setMovSnSearchTerm] = useState("");
  const [movTypeFilter, setMovTypeFilter] = useState("all");
  const [movDeptFilter, setMovDeptFilter] = useState<string[]>([]);
  const [movCompanyFilter, setMovCompanyFilter] = useState("all");
  const [movDateRange, setMovDateRange] = useState<DateRange | undefined>();
  const [movSelectedGroup, setMovSelectedGroup] = useState<GroupedMovement | null>(null);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const viewableDepts = getViewableDepartments();

  // ── Fetch all items for search ──
  const { data: allItems = [] } = useQuery({
    queryKey: ["stock-card-items"],
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      const items: EquipmentItem[] = [];

      const [eqRes, mpRes, toolRes] = await Promise.all([
        supabase.from("equipment").select("id, code, name, serial_number, category, brand, unit, department, quantity_in_stock, item_condition").eq("is_active", true),
        supabase.from("media_players").select("id, code, name, serial_number_1, serial_number_2, brand, unit, department, quantity, item_condition").eq("is_active", true),
        supabase.from("tools").select("id, code, name, serial_number, brand, unit, department, current_quantity").eq("is_active", true),
      ]);

      eqRes.data?.forEach(e => items.push({
        id: e.id, code: e.code, name: e.name, serial_number: e.serial_number,
        category: e.category, brand: e.brand, unit: e.unit, department: e.department,
        quantity_in_stock: e.quantity_in_stock, item_condition: e.item_condition, type: "equipment",
      }));

      mpRes.data?.forEach(m => items.push({
        id: m.id, code: m.code, name: m.name, serial_number: m.serial_number_1,
        serial_number_2: m.serial_number_2,
        brand: m.brand, unit: m.unit, department: m.department,
        quantity_in_stock: m.quantity, item_condition: m.item_condition, type: "media_player",
      }));

      toolRes.data?.forEach(t => items.push({
        id: t.id, code: t.code, name: t.name, serial_number: t.serial_number,
        brand: t.brand, unit: t.unit, department: t.department,
        quantity_in_stock: t.current_quantity, item_condition: "normal", type: "tool",
      }));

      return items;
    },
  });

  // ── Filter search results ──
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.toLowerCase();
    return allItems
      .filter(i => {
        if (filterTypes.length > 0 && !filterTypes.includes(i.type)) return false;
        // Brand filter
        if (filterBrands.length > 0 && (!i.brand || !filterBrands.includes(i.brand))) return false;
        // Department permission filter
        if (!isAdmin && i.department && !viewableDepts.includes(i.department)) return false;
        // Department multi-select filter
        if (filterDepartments.length > 0 && (!i.department || !filterDepartments.includes(i.department))) return false;
        const match = i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) ||
          (i.serial_number && i.serial_number.toLowerCase().includes(q)) ||
          (i.serial_number_2 && i.serial_number_2.toLowerCase().includes(q));
        return match;
      })
      .slice(0, 20);
  }, [searchText, allItems, filterTypes, filterBrands, filterDepartments, isAdmin, viewableDepts]);

  // ── Available brands for filter ──
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    allItems.forEach(i => { if (i.brand) brands.add(i.brand); });
    return Array.from(brands).sort().map(b => ({ value: b, label: b }));
  }, [allItems]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return allItems.find(i => i.id === selectedItemId) || null;
  }, [selectedItemId, allItems]);

  const hasSN = selectedItem && (selectedItem.serial_number || selectedItem.serial_number_2);

  // ── Fetch stock movements ──
  const { data: movements = [] } = useQuery({
    queryKey: ["stock-card-movements", selectedItemId, selectedItemType, dateRange],
    staleTime: 2 * 60 * 1000,
    enabled: !!selectedItemId && !!selectedItem,
    queryFn: async () => {
      if (!selectedItemId || !selectedItem) return [];
      
      // For equipment, query by equipment_id (FK match)
      // For media_players/tools, query by equipment_code (no FK to those tables)
      let query;
      if (selectedItemType === "equipment") {
        query = supabase.from("stock_movements")
          .select("*")
          .eq("equipment_id", selectedItemId)
          .order("created_at", { ascending: false });
      } else {
        query = supabase.from("stock_movements")
          .select("*")
          .eq("equipment_code", selectedItem.code)
          .order("created_at", { ascending: false });
      }

      if (dateRange?.from) query = query.gte("created_at", dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte("created_at", dateRange.to.toISOString());

      const { data } = await query;
      return data || [];
    },
  });

  // ── Fetch billboard equipment history ──
  const { data: billboardHistory = [] } = useQuery({
    queryKey: ["stock-card-billboard-history", selectedItemId],
    staleTime: 2 * 60 * 1000,
    enabled: !!selectedItemId,
    queryFn: async () => {
      if (!selectedItemId) return [];
      const { data } = await supabase.from("billboard_equipment_history")
        .select("*, billboards(equipment_id, location_name, description)")
        .eq("equipment_id", selectedItemId)
        .order("uninstall_date", { ascending: false });
      return data || [];
    },
  });

  // ── Fetch current billboard installations ──
  const { data: currentInstallations = [] } = useQuery({
    queryKey: ["stock-card-current-install", selectedItemId],
    staleTime: 2 * 60 * 1000,
    enabled: !!selectedItemId,
    queryFn: async () => {
      if (!selectedItemId) return [];
      const { data } = await supabase.from("billboard_equipment")
        .select("*, billboards(equipment_id, location_name, description)")
        .eq("equipment_id", selectedItemId);
      return data || [];
    },
  });

  // ── Build timeline ──
  const timeline: TimelineEvent[] = useMemo(() => {
    if (!selectedItemId) return [];
    const events: TimelineEvent[] = [];

    // Stock movements
    movements.forEach(m => {
      events.push({
        date: m.created_at,
        type: m.movement_type,
        detail: m.notes || m.reference_document || "-",
        quantity: m.quantity,
        stock_before: m.stock_before,
        stock_after: m.stock_after,
        condition: m.item_condition,
        document: m.reference_document,
        billboard_name: null,
      });
    });

    // Billboard history (uninstalls)
    billboardHistory.forEach((h: any) => {
      const bbName = h.billboards?.equipment_id || h.billboards?.location_name || "ป้าย";
      events.push({
        date: h.uninstall_date,
        type: "uninstall",
        detail: `ถอดจาก ${bbName}${h.uninstall_reason ? ` — ${h.uninstall_reason}` : ""}`,
        quantity: h.quantity,
        condition: null,
        document: null,
        billboard_name: bbName,
      });
      if (h.installation_date) {
        events.push({
          date: h.installation_date,
          type: "install",
          detail: `ติดตั้งที่ ${bbName}`,
          quantity: h.quantity,
          condition: null,
          document: null,
          billboard_name: bbName,
        });
      }
    });

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate duration between events
    for (let i = 0; i < events.length; i++) {
      if (i > 0) {
        events[i].duration_days = differenceInDays(parseISO(events[i].date), parseISO(events[i - 1].date));
      }
    }

    return events;
  }, [selectedItemId, movements, billboardHistory]);

  // ── Filtered timeline ──
  const filteredTimeline = useMemo(() => {
    return timeline.filter(e => {
      if (filterMovements.length > 0) {
        const mapped = e.type === "install" ? "install_to_billboard" : e.type === "uninstall" ? "return_from_billboard" : e.type;
        if (!filterMovements.includes(mapped)) return false;
      }
      if (filterConditions.length > 0 && e.condition && !filterConditions.includes(e.condition)) return false;
      return true;
    });
  }, [timeline, filterMovements, filterConditions]);

  // ── Timeline pagination ──
  const {
    paginatedData: paginatedTimeline,
    currentPage: tlPage,
    pageSize: tlPageSize,
    totalPages: tlTotalPages,
    totalItems: tlTotalItems,
    handlePageChange: tlPageChange,
    handlePageSizeChange: tlPageSizeChange,
  } = useTablePagination(filteredTimeline, 20);

  const journeys: BillboardJourney[] = useMemo(() => {
    return billboardHistory.map((h: any) => {
      const bbName = h.billboards?.equipment_id || h.billboards?.location_name || "-";
      const days = h.installation_date ? differenceInDays(parseISO(h.uninstall_date), parseISO(h.installation_date)) : null;
      return {
        billboard_id: h.billboard_id,
        billboard_name: bbName,
        installation_date: h.installation_date,
        uninstall_date: h.uninstall_date,
        duration_days: days,
        uninstall_reason: h.uninstall_reason,
        quantity: h.quantity,
      };
    });
  }, [billboardHistory]);

  // ── Stats for S/N items ──
  const stats = useMemo(() => {
    if (!hasSN || journeys.length === 0) return null;
    const totalInstallDays = journeys.reduce((sum, j) => sum + (j.duration_days || 0), 0);
    const firstEvent = timeline[0];
    const lastEvent = timeline[timeline.length - 1];
    const totalDays = firstEvent && lastEvent ? differenceInDays(parseISO(lastEvent.date), parseISO(firstEvent.date)) : 0;
    const warehouseDays = Math.max(0, totalDays - totalInstallDays);
    const installCount = journeys.length;

    return { totalInstallDays, warehouseDays, installCount, totalDays };
  }, [hasSN, journeys, timeline]);

  const pieData = stats ? [
    { name: "ในคลัง", value: stats.warehouseDays, color: "hsl(var(--primary))" },
    { name: "ติดตั้ง", value: stats.totalInstallDays, color: "hsl(var(--destructive))" },
  ] : [];

  const selectItem = (item: EquipmentItem) => {
    setSelectedItemId(item.id);
    setSelectedItemType(item.type);
    setSearchText(`${item.code} — ${item.name}`);
  };

  const typeIcon = (type: string) => {
    const t = ITEM_TYPES.find(i => i.value === type);
    return t ? <t.icon className="w-4 h-4" /> : null;
  };

  // ── Export to Excel ──
  const handleExportExcel = useCallback(() => {
    if (!selectedItem) return;
    exportStockCardExcel(selectedItem, filteredTimeline, journeys, currentInstallations.length);
    toast({ title: "ส่งออก Excel สำเร็จ" });
  }, [selectedItem, filteredTimeline, journeys, currentInstallations]);

  // ── Export to PDF ──
  const handleExportPDF = useCallback(() => {
    if (!selectedItem) return;
    exportStockCardPDF(selectedItem, filteredTimeline, journeys);
    toast({ title: "ส่งออก PDF สำเร็จ" });
  }, [selectedItem, filteredTimeline, journeys]);

  // ── All Movements Tab Data ──
  const { data: movCompaniesList } = useQuery({
    queryKey: ["stock-card-mov-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: allMovements, isLoading: movLoading } = useQuery({
    queryKey: ["stock-card-all-movements", movSearchTerm, movTypeFilter],
    enabled: activeTab === "all-movements",
    queryFn: async () => {
      let query = supabase
        .from("stock_movements")
        .select(`*, equipment:equipment_id(code, name, serial_number), location:location_id(name), companies:company_id(name)`)
        .order("created_at", { ascending: false });

      if (movSearchTerm) {
        query = query.or(`equipment_code.ilike.%${movSearchTerm}%,equipment_name.ilike.%${movSearchTerm}%,reference_document.ilike.%${movSearchTerm}%,notes.ilike.%${movSearchTerm}%`);
      }
      if (movTypeFilter !== "all") {
        query = query.eq("movement_type", movTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const groupedAllMovements = useMemo(() => {
    if (!allMovements) return [];

    let filtered = allMovements;
    // Dedicated S/N search
    if (movSnSearchTerm) {
      const snTerm = movSnSearchTerm.toLowerCase();
      filtered = filtered.filter((m: any) => {
        const sn = m.equipment?.serial_number || "";
        return sn.toLowerCase().includes(snTerm);
      });
    }
    // General search (code, name, document, notes)
    if (movSearchTerm) {
      const term = movSearchTerm.toLowerCase();
      filtered = filtered.filter((m: any) => {
        return m.equipment_code?.toLowerCase().includes(term) ||
          m.equipment_name?.toLowerCase().includes(term) ||
          m.reference_document?.toLowerCase().includes(term) ||
          m.notes?.toLowerCase().includes(term);
      });
    }
    if (movDeptFilter.length > 0) {
      filtered = filtered.filter((m: any) => movDeptFilter.includes(m.department));
    }
    if (movCompanyFilter !== "all") {
      filtered = filtered.filter((m: any) => m.company_id === movCompanyFilter);
    }
    if (movDateRange?.from) {
      filtered = filtered.filter((m: any) => {
        const d = new Date(m.created_at);
        if (movDateRange.from && d < movDateRange.from) return false;
        if (movDateRange.to && d > movDateRange.to) return false;
        return true;
      });
    }

    const groups = new Map<string, GroupedMovement>();
    filtered.forEach((movement: any) => {
      const key = movement.reference_document || movement.id;
      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.items.push(movement);
        group.total_items = group.items.length;
      } else {
        groups.set(key, {
          reference_document: movement.reference_document || `No-Doc-${movement.id.slice(0, 8)}`,
          created_at: movement.created_at,
          movement_type: movement.movement_type,
          company_name: movement.companies?.name || null,
          items: [movement],
          total_items: 1,
        });
      }
    });

    return Array.from(groups.values());
  }, [allMovements, movDeptFilter, movCompanyFilter, movDateRange]);

  const {
    paginatedData: movPaginatedGroups, currentPage: movPage, pageSize: movPageSize,
    totalPages: movTotalPages, totalItems: movTotalItems,
    handlePageChange: movPageChange, handlePageSizeChange: movPageSizeChange,
  } = useTablePagination(groupedAllMovements, 20);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Card</h1>
          <p className="text-sm text-muted-foreground">ประวัติชีวิตสินค้า & ภาพรวมการเคลื่อนไหวทั้งหมด</p>
        </div>
        {selectedItem && activeTab === "stock-card" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
              <FileText className="w-4 h-4" /> PDF
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid lg:grid-cols-2">
          <TabsTrigger value="stock-card" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Stock Card (รายชิ้น)
          </TabsTrigger>
          <TabsTrigger value="all-movements" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            ภาพรวมเคลื่อนไหว
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock-card" className="space-y-6">

      {/* ── Section 1: Search & Filters ── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Quick type toggle buttons */}
          <div className="flex flex-wrap gap-2">
            {ITEM_TYPES.map(t => {
              const Icon = t.icon;
              const isActive = filterTypes.length === 1 && filterTypes[0] === t.value;
              return (
                <Button
                  key={t.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 transition-all"
                  onClick={() => {
                    if (isActive) {
                      setFilterTypes([]);
                    } else {
                      setFilterTypes([t.value]);
                    }
                    if (selectedItemId) { setSelectedItemId(null); setSelectedItemType(null); }
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </Button>
              );
            })}
            {filterTypes.length > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setFilterTypes([])}>
                แสดงทั้งหมด
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Label className="text-sm font-medium mb-1 block">ค้นหาสินค้า</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="พิมพ์รหัส, ชื่อ หรือ S/N..."
                value={searchText}
                onChange={e => { setSearchText(e.target.value); if (selectedItemId) { setSelectedItemId(null); setSelectedItemType(null); } }}
                className="pl-9"
              />
            </div>
            {/* Dropdown results */}
            {filteredItems.length > 0 && !selectedItemId && (
              <Card className="absolute z-50 w-full mt-1 shadow-lg border">
                <ScrollArea className="max-h-64">
                  <div className="p-1">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent text-left text-sm transition-colors"
                        onClick={() => selectItem(item)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {typeIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.code} — {item.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {item.serial_number && <span className="flex items-center gap-0.5"><Fingerprint className="w-3 h-3" />{item.serial_number}</span>}
                            <span>{ITEM_TYPES.find(t => t.value === item.type)?.label}</span>
                            {item.department && <span>• {item.department}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {item.quantity_in_stock} {item.unit}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <MultiSelectFilter
              label="ประเภทเคลื่อนไหว"
              options={MOVEMENT_TYPES.map(m => ({ value: m.value, label: m.label }))}
              selected={filterMovements}
              onChange={setFilterMovements}
            />
            <MultiSelectFilter
              label="สภาพสินค้า"
              options={CONDITIONS.map(c => ({ value: c.value, label: c.label }))}
              selected={filterConditions}
              onChange={setFilterConditions}
            />
            <MultiSelectFilter
              label="ยี่ห้อ"
              options={availableBrands}
              selected={filterBrands}
              onChange={setFilterBrands}
            />
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">ฝ่าย</Label>
              <DepartmentMultiFilter value={filterDepartments} onChange={setFilterDepartments} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">ช่วงวันที่</Label>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Stock Card Header ── */}
      {selectedItem && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Item info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    {typeIcon(selectedItem.type)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedItem.code}</h2>
                    <p className="text-sm text-muted-foreground">{selectedItem.name}</p>
                  </div>
                  <Badge className={hasSN
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground"
                  }>
                    {hasSN ? (
                      <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" />มี S/N — ดูรายละเอียดเต็ม</span>
                    ) : (
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />ไม่มี S/N — ดูเฉพาะยอดรวม</span>
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {selectedItem.serial_number && (
                    <div><span className="text-muted-foreground">S/N:</span> <span className="font-medium">{selectedItem.serial_number}</span></div>
                  )}
                  {selectedItem.serial_number_2 && (
                    <div><span className="text-muted-foreground">S/N 2:</span> <span className="font-medium">{selectedItem.serial_number_2}</span></div>
                  )}
                  {selectedItem.category && <div><span className="text-muted-foreground">หมวด:</span> <span className="font-medium">{selectedItem.category}</span></div>}
                  {selectedItem.brand && <div><span className="text-muted-foreground">ยี่ห้อ:</span> <span className="font-medium">{selectedItem.brand}</span></div>}
                  {selectedItem.department && <div><span className="text-muted-foreground">ฝ่าย:</span> <span className="font-medium">{selectedItem.department}</span></div>}
                  <div>
                    <span className="text-muted-foreground">สภาพ:</span>{" "}
                    <Badge variant="outline" className={`text-xs ${getConditionMeta(selectedItem.item_condition).color}`}>
                      {getConditionMeta(selectedItem.item_condition).label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:w-auto">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{selectedItem.quantity_in_stock}</div>
                  <div className="text-xs text-muted-foreground">สต็อกปัจจุบัน</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{currentInstallations.length}</div>
                  <div className="text-xs text-muted-foreground">ติดตั้งอยู่</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{journeys.length}</div>
                  <div className="text-xs text-muted-foreground">ครั้งที่ติดตั้ง</div>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{filteredTimeline.length}</div>
                  <div className="text-xs text-muted-foreground">ความเคลื่อนไหว</div>
                </div>
              </div>
            </div>

            {/* Current installations */}
            {currentInstallations.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium mb-1">
                  <MapPin className="w-4 h-4" /> ติดตั้งอยู่ที่ป้ายปัจจุบัน
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentInstallations.map((inst: any) => (
                    <Badge key={inst.id} variant="outline" className="bg-background">
                      {inst.billboards?.equipment_id || inst.billboards?.location_name || inst.billboard_id}
                      {inst.installation_date && ` (ตั้งแต่ ${format(parseISO(inst.installation_date), "dd/MM/yy")})`}
                      {" × "}{inst.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Section 3: Timeline ── */}
      {selectedItem && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Timeline ความเคลื่อนไหว
              <Badge variant="secondary" className="ml-auto">{filteredTimeline.length} รายการ</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lifecycle ProcessTracker */}
            {(() => {
              const hasReceive = timeline.some(e => e.type === "receive");
              const hasIssue = timeline.some(e => e.type === "issue");
              const hasInstall = timeline.some(e => e.type === "install" || e.type === "install_to_billboard");
              const hasUninstall = timeline.some(e => e.type === "uninstall" || e.type === "return_from_billboard");
              const isCurrentlyInstalled = currentInstallations.length > 0;
              const inStock = (selectedItem?.quantity_in_stock || 0) > 0;

              const steps: ProcessStep[] = [
                {
                  label: "รับเข้าคลัง",
                  status: hasReceive ? "done" : "pending",
                  date: hasReceive ? timeline.find(e => e.type === "receive")?.date : undefined,
                },
                {
                  label: "จัดเก็บ",
                  status: hasReceive ? (inStock && !isCurrentlyInstalled ? "current" : "done") : "pending",
                },
              ];

              if (hasSN) {
                // S/N items: show install lifecycle
                if (hasInstall || isCurrentlyInstalled) {
                  const lastInstall = [...timeline].reverse().find(e => e.type === "install" || e.type === "install_to_billboard");
                  const lastUninstall = [...timeline].reverse().find(e => e.type === "uninstall" || e.type === "return_from_billboard");
                  steps.push({
                    label: "ติดตั้งป้าย",
                    status: isCurrentlyInstalled ? "current" : hasInstall ? "done" : "pending",
                    date: isCurrentlyInstalled 
                      ? currentInstallations[0]?.installation_date 
                      : lastInstall?.date,
                  });
                  steps.push({
                    label: "ถอด/คืนคลัง",
                    status: hasUninstall && !isCurrentlyInstalled ? "done" : "pending",
                    date: hasUninstall ? lastUninstall?.date : undefined,
                  });
                } else if (hasIssue) {
                  const lastIssue = [...timeline].reverse().find(e => e.type === "issue");
                  steps.push({
                    label: "เบิกจ่าย",
                    status: "done",
                    date: lastIssue?.date,
                  });
                } else {
                  steps.push({ label: "เบิก/ติดตั้ง", status: inStock ? "pending" : "current" });
                }
              } else {
                const lastIssue = [...timeline].reverse().find(e => e.type === "issue");
                steps.push({
                  label: "เบิกจ่าย",
                  status: hasIssue ? "done" : "pending",
                  date: hasIssue ? lastIssue?.date : undefined,
                });
              }

              return (
                <div className="bg-muted/30 rounded-lg px-6 py-4">
                  <ProcessTracker steps={steps} size="md" />
                </div>
              );
            })()}

            {filteredTimeline.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>ไม่พบข้อมูลความเคลื่อนไหว</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">วันที่</TableHead>
                        <TableHead className="w-[130px]">ประเภท</TableHead>
                        <TableHead>รายละเอียด</TableHead>
                        <TableHead className="w-[150px]">ป้ายโฆษณา</TableHead>
                        <TableHead className="text-right w-[70px]">จำนวน</TableHead>
                        <TableHead className="text-center w-[110px]">สต็อก ก่อน→หลัง</TableHead>
                        <TableHead className="w-[80px]">สภาพ</TableHead>
                        <TableHead className="text-right w-[70px]">ระยะเวลา</TableHead>
                        <TableHead className="w-[120px]">เอกสาร</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTimeline.map((ev, idx) => {
                        const meta = getMovementMeta(ev.type === "install" ? "install_to_billboard" : ev.type === "uninstall" ? "return_from_billboard" : ev.type);
                        const condMeta = ev.condition ? getConditionMeta(ev.condition) : null;
                        const isBillboardRelated = ev.type === "install" || ev.type === "uninstall" || ev.type === "install_to_billboard" || ev.type === "return_from_billboard";
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              {format(parseISO(ev.date), "dd/MM/yy HH:mm", { locale: th })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs gap-1 ${meta.color}`}>
                                <meta.icon className="w-3 h-3" />
                                {meta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{ev.detail}</TableCell>
                            <TableCell>
                              {ev.billboard_name ? (
                                <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30">
                                  <MapPin className="w-3 h-3" />
                                  {ev.billboard_name}
                                </Badge>
                              ) : isBillboardRelated ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">{ev.quantity}</TableCell>
                            <TableCell className="text-center text-xs font-mono">
                              {ev.stock_before !== undefined ? `${ev.stock_before} → ${ev.stock_after}` : "-"}
                            </TableCell>
                            <TableCell>
                              {condMeta ? (
                                <Badge variant="outline" className={`text-xs ${condMeta.color}`}>{condMeta.label}</Badge>
                              ) : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {ev.duration_days !== null && ev.duration_days !== undefined ? (
                                <span className="text-muted-foreground">{ev.duration_days} วัน</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-xs truncate max-w-[120px]">{ev.document || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  currentPage={tlPage}
                  totalPages={tlTotalPages}
                  totalItems={tlTotalItems}
                  pageSize={tlPageSize}
                  onPageChange={tlPageChange}
                  onPageSizeChange={tlPageSizeChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Section 4: Billboard Journey ── */}
      {selectedItem && journeys.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" /> ประวัติติดตั้งป้ายโฆษณา
              <Badge variant="secondary" className="ml-auto">{journeys.length} ครั้ง</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ป้ายโฆษณา</TableHead>
                    <TableHead>ติดตั้งเมื่อ</TableHead>
                    <TableHead>ถอดเมื่อ</TableHead>
                    <TableHead className="text-right">ระยะเวลา (วัน)</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>เหตุผล</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journeys.map((j, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{j.billboard_name}</TableCell>
                      <TableCell className="text-sm">
                        {j.installation_date ? format(parseISO(j.installation_date), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {j.uninstall_date ? format(parseISO(j.uninstall_date), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {j.duration_days !== null ? (
                          <Badge variant="outline">{j.duration_days} วัน</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">{j.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {j.uninstall_reason || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 5: Stats (S/N only) ── */}
      {selectedItem && hasSN && stats && stats.totalDays > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> สรุปสถิติ (เฉพาะมี S/N)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Pie chart */}
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} วัน`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & stats */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">อยู่ในคลัง: <strong>{stats.warehouseDays} วัน</strong> ({stats.totalDays > 0 ? Math.round(stats.warehouseDays / stats.totalDays * 100) : 0}%)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm">ติดตั้งที่ป้าย: <strong>{stats.totalInstallDays} วัน</strong> ({stats.totalDays > 0 ? Math.round(stats.totalInstallDays / stats.totalDays * 100) : 0}%)</span>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  จำนวนครั้งที่ติดตั้ง: <strong>{stats.installCount} ครั้ง</strong> | ระยะเวลาทั้งหมด: <strong>{stats.totalDays} วัน</strong>
                </div>

                {/* Billboard visit summary */}
                {journeys.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-1">ป้ายที่เคยไป:</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(
                        journeys.reduce((acc, j) => {
                          acc[j.billboard_name] = (acc[j.billboard_name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([name, count]) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name} ×{count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!selectedItem && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground mb-1">เลือกสินค้าเพื่อดู Stock Card</h3>
            <p className="text-sm text-muted-foreground">พิมพ์รหัส ชื่อ หรือ Serial Number ในช่องค้นหาด้านบน</p>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* ── All Movements Tab ── */}
        <TabsContent value="all-movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" /> ภาพรวมการเคลื่อนไหว Stock ทั้งหมด
              </CardTitle>
              <CardDescription>แสดงรายการเปลี่ยนแปลง stock พร้อม stock ก่อน-หลังทุกรายการ (จัดกลุ่มตามเอกสาร)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหา S/N..."
                    value={movSnSearchTerm}
                    onChange={(e) => { setMovSnSearchTerm(e.target.value); movPageChange(1); }}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหา รหัส/ชื่อ หรือเลขเอกสาร..."
                    value={movSearchTerm}
                    onChange={(e) => { setMovSearchTerm(e.target.value); movPageChange(1); }}
                    className="pl-10"
                  />
                </div>
                <Select value={movTypeFilter} onValueChange={(v) => { setMovTypeFilter(v); movPageChange(1); }}>
                  <SelectTrigger><SelectValue placeholder="ประเภท" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="receive">รับเข้า</SelectItem>
                    <SelectItem value="issue">เบิกออก</SelectItem>
                    <SelectItem value="transfer_in">รับโอน</SelectItem>
                    <SelectItem value="transfer_out">โอนออก</SelectItem>
                    <SelectItem value="return_from_billboard">คืนจากป้าย</SelectItem>
                    <SelectItem value="install_to_billboard">ติดตั้งป้าย</SelectItem>
                    <SelectItem value="defective_return">นำของเสียเข้า</SelectItem>
                  </SelectContent>
                </Select>
                <DepartmentMultiFilter value={movDeptFilter} onChange={(v) => { setMovDeptFilter(v); movPageChange(1); }} />
                <Select value={movCompanyFilter} onValueChange={(v) => { setMovCompanyFilter(v); movPageChange(1); }}>
                  <SelectTrigger><SelectValue placeholder="บริษัท" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกบริษัท</SelectItem>
                    {movCompaniesList?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <DatePickerWithRange date={movDateRange} onDateChange={(d) => { setMovDateRange(d); movPageChange(1); }} />
              </div>

              {movLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : movPaginatedGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลการเคลื่อนไหว stock</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>วันที่/เวลา</TableHead>
                          <TableHead>ประเภท</TableHead>
                          <TableHead>บริษัท</TableHead>
                          <TableHead>เลขเอกสาร / รหัสสินค้า</TableHead>
                          <TableHead>รายการ / ชื่อสินค้า</TableHead>
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead className="text-right">ก่อน</TableHead>
                          <TableHead className="text-right">หลัง</TableHead>
                          <TableHead>ตำแหน่ง / การดำเนินการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movPaginatedGroups.map((group) => (
                          <StockMovementGroupRow key={group.reference_document} group={group} onViewDocument={(g) => { setMovSelectedGroup(g); setIsDocDialogOpen(true); }} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <TablePagination currentPage={movPage} totalPages={movTotalPages} totalItems={movTotalItems} pageSize={movPageSize} onPageChange={movPageChange} onPageSizeChange={movPageSizeChange} />
                </>
              )}
            </CardContent>
          </Card>

          <StockMovementDocumentDialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen} group={movSelectedGroup} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
