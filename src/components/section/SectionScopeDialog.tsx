import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEVICE_TYPES, DEVICE_TYPE_LABELS } from "@/lib/deviceTypes";
import type { SectionScopeType } from "@/hooks/useSectionScope";

interface Props {
  sectionId: string;
  sectionName: string;
  onSaved?: () => void;
}

interface Option {
  key: string;
  label: string;
  scope_type: SectionScopeType;
  ref_id: string | null;
  ref_text: string | null;
}

const keyOf = (t: SectionScopeType, id: string | null, text: string | null) => `${t}::${id || text || ""}`;

export function SectionScopeDialog({ sectionId, sectionName, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [equipCats, setEquipCats] = useState<Option[]>([]);
  const [equipSubs, setEquipSubs] = useState<Option[]>([]);
  const [toolCats, setToolCats] = useState<Option[]>([]);
  const [toolSubs, setToolSubs] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const deviceOptions: Option[] = DEVICE_TYPES.map((t) => ({
    key: keyOf("mp_device_type", null, t),
    label: DEVICE_TYPE_LABELS[t],
    scope_type: "mp_device_type" as const,
    ref_id: null,
    ref_text: t,
  }));

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cat, sub, tcat, tsub, current] = await Promise.all([
          supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
          supabase.from("subcategories").select("id, name").eq("is_active", true).order("name"),
          supabase.from("tool_categories").select("id, name").eq("is_active", true).order("name"),
          supabase.from("tool_subcategories").select("id, name").eq("is_active", true).order("name"),
          (supabase as any).from("section_scopes").select("*").eq("section_id", sectionId),
        ]);
        setEquipCats(
          ((cat.data || []) as any[]).map((c) => ({
            key: keyOf("equipment_category", null, c.name),
            label: c.name,
            scope_type: "equipment_category" as const,
            ref_id: null,
            ref_text: c.name,
          })),
        );
        setEquipSubs(
          ((sub.data || []) as any[]).map((c) => ({
            key: keyOf("equipment_subcategory", c.id, null),
            label: c.name,
            scope_type: "equipment_subcategory" as const,
            ref_id: c.id,
            ref_text: null,
          })),
        );
        setToolCats(
          ((tcat.data || []) as any[]).map((c) => ({
            key: keyOf("tool_category", c.id, null),
            label: c.name,
            scope_type: "tool_category" as const,
            ref_id: c.id,
            ref_text: null,
          })),
        );
        setToolSubs(
          ((tsub.data || []) as any[]).map((c) => ({
            key: keyOf("tool_subcategory", c.id, null),
            label: c.name,
            scope_type: "tool_subcategory" as const,
            ref_id: c.id,
            ref_text: null,
          })),
        );
        setSelected(
          new Set(
            (((current as any).data || []) as any[]).map((r) =>
              keyOf(r.scope_type, r.ref_id, r.ref_text),
            ),
          ),
        );
      } catch (e: any) {
        toast.error(e.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, sectionId]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allOptions = [...equipCats, ...equipSubs, ...toolCats, ...toolSubs, ...deviceOptions];

  const save = async () => {
    setSaving(true);
    try {
      const { error: delErr } = await (supabase as any)
        .from("section_scopes")
        .delete()
        .eq("section_id", sectionId);
      if (delErr) throw delErr;
      const rows = allOptions
        .filter((o) => selected.has(o.key))
        .map((o) => ({
          section_id: sectionId,
          scope_type: o.scope_type,
          ref_id: o.ref_id,
          ref_text: o.ref_text,
        }));
      if (rows.length > 0) {
        const { error } = await (supabase as any).from("section_scopes").insert(rows);
        if (error) throw error;
      }
      toast.success("บันทึกขอบเขตหมวดหมู่สำเร็จ");
      setOpen(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const renderGroup = (title: string, options: Option[]) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">
        {title}{" "}
        <Badge variant="secondary" className="ml-1 text-[10px]">
          {options.filter((o) => selected.has(o.key)).length}/{options.length}
        </Badge>
      </Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">ไม่มีข้อมูล</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {options.map((o) => (
            <label
              key={o.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded border text-sm cursor-pointer hover:bg-muted/50"
            >
              <Checkbox checked={selected.has(o.key)} onCheckedChange={() => toggle(o.key)} />
              <span className="truncate" title={o.label}>
                {o.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="ขอบเขตหมวดหมู่ของแผนก">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ขอบเขตหมวดหมู่ของแผนก — {sectionName}</DialogTitle>
          <DialogDescription>
            เลือกหมวดหมู่ที่แผนกนี้ดูแล ผู้ใช้ที่สังกัดแผนกนี้จะเห็นเฉพาะรายการในหมวดที่เลือก
            (ถ้าไม่เลือกอะไรเลย = ไม่จำกัดหมวดหมู่)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">กำลังโหลด...</div>
        ) : (
          <div className="space-y-4">
            {renderGroup("หมวดหมู่อุปกรณ์/อะไหล่", equipCats)}
            <Separator />
            {renderGroup("หมวดหมู่ย่อยอุปกรณ์", equipSubs)}
            <Separator />
            {renderGroup("ประเภท Media Player / จอภาพ", deviceOptions)}
            <Separator />
            {renderGroup("หมวดหมู่เครื่องมือ", toolCats)}
            <Separator />
            {renderGroup("หมวดหมู่ย่อยเครื่องมือ", toolSubs)}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
