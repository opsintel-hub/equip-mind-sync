import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchEquipmentCompatMap,
  fetchEquipmentCompatModes,
  getCompatibilityBadge,
} from "@/lib/compatibility";

interface Props {
  equipmentId?: string | null;
  /** Skip rendering (returns "-") when true, e.g. row is media_player/tool */
  skip?: boolean;
  className?: string;
}

/**
 * Standalone compatibility badge cell for reports.
 * Loads maps via React Query so multiple usages share the cache.
 */
export function CompatibilityBadgeCell({ equipmentId, skip, className }: Props) {
  const { data: compatMap = {} } = useQuery({
    queryKey: ["equipment-compat-map"],
    queryFn: fetchEquipmentCompatMap,
    staleTime: 60_000,
  });
  const { data: modeMap = {} } = useQuery({
    queryKey: ["equipment-compat-modes"],
    queryFn: fetchEquipmentCompatModes,
    staleTime: 60_000,
  });

  if (skip || !equipmentId) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }
  const info = modeMap[equipmentId];
  const mode = info?.mode || "unrestricted";
  const count = compatMap[equipmentId]?.size;
  const b = getCompatibilityBadge(mode, count);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${b.className} text-xs cursor-help ${className || ""}`}>
            {b.icon} {b.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {mode === "unrestricted"
            ? "ใช้ได้กับป้ายทั้งหมด"
            : `รองรับ ${count || 0} ป้าย`}
          {info?.notes && (
            <div className="mt-1 text-xs text-muted-foreground">{info.notes}</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
