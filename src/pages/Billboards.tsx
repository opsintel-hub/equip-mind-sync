import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import BillboardForm from "@/components/billboard/BillboardForm";
import BillboardFilters from "@/components/billboard/BillboardFilters";
import BillboardExport from "@/components/billboard/BillboardExport";
import { BillboardSummaryCards } from "@/components/billboard/BillboardSummaryCards";
import { DraggableScrollTable } from "@/components/ui/draggable-scroll-table";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [20, 50, 100];
type BillboardRecord = Tables<"billboards">;

type BillboardColumn = {
  key: keyof BillboardRecord;
  label: string;
  minWidth?: string;
  sticky?: boolean;
  align?: "left" | "right";
};

const BILLBOARD_COLUMNS: BillboardColumn[] = [
  { key: "old_code", label: "OldCode", minWidth: "min-w-[180px]", sticky: true },
  { key: "equipment_id", label: "EquipmentID", minWidth: "min-w-[180px]" },
  { key: "id", label: "ID", minWidth: "min-w-[260px]" },
  { key: "bkk_upc", label: "BKK UPC", minWidth: "min-w-[140px]" },
  { key: "department", label: "Department", minWidth: "min-w-[170px]" },
  { key: "media_class", label: "Media Class", minWidth: "min-w-[160px]" },
  { key: "media_segment", label: "Media Segment", minWidth: "min-w-[170px]" },
  { key: "media_type", label: "Media Type", minWidth: "min-w-[180px]" },
  { key: "description", label: "Description", minWidth: "min-w-[340px]" },
  { key: "region", label: "Region", minWidth: "min-w-[130px]" },
  { key: "district", label: "District", minWidth: "min-w-[140px]" },
  { key: "territory", label: "Territory", minWidth: "min-w-[150px]" },
  { key: "location_name", label: "Location Name", minWidth: "min-w-[260px]" },
  { key: "route_install_demolish", label: "Route Install/Demolish", minWidth: "min-w-[220px]" },
  { key: "route_monitoring", label: "Route Monitoring", minWidth: "min-w-[180px]" },
  { key: "route_pm", label: "Route PM", minWidth: "min-w-[150px]" },
  { key: "route_report_photo", label: "Route Report Photo", minWidth: "min-w-[190px]" },
  { key: "target_monitoring", label: "Target Monitoring", minWidth: "min-w-[190px]" },
  { key: "extra_1", label: "Extra 1", minWidth: "min-w-[140px]" },
  { key: "extra_2", label: "Extra 2", minWidth: "min-w-[140px]" },
  { key: "extra_3", label: "Extra 3", minWidth: "min-w-[140px]" },
  { key: "size", label: "Size", minWidth: "min-w-[120px]" },
  { key: "status", label: "Status", minWidth: "min-w-[130px]" },
  { key: "notes", label: "Notes", minWidth: "min-w-[260px]" },
  { key: "created_by", label: "Created By", minWidth: "min-w-[220px]" },
  { key: "created_at", label: "Created At", minWidth: "min-w-[190px]" },
  { key: "updated_at", label: "Updated At", minWidth: "min-w-[190px]" },
];

const formatCellValue = (billboard: BillboardRecord, column: BillboardColumn) => {
  const value = billboard[column.key];

  if (column.key === "status" && typeof value === "string") {
    return null;
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
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
  const [filters, setFilters] = useState({
    region: "",
    district: "",
    department: "",
    mediaType: "",
    status: "",
    locationName: "",
    equipmentStatus: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ region: "", district: "", department: "", mediaType: "", status: "", locationName: "", equipmentStatus: "" });
    setCurrentPage(1);
  };

  const { data: paginatedData, isLoading, refetch } = useQuery({
    queryKey: ["billboards", searchTerm, currentPage, pageSize, filters],
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
            equipment:equipment_id (
              expiry_date,
              warranty_expiry_date
            )
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
        .order("old_code", { ascending: true })
        .range(from, to);

      if (searchTerm) {
        query = query.or(`equipment_id.ilike.%${searchTerm}%,old_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`);
      }
      if (filters.region) query = query.eq("region", filters.region);
      if (filters.district) query = query.eq("district", filters.district);
      if (filters.department) query = query.eq("department", filters.department);
      if (filters.mediaType) query = query.eq("media_type", filters.mediaType);
      if (filters.status) query = query.eq("status", filters.status);
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

  const handleFormSuccess = () => {
    handleFormClose();
    refetch();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">ฐานข้อมูลป้ายโฆษณา</h1>
        <p className="text-muted-foreground">จัดการข้อมูลป้ายโฆษณาและอุปกรณ์ที่ติดตั้ง</p>
      </div>

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
              <div className="flex gap-2">
                <BillboardExport currentFilters={filters} />
                {isSuperAdmin && (
                  <Button onClick={() => setIsFormOpen(true)} data-no-drag>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มป้าย
                  </Button>
                )}
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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลดข้อมูล...</div>
          ) : !billboards?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบข้อมูลป้ายโฆษณา - กดปุ่ม "เพิ่มป้าย" เพื่อเริ่มต้น
            </div>
          ) : (
            <>
              <DraggableScrollTable>
                <Table className="w-max min-w-full border-separate border-spacing-0">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      {BILLBOARD_COLUMNS.map((column) => (
                        <TableHead
                          key={String(column.key)}
                          className={[
                            "top-0 z-20 bg-muted whitespace-nowrap border-b",
                            column.minWidth || "min-w-[140px]",
                            column.sticky ? "sticky left-0 z-30 shadow-[2px_0_4px_-2px_hsl(var(--border))]" : "sticky",
                            column.align === "right" ? "text-right" : "text-left",
                          ].join(" ")}
                        >
                          {column.label}
                        </TableHead>
                      ))}
                      <TableHead className="sticky top-0 z-20 bg-muted text-right min-w-[120px] border-b">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billboards.map((billboard) => (
                      <TableRow key={billboard.id} className="group hover:bg-muted/30">
                        {BILLBOARD_COLUMNS.map((column) => (
                          <TableCell
                            key={`${billboard.id}-${String(column.key)}`}
                            className={[
                              "align-top whitespace-normal break-words border-b",
                              column.minWidth || "min-w-[140px]",
                              column.sticky ? "sticky left-0 z-10 bg-background group-hover:bg-muted/30 shadow-[2px_0_4px_-2px_hsl(var(--border))]" : "",
                            ].join(" ")}
                          >
                            {column.key === "status"
                              ? getStatusBadge(billboard.status)
                              : formatCellValue(billboard, column)}
                          </TableCell>
                        ))}
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
                    ))}
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
            <DialogTitle>
              {selectedBillboard ? "แก้ไขข้อมูลป้าย" : "เพิ่มป้ายใหม่"}
            </DialogTitle>
          </DialogHeader>
          <BillboardForm
            billboard={selectedBillboard}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billboards;
