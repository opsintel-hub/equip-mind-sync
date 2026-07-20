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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PMType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

/**
 * Manage the `pm_types` catalog used by the Tool PM Matrix.
 * Placed inside Master Data → เครื่องมือ tab so users have a single place to configure PM.
 */
export function PMTypeManager() {
  const [items, setItems] = useState<PMType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PMType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pm_types")
      .select("id, name, description, is_active")
      .order("name");
    if (error) toast.error("โหลดประเภท PM ไม่สำเร็จ");
    else setItems((data as PMType[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setDialogOpen(true); };
  const openEdit = (t: PMType) => { setEditing(t); setForm({ name: t.name, description: t.description || "" }); setDialogOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("กรุณากรอกชื่อประเภท PM"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("pm_types")
          .update({ name: form.name.trim(), description: form.description.trim() || null })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("แก้ไขสำเร็จ");
      } else {
        const { error } = await supabase.from("pm_types")
          .insert({ name: form.name.trim(), description: form.description.trim() || null });
        if (error) throw error;
        toast.success("เพิ่มประเภท PM สำเร็จ");
      }
      setDialogOpen(false);
      fetch();
    } catch (e: any) {
      toast.error(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("pm_types").update({ is_active: false }).eq("id", deleteId);
      if (error) throw error;
      toast.success("ซ่อนรายการแล้ว");
      fetch();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setDeleteId(null);
    }
  };

  const active = items.filter((i) => i.is_active !== false);
  const hiddenCount = items.length - active.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ประเภทการ PM เครื่องมือ</CardTitle>
            <CardDescription>
              รายการนี้จะไปปรากฏใน "PM Matrix" ตอนสร้าง/แก้ไขเครื่องมือ เพื่อให้กำหนดรอบวันของแต่ละประเภทได้อิสระ
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> เพิ่มประเภท PM
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">กำลังโหลด...</div>
        ) : active.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            ยังไม่มีประเภท PM — กด "เพิ่มประเภท PM" เพื่อเริ่มต้น (เช่น ทำความสะอาด, คาลิเบรต, ตรวจเช็คสภาพ)
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อประเภท</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead className="w-32 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {hiddenCount > 0 && (
          <div className="mt-3"><Badge variant="outline" className="text-xs">ซ่อนอยู่ {hiddenCount} รายการ</Badge></div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขประเภท PM" : "เพิ่มประเภท PM"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ชื่อประเภท <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ทำความสะอาด, คาลิเบรต" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย (ไม่บังคับ)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="รายละเอียดขั้นตอน หรือหมายเหตุ..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={save} disabled={saving}>{saving ? "กำลังบันทึก..." : editing ? "บันทึก" : "เพิ่ม"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการซ่อนรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              รายการนี้จะไม่ปรากฏใน PM Matrix ของเครื่องมือใหม่ แต่ข้อมูล PM เก่าที่อ้างอิงจะยังคงอยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>ซ่อน</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
