import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Cpu, Code2 } from "lucide-react";
import { toast } from "sonner";

interface RepairAction {
  id: string;
  name: string;
  scope: "hardware" | "software";
  applies_to_device: "media_player" | "monitor" | "both";
  is_active: boolean;
  sort_order: number;
}

const DEVICE_LABEL: Record<RepairAction["applies_to_device"], string> = {
  media_player: "Media Player",
  monitor: "จอภาพ",
  both: "ทั้งคู่",
};

export function RepairActionsManager() {
  const [items, setItems] = useState<RepairAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RepairAction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; scope: "hardware" | "software"; applies_to_device: RepairAction["applies_to_device"] }>({
    name: "",
    scope: "hardware",
    applies_to_device: "both",
  });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repair_actions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) toast.error("ไม่สามารถโหลดรายการได้");
    else setItems((data as RepairAction[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", scope: "hardware", applies_to_device: "both" });
    setDialogOpen(true);
  };

  const openEdit = (item: RepairAction) => {
    setEditing(item);
    setForm({ name: item.name, scope: item.scope, applies_to_device: item.applies_to_device });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("กรุณากรอกชื่อรายการ"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("repair_actions").update({
          name: form.name.trim(), scope: form.scope, applies_to_device: form.applies_to_device,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("แก้ไขสำเร็จ");
      } else {
        const nextSort = (items[items.length - 1]?.sort_order || 0) + 10;
        const { error } = await supabase.from("repair_actions").insert({
          name: form.name.trim(), scope: form.scope, applies_to_device: form.applies_to_device,
          sort_order: nextSort, is_active: true,
        });
        if (error) throw error;
        toast.success("เพิ่มสำเร็จ");
      }
      setDialogOpen(false);
      fetchItems();
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด — อาจไม่มีสิทธิ์ (ต้องเป็น Admin ขึ้นไป)");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("repair_actions").update({ is_active: false }).eq("id", deleteId);
      if (error) throw error;
      toast.success("ซ่อนรายการแล้ว");
      fetchItems();
    } catch {
      toast.error("ไม่สามารถลบได้");
    } finally {
      setDeleteId(null);
    }
  };

  const handleMove = async (item: RepairAction, dir: "up" | "down") => {
    const idx = active.findIndex((i) => i.id === item.id);
    const swap = active[dir === "up" ? idx - 1 : idx + 1];
    if (!swap) return;
    try {
      await supabase.from("repair_actions").update({ sort_order: swap.sort_order }).eq("id", item.id);
      await supabase.from("repair_actions").update({ sort_order: item.sort_order }).eq("id", swap.id);
      fetchItems();
    } catch { toast.error("ไม่สามารถเรียงลำดับได้"); }
  };

  const active = items.filter((i) => i.is_active);
  const inactiveCount = items.length - active.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>⑤ รายการงานซ่อม (Repair Actions)</CardTitle>
            <CardDescription>
              รายการที่ช่างเลือกเมื่อบันทึกผล "ซ่อมเอง" — เช่น ลง Windows ใหม่, เปลี่ยน HDD, เปลี่ยน Panel
              (Multi-select) กรองอัตโนมัติตามประเภทเครื่อง (MP / จอภาพ) และประเภทงาน (Hardware / Software)
            </CardDescription>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> เพิ่มรายการ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">กำลังโหลด...</div>
        ) : active.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">ยังไม่มีรายการ — กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้น</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ลำดับ</TableHead>
                <TableHead>ชื่อรายการ</TableHead>
                <TableHead className="w-32">ประเภทงาน</TableHead>
                <TableHead className="w-36">ใช้กับ</TableHead>
                <TableHead className="w-32 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => handleMove(item, "up")}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === active.length - 1} onClick={() => handleMove(item, "down")}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={item.scope === "hardware" ? "secondary" : "outline"} className="gap-1">
                      {item.scope === "hardware" ? <Cpu className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
                      {item.scope === "hardware" ? "Hardware" : "Software"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{DEVICE_LABEL[item.applies_to_device]}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
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
            <Badge variant="outline" className="text-xs">ซ่อนอยู่ {inactiveCount} รายการ</Badge>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขรายการซ่อม" : "เพิ่มรายการซ่อม"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ชื่อรายการ <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น เปลี่ยน HDD, ลง Windows ใหม่"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>ประเภทงาน <span className="text-destructive">*</span></Label>
              <Select value={form.scope} onValueChange={(v: "hardware" | "software") => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware (อะไหล่)</SelectItem>
                  <SelectItem value="software">Software (โปรแกรม)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ใช้กับอุปกรณ์ <span className="text-destructive">*</span></Label>
              <Select value={form.applies_to_device} onValueChange={(v: RepairAction["applies_to_device"]) => setForm({ ...form, applies_to_device: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">ทั้งคู่ (MP + จอภาพ)</SelectItem>
                  <SelectItem value="media_player">Media Player</SelectItem>
                  <SelectItem value="monitor">จอภาพ (Monitor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก..." : editing ? "บันทึก" : "เพิ่ม"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              รายการนี้จะถูกซ่อนจาก Dropdown เมื่อช่างบันทึกผลซ่อม แต่ข้อมูลเก่าที่อ้างอิงจะยังคงแสดงได้ (มี snapshot บันทึกไว้)
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
