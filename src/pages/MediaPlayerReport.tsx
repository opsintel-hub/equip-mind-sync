import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { Monitor, Search, Download, Eye, Package, AlertTriangle, CheckCircle, Loader2, FileDown, Tag, Building2, Wrench, Shield } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { buildReceivedSerialAliasMap, formatMergedSerials, matchesSerialSearch } from "@/lib/serialSearch";

import { MediaPlayerRow, BillboardJourney, StockMovement } from "@/components/media-player/profile/types";
import { SummaryCards } from "@/components/media-player/profile/SummaryCards";
import { GeneralInfoTab } from "@/components/media-player/profile/GeneralInfoTab";
import { JourneyTab } from "@/components/media-player/profile/JourneyTab";
import { MovementTab } from "@/components/media-player/profile/MovementTab";

const getConditionBadge = (condition: string) => {
  switch (condition) {
    case "normal":
      return <Badge className="bg-green-100 text-green-800 border-green-200">ปกติ</Badge>;
    case "defective":
      return <Badge className="bg-red-100 text-red-800 border-red-200">ชำรุด</Badge>;
    case "repaired":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">ซ่อมแล้ว</Badge>;
    default:
      return <Badge variant="outline">{condition}</Badge>;
  }
};

interface MediaPlayerListItem {
  id: string;
  code: string;
  name: string;
  serial_number_1: string | null;
  serial_number_2: string | null;
  brand: string | null;
  department: string | null;
  item_condition: string;
  status: string | null;
  quantity: number;
  unit: string;
  billboard_id: string | null;
  location_id: string | null;
  company_id: string | null;
  warranty_expiry_date: string | null;
  date_of_receipt: string | null;
  install_date: string | null;
  companies: { name: string } | null;
  locations: { name: string } | null;
  billboard: { id: string; equipment_id: string; old_code: string | null; location_name: string | null } | null;
}

export default function MediaPlayerReport() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [snSearch, setSnSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [codePrefixFilter, setCodePrefixFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Fetch all media players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["media-player-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select(`
          id, code, name, serial_number_1, serial_number_2, brand, department,
          item_condition, status, quantity, unit, billboard_id, location_id, company_id,
          warranty_expiry_date, date_of_receipt, install_date,
          companies:company_id (name),
          locations:location_id (name),
          billboard:billboards!media_players_billboard_id_fkey (id, equipment_id, old_code, location_name)
        `)
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return (data || []) as unknown as MediaPlayerListItem[];
    },
  });

  const { data: receivedSerialAliases = [] } = useQuery({
    queryKey: ["media-player-report-received-serials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt_pending")
        .select("media_player_id, serial_number, received_at, created_at")
        .eq("status", "received")
        .eq("is_media_player", true)
        .not("media_player_id", "is", null)
        .not("serial_number", "is", null)
        .neq("serial_number", "");

      if (error) throw error;
      return data || [];
    },
  });

  const mediaPlayerAliasMap = useMemo(
    () => buildReceivedSerialAliasMap(receivedSerialAliases, "media_player_id"),
    [receivedSerialAliases],
  );

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("name").eq("is_active", true).order("name");
      return (data || []).map((d: any) => d.name);
    },
  });

  // Extract unique code prefixes
  const codePrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    players.forEach((p) => {
      const match = p.code?.match(/^([A-Za-z-]+)/);
      if (match) prefixes.add(match[1]);
    });
    return Array.from(prefixes).sort();
  }, [players]);

  // Extract unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => { if (p.brand) set.add(p.brand); });
    return Array.from(set).sort();
  }, [players]);

  // Extract unique companies
  const companyNames = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => { if (p.companies?.name) set.add(p.companies.name); });
    return Array.from(set).sort();
  }, [players]);

  // Filter
  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (conditionFilter !== "all" && p.item_condition !== conditionFilter) return false;
      if (departmentFilter !== "all" && p.department !== departmentFilter) return false;
      if (statusFilter !== "all") {
        const isInstalled = !!p.billboard_id;
        if (statusFilter === "installed" && !isInstalled) return false;
        if (statusFilter === "in_stock" && isInstalled) return false;
      }
      if (companyFilter !== "all" && (p.companies?.name || "") !== companyFilter) return false;
      if (brandFilter !== "all" && (p.brand || "") !== brandFilter) return false;
      if (codePrefixFilter !== "all") {
        const match = p.code?.match(/^([A-Za-z-]+)/);
        if (!match || match[1] !== codePrefixFilter) return false;
      }
      // Dedicated S/N search
      if (snSearch) {
        const s = snSearch.toLowerCase();
        const matchSN =
          p.serial_number_1?.toLowerCase().includes(s) ||
          p.serial_number_2?.toLowerCase().includes(s);
        if (!matchSN) return false;
      }
      // General search (code, name, brand)
      if (search) {
        const s = search.toLowerCase();
        const match =
          p.code?.toLowerCase().includes(s) ||
          p.name?.toLowerCase().includes(s) ||
          p.brand?.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [players, search, snSearch, conditionFilter, departmentFilter, statusFilter, companyFilter, brandFilter, codePrefixFilter]);

  const {
    paginatedData,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(filtered, 20);

  // Summary stats - based on filtered data
  const stats = useMemo(() => {
    const total = filtered.length;
    const installed = filtered.filter((p) => !!p.billboard_id).length;
    const inStock = filtered.filter((p) => !p.billboard_id).length;
    const defective = filtered.filter((p) => p.item_condition === "defective").length;
    const repaired = filtered.filter((p) => p.item_condition === "repaired").length;
    const filteredPrefixes = new Set<string>();
    filtered.forEach((p) => { const m = p.code?.match(/^([A-Za-z-]+)/); if (m) filteredPrefixes.add(m[1]); });
    const uniquePrefixes = filteredPrefixes.size;
    const filteredBrands = new Set<string>();
    filtered.forEach((p) => { if (p.brand) filteredBrands.add(p.brand); });
    const uniqueBrands = filteredBrands.size;
    const warrantyExpiring = filtered.filter((p) => {
      if (!p.warranty_expiry_date) return false;
      const days = differenceInDays(parseISO(p.warranty_expiry_date), new Date());
      return days >= 0 && days <= 90;
    }).length;
    return { total, installed, inStock, defective, repaired, uniquePrefixes, uniqueBrands, warrantyExpiring };
  }, [filtered]);

  // Export Excel
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const rows = filtered.map((p) => ({
      รหัส: p.code,
      ชื่อ: p.name,
      "S/N 1": p.serial_number_1 || "",
      "S/N 2": p.serial_number_2 || "",
      ยี่ห้อ: p.brand || "",
      ฝ่าย: p.department || "",
      สภาพ: p.item_condition === "normal" ? "ปกติ" : p.item_condition === "defective" ? "ชำรุด" : p.item_condition === "repaired" ? "ซ่อมแล้ว" : p.item_condition,
      สถานะ: p.billboard_id ? "ติดตั้ง" : "ในคลัง",
      ป้ายปัจจุบัน: p.billboard ? formatBillboardLabel(p.billboard.old_code, p.billboard.location_name, p.billboard.equipment_id) : "",
      บริษัท: p.companies?.name || "",
      ตำแหน่งจัดเก็บ: p.locations?.name || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Media Players");
    XLSX.writeFile(wb, `media-player-report-${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-8 h-8" />
            รายงาน Media Player
          </h1>
          <p className="text-muted-foreground">แสดงรายการ Media Player ทั้งหมด 1 เครื่องต่อ 1 แถว พร้อมดู Profile แต่ละเครื่อง</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ทั้งหมด</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">จำนวนรหัส (Prefix)</p>
              <p className="text-2xl font-bold">{stats.uniquePrefixes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ติดตั้งแล้ว</p>
              <p className="text-2xl font-bold">{stats.installed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Package className="w-5 h-5 text-chart-1" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ในคลัง</p>
              <p className="text-2xl font-bold">{stats.inStock}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ชำรุด</p>
              <p className="text-2xl font-bold">{stats.defective}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Wrench className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ซ่อมแล้ว</p>
              <p className="text-2xl font-bold">{stats.repaired}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">จำนวนยี่ห้อ</p>
              <p className="text-2xl font-bold">{stats.uniqueBrands}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-chart-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ประกันใกล้หมด (90 วัน)</p>
              <p className="text-2xl font-bold">{stats.warrantyExpiring}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[160px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา S/N..."
                  value={snSearch}
                  onChange={(e) => setSnSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา รหัส, ชื่อ, ยี่ห้อ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={codePrefixFilter} onValueChange={setCodePrefixFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="รหัส (Prefix)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกรหัส</SelectItem>
                {codePrefixes.map((prefix) => (
                  <SelectItem key={prefix} value={prefix}>{prefix}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="สภาพ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสภาพ</SelectItem>
                <SelectItem value="normal">ปกติ</SelectItem>
                <SelectItem value="defective">ชำรุด</SelectItem>
                <SelectItem value="repaired">ซ่อมแล้ว</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="installed">ติดตั้ง</SelectItem>
                <SelectItem value="in_stock">ในคลัง</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="ฝ่าย" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((d: string) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="บริษัท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบริษัท</SelectItem>
                {companyNames.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ยี่ห้อ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกยี่ห้อ</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>สภาพ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ป้ายปัจจุบัน</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead className="text-center w-[80px]">Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        ไม่พบข้อมูล Media Player
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((p, idx) => {
                      const sn = [p.serial_number_1, p.serial_number_2].filter(Boolean).join(" / ");
                      const bbLabel = p.billboard
                        ? formatBillboardLabel(p.billboard.old_code, p.billboard.location_name, p.billboard.equipment_id)
                        : "-";
                      const rowNum = (currentPage - 1) * pageSize + idx + 1;

                      return (
                        <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedPlayerId(p.id)}>
                          <TableCell className="text-muted-foreground">{rowNum}</TableCell>
                          <TableCell className="font-mono font-medium">{p.code}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{sn || "-"}</TableCell>
                          <TableCell>{getConditionBadge(p.item_condition)}</TableCell>
                          <TableCell>
                            {p.billboard_id ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">ติดตั้ง</Badge>
                            ) : (
                              <Badge variant="outline">ในคลัง</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{bbLabel}</TableCell>
                          <TableCell>{p.department || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlayerId(p.id);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {totalItems > 0 && (
                <div className="p-4 border-t">
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile Dialog */}
      {selectedPlayerId && (
        <MediaPlayerProfileDialog
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
          onOpenFullProfile={(id) => {
            setSelectedPlayerId(null);
            navigate(`/media-player/${id}`);
          }}
        />
      )}
    </div>
  );
}

// ── Profile Dialog ──────────────────────────────────────────────
function MediaPlayerProfileDialog({
  playerId,
  onClose,
  onOpenFullProfile,
}: {
  playerId: string;
  onClose: () => void;
  onOpenFullProfile: (id: string) => void;
}) {
  const [player, setPlayer] = useState<MediaPlayerRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [journeys, setJourneys] = useState<BillboardJourney[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [modelName, setModelName] = useState("-");

  useEffect(() => {
    loadPlayer();
  }, [playerId]);

  async function loadPlayer() {
    setIsLoading(true);
    const { data: p } = await supabase
      .from("media_players")
      .select(`
        *,
        billboard:billboards(id, equipment_id, old_code, location_name),
        companies(name),
        cms_types(name),
        locations(name),
        suppliers(name)
      `)
      .eq("id", playerId)
      .single();

    if (!p) {
      setIsLoading(false);
      return;
    }

    setPlayer(p as unknown as MediaPlayerRow);

    // Model
    if ((p as any).model_id) {
      const { data: model } = await supabase
        .from("media_player_models" as any)
        .select("name")
        .eq("id", (p as any).model_id)
        .single();
      if (model) setModelName((model as any).name);
    }

    // Journey
    const { data: history } = await supabase
      .from("billboard_equipment_history")
      .select("billboard_id, installation_date, uninstall_date, uninstall_reason, quantity")
      .or(`equipment_id.eq.${playerId}`);

    const journeyData: BillboardJourney[] = [];
    if (history && history.length > 0) {
      const billboardIds = [...new Set(history.map((h: any) => h.billboard_id))];
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name")
        .in("id", billboardIds);
      const bbMap = new Map((billboards || []).map((b: any) => [b.id, b]));

      for (const h of history as any[]) {
        const bb = bbMap.get(h.billboard_id);
        const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : h.billboard_id;
        const instDate = h.installation_date;
        const uninstDate = h.uninstall_date;
        const days = instDate && uninstDate ? differenceInDays(parseISO(uninstDate), parseISO(instDate)) : null;
        journeyData.push({
          billboard_id: h.billboard_id,
          billboard_name: bbName,
          installation_date: instDate,
          uninstall_date: uninstDate,
          duration_days: days,
          uninstall_reason: h.uninstall_reason,
          quantity: h.quantity,
        });
      }
    }
    setJourneys(journeyData);

    // Movements
    const { data: movs } = await supabase
      .from("stock_movements")
      .select("id, created_at, movement_type, quantity, stock_before, stock_after, reference_document, notes, item_condition")
      .eq("equipment_code", (p as any).code)
      .order("created_at", { ascending: false })
      .limit(200);
    setMovements((movs as any) || []);

    setIsLoading(false);
  }

  const lifecycleSteps: ProcessStep[] = useMemo(() => {
    if (!player) return [];
    const hasReceipt = !!player.date_of_receipt;
    const hasLocation = !!player.location_id;
    const isInstalled = !!player.billboard_id;
    const hasHistory = journeys.length > 0;

    // Infer earlier steps as done if later steps are completed
    const receiptDone = hasReceipt || hasLocation || isInstalled || hasHistory;
    const storageDone = hasLocation || isInstalled || hasHistory;

    return [
      { label: "ลงทะเบียน", status: "done", date: player.created_at },
      { label: "รับเข้าคลัง", status: receiptDone ? "done" : "pending", date: player.date_of_receipt },
      { label: "จัดเก็บ", status: storageDone ? "done" : (hasReceipt ? "current" : "pending") },
      { label: "ติดตั้งป้าย", status: isInstalled ? "done" : (hasHistory ? "done" : (storageDone ? "current" : "pending")), date: player.install_date },
      ...(hasHistory && !isInstalled ? [{ label: "ถอด/คืนคลัง", status: "done" as const }] : []),
    ];
  }, [player, journeys]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {player ? `${player.code} — ${player.name}` : "กำลังโหลด..."}
            </span>
            {player && (
              <Button size="sm" variant="outline" onClick={() => onOpenFullProfile(player.id)}>
                เปิดหน้าเต็ม
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : player ? (
          <div className="space-y-4">
            {/* Lifecycle */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifecycle</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessTracker steps={lifecycleSteps} />
              </CardContent>
            </Card>

            <SummaryCards player={player} journeys={journeys} />

            {/* Tabs */}
            <Tabs defaultValue="journey" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
                <TabsTrigger value="journey">ประวัติติดตั้ง</TabsTrigger>
                <TabsTrigger value="movements">Stock Card</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <GeneralInfoTab player={player} modelName={modelName} />
              </TabsContent>
              <TabsContent value="journey">
                <JourneyTab player={player} journeys={journeys} />
              </TabsContent>
              <TabsContent value="movements">
                <MovementTab movements={movements} playerCode={player.code} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <p className="text-center py-10 text-muted-foreground">ไม่พบข้อมูล</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
