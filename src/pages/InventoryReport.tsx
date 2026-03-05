import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Package, AlertTriangle, XCircle, CheckCircle, Monitor, ImageIcon, Wrench, ArrowRightLeft, MapPin } from "lucide-react";
import { InventoryFilters, InventoryFiltersState, getConditionLabel, getConditionBadgeClass } from "@/components/inventory/InventoryFilters";
import { EquipmentImageViewer } from "@/components/equipment/EquipmentImageViewer";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Removed hardcoded ITEMS_PER_PAGE - now using useTablePagination hook
const DEFAULT_ADVANCE_DAYS = 30; // Default days to consider as "near expiry/warranty"

// Unified inventory item type
interface InventoryItem {
  id: string;
  code: string;
  name: string;
  serial_number?: string | null;
  category: string;
  brand: string | null;
  department: string | null;
  quantity_in_stock: number;
  min_stock_level: number;
  unit: string;
  unit_price: number;
  company_id: string | null;
  location_id: string | null;
  subcategory_id: string | null;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  companies: { id: string; name: string; code: string } | null;
  locations: { id: string; name: string; code: string; warehouse_id: string; warehouses: { id: string; name: string; code: string } | null } | null;
  subcategories: { id: string; name: string; category_id: string } | null;
  item_type: 'equipment' | 'tools' | 'media_player';
  item_condition: string;
  // Issue tracking fields
  issue_status?: 'in_stock' | 'issued' | 'partial';
  issue_purpose?: string | null;
  issue_billboard_code?: string | null;
  issue_requester?: string | null;
  issued_quantity?: number;
}

export default function InventoryReport() {
  const [filters, setFilters] = useState<InventoryFiltersState>({
    companyId: "",
    department: "",
    categoryId: "",
    subcategoryId: "",
    warehouseId: "",
    locationId: "",
    stockStatus: "",
    search: "",
    itemType: "",
    statusFilters: [],
    advanceDays: DEFAULT_ADVANCE_DAYS,
    issueStatus: "",
    itemCondition: "",
  });
  // Pagination is handled by useTablePagination below

  // Fetch categories for mapping
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // Create category name map
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  // Fetch equipment with related data
  const { data: equipmentData = [], isLoading: isLoadingEquipment } = useQuery({
    queryKey: ["inventory-report-equipment", filters],
    queryFn: async () => {
      // Skip if filtering for media players or tools only
      if (filters.itemType === "media_player" || filters.itemType === "tools") {
        return [];
      }

      let query = supabase
        .from("equipment")
        .select(`
          id,
          code,
          name,
          category,
          brand,
          department,
          quantity_in_stock,
          min_stock_level,
          unit,
          unit_price,
          company_id,
          location_id,
          subcategory_id,
          expiry_date,
          warranty_expiry_date,
          item_condition,
          companies:company_id (id, name, code),
          locations:location_id (id, name, code, warehouse_id, warehouses:warehouse_id (id, name, code)),
          subcategories:subcategory_id (id, name, category_id)
        `)
        .eq("is_active", true)
        .order("code");

      // Apply filters
      if (filters.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters.department) {
        query = query.eq("department", filters.department);
      }
      if (filters.subcategoryId) {
        query = query.eq("subcategory_id", filters.subcategoryId);
      }
      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters.search) {
        query = query.or(
          `code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform to unified format
      return (data || []).map((item): InventoryItem => ({
        ...item,
        quantity_in_stock: item.quantity_in_stock || 0,
        min_stock_level: item.min_stock_level || 0,
        expiry_date: item.expiry_date,
        warranty_expiry_date: item.warranty_expiry_date,
        item_type: 'equipment' as const,
        item_condition: item.item_condition || 'normal',
      }));
    },
    enabled: filters.itemType !== "media_player" && filters.itemType !== "tools",
  });

  // Fetch tools with related data
  const { data: toolsData = [], isLoading: isLoadingTools } = useQuery({
    queryKey: ["inventory-report-tools", filters],
    queryFn: async () => {
      // Skip if filtering for equipment or media players only
      if (filters.itemType === "equipment" || filters.itemType === "media_player") {
        return [];
      }

      let query = supabase
        .from("tools")
        .select(`
          id,
          code,
          name,
          brand,
          department,
          current_quantity,
          unit,
          unit_price,
          company_id,
          location_id,
          expiry_date,
          warranty_expiry_date,
          companies:company_id (id, name, code),
          locations:location_id (id, name, code, warehouse_id, warehouses:warehouse_id (id, name, code)),
          tool_categories:tool_category_id (id, name)
        `)
        .eq("is_active", true)
        .order("code");

      // Apply filters
      if (filters.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters.department) {
        query = query.eq("department", filters.department);
      }
      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters.search) {
        query = query.or(
          `code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform to unified format
      return (data || []).map((item: any): InventoryItem => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.tool_categories?.name || "เครื่องมือ",
        brand: item.brand,
        department: item.department,
        quantity_in_stock: item.current_quantity || 0,
        min_stock_level: 0,
        unit: item.unit,
        unit_price: item.unit_price || 0,
        company_id: item.company_id,
        location_id: item.location_id,
        subcategory_id: null,
        expiry_date: item.expiry_date,
        warranty_expiry_date: item.warranty_expiry_date,
        companies: item.companies as InventoryItem["companies"],
        locations: item.locations as InventoryItem["locations"],
        subcategories: null,
        item_type: 'tools' as const,
        item_condition: 'normal',
      }));
    },
    enabled: filters.itemType !== "equipment" && filters.itemType !== "media_player",
  });

  // Fetch media players with related data
  const { data: mediaPlayerData = [], isLoading: isLoadingMediaPlayers } = useQuery({
    queryKey: ["inventory-report-media-players", filters],
    queryFn: async () => {
      // Skip if filtering for equipment or tools only
      if (filters.itemType === "equipment" || filters.itemType === "tools") {
        return [];
      }

      let query = supabase
        .from("media_players")
        .select(`
          id,
          code,
          name,
          brand,
          department,
          quantity,
          unit,
          unit_price,
          company_id,
          location_id,
          warranty_expiry_date,
          item_condition,
          companies:company_id (id, name, code),
          locations:location_id (id, name, code, warehouse_id, warehouses:warehouse_id (id, name, code))
        `)
        .eq("is_active", true)
        .order("code");

      // Apply filters
      if (filters.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters.department) {
        query = query.eq("department", filters.department);
      }
      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters.search) {
        query = query.or(
          `code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,serial_number_1.ilike.%${filters.search}%,serial_number_2.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform to unified format
      return (data || []).map((item): InventoryItem => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: "Media Player",
        brand: item.brand,
        department: item.department,
        quantity_in_stock: item.quantity || 0,
        min_stock_level: 0, // Media players don't have min stock
        unit: item.unit,
        unit_price: item.unit_price || 0,
        company_id: item.company_id,
        location_id: item.location_id,
        subcategory_id: null,
        expiry_date: null, // Media players don't have expiry date
        warranty_expiry_date: item.warranty_expiry_date,
        companies: item.companies as InventoryItem["companies"],
        locations: item.locations as InventoryItem["locations"],
        subcategories: null,
        item_type: 'media_player' as const,
        item_condition: item.item_condition || 'normal',
      }));
    },
    enabled: filters.itemType !== "equipment" && filters.itemType !== "tools",
  });

  // Fetch issue data for equipment
  const { data: issueData = [] } = useQuery({
    queryKey: ["inventory-issue-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select(`
          id,
          equipment_id,
          status,
          purpose,
          purpose_id,
          billboard_id,
          requester_name,
          issued_quantity,
          quantity,
          billboards:billboard_id (id, equipment_id)
        `)
        .in("status", ["issued", "approved", "partial", "waiting_stock"]);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch billboards to get their codes
  const { data: billboards = [] } = useQuery({
    queryKey: ["billboards-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, equipment_id");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch equipment for billboard codes
  const { data: billboardEquipment = [] } = useQuery({
    queryKey: ["billboard-equipment-codes"],
    queryFn: async () => {
      const billboardEquipmentIds = billboards.map((b) => b.equipment_id);
      if (billboardEquipmentIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code")
        .in("id", billboardEquipmentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: billboards.length > 0,
  });

  // Create a map of equipment ID to issue info
  const issueMap = useMemo(() => {
    const map: Record<string, {
      status: string;
      purpose: string | null;
      billboard_code: string | null;
      requester: string | null;
      issued_quantity: number;
    }> = {};

    issueData.forEach((issue: any) => {
      if (!issue.equipment_id) return;
      
      // Find billboard code if billboard_id exists
      let billboardCode: string | null = null;
      if (issue.billboard_id) {
        const billboard = billboards.find((b) => b.id === issue.billboard_id);
        if (billboard) {
          const eqCode = billboardEquipment.find((e) => e.id === billboard.equipment_id);
          billboardCode = eqCode?.code || null;
        }
      }

      // Aggregate issued quantities per equipment
      if (!map[issue.equipment_id]) {
        map[issue.equipment_id] = {
          status: issue.status,
          purpose: issue.purpose,
          billboard_code: billboardCode,
          requester: issue.requester_name,
          issued_quantity: issue.issued_quantity || issue.quantity || 0,
        };
      } else {
        // Add to existing
        map[issue.equipment_id].issued_quantity += issue.issued_quantity || issue.quantity || 0;
      }
    });

    return map;
  }, [issueData, billboards, billboardEquipment]);

  // Combine equipment, tools and media player data with issue information
  const combinedData = useMemo(() => {
    const allData = [...equipmentData, ...toolsData, ...mediaPlayerData];
    
    // Enhance with issue data
    return allData.map((item): InventoryItem => {
      const issueInfo = issueMap[item.id];
      
      let issueStatus: 'in_stock' | 'issued' | 'partial' = 'in_stock';
      if (issueInfo) {
        if (issueInfo.issued_quantity >= item.quantity_in_stock + issueInfo.issued_quantity) {
          issueStatus = 'issued';
        } else if (issueInfo.issued_quantity > 0) {
          issueStatus = 'partial';
        }
      }
      
      return {
        ...item,
        issue_status: issueStatus,
        issue_purpose: issueInfo?.purpose || null,
        issue_billboard_code: issueInfo?.billboard_code || null,
        issue_requester: issueInfo?.requester || null,
        issued_quantity: issueInfo?.issued_quantity || 0,
      };
    });
  }, [equipmentData, toolsData, mediaPlayerData, issueMap]);

  const isLoading = isLoadingEquipment || isLoadingTools || isLoadingMediaPlayers;

  // Get advance days from filters or use default
  const advanceDays = filters.advanceDays || DEFAULT_ADVANCE_DAYS;

  // Helper functions for status checks
  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isWarrantyExpired = (warrantyDate: string | null) => {
    if (!warrantyDate) return false;
    return new Date(warrantyDate) < new Date();
  };

  const isNearExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= advanceDays;
  };

  const isNearWarranty = (warrantyDate: string | null) => {
    if (!warrantyDate) return false;
    const warranty = new Date(warrantyDate);
    const now = new Date();
    const diffDays = Math.ceil((warranty.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= advanceDays;
  };

  // Apply client-side filters and transform data
  const filteredData = useMemo(() => {
    if (!combinedData) return [];

    return combinedData.filter((item) => {
      // Filter by category (need to check subcategory's category_id)
      if (filters.categoryId) {
        // Media players and tools don't have subcategories, so skip them if category filter is set
        if (item.item_type !== 'equipment') return false;
        
        const subcat = item.subcategories;
        if (!subcat || subcat.category_id !== filters.categoryId) {
          // Also check if category text matches category name
          const categoryName = categoryMap[filters.categoryId];
          if (item.category !== categoryName) {
            return false;
          }
        }
      }

      // Filter by subcategory (only equipment have subcategories)
      if (filters.subcategoryId && item.item_type !== 'equipment') {
        return false;
      }

      // Filter by warehouse (through location)
      if (filters.warehouseId) {
        const location = item.locations;
        if (!location || location.warehouse_id !== filters.warehouseId) {
          return false;
        }
      }

      // Filter by stock status
      if (filters.stockStatus) {
        const qty = item.quantity_in_stock;
        const minStock = item.min_stock_level;

        if (filters.stockStatus === "out" && qty > 0) return false;
        if (filters.stockStatus === "low" && (qty === 0 || qty > minStock)) return false;
        if (filters.stockStatus === "normal" && qty <= minStock) return false;
      }

      // Apply multi-select status filters
      if (filters.statusFilters && filters.statusFilters.length > 0) {
        const matchesAnyStatusFilter = filters.statusFilters.some((statusFilter) => {
          switch (statusFilter) {
            case "expired":
              return item.item_type !== 'media_player' && isExpired(item.expiry_date);
            case "warranty_expired":
              return isWarrantyExpired(item.warranty_expiry_date);
            case "near_expiry":
              return item.item_type !== 'media_player' && isNearExpiry(item.expiry_date);
            case "near_warranty":
              return isNearWarranty(item.warranty_expiry_date);
            case "out_of_stock":
              return item.quantity_in_stock === 0;
            default:
              return false;
          }
        });
        if (!matchesAnyStatusFilter) return false;
      }

      // Filter by issue status
      if (filters.issueStatus) {
        if (filters.issueStatus === "in_stock" && item.issue_status !== "in_stock") return false;
        if (filters.issueStatus === "issued" && item.issue_status !== "issued") return false;
        if (filters.issueStatus === "partial" && item.issue_status !== "partial") return false;
      }

      // Filter by item condition
      if (filters.itemCondition) {
        if (item.item_condition !== filters.itemCondition) return false;
      }

      return true;
    });
  }, [combinedData, filters, categoryMap, advanceDays]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(filteredData, 20);

  // Reset page when filters change
  const handleFiltersChange = (newFilters: InventoryFiltersState) => {
    setFilters(newFilters);
    handlePageChange(1);
  };

  // Get stock status
  const getStockStatus = (qty: number, minStock: number) => {
    if (qty === 0) return { label: "หมด", variant: "destructive" as const, icon: XCircle };
    if (qty <= minStock) return { label: "ใกล้หมด", variant: "warning" as const, icon: AlertTriangle };
    return { label: "ปกติ", variant: "default" as const, icon: CheckCircle };
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredData.length;
    const outOfStock = filteredData.filter((item) => (item.quantity_in_stock || 0) === 0).length;
    const lowStock = filteredData.filter((item) => {
      const qty = item.quantity_in_stock || 0;
      const min = item.min_stock_level || 0;
      return qty > 0 && qty <= min;
    }).length;
    const normal = total - outOfStock - lowStock;
    const totalValue = filteredData.reduce(
      (sum, item) => sum + (item.quantity_in_stock || 0) * (item.unit_price || 0),
      0
    );

    return { total, outOfStock, lowStock, normal, totalValue };
  }, [filteredData]);

  // Export to Excel
  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    const exportData = filteredData.map((item) => {
      const company = item.companies;
      const location = item.locations;
      const subcategory = item.subcategories;
      const status = getStockStatus(
        item.quantity_in_stock,
        item.min_stock_level
      );

      const itemTypeLabel = item.item_type === 'media_player' ? "Media Player" : item.item_type === 'tools' ? "เครื่องมือ" : "อะไหล่";
      const issueStatusLabel = item.issue_status === 'issued' ? "ถูกเบิกออก" : item.issue_status === 'partial' ? "เบิกบางส่วน" : "อยู่ในคลัง";
      
      return {
        ประเภท: itemTypeLabel,
        รหัส: item.code,
        ชื่อ: item.name,
        หมวดหมู่: item.category,
        หมวดหมู่ย่อย: subcategory?.name || "-",
        ยี่ห้อ: item.brand || "-",
        บริษัท: company ? `${company.code} - ${company.name}` : "-",
        ฝ่าย: item.department || "-",
        คลังสินค้า: location?.warehouses
          ? `${location.warehouses.code} - ${location.warehouses.name}`
          : "-",
        ตำแหน่งจัดเก็บ: location ? `${location.code} - ${location.name}` : "-",
        จำนวนคงเหลือ: item.quantity_in_stock,
        หน่วย: item.unit,
        "Min Stock": item.min_stock_level,
        ราคาต่อหน่วย: item.unit_price,
        มูลค่ารวม: item.quantity_in_stock * item.unit_price,
        "สถานะ Stock": status.label,
        "สภาพสินค้า": getConditionLabel(item.item_condition),
        สถานะการเบิก: issueStatusLabel,
        จำนวนที่เบิก: item.issued_quantity || 0,
        วัตถุประสงค์: item.issue_purpose || "-",
        "ป้าย/Billboard": item.issue_billboard_code || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานสินค้าคงคลัง");
    XLSX.writeFile(wb, `inventory-report-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`Export สำเร็จ ${filteredData.length} รายการ`);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">รายงานสินค้าคงคลัง</h1>
            <p className="text-muted-foreground">
              ดูรายการอะไหล่ทั้งหมดพร้อมกรองตามเงื่อนไขต่างๆ
            </p>
          </div>
          <Button onClick={handleExport} disabled={filteredData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                รายการทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                สถานะปกติ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold text-green-600">
                  {stats.normal.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ใกล้หมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">
                  {stats.lowStock.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                หมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold text-red-600">
                  {stats.outOfStock.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                มูลค่ารวม
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ตัวกรอง</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">รูป</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>หมวดหมู่ย่อย</TableHead>
                    <TableHead>บริษัท</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>คลัง</TableHead>
                    <TableHead>ตำแหน่งจัดเก็บ</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>สถานะ Stock</TableHead>
                    <TableHead>สภาพสินค้า</TableHead>
                    <TableHead>สถานะการเบิก</TableHead>
                    <TableHead>วัตถุประสงค์</TableHead>
                    <TableHead>ป้าย/Billboard</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                       <TableCell colSpan={17} className="text-center py-8">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((item) => {
                      const company = item.companies;
                      const location = item.locations;
                      const subcategory = item.subcategories;
                      const status = getStockStatus(
                        item.quantity_in_stock,
                        item.min_stock_level
                      );
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.item_type === 'equipment' && (
                              <EquipmentImageViewer
                                equipmentId={item.id}
                                equipmentName={item.name}
                                variant="icon"
                              />
                            )}
                            {item.item_type !== 'equipment' && (
                              <span className="text-muted-foreground">
                                <ImageIcon className="h-4 w-4 opacity-30" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.item_type === 'media_player' ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                <Monitor className="h-3 w-3 mr-1" />
                                Media Player
                              </Badge>
                            ) : item.item_type === 'tools' ? (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                <Wrench className="h-3 w-3 mr-1" />
                                เครื่องมือ
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Package className="h-3 w-3 mr-1" />
                                อะไหล่
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.brand && (
                                <div className="text-xs text-muted-foreground">{item.brand}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            {subcategory ? (
                              <span className="text-sm">{subcategory.name}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {company ? (
                              <div className="text-sm">{company.code}</div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.department || "-"}</TableCell>
                          <TableCell>
                            {location?.warehouses ? (
                              <div className="text-sm font-medium">{location.warehouses.code}</div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {location ? (
                              <div className="text-sm">
                                <div>{location.code}</div>
                                <div className="text-xs text-muted-foreground">{location.name}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.quantity_in_stock.toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.min_stock_level.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={status.variant === "warning" ? "outline" : status.variant}
                                className={
                                  status.variant === "warning"
                                    ? "border-yellow-500 text-yellow-600 bg-yellow-50"
                                    : ""
                                }
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              {/* Show expiry/warranty status badges */}
                              {isExpired(item.expiry_date) && (
                                <Badge variant="destructive" className="text-xs">
                                  หมดอายุ
                                </Badge>
                              )}
                              {isWarrantyExpired(item.warranty_expiry_date) && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  หมดประกัน
                                </Badge>
                              )}
                              {isNearExpiry(item.expiry_date) && (
                                <Badge variant="outline" className="text-xs border-red-300 text-red-500">
                                  ใกล้หมดอายุ
                                </Badge>
                              )}
                              {isNearWarranty(item.warranty_expiry_date) && (
                                <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-600">
                                  ใกล้หมดประกัน
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {/* Item Condition Column */}
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getConditionBadgeClass(item.item_condition)}`}>
                              {getConditionLabel(item.item_condition)}
                            </Badge>
                          </TableCell>
                          {/* Issue Status Column */}
                          <TableCell>
                            {item.issue_status === 'issued' ? (
                              <Badge variant="destructive" className="text-xs">
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                ถูกเบิกออก
                              </Badge>
                            ) : item.issue_status === 'partial' ? (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 bg-orange-50">
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                เบิกบางส่วน ({item.issued_quantity})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600 bg-green-50">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                อยู่ในคลัง
                              </Badge>
                            )}
                          </TableCell>
                          {/* Issue Purpose Column */}
                          <TableCell>
                            {item.issue_purpose ? (
                              <span className="text-sm">{item.issue_purpose}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {/* Billboard Column */}
                          <TableCell>
                            {item.issue_billboard_code ? (
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {item.issue_billboard_code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="px-4 pb-3">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
