import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  subcount?: number;
}

interface Props { refresh?: number }

export function ToolCategoryList({ refresh }: Props) {
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tool_categories").select("*").order("name");
    const { data: subs } = await supabase.from("tool_subcategories" as any).select("tool_category_id").eq("is_active", true);
    const countMap: Record<string, number> = {};
    (subs as any[] || []).forEach((s) => { countMap[s.tool_category_id] = (countMap[s.tool_category_id] || 0) + 1; });
    setItems((data || []).map((c) => ({ ...c, subcount: countMap[c.id] || 0 })));
  };

  useEffect(() => { load(); }, [refresh]);

  const openNew = () => { setEditing(null); setName(""); setDescription(""); setOpen(true); };
  const openEdit = (row: Row) => { setEditing(row); setName(row.name); setDescription(row.description || ""); setOpen(true); };

  const save = async () => {
    if (!name.trim()) return toast.error("กรุณากรอกชื่อ");
    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from("tool_categories").update({ name, description: description || null }).eq("id", editing.id);
        if (error) throw error;
        toast.success("แก้ไขสำเร็จ");
      } else {
        const { error } = await supabase.from("tool_categories").insert({ name, description: description || null });
        if (error) throw error;
        toast.success("เพิ่มสำเร็จ");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (deleting.subcount && deleting.subcount > 0) {
      toast.error("ไม่สามารถลบได้เนื่องจากมีหมวดหมู่ย่อยอยู่");
      setDeleting(null);
      return;
    }
    const { error } = await supabase.from("tool_categories").update({ is_active: false }).eq("id", deleting.id);
    if (error) toast.error(error.message);
    else { toast.success("ลบสำเร็จ"); load(); }
    setDeleting(null);
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />เพิ่มหมวดหมู่หลัก</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อหมวดหมู่</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead className="text-center">หมวดหมู่ย่อย</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ยังไม่มีหมวดหมู่หลัก</TableCell></TableRow>
          ) : items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-muted-foreground">{r.description || "-"}</TableCell>
              <TableCell className="text-center"><Badge variant="secondary">{r.subcount}</Badge></TableCell>
              <TableCell className="text-center"><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "แก้ไข" : "เพิ่ม"}หมวดหมู่หลัก (เครื่องมือ)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อหมวดหมู่ *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เครื่องมือช่างไฟฟ้า" />
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
              <Button onClick={save} disabled={loading}>{loading ? "กำลังบันทึก..." : "บันทึก"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>ลบ "{deleting?.name}" ใช่หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
