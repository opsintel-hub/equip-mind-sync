import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SUB_MEDIA_TYPES } from "@/lib/mediaPlayerSubTypes";

interface Props {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  id?: string;
}

const NONE = "__none__";

export function SubMediaTypeSelect({ value, onChange, required, disabled, label, hint, id }: Props) {
  return (
    <div className="space-y-1.5">
      {label !== "" && (
        <Label htmlFor={id}>
          {label || "ตำแหน่งสื่อย่อย (Sub Media Type)"}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Select
        value={value || (required ? "" : NONE)}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="-- เลือกตำแหน่งสื่อย่อย --" />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NONE}>-- ไม่ระบุ --</SelectItem>}
          {SUB_MEDIA_TYPES.map((v) => (
            <SelectItem key={v} value={v}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
