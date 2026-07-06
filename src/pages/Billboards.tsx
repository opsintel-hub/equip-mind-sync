import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  Search,
  Plus,

  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Columns3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import BillboardForm from "@/components/billboard/BillboardForm";
import BillboardFilters, { BillboardFiltersState } from "@/components/billboard/BillboardFilters";
import BillboardExport from "@/components/billboard/BillboardExport";
import { BillboardSummaryCards } from "@/components/billboard/BillboardSummaryCards";
import { DraggableScrollTable } from "@/components/ui/draggable-scroll-table";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillboardDbConnection } from "@/components/master-data/BillboardDbConnection";
import { Database as DatabaseIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const HIGHLIGHT_DURATION_MS = 4000;

type BillboardRecord = Tables<"billboards">;

type SortDir = "asc" | "desc";

type BillboardColumn = {
  key: keyof BillboardRecord;
  label: string;
  minWidth?: string;
  defaultVisible: boolean;
  sortable?: boolean;
};

const ALL_COLUMNS: BillboardColumn[] = [
  { key: "old_code", label: "OldCode", minWidth: "min-w-[160px]", defaultVisible: true, sortable: true },
  { key: "equipment_id", label: "EquipmentID", minWidth: "min-w-[180px]", defaultVisible: true, sortable: true },
  { key: "department", label: "Department", minWidth: "min-w-[160px]", defaultVisible: true, sortable: true },
  { key: "media_type", label: "MediaType", minWidth: "min-w-[170px]", defaultVisible: true, sortable: true },
  { key: "description", label: "Description", minWidth: "min-w-[300px]", defaultVisible: true, sortable: true },
  { key: "region", label: "Region", minWidth: "min-w-[120px]", defaultVisible: true, sortable: true },
  { key: "territory", label: "Territory", minWidth: "min-w-[140px]", defaultVisible: true, sortable: true },
  { key: "location_name", label: "Location", minWidth: "min-w-[240px]", defaultVisible: true, sortable: true },
  { key: "size", label: "Size", minWidth: "min-w-[110px]", defaultVisible: true, sortable: true },
  { key: "status", label: "Status", minWidth: "min-w-[120px]", defaultVisible: true, sortable: true },
  { key: "district", label: "District", minWidth: "min-w-[140px]", defaultVisible: false, sortable: true },
  { key: "bkk_upc", label: "BKK UPC", minWidth: "min-w-[140px]", defaultVisible: false, sortable: true },
  { key: "media_class", label: "Media Class", minWidth: "min-w-[150px]", defaultVisible: false, sortable: true },
  { key: "media_segment", label: "Media Segment", minWidth: "min-w-[170px]", defaultVisible: false, sortable: true },
  { key: "route_install_demolish", label: "Route Install/Demolish", minWidth: "min-w-[200px]", defaultVisible: false, sortable: true },
  { key: "route_monitoring", label: "Route Monitoring", minWidth: "min-w-[170px]", defaultVisible: false, sortable: true },
  { key: "route_pm", label: "Route PM", minWidth: "min-w-[140px]", defaultVisible: false, sortable: true },
  { key: "route_report_photo", label: "Route Report Photo", minWidth: "min-w-[180px]", defaultVisible: false, sortable: true },
  { key: "target_monitoring", label: "Target Monitoring", minWidth: "min-w-[170px]", defaultVisible: false, sortable: true },
  { key: "extra_1", label: "Extra 1", minWidth: "min-w-[130px]", defaultVisible: false, sortable: true },
  { key: "extra_2", label: "Extra 2", minWidth: "min-w-[130px]", defaultVisible: false, sortable: true },
  { key: "extra_3", label: "Extra 3", minWidth: "min-w-[130px]", defaultVisible: false, sortable: true },
  { key: "notes", label: "Notes", minWidth: "min-w-[240px]", defaultVisible: false, sortable: false },
  { key: "created_at", label: "Created At", minWidth: "min-w-[180px]", defaultVisible: false, sortable: true },
  { key: "updated_at", label: "Updated At", minWidth: "min-w-[180px]", defaultVisible: false, sortable: true },
];

const STORAGE_KEY = "billboards-visible-columns-v2";
const SORT_STORAGE_KEY = "billboards-sort-v1";

const DEFAULT_VISIBLE_KEYS = new Set(
  ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key as string),
);

const DEFAULT_FILTERS: BillboardFiltersState = {
  region: "",
  district: "",
  department: "",
  mediaType: "",
  status: "",
  locationName: "",
  equipmentStatus: "",
  territory: "",
  mediaClass: "",
  mediaSegment: "",
};

const formatCellValue = (billboard: BillboardRecord, key: keyof BillboardRecord): string => {
  const value = billboard[key];
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "created_at" || key === "updated_at") {
    try {
      return new Date(String(value)).toLocaleString("th-TH");
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const Billboards = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useIsSuperAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<BillboardRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<BillboardFiltersState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Column visibility (persisted)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) return new Set(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set(DEFAULT_VISIBLE_KEYS);
  });

  // Sorting (persisted)
  const [sortKey, setSortKey] = useState<keyof BillboardRecord>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(SORT_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.key) return parsed.key as keyof BillboardRecord;
      }
    } catch { /* ignore */ }
    return "old_code";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(SORT_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.dir === "asc" || parsed?.dir === "desc") return parsed.dir;
      }
    } catch { /* ignore */ }
    return "asc";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleKeys)));
    } catch { /* ignore */ }
  }, [visibleKeys]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: sortKey, dir: sortDir }));
    } catch { /* ignore */ }
  }, [sortKey, sortDir]);

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleKeys.has(c.key as string)),
    [visibleKeys],
  );

  const toggleColumn = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleKeys(new Set(DEFAULT_VISIBLE_KEYS));
    toast.success("รีเซ็ตคอลัมน์เป็นค่าเริ่มต้นแล้ว");
  };

  const handleFilterChange = (key: keyof BillboardFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof BillboardRecord) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const { data: paginatedData, isLoading, refetch } = useQuery({
    queryKey: ["billboards", searchTerm, currentPage, pageSize, filters, sortKey, sortDir],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let billboardIdsWithEquipmentIssues: string[] | null = null;

      if (filters.equipmentStatus) {
        const today = new Date().toISOString().split("T")[0];
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const { data: billboardEquipment, error: beError } = await supabase
          .from("billboard_equipment")
          .select(`
            billboard_id,
            equipment:equipment_id (expiry_date, warranty_expiry_date)
          `);

        if (beError) throw beError;

        const matchingBillboardIds = new Set<string>();
        billboardEquipment?.forEach((be) => {
          const eq = be.equipment as { expiry_date: string | null; warranty_expiry_date: string | null } | null;
          if (!eq) return;
          switch (filters.equipmentStatus) {
            case "expired":
              if (eq.expiry_date && eq.expiry_date < today) matchingBillboardIds.add(be.billboard_id);
              break;
            case "warranty_expired":
              if (eq.warranty_expiry_date && eq.warranty_expiry_date < today) matchingBillboardIds.add(be.billboard_id);
              break;
            case "expiring_soon":
              if (eq.expiry_date && eq.expiry_date >= today && eq.expiry_date <= thirtyDaysFromNow) matchingBillboardIds.add(be.billboard_id);
              break;
            case "warranty_expiring_soon":
              if (eq.warranty_expiry_date && eq.warranty_expiry_date >= today && eq.warranty_expiry_date <= thirtyDaysFromNow) matchingBillboardIds.add(be.billboard_id);
              break;
          }
        });

        billboardIdsWithEquipmentIssues = Array.from(matchingBillboardIds);
        if (billboardIdsWithEquipmentIssues.length === 0) {
          return { data: [], count: 0 };
        }
      }

      let query = supabase
        .from("billboards")
        .select("*", { count: "exact" })
        .order(sortKey as string, { ascending: sortDir === "asc", nullsFirst: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(`equipment_id.ilike.%${searchTerm}%,old_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`);
      }
      if (filters.region) query = query.eq("region", filters.region);
      if (filters.district) query = query.eq("district", filters.district);
      if (filters.department) query = query.eq("department", filters.department);
      if (filters.mediaType) query = query.eq("media_type", filters.mediaType);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.territory) query = query.eq("territory", filters.territory);
      if (filters.mediaClass) query = query.eq("media_class", filters.mediaClass);
      if (filters.mediaSegment) query = query.eq("media_segment", filters.mediaSegment);
      if (filters.locationName) query = query.ilike("location_name", `%${filters.locationName}%`);
      if (billboardIdsWithEquipmentIssues) query = query.in("id", billboardIdsWithEquipmentIssues);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count: count || 0 };
    },
  });

  const billboards = paginatedData?.data || [];
  const totalCount = paginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Reset selection when data identity changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, pageSize, filters, searchTerm, sortKey, sortDir]);

  const allOnPageSelected = billboards.length > 0 && billboards.every((b) => selectedIds.has(b.id));
  const someOnPageSelected = billboards.some((b) => selectedIds.has(b.id));

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        billboards.forEach((b) => next.delete(b.id));
      } else {
        billboards.forEach((b) => next.add(b.id));
      }
      return next;
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`ยืนยันการลบป้าย ${selectedIds.size} รายการ? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("billboards").delete().in("id", ids);
    if (error) {
      toast.error(`ลบไม่สำเร็จ: ${error.message}`);
    } else {
      toast.success(`ลบป้าย ${ids.length} รายการสำเร็จ`);
      setSelectedIds(new Set());
      refetch();
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedIds.size === 0) return;
    const rows = billboards.filter((b) => selectedIds.has(b.id));
    const cols = visibleColumns;
    const header = cols.map((c) => c.label).join(",");
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = rows
      .map((r) => cols.map((c) => escape(formatCellValue(r, c.key))).join(","))
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billboards-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`ส่งออก ${rows.length} รายการเป็น CSV แล้ว`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบข้อมูลป้ายนี้?")) return;
    const { error } = await supabase.from("billboards").delete().eq("id", id);
    if (error) {
      toast.error("ลบข้อมูลไม่สำเร็จ");
    } else {
      toast.success("ลบข้อมูลสำเร็จ");
      refetch();
    }
  };

  const handleEdit = (billboard: BillboardRecord) => {
    setSelectedBillboard(billboard);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedBillboard(null);
  };

  const handleFormSuccess = (updatedId?: string) => {
    const targetId = updatedId ?? selectedBillboard?.id ?? null;
    handleFormClose();
    refetch();
    if (targetId) {
      setHighlightedId(targetId);
      window.setTimeout(() => {
        setHighlightedId((curr) => (curr === targetId ? null : curr));
      }, HIGHLIGHT_DURATION_MS);
    }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success hover:bg-success/20">ใช้งาน</Badge>;
      case "maintenance":
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">บำรุงรักษา</Badge>;
      case "inactive":
        return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderSortIcon = (col: BillboardColumn) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline text-muted-foreground/60" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 inline text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 inline text-primary" />;
  };



  const renderRow = (billboard: BillboardRecord) => {
    const isSelected = selectedIds.has(billboard.id);
    const isHighlighted = highlightedId === billboard.id;
    return (
      <TableRow
        key={billboard.id}
        data-state={isSelected ? "selected" : undefined}
        className={[
          "group hover:bg-muted/30 transition-colors",
          isSelected ? "bg-primary/5" : "",
          isHighlighted ? "bg-amber-100/60 dark:bg-amber-500/10 animate-pulse" : "",
        ].join(" ")}
      >
        <TableCell
          className="sticky left-0 z-10 bg-background group-hover:bg-muted/30 align-top w-12 border-b"
          data-no-drag
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleRowSelection(billboard.id)}
            aria-label="เลือกแถว"
          />
        </TableCell>
        {visibleColumns.map((column, idx) => {
          const isFirst = idx === 0;
          const cellContent =
            column.key === "status"
              ? getStatusBadge(billboard.status)
              : column.key === "equipment_id"
                ? <span className="font-medium text-primary">{billboard.equipment_id}</span>
                : formatCellValue(billboard, column.key);
          return (
            <TableCell
              key={`${billboard.id}-${String(column.key)}`}
              className={[
                "align-top whitespace-normal break-words border-b",
                column.minWidth || "min-w-[140px]",
                isFirst
                  ? "sticky left-12 z-10 bg-background group-hover:bg-muted/30 font-medium shadow-[2px_0_4px_-2px_hsl(var(--border))]"
                  : "",
              ].join(" ")}
            >
              {cellContent}
            </TableCell>
          );
        })}
        <TableCell className="text-right align-top min-w-[120px] border-b">
          <div className="flex justify-end gap-1" data-no-drag>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/billboards/${billboard.id}`)}
              title="ดูรายละเอียด"
              data-no-drag
            >
              <Eye className="w-4 h-4" />
            </Button>
            {isSuperAdmin && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(billboard)} data-no-drag>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(billboard.id)}
                  className="text-destructive hover:text-destructive"
                  data-no-drag
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const billboardsContent = (
    <div className="space-y-6">
      <BillboardSummaryCards filters={filters} searchTerm={searchTerm} />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              รายการป้ายโฆษณา
              <Badge variant="secondary" className="ml-2">{totalCount.toLocaleString()} จุด</Badge>
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัส, คำอธิบาย, ตำแหน่ง..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex gap-2" data-no-drag>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-no-drag>
                      <Columns3 className="w-4 h-4 mr-2" />
                      คอลัมน์ ({visibleColumns.length}/{ALL_COLUMNS.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background z-[200] max-h-[420px] overflow-y-auto w-64">
                    <DropdownMenuLabel>เลือกคอลัมน์ที่จะแสดง</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_COLUMNS.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key as string}
                        checked={visibleKeys.has(col.key as string)}
                        onCheckedChange={() => toggleColumn(col.key as string)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={resetColumns} className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      รีเซ็ตเป็นค่าเริ่มต้น
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <BillboardExport currentFilters={filters} />
              </div>

            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <BillboardFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border border-primary/30 bg-primary/5">
              <div className="text-sm font-medium">
                เลือกแล้ว <span className="text-primary">{selectedIds.size}</span> รายการ
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  ยกเลิกการเลือก
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkExportCSV}>
                  ส่งออก CSV ที่เลือก
                </Button>
                {isSuperAdmin && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    ลบที่เลือก
                  </Button>
                )}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !billboards?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">ไม่พบข้อมูลป้ายโฆษณา</p>
                <p className="text-sm text-muted-foreground">
                  ลองล้างตัวกรอง/คำค้นหา หรือกด "Sync ทันที" ในแท็บเชื่อมต่อเพื่อดึงข้อมูลจากระบบภายนอก
                </p>
              </div>
              <div className="flex gap-2">
                {(searchTerm || Object.values(filters).some((v) => v !== "")) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      handleClearFilters();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    ล้างตัวกรอง
                  </Button>
                )}
              </div>

            </div>
          ) : (
            <>
              <DraggableScrollTable className="relative max-h-[70vh] rounded-xl border border-border/60" maxHeight="70vh">
                <Table disableWrapper className="w-max min-w-full border-separate border-spacing-0">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead
                        className="sticky top-0 left-0 z-30 bg-muted w-12 border-b"
                        data-no-drag
                      >
                        <Checkbox
                          checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                          onCheckedChange={togglePageSelection}
                          aria-label="เลือกทั้งหน้า"
                        />
                      </TableHead>
                      {visibleColumns.map((column, idx) => {
                        const isFirst = idx === 0;
                        const sortable = column.sortable;
                        return (
                          <TableHead
                            key={String(column.key)}
                            className={[
                              "top-0 z-20 bg-muted whitespace-nowrap border-b text-left select-none",
                              column.minWidth || "min-w-[140px]",
                              isFirst
                                ? "sticky top-0 left-12 z-30 shadow-[2px_0_4px_-2px_hsl(var(--border))]"
                                : "sticky top-0",
                              sortable ? "cursor-pointer hover:bg-muted/80" : "",
                            ].join(" ")}
                            onClick={sortable ? () => handleSort(column.key) : undefined}
                            data-no-drag={sortable ? true : undefined}
                          >
                            {column.label}
                            {renderSortIcon(column)}
                          </TableHead>
                        );
                      })}
                      <TableHead className="sticky top-0 right-0 z-20 bg-muted text-right min-w-[120px] border-b">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billboards.map((b) => renderRow(b))}
                  </TableBody>
                </Table>
              </DraggableScrollTable>

              <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>แสดง</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="z-[200] max-h-60 overflow-y-auto bg-background">
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>รายการ จากทั้งหมด {totalCount.toLocaleString()} รายการ</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    ก่อนหน้า
                  </Button>
                  <span className="px-2 text-sm text-muted-foreground">
                    หน้า {currentPage} จาก {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    ถัดไป
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลป้าย</DialogTitle>
          </DialogHeader>

          <BillboardForm
            billboard={selectedBillboard}
            onSuccess={() => handleFormSuccess(selectedBillboard?.id)}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">ฐานข้อมูลป้ายโฆษณา</h1>
        <p className="text-muted-foreground">จัดการข้อมูลป้ายโฆษณาและเชื่อมต่อข้อมูลจากระบบภายนอก</p>
      </div>

      {isSuperAdmin ? (
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <MapPin className="h-4 w-4" />
              รายการป้าย
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-2">
              <DatabaseIcon className="h-4 w-4" />
              เชื่อมต่อ &amp; Sync
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">{billboardsContent}</TabsContent>
          <TabsContent value="connection">
            <BillboardDbConnection />
          </TabsContent>
        </Tabs>
      ) : (
        billboardsContent
      )}
    </div>
  );
};

export default Billboards;
