import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { GUIDE_ICON_NAMES, GUIDE_COLOR_PRESETS, GuideIcon } from "./guideEntryIcons";
import { MENU_TITLES } from "./guideMenuOptions";

export interface GuideEntry {
  id?: string;
  kind: "role" | "function";
  entry_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  bullets: string[];
  related: string[];
  display_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "role" | "function";
  entry?: GuideEntry | null;
  onSaved: () => void;
}

export function GuideEntryDialog({ open, onOpenChange, kind, entry, onSaved }: Props) {
  const isEdit = !!entry?.id;
  const [form, setForm] = useState<GuideEntry>({
    kind,
    entry_key: "",
    label: "",
    description: "",
    icon: "Shield",
    color: GUIDE_COLOR_PRESETS[0].value,
    bullets: [],
    related: [],
    display_order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [functionLabels, setFunctionLabels] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setForm(entry ? { ...entry } : {
        kind,
        entry_key: "",
        label: "",
        description: "",
        icon: "Shield",
        color: GUIDE_COLOR_PRESETS[0].value,
        bullets: [],
        related: [],
        display_order: 0,
      });
    }
  }, [open, entry, kind]);

  // For role dialog, load function labels to build the dropdown options.
  useEffect(() => {
    if (!open || kind !== "role") return;
    (supabase as any)
      .from("admin_guide_entries")
      .select("label")
      .eq("kind", "function")
      .order("display_order")
      .then(({ data }: any) => {
        setFunctionLabels((data || []).map((d: any) => d.label));
      });
  }, [open, kind]);

  const relatedOptions = useMemo(() => {
    const source = kind === "role" ? functionLabels : MENU_TITLES;
    // Merge in any legacy values already saved on this entry so they remain visible.
    const merged = Array.from(new Set([...source, ...(form.related || [])]));
    return merged.map((v) => ({ value: v, label: v }));
  }, [kind, functionLabels, form.related]);


  const updateArrayItem = (key: "bullets" | "related", idx: number, val: string) => {
    setForm((f) => ({ ...f, [key]: f[key].map((x, i) => (i === idx ? val : x)) }));
  };
  const addArrayItem = (key: "bullets" | "related") =>
    setForm((f) => ({ ...f, [key]: [...f[key], ""] }));
  const removeArrayItem = (key: "bullets" | "related", idx: number) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.entry_key.trim() || !form.label.trim()) {
      toast.error("กรุณากรอกคีย์และป้ายชื่อ");
      return;
    }
    setSaving(true);
    const payload = {
      kind: form.kind,
      entry_key: form.entry_key.trim(),
      label: form.label.trim(),
      description: form.description || null,
      icon: form.icon,
      color: form.color,
      bullets: form.bullets.map((b) => b.trim()).filter(Boolean),
      related: form.related.map((r) => r.trim()).filter(Boolean),
      display_order: Number(form.display_order) || 0,
    };
    const { error } = isEdit
      ? await (supabase as any).from("admin_guide_entries").update(payload).eq("id", entry!.id)
      : await (supabase as any).from("admin_guide_entries").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success(isEdit ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไข" : "เพิ่ม"}
            {kind === "role" ? " บทบาท" : " ฟังก์ชัน"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>คีย์ (ภายในระบบ)</Label>
              <Input
                value={form.entry_key}
                onChange={(e) => setForm({ ...form, entry_key: e.target.value })}
                placeholder={kind === "role" ? "e.g. warehouse_staff" : "e.g. goods_receipt"}
                disabled={isEdit}
              />
            </div>
            <div>
              <Label>ลำดับ</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>ป้ายชื่อ</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div>
            <Label>คำอธิบาย</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ไอคอน</Label>
              <Select value={form.icon || "Shield"} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {GUIDE_ICON_NAMES.map((n) => (
                    <SelectItem key={n} value={n}>
                      <div className="flex items-center gap-2">
                        <GuideIcon name={n} className="h-4 w-4" />
                        {n}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>โทนสี</Label>
              <Select value={form.color || ""} onValueChange={(v) => setForm({ ...form, color: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUIDE_COLOR_PRESETS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className={`inline-block px-2 py-0.5 rounded border ${c.value}`}>{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ArrayEditor
            label="สิทธิ์/สิ่งที่ทำได้ (หัวข้อย่อย)"
            items={form.bullets}
            onChange={(i, v) => updateArrayItem("bullets", i, v)}
            onAdd={() => addArrayItem("bullets")}
            onRemove={(i) => removeArrayItem("bullets", i)}
          />
          <ArrayEditor
            label="หน้าที่เข้าถึงได้"
            items={form.related}
            onChange={(i, v) => updateArrayItem("related", i, v)}
            onAdd={() => addArrayItem("related")}
            onRemove={(i) => removeArrayItem("related", i)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArrayEditor({
  label, items, onChange, onAdd, onRemove,
}: {
  label: string;
  items: string[];
  onChange: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่ม
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มีรายการ</p>}
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <Input value={item} onChange={(e) => onChange(i, e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(i)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
