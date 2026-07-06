import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Check, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  applyPresetToUser,
  presetPermissionSummary,
  type PermissionPreset,
} from "@/lib/permissions";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";

interface QuickPresetSelectorProps {
  userId: string;
  userFullName: string;
  allDepartments: string[];
  presets: PermissionPreset[];
  currentPresetKey: string | null;
  currentDepartments: string[]; // depts currently linked to user (can_view=true)
  requestedDepartment?: string | null; // fallback default
  onApplied: () => void;
}

export function QuickPresetSelector({
  userId,
  userFullName,
  allDepartments,
  presets,
  currentPresetKey,
  currentDepartments,
  requestedDepartment,
  onApplied,
}: QuickPresetSelectorProps) {
  const [selectedKey, setSelectedKey] = useState<string>(currentPresetKey || "");
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    currentDepartments.length > 0
      ? currentDepartments
      : requestedDepartment
        ? [requestedDepartment]
        : [],
  );
  const [saving, setSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    setSelectedKey(currentPresetKey || "");
  }, [currentPresetKey]);

  useEffect(() => {
    setSelectedDepts(
      currentDepartments.length > 0
        ? currentDepartments
        : requestedDepartment
          ? [requestedDepartment]
          : [],
    );
  }, [currentDepartments.join("|"), requestedDepartment]);

  const preset = useMemo(
    () => presets.find((p) => p.template_key === selectedKey) || null,
    [presets, selectedKey],
  );

  const isAllDepartments = preset?.template_key === "super_admin";
  const needsDepartment = !isAllDepartments && !!preset;

  const changed =
    selectedKey !== (currentPresetKey || "") ||
    JSON.stringify([...selectedDepts].sort()) !==
      JSON.stringify([...currentDepartments].sort());

  const toggleDept = (name: string) =>
    setSelectedDepts((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name],
    );

  const handleApply = async () => {
    if (!preset) {
      toast.error("กรุณาเลือก Preset ก่อน");
      return;
    }
    const deptsToSave = isAllDepartments ? allDepartments : selectedDepts;
    if (needsDepartment && deptsToSave.length === 0) {
      toast.error("กรุณาเลือกฝ่ายอย่างน้อย 1 ฝ่าย");
      return;
    }
    setSaving(true);
    try {
      await applyPresetToUser(userId, preset, deptsToSave);
      toast.success(`ตั้งสิทธิ์เป็น "${preset.label}" สำเร็จ (${userFullName})`);
      setPopoverOpen(false);
      onApplied();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const functionLabels = useMemo(() => {
    if (!preset) return [];
    return preset.suggested_functions
      .map((fn) => SYSTEM_FUNCTIONS.find((s) => s.name === fn)?.label || fn)
      .slice(0, 6);
  }, [preset]);

  return (
    <div className="flex items-center gap-2 min-w-[220px]">
      <Select value={selectedKey} onValueChange={setSelectedKey}>
        <SelectTrigger className="h-8 text-xs w-full max-w-[220px]">
          <SelectValue placeholder="เลือก Preset..." />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.template_key} value={p.template_key}>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{p.label}</span>
                {p.description && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                    {p.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={changed ? "default" : "outline"}
            size="sm"
            className="h-8"
            disabled={!preset}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            ใช้เลย
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-4" align="end">
          {!preset ? (
            <p className="text-sm text-muted-foreground">เลือก Preset ก่อน</p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {preset.label}
                </div>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {preset.description}
                  </p>
                )}
              </div>

              <div className="text-xs">
                <div className="font-medium text-foreground mb-1">
                  เมนูที่จะเปิด ({preset.suggested_functions.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {functionLabels.map((l) => (
                    <Badge key={l} variant="secondary" className="text-[10px]">
                      {l}
                    </Badge>
                  ))}
                  {preset.suggested_functions.length > functionLabels.length && (
                    <Badge variant="outline" className="text-[10px]">
                      +{preset.suggested_functions.length - functionLabels.length}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs">
                <div className="font-medium text-foreground mb-1">
                  สิทธิ์ในฝ่าย
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {presetPermissionSummary(preset)}
                </Badge>
              </div>

              {isAllDepartments ? (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-xs text-primary">
                  ครอบคลุมทุกฝ่ายอัตโนมัติ
                </div>
              ) : (
                <div className="text-xs">
                  <div className="font-medium text-foreground mb-1 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    ฝ่ายที่รับผิดชอบ (เลือกได้หลายฝ่าย)
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
                    {allDepartments.map((d) => {
                      const checked = selectedDepts.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDept(d)}
                          className={cn(
                            "flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-left transition-colors",
                            checked
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border hover:border-primary/50 text-muted-foreground",
                          )}
                        >
                          {checked && <Check className="h-3 w-3 text-primary" />}
                          <span className="truncate">{d}</span>
                        </button>
                      );
                    })}
                  </div>
                  {allDepartments.length === 0 && (
                    <p className="text-muted-foreground">ยังไม่มีฝ่ายในระบบ</p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="sm"
                onClick={handleApply}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-2" />
                    ยืนยันตั้งสิทธิ์
                  </>
                )}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
