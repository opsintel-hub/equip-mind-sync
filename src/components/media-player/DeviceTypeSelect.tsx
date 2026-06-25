import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DEVICE_TYPES, DEVICE_TYPE_LABELS, DeviceType } from "@/lib/deviceTypes";

interface Props {
  value: DeviceType | string | null | undefined;
  onChange: (v: DeviceType) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  id?: string;
  hint?: string;
}

export function DeviceTypeSelect({ value, onChange, disabled, label, required, id, hint }: Props) {
  return (
    <div className="space-y-1.5">
      {label !== "" && (
        <Label htmlFor={id}>
          {label || "ประเภทอุปกรณ์"}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Select
        value={(value as string) || "MEDIA_PLAYER"}
        onValueChange={(v) => onChange(v as DeviceType)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="-- เลือกประเภทอุปกรณ์ --" />
        </SelectTrigger>
        <SelectContent>
          {DEVICE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{DEVICE_TYPE_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
