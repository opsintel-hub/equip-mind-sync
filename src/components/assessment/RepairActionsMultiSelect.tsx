import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      toast.success("เพิ่มรายการใหม่แล้ว");
    } catch (e: any) {
      toast.error("เพิ่มไม่สำเร็จ: " + (e.message || e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
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
                {scopeFilter.length === 0 ? "—" : "ไม่พบรายการ ลองเพิ่มใหม่ด้านล่าง"}
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
          {canCreate && (
            <div className="border-t p-2 space-y-2 bg-muted/30">
              <p className="text-[11px] text-muted-foreground font-medium">+ เพิ่มรายการใหม่ (จะเข้า Master Data)</p>
              <div className="flex gap-1">
                <Input
                  placeholder="ชื่อรายการใหม่..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 flex-1"
                />
                <select
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value as any)}
                  className="h-8 text-xs border rounded px-1 bg-background"
                >
                  <option value="hardware">HW</option>
                  <option value="software">SW</option>
                </select>
                <Button size="sm" className="h-8" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

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
