import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
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
import { Download, Package, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { InventoryFilters, InventoryFiltersState } from "@/components/inventory/InventoryFilters";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 50;

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
  });
  const [currentPage, setCurrentPage] = useState(1);

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
  const { data: equipmentData, isLoading } = useQuery({
    queryKey: ["inventory-report", filters],
    queryFn: async () => {
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
          `code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Apply client-side filters and transform data
  const filteredData = useMemo(() => {
    if (!equipmentData) return [];

    return equipmentData.filter((item) => {
      // Filter by category (need to check subcategory's category_id)
      if (filters.categoryId) {
        const subcat = item.subcategories as { category_id: string } | null;
        if (!subcat || subcat.category_id !== filters.categoryId) {
          // Also check if category text matches category name
          const categoryName = categoryMap[filters.categoryId];
          if (item.category !== categoryName) {
            return false;
          }
        }
      }

      // Filter by warehouse (through location)
      if (filters.warehouseId) {
        const location = item.locations as { warehouse_id: string } | null;
        if (!location || location.warehouse_id !== filters.warehouseId) {
          return false;
        }
      }

      // Filter by stock status
      if (filters.stockStatus) {
        const qty = item.quantity_in_stock || 0;
        const minStock = item.min_stock_level || 0;

        if (filters.stockStatus === "out" && qty > 0) return false;
        if (filters.stockStatus === "low" && (qty === 0 || qty > minStock)) return false;
        if (filters.stockStatus === "normal" && qty <= minStock) return false;
      }

      return true;
    });
  }, [equipmentData, filters, categoryMap]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Reset page when filters change
  const handleFiltersChange = (newFilters: InventoryFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
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
      const company = item.companies as { name: string; code: string } | null;
      const location = item.locations as {
        name: string;
        code: string;
        warehouses: { name: string; code: string } | null;
      } | null;
      const subcategory = item.subcategories as { name: string } | null;
      const status = getStockStatus(
        item.quantity_in_stock || 0,
        item.min_stock_level || 0
      );

      return {
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
        จำนวนคงเหลือ: item.quantity_in_stock || 0,
        หน่วย: item.unit,
        "Min Stock": item.min_stock_level || 0,
        ราคาต่อหน่วย: item.unit_price || 0,
        มูลค่ารวม: (item.quantity_in_stock || 0) * (item.unit_price || 0),
        สถานะ: status.label,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานสินค้าคงคลัง");
    XLSX.writeFile(wb, `inventory-report-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`Export สำเร็จ ${filteredData.length} รายการ`);
  };

  return (
    <DashboardLayout>
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
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>บริษัท</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>คลัง/ตำแหน่ง</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        กำลังโหลด...
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((item) => {
                      const company = item.companies as { name: string; code: string } | null;
                      const location = item.locations as {
                        name: string;
                        code: string;
                        warehouses: { name: string; code: string } | null;
                      } | null;
                      const status = getStockStatus(
                        item.quantity_in_stock || 0,
                        item.min_stock_level || 0
                      );
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={item.id}>
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
                            {company ? (
                              <div className="text-sm">{company.code}</div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.department || "-"}</TableCell>
                          <TableCell>
                            {location ? (
                              <div className="text-sm">
                                {location.warehouses && (
                                  <div className="font-medium">{location.warehouses.code}</div>
                                )}
                                <div className="text-muted-foreground">{location.code}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(item.quantity_in_stock || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {(item.min_stock_level || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} จาก{" "}
                  {filteredData.length.toLocaleString()} รายการ
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
