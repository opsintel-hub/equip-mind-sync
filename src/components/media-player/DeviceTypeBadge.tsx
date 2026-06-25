import { Badge } from "@/components/ui/badge";
import { deviceLabel, isMonitor } from "@/lib/deviceTypes";
import { Monitor, MonitorPlay } from "lucide-react";

interface Props {
  value?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function DeviceTypeBadge({ value, className, showIcon = true }: Props) {
  const monitor = isMonitor(value);
  const color = monitor
    ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200"
    : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200";
  const Icon = monitor ? Monitor : MonitorPlay;
  return (
    <Badge variant="outline" className={`gap-1 ${color} ${className ?? ""}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      {deviceLabel(value)}
    </Badge>
  );
}
