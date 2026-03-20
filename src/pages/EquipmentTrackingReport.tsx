import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { Search, ChevronDown, ChevronRight, Eye, MapPin, Package, AlertTriangle, Shield, Clock, History as HistoryIcon, Download, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { buildReceivedSerialAliasMap, formatMergedSerials, matchesSerialSearch } from "@/lib/serialSearch";

// ─── Helpers ─────────────────────────────────────────────

const EXPIRY_WARNING_DAYS = 90;
const ITEMS_PER_PAGE = 20;

function expiryBadge(dateStr: string | null, label: string) {
  if (!dateStr) return <span className="text-muted-foreground text-xs">-</span>;
  const d = new Date(dateStr);
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return <Badge variant="destructive">{label}หมดแล้ว</Badge>;
  if (diff <= EXPIRY_WARNING_DAYS) return <Badge className="bg-amber-500 text-white hover:bg-amber-600">ใกล้หมด ({diff} วัน)</Badge>;
  return <Badge variant="secondary">ปกติ</Badge>;
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return "-";
  return `${differenceInDays(new Date(), new Date(dateStr))} วัน`;
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "dd MMM yyyy", { locale: th });
}

const movementTypeLabel: Record<string, string> = {
  receive: "รับเข้า",
  issue: "จ่ายออก",
  transfer_in: "ย้ายเข้า",
  transfer_out: "ย้ายออก",
  transfer: "ย้าย",
  return: "คืน",
  return_from_billboard: "คืนจากป้าย",
  install_to_billboard: "ติดตั้งป้าย",
  uninstall_from_billboard: "ถอดจากป้าย",
  claim: "ส่งเคลม",
  adjust: "ปรับปรุง",
};

// ─── Pagination Component ────────────────────────────────

function SimplePagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) pages.push(i);
  }
  const display: (number | "...")[] = [];
  pages.forEach((p, idx) => {
    if (idx > 0 && p - pages[idx - 1] > 1) display.push("...");
    display.push(p);
  });

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      {display.map((item, i) =>
        item === "..." ? (
          <span key={`e${i}`} className="px-2 text-muted-foreground">...</span>
        ) : (
          <Button key={item} variant={item === currentPage ? "default" : "outline"} size="sm" className="min-w-[36px]" onClick={() => onPageChange(item as number)}>
            {item}
          </Button>
        )
      )}
      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Billboard View ──────────────────────────────────────

function BillboardViewTab() {
  const [search, setSearch] = useState("");
  const [snSearch, setSnSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAllBillboards, setShowAllBillboards] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: billboards, isLoading: loadingBillboards } = useQuery({
    queryKey: ["billboard-tracking-billboards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, old_code, location_name, region, department, media_type, status, size")
        .eq("status", "active")
        .order("old_code");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: billboardEquipment, isLoading: loadingEquipment } = useQuery({
    queryKey: ["billboard-tracking-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_equipment")
        .select("id, billboard_id, equipment_id, quantity, installation_date, equipment:equipment_id(id, name, code, expiry_date, warranty_expiry_date, category, brand, serial_number)");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: mediaPlayers, isLoading: loadingMedia } = useQuery({
    queryKey: ["billboard-tracking-media-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, name, code, billboard_id, install_date, serial_number_1, serial_number_2, brand, warranty_expiry_date")
        .not("billboard_id", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: billboardReceivedSerials = [] } = useQuery({
    queryKey: ["billboard-tracking-received-serials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt_pending")
        .select("equipment_id, media_player_id, is_media_player, serial_number, received_at, created_at")
        .eq("status", "received")
        .not("serial_number", "is", null)
        .neq("serial_number", "");
      if (error) throw error;
      return data || [];
    },
  });

  const billboardEquipmentAliasMap = useMemo(
    () => buildReceivedSerialAliasMap(billboardReceivedSerials.filter((row: any) => !row.is_media_player), "equipment_id"),
    [billboardReceivedSerials],
  );

  const billboardMediaAliasMap = useMemo(
    () => buildReceivedSerialAliasMap(billboardReceivedSerials.filter((row: any) => row.is_media_player), "media_player_id"),
    [billboardReceivedSerials],
  );

  const regions = useMemo(() => [...new Set(billboards?.map(b => b.region).filter(Boolean) || [])].sort(), [billboards]);
  const { allowedDepartments, isAdmin: isAdminDept, isSingleDepartment } = useAllowedDepartments();
  const allowedDeptNames = useMemo(() => allowedDepartments.map(d => d.name), [allowedDepartments]);
  const departments = useMemo(() => {
    const allDepts = [...new Set(billboards?.map(b => b.department).filter(Boolean) || [])].sort();
    return isAdminDept ? allDepts : allDepts.filter(d => allowedDeptNames.includes(d!));
  }, [billboards, isAdminDept, allowedDeptNames]);
  const mediaTypes = useMemo(() => [...new Set(billboards?.map(b => b.media_type).filter(Boolean) || [])].sort(), [billboards]);

  // Auto-select if single department
  useEffect(() => {
    if (isSingleDepartment && allowedDepartments.length === 1 && deptFilter === "all") {
      setDeptFilter(allowedDepartments[0].name);
    }
  }, [isSingleDepartment, allowedDepartments, deptFilter]);

  // Group equipment by billboard
  const equipByBillboard = useMemo(() => {
    const map: Record<string, any[]> = {};
    (billboardEquipment || []).forEach(be => {
      const eq = be.equipment as any;
      if (!eq) return;
      if (!map[be.billboard_id]) map[be.billboard_id] = [];
      map[be.billboard_id].push({
        ...be,
        equipmentData: {
          ...eq,
          serial_number: formatMergedSerials(eq.serial_number, billboardEquipmentAliasMap[eq.id]) || null,
        },
        type: "equipment",
      });
    });
    (mediaPlayers || []).forEach(mp => {
      if (!mp.billboard_id) return;
      if (!map[mp.billboard_id]) map[mp.billboard_id] = [];
      map[mp.billboard_id].push({
        id: mp.id,
        billboard_id: mp.billboard_id,
        quantity: 1,
        installation_date: mp.install_date,
        equipmentData: {
          id: mp.id,
          name: mp.name,
          code: mp.code,
          expiry_date: null,
          warranty_expiry_date: mp.warranty_expiry_date,
          category: "Media Player",
          brand: mp.brand,
          serial_number: formatMergedSerials(mp.serial_number_1, mp.serial_number_2, billboardMediaAliasMap[mp.id]) || null,
        },
        type: "media_player",
      });
    });
    return map;
  }, [billboardEquipment, mediaPlayers, billboardEquipmentAliasMap, billboardMediaAliasMap]);

  // Check if a billboard has any equipment matching status filter
  const matchesStatusFilter = (bbId: string) => {
    if (statusFilter === "all") return true;
    const items = equipByBillboard[bbId] || [];
    if (items.length === 0) return false;
    const now = new Date();
    return items.some(item => {
      const eq = item.equipmentData;
      if (statusFilter === "expired" && eq.expiry_date && differenceInDays(new Date(eq.expiry_date), now) < 0) return true;
      if (statusFilter === "expiring_soon" && eq.expiry_date) {
        const d = differenceInDays(new Date(eq.expiry_date), now);
        return d >= 0 && d <= EXPIRY_WARNING_DAYS;
      }
      if (statusFilter === "warranty_expired" && eq.warranty_expiry_date && differenceInDays(new Date(eq.warranty_expiry_date), now) < 0) return true;
      if (statusFilter === "warranty_expiring" && eq.warranty_expiry_date) {
        const d = differenceInDays(new Date(eq.warranty_expiry_date), now);
        return d >= 0 && d <= EXPIRY_WARNING_DAYS;
      }
      return false;
    });
  };

  const filtered = useMemo(() => {
    return (billboards || []).filter(b => {
      const s = search.toLowerCase();
      // General search: billboard code, location, equipment code/name
      const matchesSearch = !s || (b.old_code || "").toLowerCase().includes(s) || (b.location_name || "").toLowerCase().includes(s) ||
        (equipByBillboard[b.id] || []).some((item: any) => {
          const eq = item.equipmentData;
          return (eq?.code || "").toLowerCase().includes(s) || (eq?.name || "").toLowerCase().includes(s);
        });
      if (!matchesSearch) return false;
      // Dedicated S/N search
      if (snSearch) {
        const items = equipByBillboard[b.id] || [];
        const matchesSN = items.some((item: any) => matchesSerialSearch(snSearch, item.equipmentData?.serial_number));
        if (!matchesSN) return false;
      }
      if (regionFilter !== "all" && b.region !== regionFilter) return false;
      if (deptFilter !== "all" && b.department !== deptFilter) return false;
      if (mediaTypeFilter !== "all" && b.media_type !== mediaTypeFilter) return false;
      if (!matchesStatusFilter(b.id)) return false;
      if (!showAllBillboards && !(equipByBillboard[b.id]?.length > 0)) return false;
      return true;
    });
  }, [billboards, search, snSearch, regionFilter, deptFilter, mediaTypeFilter, statusFilter, equipByBillboard, showAllBillboards]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    let withEquip = 0;
    let hasExpired = 0;
    let hasWarrantyExpired = 0;
    (billboards || []).forEach(b => {
      const items = equipByBillboard[b.id] || [];
      if (items.length > 0) withEquip++;
      items.forEach(item => {
        const eq = item.equipmentData;
        if (eq.expiry_date && differenceInDays(new Date(eq.expiry_date), now) < 0) hasExpired++;
        if (eq.warranty_expiry_date && differenceInDays(new Date(eq.warranty_expiry_date), now) < 0) hasWarrantyExpired++;
      });
    });
    return { total: (billboards || []).length, withEquip, hasExpired, hasWarrantyExpired };
  }, [billboards, equipByBillboard]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  // Reset page on filter change
  useMemo(() => { setCurrentPage(1); }, [search, regionFilter, deptFilter, mediaTypeFilter, statusFilter, showAllBillboards]);

  // Export
  const handleExport = () => {
    const rows: any[] = [];
    filtered.forEach(b => {
      const items = equipByBillboard[b.id] || [];
      if (items.length === 0) {
        rows.push({ "Old Code": b.old_code, "Location": b.location_name, "Size": (b as any).size || "-", "Region": b.region, "Department": b.department, "Media Type": b.media_type, "ชื่ออุปกรณ์": "-", "Code": "-", "S/N": "-", "ประเภท": "-", "จำนวน": 0, "วันที่ติดตั้ง": "-", "อายุ (วัน)": "-", "วันหมดอายุ": "-", "วันหมดประกัน": "-" });
      } else {
        items.forEach(item => {
          const eq = item.equipmentData;
          rows.push({
            "Old Code": b.old_code, "Location": b.location_name, "Size": (b as any).size || "-", "Region": b.region, "Department": b.department, "Media Type": b.media_type,
            "ชื่ออุปกรณ์": eq.name, "Code": eq.code, "S/N": eq.serial_number || "-", "ประเภท": eq.category || item.type,
            "จำนวน": item.quantity, "วันที่ติดตั้ง": item.installation_date || "-",
            "อายุ (วัน)": item.installation_date ? differenceInDays(new Date(), new Date(item.installation_date)) : "-",
            "วันหมดอายุ": eq.expiry_date || "-", "วันหมดประกัน": eq.warranty_expiry_date || "-",
          });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billboard Equipment");
    XLSX.writeFile(wb, `billboard-equipment-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const isLoading = loadingBillboards || loadingEquipment || loadingMedia;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-primary">{summaryStats.total}</div><div className="text-xs text-muted-foreground">ป้ายทั้งหมด</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{summaryStats.withEquip}</div><div className="text-xs text-muted-foreground">ป้ายที่มีอุปกรณ์</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-destructive">{summaryStats.hasExpired}</div><div className="text-xs text-muted-foreground">อุปกรณ์หมดอายุ</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-amber-600">{summaryStats.hasWarrantyExpired}</div><div className="text-xs text-muted-foreground">อุปกรณ์หมดประกัน</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหา S/N..." value={snSearch} onChange={e => setSnSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาป้าย (Old Code / Location)..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Region</SelectItem>
            {regions.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter} disabled={isSingleDepartment}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            {!isSingleDepartment && <SelectItem value="all">ทุก Department</SelectItem>}
            {departments.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Media Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Media Type</SelectItem>
            {mediaTypes.map(m => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="สถานะอุปกรณ์" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="expired">หมดอายุแล้ว</SelectItem>
            <SelectItem value="expiring_soon">ใกล้หมดอายุ</SelectItem>
            <SelectItem value="warranty_expired">หมดประกันแล้ว</SelectItem>
            <SelectItem value="warranty_expiring">ใกล้หมดประกัน</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="showAll" checked={showAllBillboards} onCheckedChange={(v) => setShowAllBillboards(!!v)} />
        <label htmlFor="showAll" className="text-sm text-muted-foreground cursor-pointer">แสดงป้ายที่ไม่มีอุปกรณ์ติดตั้งด้วย</label>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                 <TableHead>Old Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Media Type</TableHead>
                <TableHead className="text-center">อุปกรณ์ติดตั้ง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>
              ) : paginatedData.map(b => {
                const items = equipByBillboard[b.id] || [];
                const isExpanded = expandedId === b.id;
                return (
                  <React.Fragment key={b.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : b.id)}>
                      <TableCell>{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                      <TableCell className="font-medium">{b.old_code || "-"}</TableCell>
                      <TableCell>{b.location_name || "-"}</TableCell>
                      <TableCell>{(b as any).size || "-"}</TableCell>
                      <TableCell>{b.region || "-"}</TableCell>
                      <TableCell>{b.department || "-"}</TableCell>
                      <TableCell>{b.media_type || "-"}</TableCell>
                      <TableCell className="text-center">
                        {items.length > 0 ? <Badge variant="secondary">{items.length} ชิ้น</Badge> : <span className="text-muted-foreground text-xs">ไม่มี</span>}
                      </TableCell>
                    </TableRow>
                    {isExpanded && items.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <div className="p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>ชื่ออุปกรณ์</TableHead>
                                  <TableHead>Code</TableHead>
                                  <TableHead>S/N</TableHead>
                                  <TableHead>ประเภท</TableHead>
                                  <TableHead className="text-center">จำนวน</TableHead>
                                  <TableHead>วันที่ติดตั้ง</TableHead>
                                  <TableHead>อายุใช้งาน</TableHead>
                                  <TableHead>วันหมดอายุ</TableHead>
                                  <TableHead>สถานะอายุ</TableHead>
                                  <TableHead>วันหมดประกัน</TableHead>
                                  <TableHead>สถานะประกัน</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map(item => {
                                  const eq = item.equipmentData;
                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-medium">{eq.name}</TableCell>
                                      <TableCell className="text-xs font-mono">{eq.code}</TableCell>
                                      <TableCell className="text-xs whitespace-pre-line">{eq.serial_number || "-"}</TableCell>
                                      <TableCell><Badge variant="outline" className="text-xs">{item.type === "media_player" ? "Media Player" : eq.category || "อุปกรณ์"}</Badge></TableCell>
                                      <TableCell className="text-center">{item.quantity}</TableCell>
                                      <TableCell className="text-xs">{fmtDate(item.installation_date)}</TableCell>
                                      <TableCell><Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{daysSince(item.installation_date)}</Badge></TableCell>
                                      <TableCell className="text-xs">{fmtDate(eq.expiry_date)}</TableCell>
                                      <TableCell>{expiryBadge(eq.expiry_date, "")}</TableCell>
                                      <TableCell className="text-xs">{fmtDate(eq.warranty_expiry_date)}</TableCell>
                                      <TableCell>{expiryBadge(eq.warranty_expiry_date, "ประกัน")}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          <div className="px-3 pt-1 text-sm text-muted-foreground border-t">แสดง {filtered.length} ป้าย</div>
          <SimplePagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}

// ─── Equipment View ──────────────────────────────────────

function EquipmentViewTab() {
  const [search, setSearch] = useState("");
  const [snSearch, setSnSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [installFilter, setInstallFilter] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Equipment
  const { data: equipment, isLoading: loadingEq } = useQuery({
    queryKey: ["eq-tracking-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, code, serial_number, category, brand, quantity_in_stock, expiry_date, warranty_expiry_date")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  // Equipment serial numbers for per-S/N rows
  const { data: equipmentSNs } = useQuery({
    queryKey: ["eq-tracking-equipment-sns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_serial_numbers")
        .select("equipment_id, serial_number, status")
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const eqSNMap = useMemo(() => {
    const m: Record<string, { allSNs: string[]; inStockSNs: string[] }> = {};
    (equipmentSNs || []).forEach(sn => {
      if (!m[sn.equipment_id]) m[sn.equipment_id] = { allSNs: [], inStockSNs: [] };
      m[sn.equipment_id].allSNs.push(sn.serial_number);
      if (sn.status === "in_stock") m[sn.equipment_id].inStockSNs.push(sn.serial_number);
    });
    return m;
  }, [equipmentSNs]);

  // Media Players
  const { data: mediaPlayers, isLoading: loadingMP } = useQuery({
    queryKey: ["eq-tracking-media-players-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, name, code, serial_number_1, serial_number_2, brand, billboard_id, install_date, quantity, warranty_expiry_date, location_id")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  // Billboard equipment (current installations)
  const { data: billboardEquipment } = useQuery({
    queryKey: ["eq-tracking-bb-equip"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_equipment")
        .select("equipment_id, billboard_id, quantity, installation_date, billboard:billboard_id(old_code, location_name)");
      if (error) throw error;
      return data || [];
    },
  });

  // Billboards lookup for media players
  const { data: billboards } = useQuery({
    queryKey: ["eq-tracking-bb-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billboards").select("id, old_code, location_name");
      if (error) throw error;
      return data || [];
    },
  });

  const bbLookup = useMemo(() => {
    const m: Record<string, any> = {};
    (billboards || []).forEach(b => { m[b.id] = b; });
    return m;
  }, [billboards]);

  // Installed billboard per equipment
  const installedAt = useMemo(() => {
    const m: Record<string, any[]> = {};
    (billboardEquipment || []).forEach(be => {
      if (!m[be.equipment_id]) m[be.equipment_id] = [];
      m[be.equipment_id].push(be);
    });
    return m;
  }, [billboardEquipment]);

  // Combine equipment + media players for unified list (expand S/N into separate rows)
  const allItems = useMemo(() => {
    const items: any[] = [];
    (equipment || []).forEach(eq => {
      const installed = installedAt[eq.id] || [];
      const bbInfo = installed.length > 0
        ? installed.map(i => formatBillboardLabel((i.billboard as any)?.old_code, (i.billboard as any)?.location_name)).join(", ")
        : null;
      const snData = eqSNMap[eq.id];
      
      if (snData && snData.allSNs.length > 1) {
        // Expand: one row per S/N
        for (const sn of snData.allSNs) {
          const isInStock = snData.inStockSNs.includes(sn);
          items.push({
            ...eq,
            itemType: "equipment",
            serialDisplay: sn,
            installedBillboard: bbInfo,
            isInstalled: installed.length > 0,
            quantity_in_stock: isInStock ? 1 : 0,
          });
        }
      } else {
        items.push({
          ...eq,
          itemType: "equipment",
          serialDisplay: snData?.allSNs[0] || eq.serial_number || "-",
          installedBillboard: bbInfo,
          isInstalled: installed.length > 0,
        });
      }
    });
    (mediaPlayers || []).forEach(mp => {
      const bb = mp.billboard_id ? bbLookup[mp.billboard_id] : null;
      items.push({
        id: mp.id,
        name: mp.name,
        code: mp.code,
        serial_number: mp.serial_number_1,
        category: "Media Player",
        brand: mp.brand,
        quantity_in_stock: mp.billboard_id ? 0 : mp.quantity,
        expiry_date: null,
        warranty_expiry_date: mp.warranty_expiry_date,
        itemType: "media_player",
        serialDisplay: [mp.serial_number_1, mp.serial_number_2].filter(Boolean).join(" / ") || "-",
        installedBillboard: bb ? formatBillboardLabel(bb.old_code, bb.location_name) : null,
        isInstalled: !!mp.billboard_id,
        billboard_id: mp.billboard_id,
        install_date: mp.install_date,
      });
    });
    return items;
  }, [equipment, mediaPlayers, installedAt, bbLookup]);

  const categories = useMemo(() => [...new Set(allItems.map(i => i.category).filter(Boolean))].sort(), [allItems]);
  const brands = useMemo(() => [...new Set(allItems.map(i => i.brand).filter(Boolean))].sort(), [allItems]);

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      // Dedicated S/N search
      if (snSearch) {
        const snTerm = snSearch.toLowerCase();
        if (!(item.serialDisplay || "").toLowerCase().includes(snTerm)) return false;
      }
      // General search (name, code)
      const s = search.toLowerCase();
      if (s && !(item.name || "").toLowerCase().includes(s) && !(item.code || "").toLowerCase().includes(s)) return false;
      if (typeFilter !== "all" && item.itemType !== typeFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (brandFilter !== "all" && item.brand !== brandFilter) return false;
      if (installFilter === "installed" && !item.isInstalled) return false;
      if (installFilter === "in_stock" && item.isInstalled) return false;
      return true;
    });
  }, [allItems, search, snSearch, typeFilter, categoryFilter, brandFilter, installFilter]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const installed = allItems.filter(i => i.isInstalled).length;
    const inStock = allItems.filter(i => !i.isInstalled).length;
    return { total: allItems.length, installed, inStock };
  }, [allItems]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  // Reset page on filter change
  useMemo(() => { setCurrentPage(1); }, [search, typeFilter, categoryFilter, brandFilter, installFilter]);

  // Export
  const handleExport = () => {
    const rows = filtered.map(item => ({
      "Code": item.code, "ชื่อ": item.name, "S/N": item.serialDisplay, "ประเภท": item.itemType === "media_player" ? "Media Player" : item.category,
      "Brand": item.brand || "-", "สต็อกคลัง": item.quantity_in_stock, "ติดตั้งที่ป้าย": item.installedBillboard || "ในคลัง",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipment");
    XLSX.writeFile(wb, `equipment-tracking-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const isLoading = loadingEq || loadingMP;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-primary">{summaryStats.total}</div><div className="text-xs text-muted-foreground">ทั้งหมด</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{summaryStats.installed}</div><div className="text-xs text-muted-foreground">ติดตั้งอยู่</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-primary">{summaryStats.inStock}</div><div className="text-xs text-muted-foreground">ในคลัง</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหา S/N..." value={snSearch} onChange={e => setSnSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหา ชื่อ / Code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="ประเภท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="media_player">Media Player</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="หมวดหมู่" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Brand</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b!}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={installFilter} onValueChange={setInstallFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="สถานะติดตั้ง" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="installed">ติดตั้งอยู่</SelectItem>
            <SelectItem value="in_stock">ในคลัง</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>S/N</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-center">สต็อกคลัง</TableHead>
                <TableHead>ติดตั้งที่ป้าย</TableHead>
                <TableHead className="text-center">ดู</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</TableCell></TableRow>
              ) : paginatedData.map(item => (
                <TableRow key={`${item.itemType}-${item.id}`}>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-xs">{item.serialDisplay}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.itemType === "media_player" ? "Media Player" : item.category}</Badge></TableCell>
                  <TableCell className="text-xs">{item.brand || "-"}</TableCell>
                  <TableCell className="text-center">{item.quantity_in_stock}</TableCell>
                  <TableCell>
                    {item.installedBillboard ? (
                      <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs"><MapPin className="w-3 h-3 mr-1" />{item.installedBillboard}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">ในคลัง</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEquipment(item)}><Eye className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-3 pt-1 text-sm text-muted-foreground border-t">แสดง {filtered.length} รายการ</div>
          <SimplePagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Detail Dialog */}
      {selectedEquipment && (
        <EquipmentDetailDialog
          item={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          bbLookup={bbLookup}
        />
      )}
    </div>
  );
}

// ─── Equipment Detail Dialog ─────────────────────────────

function EquipmentDetailDialog({ item, onClose, bbLookup }: { item: any; onClose: () => void; bbLookup: Record<string, any> }) {
  // Installation history
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["eq-detail-history", item.id, item.itemType],
    queryFn: async () => {
      if (item.itemType === "equipment") {
        const { data, error } = await supabase
          .from("billboard_equipment_history")
          .select("*")
          .eq("equipment_id", item.id)
          .order("uninstall_date", { ascending: false });
        if (error) throw error;
        return data || [];
      }
      // For media_player, no billboard_equipment_history (they use media_players.billboard_id directly)
      return [];
    },
  });

  // Stock movements - for media_player search by code/name since stock_movements uses equipment references
  const { data: movements, isLoading: loadingMov } = useQuery({
    queryKey: ["eq-detail-movements", item.id, item.itemType, item.code],
    queryFn: async () => {
      if (item.itemType === "equipment") {
        const { data, error } = await supabase
          .from("stock_movements")
          .select("*")
          .eq("equipment_id", item.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      }
      // Media Player: search by equipment_code matching media player code
      if (item.itemType === "media_player" && item.code) {
        const { data, error } = await supabase
          .from("stock_movements")
          .select("*")
          .eq("equipment_code", item.code)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return data || [];
      }
      return [];
    },
  });

  // Current installations
  const { data: currentInstalls } = useQuery({
    queryKey: ["eq-detail-current", item.id, item.itemType],
    queryFn: async () => {
      if (item.itemType === "equipment") {
        const { data, error } = await supabase
          .from("billboard_equipment")
          .select("*, billboard:billboard_id(old_code, location_name)")
          .eq("equipment_id", item.id);
        if (error) throw error;
        return data || [];
      }
      return [];
    },
  });

  // Summary counts
  const totalInstalled = useMemo(() => {
    if (item.itemType === "media_player") return item.isInstalled ? 1 : 0;
    return (currentInstalls || []).reduce((sum: number, ci: any) => sum + ci.quantity, 0);
  }, [currentInstalls, item]);

  const totalClaimed = useMemo(() => {
    return (movements || []).filter((m: any) => m.movement_type === "claim").reduce((sum: number, m: any) => sum + Math.abs(m.quantity), 0);
  }, [movements]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {item.name} ({item.code})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">{item.quantity_in_stock}</div>
                <div className="text-xs text-muted-foreground">สต็อกในคลัง</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{totalInstalled}</div>
                <div className="text-xs text-muted-foreground">ติดตั้งอยู่</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{totalClaimed}</div>
                <div className="text-xs text-muted-foreground">ส่งเคลม</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">S/N</div>
                <div className="text-sm font-mono">{item.serialDisplay}</div>
              </CardContent>
            </Card>
          </div>

          {/* Current Installation */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> ติดตั้งปัจจุบัน</h4>
            {item.itemType === "media_player" && item.isInstalled ? (
              <div className="p-3 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <Badge className="bg-emerald-500 text-white">{item.installedBillboard}</Badge>
                {item.install_date && <span className="ml-2 text-sm text-muted-foreground">ติดตั้งเมื่อ {fmtDate(item.install_date)} ({daysSince(item.install_date)})</span>}
              </div>
            ) : (currentInstalls || []).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ป้าย</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead>วันที่ติดตั้ง</TableHead>
                    <TableHead>อายุใช้งาน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(currentInstalls || []).map((ci: any) => (
                    <TableRow key={ci.id}>
                      <TableCell>{formatBillboardLabel((ci.billboard as any)?.old_code, (ci.billboard as any)?.location_name)}</TableCell>
                      <TableCell className="text-center">{ci.quantity}</TableCell>
                      <TableCell className="text-xs">{fmtDate(ci.installation_date)}</TableCell>
                      <TableCell><Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{daysSince(ci.installation_date)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-lg">ไม่มีการติดตั้งปัจจุบัน (อยู่ในคลัง)</p>
            )}
          </div>

          {/* Installation History */}
          {item.itemType === "equipment" && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><HistoryIcon className="w-4 h-4" /> ประวัติการติดตั้ง/ถอด</h4>
              {loadingHistory ? (
                <Skeleton className="h-20 w-full" />
              ) : (history || []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ป้าย</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead>วันที่ติดตั้ง</TableHead>
                      <TableHead>วันที่ถอด</TableHead>
                      <TableHead>ระยะเวลา</TableHead>
                      <TableHead>เหตุผลถอด</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(history || []).map((h: any) => {
                      const bb = bbLookup[h.billboard_id];
                      const dur = h.installation_date && h.uninstall_date
                        ? `${differenceInDays(new Date(h.uninstall_date), new Date(h.installation_date))} วัน`
                        : "-";
                      return (
                        <TableRow key={h.id}>
                          <TableCell>{bb ? formatBillboardLabel(bb.old_code, bb.location_name) : h.billboard_id}</TableCell>
                          <TableCell className="text-center">{h.quantity}</TableCell>
                          <TableCell className="text-xs">{fmtDate(h.installation_date)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(h.uninstall_date)}</TableCell>
                          <TableCell><Badge variant="outline">{dur}</Badge></TableCell>
                          <TableCell className="text-xs">{h.uninstall_reason || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground p-3 border rounded-lg">ไม่มีประวัติการถอด</p>
              )}
            </div>
          )}

          {/* Stock Card - show for both equipment AND media_player */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Stock Card</h4>
            {loadingMov ? (
              <Skeleton className="h-20 w-full" />
            ) : (movements || []).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead>สต็อกก่อน</TableHead>
                    <TableHead>สต็อกหลัง</TableHead>
                    <TableHead>เอกสารอ้างอิง</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movements || []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{fmtDate(m.created_at)}</TableCell>
                      <TableCell><Badge variant="outline">{movementTypeLabel[m.movement_type] || m.movement_type}</Badge></TableCell>
                      <TableCell className={`text-center font-medium ${m.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                      <TableCell className="text-center">{m.stock_before}</TableCell>
                      <TableCell className="text-center">{m.stock_after}</TableCell>
                      <TableCell className="text-xs font-mono">{m.reference_document || "-"}</TableCell>
                      <TableCell className="text-xs">{m.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-lg">ไม่มีข้อมูล Stock Card</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function EquipmentTrackingReport() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ค้นหาอุปกรณ์ป้ายโฆษณา</h1>
        <p className="text-muted-foreground">ค้นหาและติดตามอุปกรณ์/อะไหล่ที่ติดตั้งบนป้ายโฆษณา</p>
      </div>

      <Tabs defaultValue="billboard" className="w-full">
        <TabsList>
          <TabsTrigger value="billboard" className="flex items-center gap-2"><MapPin className="w-4 h-4" />ค้นหาตามป้าย</TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2"><Package className="w-4 h-4" />ค้นหาตามอุปกรณ์</TabsTrigger>
        </TabsList>
        <TabsContent value="billboard">
          <BillboardViewTab />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentViewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
