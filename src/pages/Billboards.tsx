import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Search, Plus, Eye, Upload, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import BillboardForm from "@/components/billboard/BillboardForm";
import BillboardImport from "@/components/billboard/BillboardImport";

const Billboards = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<Tables<"billboards"> | null>(null);

  const { data: billboards, isLoading, refetch } = useQuery({
    queryKey: ["billboards", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("billboards")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`equipment_id.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["billboards-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("status");
      if (error) throw error;
      
      const total = data.length;
      const active = data.filter(b => b.status === "active").length;
      const maintenance = data.filter(b => b.status === "maintenance").length;
      const inactive = data.filter(b => b.status === "inactive").length;
      
      return { total, active, maintenance, inactive };
    },
  });

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ป้ายทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-success">{stats?.active || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">บำรุงรักษา</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-warning">{stats?.maintenance || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ไม่ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-muted-foreground">{stats?.inactive || 0}</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
      </div>

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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>รหัสป้าย</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>ภูมิภาค</TableHead>
                    <TableHead>ประเภทสื่อ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billboards?.map((billboard) => (
                    <TableRow key={billboard.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{billboard.equipment_id}</TableCell>
                      <TableCell className="max-w-xs truncate">{billboard.description || "-"}</TableCell>
                      <TableCell>{billboard.department || "-"}</TableCell>
                      <TableCell>{billboard.region || "-"}</TableCell>
                      <TableCell>{billboard.media_type || "-"}</TableCell>
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
