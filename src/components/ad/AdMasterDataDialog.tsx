import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Pencil, Search } from "lucide-react";

interface MasterItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

function MasterDataTab({
  tableName,
  label,
}: {
  tableName: "ad_sizes" | "ad_media_types";
  label: string;
}) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("name");
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("กรุณาระบุชื่อ");
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from(tableName)
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
          })
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success(`อัพเดท${label}สำเร็จ`);
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert({
            name: formName.trim(),
            description: formDescription.trim() || null,
            created_by: user.id,
          });
        if (error) throw error;
        toast.success(`เพิ่ม${label}สำเร็จ`);
      }
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      toast.success(`ลบ${label}สำเร็จ`);
      fetchItems();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (item: MasterItem) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !item.is_active })
        .eq("id", item.id);
      if (error) throw error;
      toast.success(item.is_active ? `ปิดการใช้งาน${label}สำเร็จ` : `เปิดการใช้งาน${label}สำเร็จ`);
      fetchItems();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setEditingItem(null);
    setIsAdding(false);
  };

  const startEdit = (item: MasterItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setIsAdding(true);
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {isAdding ? (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h4 className="font-medium">{editingItem ? `แก้ไข${label}` : `เพิ่ม${label}ใหม่`}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">ชื่อ *</label>
              <Input
                placeholder={`ชื่อ${label}`}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">คำอธิบาย</label>
              <Input
                placeholder="คำอธิบายเพิ่มเติม"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={resetForm}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`ค้นหา${label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            เพิ่ม
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-muted-foreground">กำลังโหลด...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          {searchTerm ? "ไม่พบข้อมูลที่ค้นหา" : `ยังไม่มีข้อมูล${label}`}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>คำอธิบาย</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleToggleActive(item)}
                  >
                    {item.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ{label}นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdMasterDataDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          จัดการ Master Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>จัดการข้อมูลหลักภาพโฆษณา</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="sizes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sizes">ขนาดภาพโฆษณา</TabsTrigger>
            <TabsTrigger value="media_types">ประเภทสื่อโฆษณา</TabsTrigger>
          </TabsList>
          <TabsContent value="sizes" className="mt-4">
            <MasterDataTab tableName="ad_sizes" label="ขนาดภาพ" />
          </TabsContent>
          <TabsContent value="media_types" className="mt-4">
            <MasterDataTab tableName="ad_media_types" label="ประเภทสื่อ" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
