import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, ListOrdered } from "lucide-react";
import { toast } from "sonner";

interface Props {
  serials: string;
  inStockCount?: number;
  totalCount?: number;
}

/** Compact S/N cell: first S/N + "+N" chip; full searchable list in a popover. */
export function SerialListPopover({ serials, inStockCount, totalCount }: Props) {
  const list = useMemo(() => serials.split(/\r?\n/).map((s) => s.trim()).filter(Boolean), [serials]);
  const [q, setQ] = useState("");
  const filtered = q.trim() ? list.filter((s) => s.toLowerCase().includes(q.trim().toLowerCase())) : list;

  if (list.length <= 1) return <span className="whitespace-nowrap">{list[0] ?? "-"}</span>;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(list.join("\n"));
      toast.success(`คัดลอก ${list.length} S/N แล้ว`);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="truncate max-w-[130px]" title={list[0]}>{list[0]}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-sans font-medium text-primary hover:bg-primary/20"
            title="ดู S/N ทั้งหมด"
          >
            <ListOrdered className="h-3 w-3" />+{list.length - 1}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              S/N ทั้งหมด {list.length} รายการ
              {inStockCount != null && totalCount != null && (
                <div className="text-xs font-normal text-muted-foreground">ในคลัง {inStockCount} / ทั้งหมด {totalCount}</div>
              )}
            </div>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={copyAll}>
              <Copy className="h-3 w-3 mr-1" />คัดลอก
            </Button>
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา S/N..." className="h-8 mb-2" />
          <ol className="max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
            {filtered.map((s, i) => (
              <li key={`${s}-${i}`} className="flex gap-2 rounded px-1 py-0.5 hover:bg-muted">
                <span className="w-6 text-right text-muted-foreground">{list.indexOf(s) + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
            {filtered.length === 0 && <li className="text-muted-foreground font-sans">ไม่พบ S/N</li>}
          </ol>
        </PopoverContent>
      </Popover>
    </div>
  );
}
