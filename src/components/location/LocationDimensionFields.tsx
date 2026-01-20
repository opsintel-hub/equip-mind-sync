import { useEffect } from "react";
import { ArrowLeftRight, ArrowUpDown, MoveHorizontal, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LocationDimensionFieldsProps {
  widthCm: number | undefined;
  heightCm: number | undefined;
  depthCm: number | undefined;
  volumeCm3: number | undefined;
  onWidthChange: (value: number | undefined) => void;
  onHeightChange: (value: number | undefined) => void;
  onDepthChange: (value: number | undefined) => void;
  onVolumeChange: (value: number | undefined) => void;
  disabled?: boolean;
}

export function LocationDimensionFields({
  widthCm,
  heightCm,
  depthCm,
  volumeCm3,
  onWidthChange,
  onHeightChange,
  onDepthChange,
  onVolumeChange,
  disabled
}: LocationDimensionFieldsProps) {
  // Calculate volume when dimensions change
  useEffect(() => {
    if (widthCm && heightCm && depthCm) {
      const volume = widthCm * heightCm * depthCm;
      // Format to 2 decimal places without leading zeros
      const formattedVolume = parseFloat(volume.toFixed(2));
      onVolumeChange(formattedVolume);
    } else {
      onVolumeChange(undefined);
    }
  }, [widthCm, heightCm, depthCm, onVolumeChange]);

  const handleNumberChange = (
    value: string,
    onChange: (value: number | undefined) => void
  ) => {
    if (value === "") {
      onChange(undefined);
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">ขนาดพื้นที่จัดเก็บ (ไม่บังคับ)</Label>
      <div className="grid grid-cols-4 gap-3">
        {/* Width */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>กว้าง (ซ้าย-ขวา)</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={widthCm ?? ""}
                    onChange={(e) => handleNumberChange(e.target.value, onWidthChange)}
                    disabled={disabled}
                    className="pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    cm
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>ความกว้าง: วัดจากซ้ายไปขวาเมื่อมองหน้าตรง</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Height */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpDown className="h-3 w-3" />
                  <span>สูง (บน-ล่าง)</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={heightCm ?? ""}
                    onChange={(e) => handleNumberChange(e.target.value, onHeightChange)}
                    disabled={disabled}
                    className="pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    cm
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>ความสูง: วัดจากบนลงล่างเมื่อมองหน้าตรง</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Depth */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MoveHorizontal className="h-3 w-3" />
                  <span>ลึก (หน้า-หลัง)</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={depthCm ?? ""}
                    onChange={(e) => handleNumberChange(e.target.value, onDepthChange)}
                    disabled={disabled}
                    className="pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    cm
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>ความลึก: วัดจากหน้าไปหลังเมื่อมองหน้าตรง</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Volume */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Box className="h-3 w-3" />
                  <span>ปริมาตร</span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    value={volumeCm3 !== undefined ? volumeCm3.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                    disabled
                    className="pr-10 bg-muted"
                    placeholder="-"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    cm³
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>ลูกบาศก์เซนติเมตร = กว้าง × สูง × ลึก</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
