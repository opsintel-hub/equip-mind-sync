import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkPrefixUsage, removeCodePrefix, type PrefixUsage } from "@/lib/codePrefix";

interface ToolCodePrefix {
  id: string;
  prefix: string;
  description: string | null;
  next_number: number;
}

interface ToolCodePrefixSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onCodeGenerated?: (code: string) => void;
}

export function ToolCodePrefixSelect({ value, onChange, disabled, onCodeGenerated }: ToolCodePrefixSelectProps) {
  const [prefixes, setPrefixes] = useState<ToolCodePrefix[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrefix, setEditPrefix] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [usage, setUsage] = useState<PrefixUsage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPrefix, setNewPrefix] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchPrefixes = async () => {
    const { data, error } = await supabase
      .from("tool_code_prefixes")
      .select("*")
      .eq("is_active", true)
      .order("prefix");

    if (error) {
      console.error("Error fetching tool prefixes:", error);
      toast.error("ไม่สามารถโหลดข้อมูล Prefix ได้");
    } else {
      setPrefixes(data || []);
    }
  };

  useEffect(() => {
    fetchPrefixes();
  }, []);

  useEffect(() => {
    if (value) {
      const selectedPrefix = prefixes.find(p => p.prefix === value);
      if (selectedPrefix && onCodeGenerated) {
        const nextNum = selectedPrefix.next_number;
        const previewCode = `${value} ${nextNum.toString().padStart(4, '0')}`;
        onCodeGenerated(previewCode);
      }
    }
  }, [value, prefixes, onCodeGenerated]);

  const validatePrefix = (prefix: string): boolean => {
    if (!prefix.trim()) {
      toast.error("กรุณากรอก Prefix");
      return false;
    }
    if (prefix.length > 7) {
      toast.error("Prefix ต้องไม่เกิน 7 ตัวอักษร");
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!validatePrefix(newPrefix)) return;

    const { error } = await supabase
      .from("tool_code_prefixes")
      .insert({
        prefix: newPrefix.trim().toUpperCase(),
        description: newDescription.trim() || null,
        next_number: 1
      });

    if (error) {
      if (error.code === '23505') {
        toast.error("Prefix นี้มีอยู่แล้วในระบบ");
      } else {
        toast.error("ไม่สามารถเพิ่ม Prefix ได้");
      }
    } else {
      toast.success("เพิ่ม Prefix สำเร็จ");
      setNewPrefix("");
      setNewDescription("");
      setIsAdding(false);
      fetchPrefixes();
    }
  };

  const handleEdit = async () => {
    if (!validatePrefix(editPrefix)) return;

    const { error } = await supabase
      .from("tool_code_prefixes")
      .update({
        prefix: editPrefix.trim().toUpperCase(),
        description: editDescription.trim() || null
      })
      .eq("id", editingId);

    if (error) {
      if (error.code === '23505') {
        toast.error("Prefix นี้มีอยู่แล้วในระบบ");
      } else {
        toast.error("ไม่สามารถแก้ไข Prefix ได้");
      }
    } else {
      toast.success("แก้ไข Prefix สำเร็จ");
      setEditingId(null);
      setEditPrefix("");
      setEditDescription("");
      fetchPrefixes();
    }
  };

  const requestDelete = async (p: ToolCodePrefix) => {
    setDeleteId(p.id);
    setUsage(null);
    try {
      setUsage(await checkPrefixUsage("tool", p.prefix));
    } catch (e: any) {
      toast.error("ตรวจสอบการใช้งาน Prefix ไม่สำเร็จ: " + (e?.message || ""));
    }
  };

  const handleDelete = async () => {
    const target = prefixes.find((p) => p.id === deleteId);
    if (!target) return;
    try {
      const u = usage ?? (await checkPrefixUsage("tool", target.prefix));
      const inUse = u.count > 0;
      await removeCodePrefix("tool", target.id, !inUse);
      toast.success(inUse ? `ปิดการใช้งาน Prefix ${target.prefix} แล้ว` : `ลบ Prefix ${target.prefix} แล้ว`);
      setDeleteId(null);
      setUsage(null);
      if (value === target.prefix) onChange("");
      fetchPrefixes();
    } catch (e: any) {
      toast.error(e?.message || "ไม่สามารถลบ Prefix ได้");
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="เลือก Prefix รหัสเครื่องมือ" />
            </SelectTrigger>
            <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
              {prefixes.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  ยังไม่มี Prefix กรุณาเพิ่มจากปุ่มด้านขวา
                </div>
              ) : (
                prefixes.map((prefix) => (
                  <SelectItem key={prefix.id} value={prefix.prefix}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{prefix.prefix}</span>
                      <span className="text-muted-foreground text-xs">
                        (ถัดไป: {prefix.next_number.toString().padStart(4, '0')})
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsManageOpen(true)}
          disabled={disabled}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการ Prefix รหัสเครื่องมือ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              กำหนด Prefix ได้ 1-7 ตัวอักษร เช่น TL, TOOL, WR ระบบจะเติมเลขรัน 4 หลักให้อัตโนมัติ (เช่น TL 0001)
            </p>

            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่ม Prefix
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <Input
                  placeholder="Prefix (1-7 ตัวอักษร) เช่น TL"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value.slice(0, 7))}
                  maxLength={7}
                />
                <Input
                  placeholder="รายละเอียด (ไม่บังคับ)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAdd} className="flex-1">บันทึก</Button>
                  <Button
                    variant="outline"
                    onClick={() => { setIsAdding(false); setNewPrefix(""); setNewDescription(""); }}
                    className="flex-1"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {prefixes.map((prefix) => (
                <div key={prefix.id} className="border rounded-lg p-3">
                  {editingId === prefix.id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Prefix"
                        value={editPrefix}
                        onChange={(e) => setEditPrefix(e.target.value.slice(0, 7))}
                        maxLength={7}
                      />
                      <Input
                        placeholder="รายละเอียด"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleEdit} size="sm" className="flex-1">บันทึก</Button>
                        <Button
                          variant="outline"
                          onClick={() => { setEditingId(null); setEditPrefix(""); setEditDescription(""); }}
                          size="sm"
                          className="flex-1"
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : deleteId === prefix.id ? (
                    <div className="space-y-3">
                      <div className="font-medium">{prefix.prefix}</div>
                      <p className="text-sm text-muted-foreground">
                        {usage === null
                          ? "กำลังตรวจสอบการใช้งาน..."
                          : usage.count > 0
                          ? `มี ${usage.count} รายการที่ใช้ Prefix นี้ (เช่น ${usage.samples.join(", ")}) จึงลบออกไม่ได้ — ระบบจะปิดการใช้งานแทน รหัสเดิมยังใช้งานได้ตามปกติ`
                          : "ยังไม่มีรายการใดใช้ Prefix นี้ — จะลบออกจากระบบถาวร"}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete}>
                          {(usage?.count ?? 0) > 0 ? "ปิดการใช้งาน" : "ลบ"}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDeleteId(null); setUsage(null); }}>
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{prefix.prefix}</div>
                        <div className="text-sm text-muted-foreground">
                          ถัดไป: {prefix.prefix} {prefix.next_number.toString().padStart(4, '0')}
                        </div>
                        {prefix.description && (
                          <div className="text-sm text-muted-foreground">{prefix.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(prefix.id);
                            setEditPrefix(prefix.prefix);
                            setEditDescription(prefix.description || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => requestDelete(prefix)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {prefixes.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  ยังไม่มี Prefix กรุณาเพิ่ม Prefix ใหม่
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
