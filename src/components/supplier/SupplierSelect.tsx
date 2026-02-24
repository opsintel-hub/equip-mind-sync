import { useState, useEffect } from "react";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface SupplierSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SupplierSelect({ value, onChange, disabled }: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("ไม่สามารถโหลดผู้จำหน่ายได้");
    }
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("กรุณากรอกรหัสและชื่อผู้จำหน่าย");
      return;
    }

    setIsLoading(true);
    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            code: formData.code,
            name: formData.name,
            contact_person: formData.contact_person || null,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
          })
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast.success("แก้ไขผู้จำหน่ายสำเร็จ");
      } else {
        const { error } = await supabase.from("suppliers").insert({
          code: formData.code,
          name: formData.name,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
        });

        if (error) throw error;
        toast.success("เพิ่มผู้จำหน่ายสำเร็จ");
      }

      resetForm();
      await fetchSuppliers();
    } catch (error: any) {
      console.error("Error saving supplier:", error);
      toast.error(error.message || "บันทึกผู้จำหน่ายไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSupplier) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({ is_active: false })
        .eq("id", deleteSupplier.id);

      if (error) throw error;
      toast.success("ลบผู้จำหน่ายสำเร็จ");
      setDeleteSupplier(null);
      await fetchSuppliers();
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      toast.error(error.message || "ลบผู้จำหน่ายไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      code: "",
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    });
  };

  const handleSelectChange = (selectedId: string) => {
    onChange(selectedId);
  };

  const options = suppliers.map((supplier) => ({
    value: supplier.id,
    label: `${supplier.code} - ${supplier.name}`,
    description: [supplier.contact_person && `ติดต่อ: ${supplier.contact_person}`, (supplier as any).vendor_code && `Vendor: ${(supplier as any).vendor_code}`].filter(Boolean).join(" | ") || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={handleSelectChange}
          placeholder="เลือกผู้จำหน่าย"
          searchPlaceholder="ค้นหาผู้จำหน่าย..."
          emptyMessage="ไม่พบผู้จำหน่าย"
          disabled={disabled}
        />
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled}>
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการผู้จำหน่าย</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">
                {editingSupplier ? "แก้ไขผู้จำหน่าย" : "เพิ่มผู้จำหน่ายใหม่"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>รหัสผู้จำหน่าย *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="SUP001"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อผู้จำหน่าย *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="บริษัท ABC จำกัด"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ผู้ติดต่อ</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="คุณสมชาย"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>เบอร์โทร</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="02-xxx-xxxx"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>อีเมล</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@supplier.com"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ที่อยู่</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 ถนน..."
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editingSupplier && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isLoading}>
                    ยกเลิก
                  </Button>
                )}
                <Button type="button" onClick={handleSave} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {editingSupplier ? "บันทึก" : "เพิ่ม"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">รายการผู้จำหน่าย</h3>
              <div className="border rounded-lg divide-y">
                {suppliers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">ไม่มีผู้จำหน่าย</div>
                ) : (
                  suppliers.map((supplier) => (
                    <div key={supplier.id} className="p-3 flex items-center justify-between hover:bg-accent">
                      <div>
                        <div className="font-medium">
                          {supplier.code} - {supplier.name}
                        </div>
                        {supplier.contact_person && (
                          <div className="text-sm text-muted-foreground">
                            ติดต่อ: {supplier.contact_person} {supplier.phone && `(${supplier.phone})`}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(supplier)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSupplier(supplier)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSupplier} onOpenChange={(open) => !open && setDeleteSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้จำหน่าย</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบผู้จำหน่าย "{deleteSupplier?.name}" ใช่หรือไม่?
              <br />
              การลบผู้จำหน่ายจะไม่ส่งผลกระทบต่อข้อมูลที่มีอยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
