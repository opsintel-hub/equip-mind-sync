import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, MonitorPlay, LayoutGrid } from "lucide-react";

export type DeviceTypeFilter = "ALL" | "MEDIA_PLAYER" | "MONITOR";

interface Props {
  value: DeviceTypeFilter;
  onChange: (v: DeviceTypeFilter) => void;
  className?: string;
}

export function DeviceTypeTabs({ value, onChange, className }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DeviceTypeFilter)} className={className}>
      <TabsList>
        <TabsTrigger value="ALL" className="gap-1.5">
          <LayoutGrid className="h-4 w-4" /> ทั้งหมด
        </TabsTrigger>
        <TabsTrigger value="MEDIA_PLAYER" className="gap-1.5">
          <MonitorPlay className="h-4 w-4" /> Media Player
        </TabsTrigger>
        <TabsTrigger value="MONITOR" className="gap-1.5">
          <Monitor className="h-4 w-4" /> จอภาพ
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
