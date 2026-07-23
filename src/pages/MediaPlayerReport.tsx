import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProcessTracker, ProcessStep } from "@/components/ProcessTracker";
import { Monitor, Search, Download, Eye, Package, AlertTriangle, CheckCircle, Loader2, FileDown, Tag, Building2, Wrench, Shield, Image as ImageIcon, FolderKanban, Layers } from "lucide-react";
import { differenceInDays, differenceInMonths, parseISO, format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { SUB_MEDIA_TYPES } from "@/lib/mediaPlayerSubTypes";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { matchesSerialSearch } from "@/lib/serialSearch";
import { useDeptScope } from "@/hooks/useDeptScope";
import { ViewModeToggle, useViewMode } from "@/components/common/ViewModeToggle";
import { EntityCardGrid, CardItem } from "@/components/common/EntityCardGrid";
import { EntityCalendarView, CalendarItem } from "@/components/common/EntityCalendarView";
import { usePrimaryImages } from "@/hooks/usePrimaryImages";

import { MediaPlayerRow, BillboardJourney, StockMovement } from "@/components/media-player/profile/types";
import { SummaryCards } from "@/components/media-player/profile/SummaryCards";
import { GeneralInfoTab } from "@/components/media-player/profile/GeneralInfoTab";
import { JourneyTab } from "@/components/media-player/profile/JourneyTab";
import { MovementTab } from "@/components/media-player/profile/MovementTab";

import { getConditionDisplay, CONDITION_OPTIONS } from "@/components/media-player/profile/constants";

const getConditionBadge = (condition: string) => {
  const meta = getConditionDisplay(condition);
  return <Badge className={meta.className}>{meta.label}</Badge>;
};

const getConditionLabel = (condition: string) => getConditionDisplay(condition).label;

interface StatusMeta { label: string; className: string; }
const getStatusMeta = (r: { billboard_id: string | null; rawStatus: string | null; isRefurbished: boolean }): StatusMeta => {
  const refurbSuffix = r.isRefurbished ? " · Refurbished" : "";
  switch (r.rawStatus) {
    case "pending_warehouse_return":
    case "pending_assessment":
      return { label: "พักรอประเมิน" + refurbSuffix, className: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300" };

    case "pending_assessment":
      return { label: "พักรอประเมิน" + refurbSuffix, className: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300" };
    case "under_repair":
      return { label: "กำลังซ่อม" + refurbSuffix, className: "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300" };
    case "in_claim":
      return { label: "รอเคลม" + refurbSuffix, className: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300" };
  }
  if (r.billboard_id) return { label: "ติดตั้ง" + refurbSuffix, className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300" };
  return { label: "ในคลัง" + refurbSuffix, className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300" };
};

interface MediaPlayerMaster {
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
  unit_price: number | null;
  po_number: string | null;
  asset_code: string | null;
  equipment_id_code: string | null;
  depreciation_months: number | null;
  activate_windows: string | null;
  image_url: string | null;
  specification: string | null;
  usage_lifespan_months: number | null;
  remote_name: string | null;
  sub_media_type: string | null;
  device_type: string | null;
  companies: { name: string } | null;
  locations: { name: string } | null;
  billboard: { id: string; equipment_id: string; old_code: string | null; location_name: string | null } | null;
}

/** One expanded row = one physical device */
interface ExpandedRow {
  /** unique key for React */
  key: string;
  playerId: string;
  code: string;
  name: string;
  serialNumber: string;
  brand: string;
  department: string;
  condition: string;
  statusLabel: string;
  billboardLabel: string;
  company: string;
  locationName: string;
  price: number | null;
  poNumber: string;
  warrantyExpiry: string | null;
  expiryDate: string | null; // usage_lifespan based
  assetCode: string;
  equipmentIdCode: string;
  depreciationRemaining: number | null;
  activateWindows: string;
  imageUrl: string | null;
  lotNumber1: string;
  lotNumber2: string;
  specification: string;
  remoteName: string;
  // for profile link
  billboard_id: string | null;
  warrantyDaysLeft: number | null;
  expiryDaysLeft: number | null;
  orderForProject: string;
  rawStatus: string | null;
  isRefurbished: boolean;
  poItemNo: string;
  warrantyYears: number | null;
  assetCaretaker: string;
  subMediaType: string;
  deviceType: string;
}

export default function MediaPlayerReport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [snSearch, setSnSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [subMediaTypeFilter, setSubMediaTypeFilter] = useState("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("all");
  const [codePrefixFilter, setCodePrefixFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();
  const [viewMode, setViewMode] = useViewMode("media-player-report", "table");

  // Fetch all media players with extra fields
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["media-player-report-v2", deptKey],
    queryFn: async () => {
      let query = supabase
        .from("media_players")
        .select(`
          id, code, name, serial_number_1, serial_number_2, brand, department,
          item_condition, status, quantity, unit, billboard_id, location_id, company_id,
          warranty_expiry_date, date_of_receipt, install_date, unit_price, po_number,
          asset_code, equipment_id_code, depreciation_months, activate_windows,
          image_url, specification, usage_lifespan_months, remote_name, is_refurbished,
          po_item_no, warranty_years, asset_caretaker, sub_media_type, device_type,
          companies:company_id (name),
          locations:location_id (name),
          billboard:billboards!media_players_billboard_id_fkey (id, equipment_id, old_code, location_name)
        `)
        .eq("is_active", true)
        .order("code");
      if (!isSuperAdmin) {
        const depts = viewableDepts || [];
        query = query.in("department", depts.length > 0 ? depts : ["__no_dept_permission__"]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as MediaPlayerMaster[];
    },
  });

  // Fetch receipt-level data (S/N, price, PO, lot) for expansion
  const { data: receiptRows = [] } = useQuery({
    queryKey: ["media-player-report-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt_pending")
        .select("media_player_id, serial_number, unit_price, po_number, lot_number, lot_number_2, order_for_project, received_at, created_at, media_player_image_url, po_item_no, warranty_years, asset_caretaker")
        .eq("status", "received")
        .eq("is_media_player", true)
        .not("media_player_id", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("name").eq("is_active", true).order("name");
      return (data || []).map((d: any) => d.name);
    },
  });

  // Build latest receipt map for fallback fields like PO / lot / received serial
  const latestReceiptMap = useMemo(() => {
    const map: Record<string, (typeof receiptRows)[number]> = {};
    receiptRows.forEach((r) => {
      const pid = r.media_player_id;
      if (!pid) return;

      const currentTime = new Date(r.received_at || r.created_at || 0).getTime();
      const existingTime = map[pid]
        ? new Date(map[pid].received_at || map[pid].created_at || 0).getTime()
        : -1;

      if (!map[pid] || currentTime > existingTime) {
        map[pid] = r;
      }
    });
    return map;
  }, [receiptRows]);

  // Build ALL receipt serial numbers per player for S/N search
  const allReceiptSerialsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    receiptRows.forEach((r) => {
      const pid = r.media_player_id;
      const sn = r.serial_number?.trim();
      if (!pid || !sn) return;
      if (!map[pid]) map[pid] = [];
      if (!map[pid].includes(sn)) map[pid].push(sn);
    });
    return map;
  }, [receiptRows]);

  const { data: imageRows = [] } = useQuery({
    queryKey: ["media-player-report-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_player_images" as any)
        .select("media_player_id, image_url, display_order")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Array<{ media_player_id: string; image_url: string; display_order: number | null }>;
    },
  });

  const imagesByPlayer = useMemo(() => {
    const map: Record<string, string[]> = {};
    imageRows.forEach((img) => {
      if (!img.media_player_id || !img.image_url) return;
      if (!map[img.media_player_id]) map[img.media_player_id] = [];
      map[img.media_player_id].push(img.image_url);
    });
    return map;
  }, [imageRows]);

  // Show 1 row per physical device (1 media_players record = 1 machine)
  const expandedRows = useMemo(() => {
    const rows: ExpandedRow[] = [];
    const now = new Date();

    players.forEach((p) => {
      const latestReceipt = latestReceiptMap[p.id];
      const bbLabel = p.billboard
        ? formatBillboardLabel(p.billboard.old_code, p.billboard.location_name, p.billboard.equipment_id)
        : "-";
      const wfStatusMap: Record<string, string> = {
        pending_warehouse_return: "พักรอประเมิน",
        pending_assessment: "พักรอประเมิน",
        under_repair: "กำลังซ่อม",
        in_claim: "รอเคลม",
      };
      const statusLabel = wfStatusMap[(p as any).status]
        ? wfStatusMap[(p as any).status] + ((p as any).is_refurbished ? " (Refurbished)" : "")
        : (p.billboard_id ? "ติดตั้ง" : "ในคลัง") + ((p as any).is_refurbished ? " (Refurbished)" : "");
      const company = p.companies?.name || "";
      const locationName = p.locations?.name || "";

      // Calculate warranty days left
      let warrantyDaysLeft: number | null = null;
      if (p.warranty_expiry_date) {
        warrantyDaysLeft = differenceInDays(parseISO(p.warranty_expiry_date), now);
      }

      // Calculate usage expiry date based on date_of_receipt + usage_lifespan_months
      let expiryDate: string | null = null;
      let expiryDaysLeft: number | null = null;
      if (p.date_of_receipt && p.usage_lifespan_months) {
        const receiptDate = parseISO(p.date_of_receipt);
        const expiry = new Date(receiptDate);
        expiry.setMonth(expiry.getMonth() + p.usage_lifespan_months);
        expiryDate = expiry.toISOString();
        expiryDaysLeft = differenceInDays(expiry, now);
      }

      // Calculate depreciation remaining months
      let depreciationRemaining: number | null = null;
      if (p.depreciation_months && p.date_of_receipt) {
        const monthsUsed = differenceInMonths(now, parseISO(p.date_of_receipt));
        depreciationRemaining = Math.max(0, p.depreciation_months - monthsUsed);
      }

      const serialParts = [p.serial_number_1, p.serial_number_2]
        .map((serial) => serial?.trim())
        .filter(Boolean) as string[];

      const serialNumber = serialParts.length > 0
        ? serialParts.join("\n")
        : latestReceipt?.serial_number?.trim() || "-";

      rows.push({
        key: p.id,
        playerId: p.id,
        code: p.code,
        name: p.name,
        serialNumber,
        brand: p.brand || "",
        department: p.department || "",
        condition: p.item_condition,
        statusLabel,
        billboardLabel: bbLabel,
        company,
        locationName,
        price: p.unit_price ?? latestReceipt?.unit_price ?? null,
        poNumber: p.po_number || latestReceipt?.po_number || "",
        warrantyExpiry: p.warranty_expiry_date,
        expiryDate,
        assetCode: p.asset_code || "",
        equipmentIdCode: p.equipment_id_code || "",
        depreciationRemaining,
        activateWindows: p.activate_windows || "",
        imageUrl: p.image_url || (latestReceipt as any)?.media_player_image_url || imagesByPlayer[p.id]?.[0] || null,
        lotNumber1: (latestReceipt as any)?.lot_number || "",
        lotNumber2: (latestReceipt as any)?.lot_number_2 || "",
        specification: p.specification || "",
        billboard_id: p.billboard_id,
        warrantyDaysLeft,
        expiryDaysLeft,
        orderForProject: (latestReceipt as any)?.order_for_project || "",
        remoteName: p.remote_name || "",
        rawStatus: (p as any).status || null,
        isRefurbished: !!(p as any).is_refurbished,
        poItemNo: (p as any).po_item_no || latestReceipt?.po_item_no || "",
        warrantyYears: (p as any).warranty_years ?? latestReceipt?.warranty_years ?? null,
        assetCaretaker: (p as any).asset_caretaker || (latestReceipt as any)?.asset_caretaker || "",
        subMediaType: (p as any).sub_media_type || "",
        deviceType: ((p as any).device_type || "MEDIA_PLAYER"),
      });
    });
    return rows;
  }, [players, latestReceiptMap, imagesByPlayer]);

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

  // Extract unique Order for Projects
  const projectNames = useMemo(() => {
    const set = new Set<string>();
    expandedRows.forEach((r) => { if (r.orderForProject) set.add(r.orderForProject); });
    return Array.from(set).sort();
  }, [expandedRows]);

  // Filter expanded rows
  const filtered = useMemo(() => {
    return expandedRows.filter((r) => {
      if (conditionFilter !== "all" && r.condition !== conditionFilter) return false;
      if (departmentFilter !== "all" && r.department !== departmentFilter) return false;
      if (subMediaTypeFilter !== "all" && r.subMediaType !== subMediaTypeFilter) return false;
      if (deviceTypeFilter !== "all" && (r.deviceType || "MEDIA_PLAYER") !== deviceTypeFilter) return false;
      if (statusFilter !== "all") {
        const SPECIAL = ["pending_warehouse_return", "pending_assessment", "under_repair", "in_claim"];
        const isSpecial = r.rawStatus ? SPECIAL.includes(r.rawStatus) : false;
        if (statusFilter === "installed" && !r.billboard_id) return false;
        if (statusFilter === "in_stock" && (r.billboard_id || isSpecial)) return false;
        if (statusFilter === "pending_warehouse_return" && r.rawStatus !== "pending_warehouse_return") return false;
        if (statusFilter === "pending_assessment" && r.rawStatus !== "pending_assessment") return false;
        if (statusFilter === "under_repair" && r.rawStatus !== "under_repair") return false;
        if (statusFilter === "in_claim" && r.rawStatus !== "in_claim") return false;
        if (statusFilter === "refurbished" && !r.isRefurbished) return false;
      }
      if (companyFilter !== "all" && r.company !== companyFilter) return false;
      if (brandFilter !== "all" && r.brand !== brandFilter) return false;
      if (projectFilter !== "all" && r.orderForProject !== projectFilter) return false;
      if (codePrefixFilter !== "all") {
        const match = r.code?.match(/^([A-Za-z-]+)/);
        if (!match || match[1] !== codePrefixFilter) return false;
      }
      // S/N search — also check receipt aliases
      if (snSearch) {
        const term = snSearch.trim().toLowerCase();
        const masterMatch = r.serialNumber.toLowerCase().includes(term);
        const receiptSerials = allReceiptSerialsMap[r.playerId] || [];
        const aliasMatch = receiptSerials.some((sn) => sn.toLowerCase().includes(term));
        if (!masterMatch && !aliasMatch) return false;
      }
      // General search
      if (search) {
        const s = search.toLowerCase();
        const match =
          r.code?.toLowerCase().includes(s) ||
          r.name?.toLowerCase().includes(s) ||
          r.remoteName?.toLowerCase().includes(s) ||
          r.brand?.toLowerCase().includes(s) ||
          r.poNumber?.toLowerCase().includes(s) ||
          r.assetCode?.toLowerCase().includes(s) ||
          r.equipmentIdCode?.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [expandedRows, search, snSearch, conditionFilter, departmentFilter, statusFilter, companyFilter, brandFilter, codePrefixFilter, projectFilter, allReceiptSerialsMap, subMediaTypeFilter, deviceTypeFilter]);

  const {
    paginatedData,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(filtered, 20);

  // Summary stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const installed = filtered.filter((r) => !!r.billboard_id).length;
    const inStock = filtered.filter((r) => !r.billboard_id).length;
    const defective = filtered.filter((r) => r.condition === "defective").length;
    const pendingInspection = filtered.filter((r) => r.condition === "pending_inspection").length;
    const pendingAssessment = filtered.filter((r) => r.rawStatus === "pending_assessment").length;
    const underRepair = filtered.filter((r) => r.rawStatus === "under_repair").length;
    const inClaim = filtered.filter((r) => r.rawStatus === "in_claim").length;
    const refurbished = filtered.filter((r) => r.isRefurbished).length;
    const uniquePrefixes = new Set(filtered.map((r) => { const m = r.code?.match(/^([A-Za-z-]+)/); return m ? m[1] : ""; }).filter(Boolean)).size;
    const uniqueBrands = new Set(filtered.map((r) => r.brand).filter(Boolean)).size;
    const warrantyExpiring = filtered.filter((r) => r.warrantyDaysLeft !== null && r.warrantyDaysLeft >= 0 && r.warrantyDaysLeft <= 90).length;
    const uniqueDepartments = new Set(filtered.map((r) => r.department).filter(Boolean)).size;
    const uniqueProjects = new Set(filtered.map((r) => r.orderForProject).filter(Boolean)).size;
    return { total, installed, inStock, defective, pendingInspection, pendingAssessment, underRepair, inClaim, refurbished, uniquePrefixes, uniqueBrands, warrantyExpiring, uniqueDepartments, uniqueProjects };
  }, [filtered]);

  // Export Excel
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const rows = filtered.map((r) => ({
      "ลำดับ": "",
      "รหัส": r.code,
      "ชื่อ": r.name,
      "ชื่อเครื่อง (Name)": r.remoteName,
      "S/N": r.serialNumber,
      "สภาพ": getConditionLabel(r.condition),
      "สถานะ": getStatusMeta(r).label,
      "Refurbished": r.isRefurbished ? "ใช่" : "",
      "ป้ายปัจจุบัน": r.billboardLabel,
      "ฝ่าย": r.department,
      "ประเภทอุปกรณ์": r.deviceType === "MONITOR" ? "จอภาพ" : "Media Player",
      "Sub Media Type": r.subMediaType || "",
      "บริษัท": r.company,
      "ราคา/ชิ้น": r.price ?? "",
      "เลข PO": r.poNumber,
      "Item No. (PO)": r.poItemNo,
      "ระยะรับประกัน (ปี)": r.warrantyYears ?? "",
      "ผู้ดูแล": r.assetCaretaker,
      "รหัสทรัพย์สิน": r.assetCode,
      "Equipment ID": r.equipmentIdCode,
      "ค่าเสื่อมคงเหลือ (เดือน)": r.depreciationRemaining ?? "",
      "วันหมดประกัน": r.warrantyExpiry ? format(parseISO(r.warrantyExpiry), "dd/MM/yyyy") : "",
      "วันหมดอายุ": r.expiryDate ? format(parseISO(r.expiryDate), "dd/MM/yyyy") : "",
      "ตำแหน่งจัดเก็บ": r.locationName,
      "Activate Windows": r.activateWindows,
      "Specification": r.specification,
      "Lot Number 1": r.lotNumber1,
      "Lot Number 2": r.lotNumber2,
      "Order For Project": r.orderForProject,
    }));
    rows.forEach((row, i) => { row["ลำดับ"] = String(i + 1); });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Media Players");
    XLSX.writeFile(wb, `media-player-report-${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("ส่งออก Excel สำเร็จ");
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    return price.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          <p className="text-muted-foreground">แสดงรายการ Media Player แบบ 1 เครื่องต่อ 1 แถว โดยรวม S/N 1 และ S/N 2 ไว้ในแถวเดียว</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">ทั้งหมด</p><p className="text-2xl font-bold">{stats.total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Tag className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">จำนวนรหัส (Prefix)</p><p className="text-2xl font-bold">{stats.uniquePrefixes}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><CheckCircle className="w-5 h-5 text-chart-2" /></div>
          <div><p className="text-xs text-muted-foreground">ติดตั้งแล้ว</p><p className="text-2xl font-bold">{stats.installed}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Package className="w-5 h-5 text-chart-1" /></div>
          <div><p className="text-xs text-muted-foreground">ในคลัง</p><p className="text-2xl font-bold">{stats.inStock}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">เสีย/ชำรุด</p><p className="text-2xl font-bold">{stats.defective}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Wrench className="w-5 h-5 text-chart-4" /></div>
          <div><p className="text-xs text-muted-foreground">รอตรวจสอบ</p><p className="text-2xl font-bold">{stats.pendingInspection}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">พักรอประเมิน</p><p className="text-2xl font-bold">{stats.pendingAssessment}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"><Wrench className="w-5 h-5 text-cyan-600" /></div>
          <div><p className="text-xs text-muted-foreground">กำลังซ่อม</p><p className="text-2xl font-bold">{stats.underRepair}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center"><Shield className="w-5 h-5 text-rose-700" /></div>
          <div><p className="text-xs text-muted-foreground">รอเคลม</p><p className="text-2xl font-bold">{stats.inClaim}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Refurbished</p><p className="text-2xl font-bold">{stats.refurbished}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Building2 className="w-5 h-5 text-chart-3" /></div>
          <div><p className="text-xs text-muted-foreground">จำนวนยี่ห้อ</p><p className="text-2xl font-bold">{stats.uniqueBrands}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Shield className="w-5 h-5 text-chart-5" /></div>
          <div><p className="text-xs text-muted-foreground">ประกันใกล้หมด (90 วัน)</p><p className="text-2xl font-bold">{stats.warrantyExpiring}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Layers className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">ฝ่าย</p><p className="text-2xl font-bold">{stats.uniqueDepartments}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><FolderKanban className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Order for Project</p><p className="text-2xl font-bold">{stats.uniqueProjects}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[160px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="ค้นหา S/N..." value={snSearch} onChange={(e) => setSnSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="ค้นหา รหัส, ชื่อ, ยี่ห้อ, PO, Asset Code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Select value={codePrefixFilter} onValueChange={setCodePrefixFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="รหัส (Prefix)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกรหัส</SelectItem>
                {codePrefixes.map((prefix) => (<SelectItem key={prefix} value={prefix}>{prefix}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="สภาพ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสภาพ</SelectItem>
                {CONDITION_OPTIONS.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="สถานะ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="installed">ติดตั้ง</SelectItem>
                <SelectItem value="in_stock">ในคลัง</SelectItem>
                
                <SelectItem value="pending_assessment">พักรอประเมิน</SelectItem>
                <SelectItem value="under_repair">กำลังซ่อม</SelectItem>
                <SelectItem value="in_claim">รอเคลม</SelectItem>
                <SelectItem value="refurbished">Refurbished</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ฝ่าย" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((d: string) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ประเภทอุปกรณ์" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                <SelectItem value="MEDIA_PLAYER">Media Player</SelectItem>
                <SelectItem value="MONITOR">จอภาพ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subMediaTypeFilter} onValueChange={setSubMediaTypeFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sub Media Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุก Sub Media Type</SelectItem>
                {SUB_MEDIA_TYPES.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="บริษัท" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบริษัท</SelectItem>
                {companyNames.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="ยี่ห้อ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกยี่ห้อ</SelectItem>
                {brands.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Order for Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกโครงการ</SelectItem>
                {projectNames.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
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
            <TooltipProvider>
              <div
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  // Find the actual scrollable container (Table's inner overflow div)
                  const wrapper = e.currentTarget;
                  const scrollEl = wrapper.querySelector('.overflow-auto, [class*="overflow-auto"]') as HTMLElement || wrapper;
                  const startX = e.pageX;
                  const startScroll = scrollEl.scrollLeft;
                  const onMove = (ev: MouseEvent) => { scrollEl.scrollLeft = startScroll - (ev.pageX - startX); };
                  const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); wrapper.style.removeProperty("user-select"); };
                  wrapper.style.userSelect = "none";
                  document.addEventListener("mousemove", onMove);
                  document.addEventListener("mouseup", onUp);
                }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[50px]">#</TableHead>
                      <TableHead className="min-w-[60px]">ภาพ</TableHead>
                      <TableHead className="min-w-[130px]">รหัส</TableHead>
                      <TableHead className="min-w-[130px]">ชื่อ</TableHead>
                      <TableHead className="min-w-[140px]">ชื่อเครื่อง (Name)</TableHead>
                      <TableHead className="min-w-[120px]">S/N</TableHead>
                      <TableHead className="min-w-[80px]">สภาพ</TableHead>
                      <TableHead className="min-w-[80px]">สถานะ</TableHead>
                      <TableHead className="min-w-[200px]">ป้ายปัจจุบัน</TableHead>
                      <TableHead className="min-w-[110px]">ฝ่าย</TableHead>
                      <TableHead className="min-w-[110px]">ประเภท</TableHead>
                      <TableHead className="min-w-[120px]">Sub Media Type</TableHead>
                      <TableHead className="min-w-[110px]">บริษัท</TableHead>
                      <TableHead className="min-w-[100px] text-right">ราคา/ชิ้น</TableHead>
                      <TableHead className="min-w-[100px]">เลข PO</TableHead>
                      <TableHead className="min-w-[130px]">Item No. (PO)</TableHead>
                      <TableHead className="min-w-[100px] text-right">ระยะรับประกัน (ปี)</TableHead>
                      <TableHead className="min-w-[130px]">ผู้ดูแล</TableHead>
                      <TableHead className="min-w-[110px]">รหัสทรัพย์สิน</TableHead>
                      <TableHead className="min-w-[110px]">Equipment ID</TableHead>
                      <TableHead className="min-w-[100px] text-right">ค่าเสื่อมเหลือ (เดือน)</TableHead>
                      <TableHead className="min-w-[110px]">วันหมดประกัน</TableHead>
                      <TableHead className="min-w-[110px]">วันหมดอายุ</TableHead>
                      <TableHead className="min-w-[130px]">ตำแหน่งจัดเก็บ</TableHead>
                      <TableHead className="min-w-[110px]">Activate Windows</TableHead>
                      <TableHead className="min-w-[110px]">Specification</TableHead>
                      <TableHead className="min-w-[100px]">Lot No.1</TableHead>
                      <TableHead className="min-w-[100px]">Lot No.2</TableHead>
                      <TableHead className="min-w-[150px]">Order For Project</TableHead>
                      <TableHead className="text-center min-w-[70px]">Profile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={30} className="text-center py-10 text-muted-foreground">
                          ไม่พบข้อมูล Media Player
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((r, idx) => {
                        const rowNum = (currentPage - 1) * pageSize + idx + 1;
                        return (
                          <TableRow key={r.key} className="hover:bg-muted/30">
                            <TableCell className="text-muted-foreground">{rowNum}</TableCell>
                            <TableCell>
                              {r.imageUrl ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => setLightboxImages(imagesByPlayer[r.playerId]?.length ? imagesByPlayer[r.playerId] : [r.imageUrl!])} className="cursor-pointer">
                                      <img src={r.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="p-0">
                                    <img src={r.imageUrl} alt="" className="w-48 h-48 rounded object-cover" />
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                              {!r.imageUrl ? (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-mono font-medium">{r.code}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell>{r.remoteName || "-"}</TableCell>
                            <TableCell className="text-sm whitespace-pre-line">{r.serialNumber}</TableCell>
                            <TableCell>{getConditionBadge(r.condition)}</TableCell>
                            <TableCell>
                              {(() => {
                                const meta = getStatusMeta(r);
                                return <Badge variant="outline" className={meta.className}>{meta.label}</Badge>;
                              })()}
                            </TableCell>
                            <TableCell className="text-sm">{r.billboardLabel}</TableCell>
                            <TableCell>{r.department || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={r.deviceType === "MONITOR" ? "border-purple-400 text-purple-700 bg-purple-50" : "border-blue-400 text-blue-700 bg-blue-50"}>
                                {r.deviceType === "MONITOR" ? "📺 จอภาพ" : "🖥️ Media Player"}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.subMediaType ? <Badge variant="outline" className="font-mono text-xs">{r.subMediaType}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell>{r.company || "-"}</TableCell>
                            <TableCell className="text-right font-mono">{formatPrice(r.price)}</TableCell>
                            <TableCell>{r.poNumber || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{r.poItemNo || "-"}</TableCell>
                            <TableCell className="text-right">{r.warrantyYears != null ? r.warrantyYears : "-"}</TableCell>
                            <TableCell className="text-sm">{r.assetCaretaker || "-"}</TableCell>
                            <TableCell>{r.assetCode || "-"}</TableCell>
                            <TableCell>{r.equipmentIdCode || "-"}</TableCell>
                            <TableCell className="text-right">
                              {r.depreciationRemaining !== null ? (
                                <span className={r.depreciationRemaining <= 0 ? "text-destructive font-semibold" : ""}>
                                  {r.depreciationRemaining}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              {r.warrantyExpiry ? (
                                <span className={r.warrantyDaysLeft !== null && r.warrantyDaysLeft <= 90 ? (r.warrantyDaysLeft <= 0 ? "text-destructive font-semibold" : "text-amber-600 font-medium") : ""}>
                                  {format(parseISO(r.warrantyExpiry), "dd/MM/yyyy")}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              {r.expiryDate ? (
                                <span className={r.expiryDaysLeft !== null && r.expiryDaysLeft <= 90 ? (r.expiryDaysLeft <= 0 ? "text-destructive font-semibold" : "text-amber-600 font-medium") : ""}>
                                  {format(parseISO(r.expiryDate), "dd/MM/yyyy")}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{r.locationName || "-"}</TableCell>
                            <TableCell>{r.activateWindows || "-"}</TableCell>
                            <TableCell>{r.specification || "-"}</TableCell>
                            <TableCell>{r.lotNumber1 || "-"}</TableCell>
                            <TableCell>{r.lotNumber2 || "-"}</TableCell>
                            <TableCell>{r.orderForProject || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedPlayerId(r.playerId)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
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
            </TooltipProvider>
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
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["media-player-report-v2"] });
            queryClient.invalidateQueries({ queryKey: ["media-player-report-receipts"] });
          }}
        />
      )}

      {/* Image Lightbox Dialog */}
      {lightboxImages && (
        <Dialog open onOpenChange={() => setLightboxImages(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>ดูรูปภาพ</span>
                <Button size="sm" variant="outline" asChild>
                  <a href={lightboxImages[0]} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              <img src={lightboxImages[0]} alt="รูปภาพ Media Player" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Profile Dialog ──────────────────────────────────────────────
function MediaPlayerProfileDialog({
  playerId,
  onClose,
  onOpenFullProfile,
  onUpdated,
}: {
  playerId: string;
  onClose: () => void;
  onOpenFullProfile: (id: string) => void;
  onUpdated?: () => void;
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

    // Journey (history + current + fallback from media_players)
    const { data: history } = await supabase
      .from("billboard_equipment_history")
      .select("billboard_id, installation_date, uninstall_date, uninstall_reason, quantity")
      .or(`equipment_id.eq.${playerId}`);

    const { data: currentInstalls } = await supabase
      .from("billboard_equipment")
      .select("billboard_id, installation_date, quantity")
      .eq("equipment_id", playerId);

    const journeyData: BillboardJourney[] = [];
    const allBbIds = new Set<string>();
    (history || []).forEach((h: any) => allBbIds.add(h.billboard_id));
    (currentInstalls || []).forEach((c: any) => allBbIds.add(c.billboard_id));
    if ((p as any).billboard_id) allBbIds.add((p as any).billboard_id);

    let bbMap = new Map<string, any>();
    if (allBbIds.size > 0) {
      const { data: billboards } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name")
        .in("id", [...allBbIds]);
      bbMap = new Map((billboards || []).map((b: any) => [b.id, b]));
    }

    for (const h of (history || []) as any[]) {
      const bb = bbMap.get(h.billboard_id);
      const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : h.billboard_id;
      const days = h.installation_date && h.uninstall_date ? differenceInDays(parseISO(h.uninstall_date), parseISO(h.installation_date)) : null;
      journeyData.push({ billboard_id: h.billboard_id, billboard_name: bbName, installation_date: h.installation_date, uninstall_date: h.uninstall_date, duration_days: days, uninstall_reason: h.uninstall_reason, quantity: h.quantity });
    }

    for (const c of (currentInstalls || []) as any[]) {
      const bb = bbMap.get(c.billboard_id);
      const bbName = bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : c.billboard_id;
      const instDate = c.installation_date || (p as any).install_date;
      const days = instDate ? differenceInDays(new Date(), parseISO(instDate)) : null;
      journeyData.push({ billboard_id: c.billboard_id, billboard_name: bbName, installation_date: instDate, uninstall_date: null, duration_days: days, uninstall_reason: null, quantity: c.quantity });
    }

    if (journeyData.length === 0 && (p as any).billboard_id && (p as any).install_date) {
      const bb = bbMap.get((p as any).billboard_id);
      const bbName = bb
        ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id)
        : (p as any).billboard_id;
      journeyData.push({
        billboard_id: (p as any).billboard_id,
        billboard_name: bbName,
        installation_date: (p as any).install_date,
        uninstall_date: null,
        duration_days: differenceInDays(new Date(), parseISO((p as any).install_date)),
        uninstall_reason: null,
        quantity: 1,
      });
    }

    journeyData.sort((a, b) => {
      if (!a.uninstall_date && b.uninstall_date) return -1;
      if (a.uninstall_date && !b.uninstall_date) return 1;
      return (b.installation_date || "").localeCompare(a.installation_date || "");
    });
    setJourneys(journeyData);

    // Movements
    const { data: movs } = await supabase
      .from("stock_movements")
      .select("id, created_at, movement_type, quantity, stock_before, stock_after, reference_document, notes, item_condition")
      .eq("equipment_id", playerId)
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifecycle</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessTracker steps={lifecycleSteps} />
              </CardContent>
            </Card>

            <SummaryCards player={player} journeys={journeys} />

            <Tabs defaultValue="journey" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
                <TabsTrigger value="journey">ประวัติติดตั้ง</TabsTrigger>
                <TabsTrigger value="movements">Stock Card</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <GeneralInfoTab player={player} modelName={modelName} onUpdated={() => { loadPlayer(); onUpdated?.(); }} />
              </TabsContent>
              <TabsContent value="journey">
                <JourneyTab player={player} journeys={journeys} />
              </TabsContent>
              <TabsContent value="movements">
                <MovementTab movements={movements} playerCode={player.code} serialNumber1={player.serial_number_1} serialNumber2={player.serial_number_2} />
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
