import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Search, Plus, Upload, Edit, Trash2, ChevronLeft, ChevronRight, Building2, Monitor, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import BillboardForm from "@/components/billboard/BillboardForm";
import BillboardImport from "@/components/billboard/BillboardImport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const Billboards = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<Tables<"billboards"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch paginated data
  const { data: paginatedData, isLoading, refetch } = useQuery({
    queryKey: ["billboards", searchTerm, currentPage, pageSize],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("billboards")
        .select("*", { count: "exact" })
        .order("old_code", { ascending: true })
        .range(from, to);

      if (searchTerm) {
        query = query.or(`equipment_id.ilike.%${searchTerm}%,old_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count: count || 0 };
    },
  });

  // Fetch summary statistics
  const { data: summaryStats } = useQuery({
    queryKey: ["billboards-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("department, media_type, territory");
      if (error) throw error;

      // Count by Department
      const departmentCounts: Record<string, number> = {};
      data.forEach((b) => {
        const dept = b.department || "ไม่ระบุ";
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      });

      // Count by MediaType
      const mediaTypeCounts: Record<string, number> = {};
      data.forEach((b) => {
        const mt = b.media_type || "ไม่ระบุ";
        mediaTypeCounts[mt] = (mediaTypeCounts[mt] || 0) + 1;
      });

      // Count by Territory
      const territoryCounts: Record<string, number> = {};
      data.forEach((b) => {
        const terr = b.territory || "ไม่ระบุ";
        territoryCounts[terr] = (territoryCounts[terr] || 0) + 1;
      });

      return {
        total: data.length,
        departments: Object.entries(departmentCounts).sort((a, b) => b[1] - a[1]),
        mediaTypes: Object.entries(mediaTypeCounts).sort((a, b) => b[1] - a[1]),
        territories: Object.entries(territoryCounts).sort((a, b) => b[1] - a[1]),
      };
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

  const handleImportSuccess = () => {
    setIsImportOpen(false);
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              สรุปตาม Department
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {summaryStats?.departments.slice(0, 10).map(([dept, count]) => (
              <div key={dept} className="flex justify-between items-center text-sm">
                <span className="truncate mr-2">{dept}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {(summaryStats?.departments.length || 0) > 10 && (
              <p className="text-xs text-muted-foreground">+{summaryStats!.departments.length - 10} อื่นๆ</p>
            )}
          </CardContent>
        </Card>

        {/* MediaType Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              สรุปตาม MediaType
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {summaryStats?.mediaTypes.slice(0, 10).map(([mt, count]) => (
              <div key={mt} className="flex justify-between items-center text-sm">
                <span className="truncate mr-2">{mt}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {(summaryStats?.mediaTypes.length || 0) > 10 && (
              <p className="text-xs text-muted-foreground">+{summaryStats!.mediaTypes.length - 10} อื่นๆ</p>
            )}
          </CardContent>
        </Card>

        {/* Territory Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              สรุปตาม Territory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {summaryStats?.territories.slice(0, 10).map(([terr, count]) => (
              <div key={terr} className="flex justify-between items-center text-sm">
                <span className="truncate mr-2">{terr}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {(summaryStats?.territories.length || 0) > 10 && (
              <p className="text-xs text-muted-foreground">+{summaryStats!.territories.length - 10} อื่นๆ</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total count card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">ป้ายโฆษณาทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-foreground">{summaryStats?.total?.toLocaleString() || 0}</div>
          <p className="text-sm text-muted-foreground mt-1">จุด</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              รายการป้ายโฆษณา
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
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  นำเข้า Excel
                </Button>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มป้าย
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                        <TableCell>{getStatusBadge(billboard.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
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
                    <SelectContent>
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
