import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Package, Eye, Upload } from "lucide-react";
import { BillboardPackageDetail } from "@/components/billboard/BillboardPackageDetail";
import { BillboardPackageImport } from "@/components/billboard/BillboardPackageImport";

interface BillboardPackage {
  id: string;
  name: string;
  media_type: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  billboard_count?: number;
}

const BillboardPackages = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<BillboardPackage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailPkg, setDetailPkg] = useState<BillboardPackage | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formMediaType, setFormMediaType] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const { data: packages, isLoading } = useQuery({
    queryKey: ["billboard-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_packages")
        .select("*")
        .order("name");
      if (error) throw error;

      // Get counts
      const { data: counts, error: countErr } = await supabase
        .from("billboard_package_items")
        .select("package_id");
      if (countErr) throw countErr;

      const countMap: Record<string, number> = {};
      (counts || []).forEach((item: any) => {
        countMap[item.package_id] = (countMap[item.package_id] || 0) + 1;
      });

      return (data || []).map((pkg: any) => ({
        ...pkg,
        billboard_count: countMap[pkg.id] || 0,
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formName.trim()) throw new Error("กรุณาระบุชื่อ Package");
      const { data: { user } } = await supabase.auth.getUser();

      if (editingPkg) {
        const { error } = await supabase
          .from("billboard_packages")
          .update({
            name: formName.trim(),
            media_type: formMediaType.trim() || null,
            description: formDescription.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("billboard_packages")
          .insert({
            name: formName.trim(),
            media_type: formMediaType.trim() || null,
            description: formDescription.trim() || null,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPkg ? "อัพเดท Package สำเร็จ" : "เพิ่ม Package สำเร็จ");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["billboard-packages"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billboard_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบ Package สำเร็จ");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["billboard-packages"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (pkg: BillboardPackage) => {
      const { error } = await supabase
        .from("billboard_packages")
        .update({ is_active: !pkg.is_active, updated_at: new Date().toISOString() })
        .eq("id", pkg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billboard-packages"] });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormMediaType("");
    setFormDescription("");
    setEditingPkg(null);
    setShowForm(false);
  };

  const startEdit = (pkg: BillboardPackage) => {
    setEditingPkg(pkg);
    setFormName(pkg.name);
    setFormMediaType(pkg.media_type || "");
    setFormDescription(pkg.description || "");
    setShowForm(true);
  };

  const filtered = (packages || []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.media_type && p.media_type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">จัดการ Package ป้ายโฆษณา</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            สร้างและจัดการ Package (กลุ่มป้ายโฆษณา) สำหรับใช้ในระบบภาพโฆษณา
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="h-4 w-4" /> เพิ่ม Package
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1">
            <Upload className="h-4 w-4" /> Import จาก Excel
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อ Package หรือ Media Type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPkg ? "แก้ไข Package" : "เพิ่ม Package ใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ชื่อ Package *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="เช่น Cookies Pack 1" />
            </div>
            <div>
              <Label>Media Type</Label>
              <Input value={formMediaType} onChange={(e) => setFormMediaType(e.target.value)} placeholder="เช่น Cookies, Flyover2.0" />
            </div>
            <div>
              <Label>คำอธิบาย</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="คำอธิบายเพิ่มเติม" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>ยกเลิก</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            รายการ Package ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "ไม่พบ Package ที่ค้นหา" : "ยังไม่มี Package"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ Package</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead className="text-center">จำนวนป้าย</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.media_type || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{pkg.billboard_count} ป้าย</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pkg.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActiveMutation.mutate(pkg)}
                      >
                        {pkg.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDetailPkg(pkg)} title="ดูรายละเอียด/จัดการป้าย">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(pkg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(pkg.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {detailPkg && (
        <BillboardPackageDetail
          pkg={detailPkg}
          open={!!detailPkg}
          onClose={() => {
            setDetailPkg(null);
            queryClient.invalidateQueries({ queryKey: ["billboard-packages"] });
          }}
        />
      )}

      {/* Import Dialog */}
      <BillboardPackageImport
        open={showImport}
        onClose={() => {
          setShowImport(false);
          queryClient.invalidateQueries({ queryKey: ["billboard-packages"] });
        }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Package</AlertDialogTitle>
            <AlertDialogDescription>
              การลบ Package จะลบการผูกป้ายทั้งหมดด้วย ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillboardPackages;
