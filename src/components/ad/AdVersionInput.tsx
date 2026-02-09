import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface AdVersion {
  version_name: string;
  quantity: number;
}

interface AdVersionInputProps {
  versions: AdVersion[];
  onChange: (versions: AdVersion[]) => void;
  disabled?: boolean;
}

export function AdVersionInput({ versions, onChange, disabled }: AdVersionInputProps) {
  const addVersion = () => {
    onChange([...versions, { version_name: "", quantity: 1 }]);
  };

  const removeVersion = (index: number) => {
    if (versions.length <= 1) return;
    onChange(versions.filter((_, i) => i !== index));
  };

  const updateVersion = (index: number, field: keyof AdVersion, value: string | number) => {
    const updated = versions.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    );
    onChange(updated);
  };

  const totalQuantity = versions.reduce((sum, v) => sum + (v.quantity || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">เวอร์ชันภาพ *</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVersion}
          disabled={disabled}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          เพิ่มเวอร์ชัน
        </Button>
      </div>

      <div className="space-y-2">
        {versions.map((version, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder={`ชื่อเวอร์ชัน เช่น Version ${String.fromCharCode(65 + index)}`}
                value={version.version_name}
                onChange={(e) => updateVersion(index, "version_name", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min={1}
                placeholder="จำนวน"
                value={version.quantity || ""}
                onChange={(e) =>
                  updateVersion(index, "quantity", parseInt(e.target.value) || 0)
                }
                disabled={disabled}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeVersion(index)}
              disabled={disabled || versions.length <= 1}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">
          ผลรวมจำนวนภาพทั้งหมด
        </span>
        <span className="text-lg font-bold text-primary">{totalQuantity} ชิ้น</span>
      </div>
    </div>
  );
}
