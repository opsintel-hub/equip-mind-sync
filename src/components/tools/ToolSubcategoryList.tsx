import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Cat { id: string; name: string; }
interface Row {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  tool_category_id: string;
}

interface Props { refresh?: number }

export function ToolSubcategoryList({ refresh }: Props) {
  const [items, setItems] = useState<Row[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [catId, setCatId] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCats = async () => {
    const { data } = await supabase.from("tool_categories").select("id, name").eq("is_active", true).order("name");
    setCats((data as any) || []);
  };
  const load = async () => {
    let q: any = supabase.from("tool_subcategories" as any).select("*").order("name");
    if (filter !== "all") q = q.eq("tool_category_id", filter);
    const { data } = await q;
    setItems(((data as any) || []) as Row[]);
  };
  useEffect(() => { loadCats(); }, []);
  useEffect(() => { load(); }, [refresh, filter]);

  const openNew = () => { setEditing(null); setName(""); setDescription(""); setCatId(""); setOpen(true); };
  const openEdit = (r: Row) => { setEditing(r); setName(r.name); setDescription(r.description || ""); setCatId(r.tool_category_id); setOpen(true); };

  const save = async () => {
    if (!name.trim()) return toast.error("กรุณากรอกชื่อ");
    if (!catId) return toast.error("กรุณาเลือกหมวดหมู่หลัก");
    setLoading(true);
    try {
      if (editing) {
        const { error } = await supabase.from("tool_subcategories" as any).update({ name, description: description || null, tool_category_id: catId }).eq("id", editing.id);
        if (error) throw error;
        toast.success("แก้ไขสำเร็จ");
      } else {
        const { error } = await supabase.from("tool_subcategories" as any).insert({ name, description: description || null, tool_category_id: catId });
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
    const { error } = await supabase.from("tool_subcategories" as any).update({ is_active: false }).eq("id", deleting.id);
    if (error) toast.error(error.message);
    else { toast.success("ลบสำเร็จ"); load(); }
    setDeleting(null);
  };

  const catName = (id: string) => cats.find(c => c.id === id)?.name || "-";

  return (
    <>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="w-[250px]">
          <SearchableSelect
            options={[{ value: "all", label: "ทั้งหมด" }, ...cats.map(c => ({ value: c.id, label: c.name }))]}
            value={filter}
            onValueChange={setFilter}
            placeholder="กรองตามหมวดหมู่หลัก"
            searchPlaceholder="ค้นหา..."
            emptyMessage="ไม่พบหมวดหมู่"
          />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />เพิ่มหมวดหมู่ย่อย</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อหมวดหมู่ย่อย</TableHead>
            <TableHead>หมวดหมู่หลัก</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">ยังไม่มีหมวดหมู่ย่อย</TableCell></TableRow>
          ) : items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell><Badge variant="outline">{catName(r.tool_category_id)}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{r.description || "-"}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "แก้ไข" : "เพิ่ม"}หมวดหมู่ย่อย (เครื่องมือ)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>หมวดหมู่หลัก *</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่หลัก" /></SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ชื่อหมวดหมู่ย่อย *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สว่าน" />
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
