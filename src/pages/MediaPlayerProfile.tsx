import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { format, differenceInDays, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  Search, Monitor, Shield, ShieldAlert, MapPin, Clock, Package, Loader2,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Hammer, RotateCcw, AlertTriangle,
  FileText, ExternalLink, ChevronLeft, Info
} from "lucide-react";
import { toast } from "sonner";
import { formatBillboardLabel } from "@/lib/billboardUtils";

// ── Types ──────────────────────────────────────────
interface MediaPlayerRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  serial_number_1: string | null;
  serial_number_2: string | null;
  brand: string | null;
  specification: string | null;
  status: string | null;
  item_condition: string;
  department: string | null;
  billboard_id: string | null;
  install_date: string | null;
  date_of_receipt: string | null;
  warranty_expiry_date: string | null;
  depreciation_months: number | null;
  usage_lifespan_months: number | null;
  unit_price: number | null;
  asset_code: string | null;
  equipment_id_code: string | null;
  po_number: string | null;
  pr_number: string | null;
  invoice_number: string | null;
  po_document_url: string | null;
  pr_document_url: string | null;
  invoice_document_url: string | null;
  remote_name: string | null;
  activate_windows: string | null;
  order_for_project: string | null;
  notes: string | null;
  cms_type_id: string | null;
  company_id: string | null;
  model_id: string | null;
  location_id: string | null;
  created_at: string;
  image_url: string | null;
  billboard?: { id: string; equipment_id: string; old_code: string | null; location_name: string | null } | null;
  companies?: { name: string } | null;
  cms_types?: { name: string } | null;
  locations?: { name: string } | null;
  suppliers?: { name: string } | null;
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

interface StockMovement {
  id: string;
  created_at: string;
  movement_type: string;
  quantity: number;
  stock_before: number | null;
  stock_after: number | null;
  reference_document: string | null;
  notes: string | null;
  item_condition: string | null;
}

interface SearchResult {
  id: string;
  code: string;
  name: string;
  serial_number_1: string | null;
  serial_number_2: string | null;
}

// ── Movement helpers ──────────────────────────────
const MOVEMENT_TYPES = [
  { value: "receive", label: "รับเข้า", icon: ArrowDownToLine, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "issue", label: "จ่ายออก", icon: ArrowUpFromLine, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "transfer_in", label: "โอนเข้า", icon: ArrowLeftRight, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "transfer_out", label: "โอนออก", icon: ArrowLeftRight, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "install_to_billboard", label: "ติดตั้งป้าย", icon: Hammer, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "return_from_billboard", label: "ถอดจากป้าย", icon: RotateCcw, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { value: "defective_return", label: "ของเสียเข้า", icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

function getMovementMeta(type: string) {
  return MOVEMENT_TYPES.find(m => m.value === type) || MOVEMENT_TYPES[0];
}

// ── PIE COLORS ────────────────────────────────────
const PIE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#8b5cf6", "#ec4899"];

// ── Main Component ────────────────────────────────
const MediaPlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [player, setPlayer] = useState<MediaPlayerRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [journeys, setJourneys] = useState<BillboardJourney[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [modelName, setModelName] = useState("-");
  const [statusLabel, setStatusLabel] = useState("Active");

  // ── Search ──
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const term = `%${searchTerm}%`;
      const { data } = await supabase
        .from("media_players")
        .select("id, code, name, serial_number_1, serial_number_2")
        .eq("is_active", true)
        .or(`code.ilike.${term},name.ilike.${term},serial_number_1.ilike.${term},serial_number_2.ilike.${term}`)
        .limit(10);
      setSearchResults((data as any) || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Load player by ID ──
  useEffect(() => {
    if (id && id !== "search") loadPlayer(id);
    else setShowSearch(true);
  }, [id]);

  const loadPlayer = async (playerId: string) => {
    setIsLoading(true);
    setShowSearch(false);

    // Main data
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
      toast.error("ไม่พบข้อมูล Media Player");
      setIsLoading(false);
      return;
    }

    setPlayer(p as unknown as MediaPlayerRow);

    // Model name
    if ((p as any).model_id) {
      const { data: model } = await supabase
        .from("media_player_models" as any)
        .select("name")
        .eq("id", (p as any).model_id)
        .single();
      if (model) setModelName((model as any).name);
    } else {
      setModelName("-");
    }

    // Status label
    if ((p as any).status) {
      const { data: st } = await supabase
        .from("media_player_statuses" as any)
        .select("label")
        .eq("value", (p as any).status)
        .single();
      if (st) setStatusLabel((st as any).label);
      else setStatusLabel((p as any).status);
    } else {
      setStatusLabel("Active");
    }

    // Images
    const { data: imgs } = await supabase
      .from("media_player_images" as any)
      .select("image_url")
      .eq("media_player_id", playerId)
      .order("display_order");
    setImages((imgs || []).map((i: any) => i.image_url));

    // Billboard journey (history)
    const { data: history } = await supabase
      .from("billboard_equipment_history")
      .select("billboard_id, installation_date, uninstall_date, uninstall_reason, quantity")
      .or(`equipment_id.eq.${playerId}`);

    // Also need billboard names for the history entries
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

    // Stock movements
    const { data: movs } = await supabase
      .from("stock_movements")
      .select("id, created_at, movement_type, quantity, stock_before, stock_after, reference_document, notes, item_condition")
      .eq("equipment_code", (p as any).code)
      .order("created_at", { ascending: false })
      .limit(200);
    setMovements((movs as any) || []);

    setIsLoading(false);
  };

  // ── Computed values ──
  const usageAgeDays = useMemo(() => {
    if (!player?.date_of_receipt) return null;
    return differenceInDays(new Date(), parseISO(player.date_of_receipt));
  }, [player]);

  const warrantyStatus = useMemo(() => {
    if (!player?.warranty_expiry_date) return { label: "ไม่ระบุ", variant: "secondary" as const };
    const diff = differenceInDays(parseISO(player.warranty_expiry_date), new Date());
    if (diff < 0) return { label: `หมดประกันแล้ว (${Math.abs(diff)} วัน)`, variant: "destructive" as const };
    if (diff <= 90) return { label: `เหลือ ${diff} วัน`, variant: "outline" as const };
    return { label: `เหลือ ${diff} วัน`, variant: "secondary" as const };
  }, [player]);

  const currentBillboard = useMemo(() => {
    if (!player?.billboard) return null;
    return formatBillboardLabel(player.billboard.old_code, player.billboard.location_name, player.billboard.equipment_id);
  }, [player]);

  const lifecycleSteps: ProcessStep[] = useMemo(() => {
    if (!player) return [];
    const hasReceipt = !!player.date_of_receipt;
    const hasLocation = !!player.location_id;
    const isInstalled = !!player.billboard_id;
    const hasHistory = journeys.length > 0;

    return [
      { label: "ลงทะเบียน", status: "done", date: player.created_at },
      { label: "รับเข้าคลัง", status: hasReceipt ? "done" : "pending", date: player.date_of_receipt },
      { label: "จัดเก็บ", status: hasLocation ? "done" : (hasReceipt ? "current" : "pending") },
      { label: "ติดตั้งป้าย", status: isInstalled ? "done" : (hasHistory ? "done" : (hasLocation ? "current" : "pending")), date: player.install_date },
      ...(hasHistory && !isInstalled ? [{ label: "ถอด/คืนคลัง", status: "done" as const }] : []),
    ];
  }, [player, journeys]);

  // Pie chart data: days installed vs in warehouse
  const usagePieData = useMemo(() => {
    if (!player?.date_of_receipt) return [];
    const totalDays = differenceInDays(new Date(), parseISO(player.date_of_receipt));
    if (totalDays <= 0) return [];
    const installedDays = journeys.reduce((sum, j) => sum + (j.duration_days || 0), 0);
    // Add current installation if still active
    const currentInstallDays = player.install_date ? differenceInDays(new Date(), parseISO(player.install_date)) : 0;
    const totalInstalled = installedDays + currentInstallDays;
    const warehouseDays = Math.max(0, totalDays - totalInstalled);
    return [
      { name: "ติดตั้งหน้างาน", value: totalInstalled, color: "#3b82f6" },
      { name: "อยู่ในคลัง", value: warehouseDays, color: "#f97316" },
    ].filter(d => d.value > 0);
  }, [player, journeys]);

  const selectResult = (r: SearchResult) => {
    setSearchTerm("");
    setSearchResults([]);
    navigate(`/media-player/${r.id}`, { replace: true });
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-8 h-8" />
            Media Player Profile
          </h1>
          <p className="text-muted-foreground">ค้นหาด้วย S/N, รหัส, หรือชื่อ แล้วดูข้อมูลครบจบในหน้าเดียว</p>
        </div>
        {player && (
          <Button variant="outline" onClick={() => { setPlayer(null); setShowSearch(true); navigate("/media-player/search", { replace: true }); }}>
            <Search className="w-4 h-4 mr-2" />
            ค้นหาใหม่
          </Button>
        )}
      </div>

      {/* Search bar */}
      {(showSearch || !player) && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วย Serial Number, รหัส, หรือชื่อ Media Player..."
                className="pl-11 h-12 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />}
            </div>

            {searchResults.length > 0 && (
              <div className="max-w-xl mx-auto mt-2 border rounded-lg overflow-hidden divide-y">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
                    onClick={() => selectResult(r)}
                  >
                    <Monitor className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-sm">{r.code}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {r.name}
                        {r.serial_number_1 && ` • S/N: ${r.serial_number_1}`}
                        {r.serial_number_2 && ` / ${r.serial_number_2}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">ไม่พบข้อมูลที่ตรงกัน</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Profile */}
      {player && (
        <>
          {/* Image + Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image */}
                <div className="shrink-0">
                  {images.length > 0 ? (
                    <img
                      src={images[0]}
                      alt={player.code}
                      className="w-40 h-40 object-cover rounded-xl border"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-muted rounded-xl flex items-center justify-center">
                      <Monitor className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {images.length > 1 && (
                    <div className="flex gap-1 mt-2">
                      {images.slice(1, 5).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-9 h-9 object-cover rounded border" />
                      ))}
                      {images.length > 5 && (
                        <span className="w-9 h-9 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground">
                          +{images.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold font-mono">{player.code}</h2>
                    <Badge variant="secondary">{statusLabel}</Badge>
                    <Badge variant={player.item_condition === "normal" ? "secondary" : "destructive"}>
                      {player.item_condition === "normal" ? "ปกติ" : player.item_condition === "defective" ? "ชำรุด" : player.item_condition}
                    </Badge>
                  </div>
                  <p className="text-lg text-muted-foreground mt-1">{player.name} {modelName !== "-" ? `• ${modelName}` : ""}</p>
                  {player.serial_number_1 && (
                    <p className="text-sm mt-2 font-mono">
                      S/N 1: <span className="font-semibold">{player.serial_number_1}</span>
                      {player.serial_number_2 && <> &nbsp;|&nbsp; S/N 2: <span className="font-semibold">{player.serial_number_2}</span></>}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">อายุใช้งาน</p>
                    <p className="text-2xl font-bold">
                      {usageAgeDays !== null ? (
                        usageAgeDays >= 365 ? `${(usageAgeDays / 365).toFixed(1)} ปี` : `${usageAgeDays} วัน`
                      ) : "ไม่ระบุ"}
                    </p>
                  </div>
                  <Clock className="w-7 h-7 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">สถานะประกัน</p>
                    <Badge variant={warrantyStatus.variant} className="mt-1 text-sm">
                      {warrantyStatus.label}
                    </Badge>
                  </div>
                  {warrantyStatus.variant === "destructive" ? (
                    <ShieldAlert className="w-7 h-7 text-destructive opacity-70" />
                  ) : (
                    <Shield className="w-7 h-7 text-primary opacity-70" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ป้ายปัจจุบัน</p>
                    <p className="text-sm font-semibold mt-1 truncate max-w-[180px]">
                      {currentBillboard || "ไม่ได้ติดตั้ง"}
                    </p>
                  </div>
                  <MapPin className="w-7 h-7 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ประวัติติดตั้ง</p>
                    <p className="text-2xl font-bold">{journeys.length + (player.billboard_id ? 1 : 0)} ครั้ง</p>
                  </div>
                  <Package className="w-7 h-7 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Process Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessTracker steps={lifecycleSteps} />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
              <TabsTrigger value="journey">ประวัติติดตั้ง</TabsTrigger>
              <TabsTrigger value="movements">Stock Movement</TabsTrigger>
            </TabsList>

            {/* Tab 1: General Info */}
            <TabsContent value="general">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                    <InfoRow label="รหัส" value={player.code} />
                    <InfoRow label="ชื่อสินค้า" value={player.name} />
                    <InfoRow label="โมเดล" value={modelName} />
                    <InfoRow label="ยี่ห้อ" value={player.brand} />
                    <InfoRow label="ประเภท (CMS)" value={player.cms_types?.name} />
                    <InfoRow label="Specification" value={player.specification} />
                    <InfoRow label="S/N 1" value={player.serial_number_1} mono />
                    <InfoRow label="S/N 2" value={player.serial_number_2} mono />
                    <InfoRow label="Activate Windows" value={player.activate_windows} />
                    <InfoRow label="ชื่อ (Remote Name)" value={player.remote_name} />
                    <InfoRow label="ฝ่าย" value={player.department} />
                    <InfoRow label="บริษัท" value={player.companies?.name} />
                    <InfoRow label="สถานที่จัดเก็บ" value={player.locations?.name} />
                    <InfoRow label="ผู้จัดจำหน่าย" value={player.suppliers?.name} />
                    <InfoRow label="วันที่รับเข้าคลัง" value={player.date_of_receipt} />
                    <InfoRow label="วันหมดประกัน" value={player.warranty_expiry_date} />
                    <InfoRow label="ราคา (บาท)" value={player.unit_price?.toLocaleString()} />
                    <InfoRow label="ค่าเสื่อม (เดือน)" value={player.depreciation_months?.toString()} />
                    <InfoRow label="อายุใช้งาน (เดือน)" value={player.usage_lifespan_months?.toString()} />
                    <InfoRow label="รหัสทรัพย์สิน" value={player.asset_code} />
                    <InfoRow label="Equipment ID" value={player.equipment_id_code} />
                    <InfoRow label="Order For Project" value={player.order_for_project} />
                  </div>

                  {/* Documents */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">เอกสารที่เกี่ยวข้อง</h4>
                    <div className="flex flex-wrap gap-3">
                      <DocLink label="PO" number={player.po_number} url={player.po_document_url} />
                      <DocLink label="PR" number={player.pr_number} url={player.pr_document_url} />
                      <DocLink label="Invoice" number={player.invoice_number} url={player.invoice_document_url} />
                    </div>
                  </div>

                  {player.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-1">หมายเหตุ</h4>
                      <p className="text-sm text-muted-foreground">{player.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Billboard Journey */}
            <TabsContent value="journey">
              <div className="space-y-6">
                {/* Current installation */}
                {currentBillboard && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">ติดตั้งอยู่ปัจจุบัน</p>
                          <p className="font-semibold">{currentBillboard}</p>
                          {player.install_date && (
                            <p className="text-xs text-muted-foreground">
                              ตั้งแต่ {format(parseISO(player.install_date), "dd MMM yyyy", { locale: th })}
                              {" "}({differenceInDays(new Date(), parseISO(player.install_date))} วัน)
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Journey table */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">ประวัติการติดตั้ง/ถอด</CardTitle>
                        <CardDescription>รายการป้ายที่เคยติดตั้ง</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {journeys.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">ยังไม่มีประวัติ</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ป้ายโฆษณา</TableHead>
                                <TableHead>วันติดตั้ง</TableHead>
                                <TableHead>วันถอด</TableHead>
                                <TableHead className="text-right">จำนวนวัน</TableHead>
                                <TableHead>เหตุผล</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {journeys.map((j, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{j.billboard_name}</TableCell>
                                  <TableCell className="text-sm">
                                    {j.installation_date ? format(parseISO(j.installation_date), "dd/MM/yy") : "-"}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {j.uninstall_date ? format(parseISO(j.uninstall_date), "dd/MM/yy") : "-"}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {j.duration_days !== null ? `${j.duration_days}` : "-"}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                    {j.uninstall_reason || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pie chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">สัดส่วนเวลาใช้งาน</CardTitle>
                      <CardDescription>วันในคลัง vs วันติดตั้ง</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {usagePieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={usagePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              dataKey="value"
                              label={({ name, value }) => `${name} (${value} วัน)`}
                              labelLine={false}
                            >
                              {usagePieData.map((d, i) => (
                                <Cell key={i} fill={d.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => `${v} วัน`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center py-8 text-sm text-muted-foreground">ยังไม่มีข้อมูลวันรับเข้าคลัง</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Stock Movement */}
            <TabsContent value="movements">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Movement Timeline</CardTitle>
                  <CardDescription>ความเคลื่อนไหวของสินค้ารหัส {player.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  {movements.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">ยังไม่มีข้อมูลความเคลื่อนไหว</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>วันที่</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead className="text-right">จำนวน</TableHead>
                            <TableHead className="text-right">สต็อกก่อน</TableHead>
                            <TableHead className="text-right">สต็อกหลัง</TableHead>
                            <TableHead>สภาพ</TableHead>
                            <TableHead>เอกสาร</TableHead>
                            <TableHead>หมายเหตุ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movements.map((m) => {
                            const meta = getMovementMeta(m.movement_type);
                            const Icon = meta.icon;
                            return (
                              <TableRow key={m.id}>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {format(parseISO(m.created_at), "dd/MM/yy HH:mm")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`${meta.color} border-0 gap-1`}>
                                    <Icon className="w-3 h-3" />
                                    {meta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{m.stock_before ?? "-"}</TableCell>
                                <TableCell className="text-right font-mono">{m.stock_after ?? "-"}</TableCell>
                                <TableCell className="text-sm">
                                  {m.item_condition === "normal" ? "ปกติ" : m.item_condition === "defective" ? "ชำรุด" : m.item_condition || "-"}
                                </TableCell>
                                <TableCell className="text-sm font-mono">{m.reference_document || "-"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.notes || "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

// ── Helper components ─────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${mono ? "font-mono" : ""}`}>{value || "-"}</p>
    </div>
  );
}

function DocLink({ label, number, url }: { label: string; number?: string | null; url?: string | null }) {
  if (!number && !url) return null;
  return (
    <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
      <FileText className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}: {number || "-"}</span>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

export default MediaPlayerProfile;
