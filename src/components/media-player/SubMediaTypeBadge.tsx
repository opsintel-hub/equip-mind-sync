import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { SubMediaTypeSelect } from "./SubMediaTypeSelect";
import { requiresSubMediaType, SEVEN_ELEVEN_DEPT_NAME } from "@/lib/mediaPlayerSubTypes";
import { cn } from "@/lib/utils";

interface Props {
  department?: string | null;
  subMediaType?: string | null;
  size?: "xs" | "sm" | "md";
  onEdit?: (next: string | null) => void | Promise<void>;
  /** If true, always shows the badge area (with placeholder dash) when 7-Eleven Media. */
  showPlaceholder?: boolean;
  className?: string;
}

/**
 * Badge for displaying (and optionally editing) the 7-Eleven Media `sub_media_type`.
 * Returns null when the department is not 7-Eleven Media (unless onEdit is provided and showPlaceholder=true).
 */
export function SubMediaTypeBadge({
  department,
  subMediaType,
  size = "sm",
  onEdit,
  showPlaceholder = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(subMediaType ?? null);
  const [saving, setSaving] = useState(false);

  const isSevenEleven = requiresSubMediaType(department);
  if (!isSevenEleven) return null;
  if (!subMediaType && !showPlaceholder && !onEdit) return null;

  const sizeCls =
    size === "xs"
      ? "text-[10px] px-1.5 py-0 h-4"
      : size === "md"
      ? "text-sm px-2.5 py-0.5"
      : "text-xs px-2 py-0.5";

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-mono border-emerald-500/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        sizeCls,
        className,
      )}
    >
      <span className="mr-1 text-[9px] font-bold text-orange-600 dark:text-orange-400">7-11</span>
      {subMediaType || "—"}
    </Badge>
  );

  const wrapped = (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          ฝ่าย {SEVEN_ELEVEN_DEPT_NAME}
          {subMediaType ? ` — ตำแหน่ง: ${subMediaType}` : " — ยังไม่ได้ระบุตำแหน่ง"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (!onEdit) return wrapped;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(subMediaType ?? null);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 hover:opacity-80">
          {wrapped}
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <SubMediaTypeSelect
            value={draft}
            onChange={(v) => setDraft(v)}
            label="แก้ไขตำแหน่งสื่อย่อย"
            hint="แก้ได้ทุกขั้น — รองรับการเปลี่ยนตำแหน่งหน้างาน"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                setSaving(true);
                try {
                  await onEdit(draft);
                  setOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
