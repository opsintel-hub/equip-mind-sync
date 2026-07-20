import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PMResult {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean | null;
}

const COLOR_OPTIONS = [
  { value: "green", label: "🟢 เขียว (ปกติ / ผ่าน)" },
  { value: "yellow", label: "🟡 เหลือง (เตือน / ต้องซ่อม)" },
  { value: "orange", label: "🟠 ส้ม (ต้องเปลี่ยน)" },
  { value: "red", label: "🔴 แดง (เสีย / อันตราย)" },
  { value: "blue", label: "🔵 ฟ้า (ข้อมูล)" },
  { value: "gray", label: "⚪ เทา (อื่นๆ)" },
];

const COLOR_CLASS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-gray-500",
};

export function PMResultManager() {
  const [items, setItems] = useState<PMResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PMResult | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("green");
  const [isActive, setIsActive] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pm_results")
      .select("*")
      .order("name");
    if (error) toast.error("โหลดข้อมูลไม่สำเร็จ");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor("green");
    setIsActive(true);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = (item: PMResult) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || "");
    setColor(item.color || "green");
    setIsActive(item.is_active ?? true);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("กรุณากรอกชื่อผลการตรวจ"); return; }
    const payload = { name: name.trim(), description: description.trim() || null, color, is_active: isActive };
    const { error } = editing
      ? await supabase.from("pm_results").update(payload).eq("id", editing.id)
      : await supabase.from("pm_results").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "บันทึกการแก้ไขแล้ว" : "เพิ่มผลการตรวจแล้ว");
    setOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pm_results").delete().eq("id", id);
    if (error) { toast.error("ลบไม่สำเร็จ — อาจถูกใช้งานอยู่แล้ว ลอง 'ปิดใช้งาน' แทน"); return; }
    toast.success("ลบแล้ว");
    fetchItems();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ผลการตรวจสอบ PM (เครื่องมือ)</CardTitle>
            <CardDescription>
              ตัวเลือกที่จะแสดงในหน้า "งาน PM เครื่องมือ → บันทึกผลการตรวจ" และแสดงเป็น Badge ในรายงานประวัติ PM
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> เพิ่มผลการตรวจ</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">ยังไม่มีข้อมูล — กด "เพิ่มผลการตรวจ" เพื่อสร้างรายการแรก</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อผลการตรวจ</TableHead>
                <TableHead>สี</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead className="text-center">สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <Badge className={COLOR_CLASS[it.color] || ""}>{it.name}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{COLOR_OPTIONS.find(c => c.value === it.color)?.label || it.color}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{it.description || "-"}</TableCell>
                  <TableCell className="text-center">
                    {it.is_active ? <Badge variant="outline" className="text-green-600 border-green-600">ใช้งาน</Badge> : <Badge variant="outline">ปิด</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ลบผลการตรวจ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              จะลบ "{it.name}" ออกจากระบบ — หากเคยใช้งานในประวัติ PM แล้ว ระบบจะไม่ยอมให้ลบ แนะนำให้ "ปิดใช้งาน" แทน
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(it.id)}>ลบ</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขผลการตรวจ" : "เพิ่มผลการตรวจ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อผลการตรวจ *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ปกติ, ต้องซ่อม, เสีย" />
            </div>
            <div className="space-y-2">
              <Label>สี Badge</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>คำอธิบาย</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pm-result-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <Label htmlFor="pm-result-active">เปิดใช้งาน (แสดงในตัวเลือกตอนบันทึกผลตรวจ)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave}>{editing ? "บันทึก" : "เพิ่ม"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
