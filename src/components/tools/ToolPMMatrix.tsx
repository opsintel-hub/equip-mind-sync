import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface PMMatrixRow {
  pm_type_id: string;
  interval_days: number;
}

interface Props {
  value: PMMatrixRow[];
  onChange: (rows: PMMatrixRow[]) => void;
  disabled?: boolean;
}

interface PMType {
  id: string;
  name: string;
  description: string | null;
}

const PRESETS = [15, 30, 60, 90, 180, 365];

export function ToolPMMatrix({ value, onChange, disabled }: Props) {
  const [types, setTypes] = useState<PMType[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pm_types")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name");
      if (error) {
        toast.error("โหลดประเภท PM ไม่สำเร็จ");
        return;
      }
      setTypes(data || []);
    })();
  }, []);

  const toggle = (id: string) => {
    if (disabled) return;
    const exists = value.find((v) => v.pm_type_id === id);
    if (exists) {
      onChange(value.filter((v) => v.pm_type_id !== id));
    } else {
      onChange([...value, { pm_type_id: id, interval_days: 30 }]);
    }
  };

  const updateInterval = (id: string, days: number) => {
    onChange(value.map((v) => (v.pm_type_id === id ? { ...v, interval_days: days } : v)));
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="text-xs text-muted-foreground mb-1">
        ✅ ติ๊กประเภท PM ที่ต้องทำ แล้วระบุรอบวันของแต่ละประเภทได้อิสระ (เช่น ทำความสะอาดทุก 30 วัน / คาลิเบรตทุก 180 วัน)
      </div>
      {types.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">ยังไม่มีประเภท PM (เพิ่มที่ Master Data → ประเภทการ PM)</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-7">ประเภทการ PM</div>
            <div className="col-span-3">รอบวัน</div>
            <div className="col-span-2">Preset</div>
          </div>
          {types.map((t) => {
            const row = value.find((v) => v.pm_type_id === t.id);
            const checked = !!row;
            return (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-center bg-muted/40 rounded px-2 py-1.5">
                <div className="col-span-7 flex items-center gap-2">
                  <Checkbox
                    id={`pm-mtx-${t.id}`}
                    checked={checked}
                    onCheckedChange={() => toggle(t.id)}
                    disabled={disabled}
                  />
                  <Label htmlFor={`pm-mtx-${t.id}`} className="cursor-pointer text-sm">
                    {t.name}
                    {t.description && (
                      <span className="block text-xs text-muted-foreground">{t.description}</span>
                    )}
                  </Label>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min={1}
                    disabled={!checked || disabled}
                    value={row?.interval_days ?? 30}
                    onChange={(e) => updateInterval(t.id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8"
                  />
                </div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={!checked || disabled}
                      onClick={() => updateInterval(t.id, p)}
                      className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-primary/10 disabled:opacity-40"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export async function loadToolPMMatrix(toolId: string): Promise<PMMatrixRow[]> {
  const { data } = await supabase
    .from("tool_pm_types")
    .select("pm_type_id, interval_days")
    .eq("tool_id", toolId);
  return (data || []).map((r: any) => ({
    pm_type_id: r.pm_type_id,
    interval_days: r.interval_days ?? 30,
  }));
}

export async function saveToolPMMatrix(toolId: string, rows: PMMatrixRow[]) {
  await supabase.from("tool_pm_types").delete().eq("tool_id", toolId);
  if (rows.length > 0) {
    await supabase.from("tool_pm_types").insert(
      rows.map((r) => ({
        tool_id: toolId,
        pm_type_id: r.pm_type_id,
        interval_days: r.interval_days,
      }))
    );

    // Sync legacy tools.pm_interval_days = smallest interval so lists/tasks reflect matrix
    const minInterval = Math.max(
      1,
      Math.min(...rows.map((r) => r.interval_days || 30))
    );
    await supabase
      .from("tools")
      .update({ pm_interval_days: minInterval })
      .eq("id", toolId);

    // Ensure at least one pending/in_progress task exists so the calendar shows PM
    const { data: activeTasks } = await supabase
      .from("tool_pm_tasks")
      .select("id, due_date, status")
      .eq("tool_id", toolId)
      .in("status", ["pending", "in_progress"]);

    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + minInterval);
    const dueStr = due.toISOString().split("T")[0];

    if (!activeTasks || activeTasks.length === 0) {
      await supabase.from("tool_pm_tasks").insert({
        tool_id: toolId,
        due_date: dueStr,
        status: "pending",
      });
    } else {
      // Re-align the earliest active task's due date to the new interval
      const earliest = [...activeTasks].sort(
        (a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
      await supabase
        .from("tool_pm_tasks")
        .update({ due_date: dueStr })
        .eq("id", earliest.id);
    }
  }
}
