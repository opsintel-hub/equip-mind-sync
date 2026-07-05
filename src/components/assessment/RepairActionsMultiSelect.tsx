import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu, Code2, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

export interface RepairActionOption {
  id: string;
  name: string;
  scope: "hardware" | "software";
  applies_to_device: "media_player" | "monitor" | "both";
}

interface Props {
  deviceType?: string | null; // "MEDIA_PLAYER" | "MONITOR" (falls back to media_player)
  scopeFilter: ("hardware" | "software")[]; // filter dropdown to selected scopes
  selectedIds: string[];
  onChange: (ids: string[], snapshot: RepairActionOption[]) => void;
  canCreate?: boolean; // allow inline "+ เพิ่มรายการใหม่"
}

export function RepairActionsMultiSelect({ deviceType, scopeFilter, selectedIds, onChange, canCreate = true }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<RepairActionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState<"hardware" | "software">("hardware");

  const deviceKey: "media_player" | "monitor" = String(deviceType || "").toUpperCase() === "MONITOR" ? "monitor" : "media_player";

  const fetchOptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repair_actions")
      .select("id, name, scope, applies_to_device, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (!error) {
      setOptions(((data as any[]) || []).map((r) => ({
        id: r.id, name: r.name, scope: r.scope, applies_to_device: r.applies_to_device,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchOptions(); }, []);

  const filtered = useMemo(() => {
    return options.filter((o) => {
      if (scopeFilter.length > 0 && !scopeFilter.includes(o.scope)) return false;
      if (o.applies_to_device !== "both" && o.applies_to_device !== deviceKey) return false;
      if (search.trim() && !o.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [options, scopeFilter, deviceKey, search]);

  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id];
    const snap = options.filter((o) => next.includes(o.id));
    onChange(next, snap);
  };

  const remove = (id: string) => {
    const next = selectedIds.filter((i) => i !== id);
    const snap = options.filter((o) => next.includes(o.id));
    onChange(next, snap);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from("repair_actions").insert({
        name: newName.trim(),
        scope: newScope,
        applies_to_device: "both",
        sort_order: 9999,
        is_active: true,
      }).select("id, name, scope, applies_to_device").single();
      if (error) throw error;
      const created = data as RepairActionOption;
      setOptions((prev) => [...prev, created]);
      const next = [...selectedIds, created.id];
      const snap = [...options, created].filter((o) => next.includes(o.id));
      onChange(next, snap);
      setNewName("");
      setCreateOpen(false);
      toast.success("เพิ่มรายการใหม่แล้ว");
    } catch (e: any) {
      toast.error("เพิ่มไม่สำเร็จ: " + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between font-normal">
              <span className="text-muted-foreground">
                {selectedIds.length === 0 ? "เลือกรายการที่ซ่อม/เปลี่ยน..." : `เลือกแล้ว ${selectedIds.length} รายการ`}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="ค้นหารายการ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
              {scopeFilter.length === 0 && (
                <p className="text-[11px] text-warning mt-1">กรุณาเลือกประเภทงานซ่อม (Hardware/Software) ก่อน</p>
              )}
            </div>
            <ScrollArea className="h-64">
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground text-center">กำลังโหลด...</div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  {scopeFilter.length === 0 ? "—" : "ไม่พบรายการ ลองกดปุ่ม + เพื่อเพิ่มใหม่"}
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((o) => {
                    const checked = selectedIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggle(o.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded hover:bg-accent"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(o.id)} onClick={(e) => e.stopPropagation()} />
                        <span className="flex-1">{o.name}</span>
                        <Badge variant={o.scope === "hardware" ? "secondary" : "outline"} className="gap-1 text-[10px] px-1.5 py-0">
                          {o.scope === "hardware" ? <Cpu className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
                          {o.scope === "hardware" ? "HW" : "SW"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {canCreate && (
          <Popover open={createOpen} onOpenChange={setCreateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" type="button" title="เพิ่มรายการใหม่ (Master Data)">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-4 border-b">
                <h4 className="text-sm font-semibold">เพิ่มรายการใหม่</h4>
                <p className="text-xs text-muted-foreground">สร้างรายการ Master Data สำหรับการซ่อม/เปลี่ยน</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-repair-action-name" className="text-xs">
                    ชื่อรายการ
                  </Label>
                  <Input
                    id="new-repair-action-name"
                    placeholder="ระบุชื่อรายการ..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-repair-action-scope" className="text-xs">
                    ประเภท
                  </Label>
                  <Select
                    value={newScope}
                    onValueChange={(value) => setNewScope(value as "hardware" | "software")}
                  >
                    <SelectTrigger id="new-repair-action-scope" className="w-full">
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardware">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5" />
                          <span>Hardware (HW)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="software">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-3.5 w-3.5" />
                          <span>Software (SW)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => { setCreateOpen(false); setNewName(""); }}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  เพิ่มรายการ
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
              {o.scope === "hardware" ? <Cpu className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
              {o.name}
              <button type="button" onClick={() => remove(o.id)} className="ml-1 rounded hover:bg-background/50 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
