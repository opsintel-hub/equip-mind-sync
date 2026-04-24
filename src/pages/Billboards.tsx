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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const Billboards = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<Tables<"billboards"> | null>(null);
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
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ region: "", district: "", department: "", mediaType: "", status: "", locationName: "", equipmentStatus: "" });
    setCurrentPage(1);
  };

  // Fetch paginated data with filters
  const { data: paginatedData, isLoading, refetch } = useQuery({
    queryKey: ["billboards", searchTerm, currentPage, pageSize, filters],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // If equipment status filter is active, we need to filter by billboard IDs
      let billboardIdsWithEquipmentIssues: string[] | null = null;
      
      if (filters.equipmentStatus) {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Fetch billboard_equipment with equipment expiry/warranty info
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
              if (eq.expiry_date && eq.expiry_date < today) {
                matchingBillboardIds.add(be.billboard_id);
              }
              break;
            case "warranty_expired":
              if (eq.warranty_expiry_date && eq.warranty_expiry_date < today) {
                matchingBillboardIds.add(be.billboard_id);
              }
              break;
            case "expiring_soon":
              if (eq.expiry_date && eq.expiry_date >= today && eq.expiry_date <= thirtyDaysFromNow) {
                matchingBillboardIds.add(be.billboard_id);
              }
              break;
            case "warranty_expiring_soon":
              if (eq.warranty_expiry_date && eq.warranty_expiry_date >= today && eq.warranty_expiry_date <= thirtyDaysFromNow) {
                matchingBillboardIds.add(be.billboard_id);
              }
              break;
          }
        });
        
        billboardIdsWithEquipmentIssues = Array.from(matchingBillboardIds);
        
        // If no matching billboards, return empty result
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
      if (billboardIdsWithEquipmentIssues) {
        query = query.in("id", billboardIdsWithEquipmentIssues);
      }

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

  const handleEdit = (billboard: Tables<"billboards">) => {
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
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มป้าย
                </Button>
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
              ไม่พบข้อมูลป้ายโฆษณา - เริ่มต้นด้วยการ "นำเข้า Excel" หรือ "เพิ่มป้าย"
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>OldCode</TableHead>
                      <TableHead>EquipmentID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>MediaType</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Territory</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billboards?.map((billboard) => (
                      <TableRow key={billboard.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{billboard.old_code || "-"}</TableCell>
                        <TableCell className="font-medium text-primary">{billboard.equipment_id}</TableCell>
                        <TableCell>{billboard.department || "-"}</TableCell>
                        <TableCell>{billboard.media_type || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{billboard.description || "-"}</TableCell>
                        <TableCell>{billboard.region || "-"}</TableCell>
                        <TableCell>{billboard.territory || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{billboard.location_name || "-"}</TableCell>
                        <TableCell>{(billboard as any).size || "-"}</TableCell>
                        <TableCell>{getStatusBadge(billboard.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/billboards/${billboard.id}`)}
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(billboard)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(billboard.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>แสดง</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
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
                  <span className="text-sm text-muted-foreground px-2">
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

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>นำเข้าข้อมูลจากไฟล์ Excel</DialogTitle>
          </DialogHeader>
          <BillboardImport
            onSuccess={handleImportSuccess}
            onCancel={() => setIsImportOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billboards;
