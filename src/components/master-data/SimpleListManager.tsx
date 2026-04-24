import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export type SimpleListTable =
  | "mp_symptoms"
  | "mp_assessment_results"
  | "mp_swap_reject_reasons"
  | "mp_claim_results";

interface SimpleListItem {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface SimpleListManagerProps {
  tableName: SimpleListTable;
  title: string;
  description: string;
  itemLabel?: string;
}

export function SimpleListManager({
  tableName,
  title,
  description,
  itemLabel = "รายการ",
}: SimpleListManagerProps) {
  const [items, setItems] = useState<SimpleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SimpleListItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      toast.error("ไม่สามารถโหลดรายการได้");
    } else {
      setItems((data as SimpleListItem[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: SimpleListItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อรายการ");
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from(tableName)
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          })
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("แก้ไขสำเร็จ");
      } else {
        const nextSort = (items[items.length - 1]?.sort_order || 0) + 10;
        const { error } = await supabase.from(tableName).insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          sort_order: nextSort,
          is_active: true,
        });
        if (error) throw error;
        toast.success("เพิ่มสำเร็จ");
      }
      setDialogOpen(false);
      fetchItems();
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาด — อาจไม่มีสิทธิ์ (ต้องเป็น Super Admin)");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("ลบสำเร็จ (ซ่อนรายการ)");
      fetchItems();
    } catch {
      toast.error("ไม่สามารถลบได้");
    } finally {
      setDeleteId(null);
    }
  };

  const handleMove = async (item: SimpleListItem, direction: "up" | "down") => {
    const idx = items.findIndex((i) => i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const swapItem = items[swapIdx];
    try {
      await supabase
        .from(tableName)
        .update({ sort_order: swapItem.sort_order })
        .eq("id", item.id);
      await supabase
        .from(tableName)
        .update({ sort_order: item.sort_order })
        .eq("id", swapItem.id);
      fetchItems();
    } catch {
      toast.error("ไม่สามารถเรียงลำดับได้");
    }
  };

  const activeItems = items.filter((i) => i.is_active);
  const inactiveCount = items.length - activeItems.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            เพิ่ม{itemLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">กำลังโหลด...</div>
        ) : activeItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            ยังไม่มี{itemLabel} — กดปุ่ม "เพิ่ม{itemLabel}" เพื่อเริ่มต้น
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ลำดับ</TableHead>
                <TableHead>ชื่อรายการ</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead className="w-32 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeItems.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => handleMove(item, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === activeItems.length - 1}
                        onClick={() => handleMove(item, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {inactiveCount > 0 && (
          <div className="mt-3">
            <Badge variant="outline" className="text-xs">
              ซ่อนอยู่ {inactiveCount} รายการ
            </Badge>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `แก้ไข${itemLabel}` : `เพิ่ม${itemLabel}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                ชื่อรายการ <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`เช่น ${itemLabel}...`}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย (ไม่บังคับ)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="รายละเอียดเพิ่มเติม..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : editingItem ? "บันทึก" : "เพิ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              รายการนี้จะถูกซ่อนจาก Dropdown ทั่วระบบ แต่ข้อมูลเก่าที่อ้างอิงจะยังคงแสดงได้
              สามารถนำกลับมาใช้ได้โดยติดต่อผู้ดูแลระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
