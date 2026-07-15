import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ChevronRight, Plus, Pencil, Trash2, Folder, FolderOpen, ChevronsDownUp, ChevronsUpDown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CategorySuggestWizard } from "./CategorySuggestWizard";

interface Row {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}
interface ChildRow extends Row {
  parentId: string | null;
}

interface Props {
  parentTable: "categories" | "tool_categories";
  childTable: "subcategories" | "tool_subcategories";
  childFk: "category_id" | "tool_category_id";
  storageKey: string;
  labels: {
    parentSingular: string; // e.g. "หมวดหมู่หลัก"
    childSingular: string;  // e.g. "หมวดหมู่ย่อย"
    parentEmpty: string;    // e.g. "ยังไม่มีหมวดหมู่หลัก"
    childEmpty: string;     // e.g. "ยังไม่มีหมวดหมู่ย่อยในกลุ่มนี้"
    parentPlaceholder?: string;
    childPlaceholder?: string;
  };
  softDeleteChild?: boolean; // ToolSubcategory used soft-delete previously
}

type EditTarget =
  | { kind: "parent"; row?: Row | null }
  | { kind: "child"; row?: ChildRow | null; defaultParentId?: string };

export function CategoryAccordion({
  parentTable,
  childTable,
  childFk,
  storageKey,
  labels,
  softDeleteChild = false,
}: Props) {
  const [parents, setParents] = useState<Row[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "parent" | "child"; row: Row | ChildRow } | null
  >(null);

  const persistExpanded = (next: Set<string>) => {
    setExpanded(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  };

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    persistExpanded(next);
  };

  const load = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase.from(parentTable as any).select("id, name, description, is_active").order("name"),
      supabase.from(childTable as any).select(`id, name, description, is_active, ${childFk}`).order("name"),
    ]);
    if (pRes.error) toast.error(pRes.error.message);
    if (cRes.error) toast.error(cRes.error.message);
    setParents(((pRes.data as any[]) || []) as Row[]);
    setChildren(
      (((cRes.data as any[]) || []) as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        is_active: r.is_active,
        parentId: r[childFk] ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentTable, childTable]);

  const childrenByParent = useMemo(() => {
    const map: Record<string, ChildRow[]> = {};
    for (const c of children) {
      const k = c.parentId || "__orphan__";
      (map[k] ||= []).push(c);
    }
    return map;
  }, [children]);

  const expandAll = () => persistExpanded(new Set(parents.map((p) => p.id)));
  const collapseAll = () => persistExpanded(new Set());

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, row } = deleteTarget;
    if (kind === "parent") {
      const has = (childrenByParent[row.id] || []).length > 0;
      if (has) {
        toast.error(`ไม่สามารถลบได้เนื่องจากมี${labels.childSingular}อยู่`);
        setDeleteTarget(null);
        return;
      }
      const { error } = await supabase.from(parentTable as any).delete().eq("id", row.id);
      if (error) return toast.error(error.message);
      toast.success("ลบสำเร็จ");
    } else {
      const q = softDeleteChild
        ? supabase.from(childTable as any).update({ is_active: false }).eq("id", row.id)
        : supabase.from(childTable as any).delete().eq("id", row.id);
      const { error } = await q;
      if (error) return toast.error(error.message);
      toast.success("ลบสำเร็จ");
    }
    setDeleteTarget(null);
    load();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-1.5" />
            ขยายทั้งหมด
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4 mr-1.5" />
            ยุบทั้งหมด
          </Button>
        </div>
        <Button onClick={() => setEditTarget({ kind: "parent", row: null })}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่ม{labels.parentSingular}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
      ) : parents.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg">
          {labels.parentEmpty}
        </div>
      ) : (
        <div className="space-y-2">
          {parents.map((p) => {
            const isOpen = expanded.has(p.id);
            const kids = childrenByParent[p.id] || [];
            return (
              <div key={p.id} className="border rounded-lg bg-card overflow-hidden">
                {/* Header row */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer",
                    isOpen && "bg-muted/30 border-b",
                  )}
                  onClick={() => toggle(p.id)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  {isOpen ? (
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium truncate flex-1">{p.name}</span>
                  {p.description && (
                    <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[240px]">
                      {p.description}
                    </span>
                  )}
                  <Badge variant="secondary" className="shrink-0">
                    {kids.length} ย่อย
                  </Badge>
                  <Badge variant={p.is_active ? "default" : "secondary"} className="shrink-0">
                    {p.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                  <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditTarget({ kind: "parent", row: p })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteTarget({ kind: "parent", row: p })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Body (children) */}
                {isOpen && (
                  <div className="pl-6 pr-2 py-2 space-y-1">
                    {kids.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic px-3 py-2">
                        {labels.childEmpty}
                      </div>
                    ) : (
                      kids.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border"
                        >
                          <span className="text-muted-foreground text-xs">└─</span>
                          <span className="flex-1 truncate">{c.name}</span>
                          {c.description && (
                            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[240px]">
                              {c.description}
                            </span>
                          )}
                          <Badge
                            variant={c.is_active ? "outline" : "secondary"}
                            className="shrink-0 text-xs"
                          >
                            {c.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                          </Badge>
                          <div className="flex gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setEditTarget({ kind: "child", row: c })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setDeleteTarget({ kind: "child", row: c })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-6 text-primary hover:text-primary"
                      onClick={() =>
                        setEditTarget({ kind: "child", row: null, defaultParentId: p.id })
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      เพิ่ม{labels.childSingular}ในกลุ่มนี้
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editTarget && (
        <EditDialog
          target={editTarget}
          parents={parents}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
          parentTable={parentTable}
          childTable={childTable}
          childFk={childFk}
          labels={labels}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ "{deleteTarget?.row.name}" ใช่หรือไม่?
            </AlertDialogDescription>
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

function EditDialog({
  target,
  parents,
  onClose,
  onSaved,
  parentTable,
  childTable,
  childFk,
  labels,
}: {
  target: EditTarget;
  parents: Row[];
  onClose: () => void;
  onSaved: () => void;
  parentTable: string;
  childTable: string;
  childFk: string;
  labels: Props["labels"];
}) {
  const isChild = target.kind === "child";
  const row = target.row;
  const [name, setName] = useState(row?.name ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [parentId, setParentId] = useState<string>(
    isChild ? (row as ChildRow | null | undefined)?.parentId ?? target.defaultParentId ?? "" : "",
  );
  const [saving, setSaving] = useState(false);

  const parentName = isChild ? parents.find((p) => p.id === parentId)?.name : null;
  const isEdit = !!row;

  const save = async () => {
    if (!name.trim()) return toast.error("กรุณากรอกชื่อ");
    if (isChild && !parentId) return toast.error(`กรุณาเลือก${labels.parentSingular}`);
    setSaving(true);
    try {
      const table = isChild ? childTable : parentTable;
      const payload: any = {
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
      };
      if (isChild) payload[childFk] = parentId;
      const q = isEdit
        ? supabase.from(table as any).update(payload).eq("id", row!.id)
        : supabase.from(table as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(isEdit ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const title = `${isEdit ? "แก้ไข" : "เพิ่ม"}${
    isChild ? labels.childSingular : labels.parentSingular
  }`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isChild && (
            <div className="space-y-2">
              <Label>{labels.parentSingular} *</Label>
              <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm">
                {parentName || <span className="text-muted-foreground">— ไม่พบ —</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                หากต้องการย้ายไป{labels.parentSingular}อื่น ให้ลบแล้วสร้างใหม่ในกลุ่มที่ต้องการ
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              ชื่อ{isChild ? labels.childSingular : labels.parentSingular} *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isChild ? labels.childPlaceholder : labels.parentPlaceholder}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>คำอธิบาย</Label>
            <Textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="ไม่บังคับ"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
            <Label htmlFor="active">เปิดใช้งาน</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "เพิ่ม"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
