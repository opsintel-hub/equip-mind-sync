import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CardBadge {
  label: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export interface CardItem {
  id: string;
  imageUrl?: string | null;
  code?: string;
  title: string;
  subtitle?: string;
  badges?: CardBadge[];
  /** small stat, e.g. "คงเหลือ 5" */
  stat?: string;
  statClass?: string;
}

interface Props {
  items: CardItem[];
  onClick?: (id: string) => void;
  emptyText?: string;
  /** override thumbnail aspect ratio */
  aspect?: "video" | "square";
}

export function EntityCardGrid({ items, onClick, emptyText, aspect = "video" }: Props) {
  if (!items.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {emptyText || "ไม่พบข้อมูล"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {items.map((it) => (
        <Card
          key={it.id}
          onClick={() => onClick?.(it.id)}
          className={cn(
            "overflow-hidden border transition-all hover:shadow-md hover:border-primary/50 flex flex-col",
            onClick && "cursor-pointer",
          )}
        >
          <div
            className={cn(
              "relative w-full bg-muted flex items-center justify-center overflow-hidden",
              aspect === "video" ? "aspect-video" : "aspect-square",
            )}
          >
            {it.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.imageUrl}
                alt={it.title}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            )}
            {it.stat && (
              <div
                className={cn(
                  "absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold shadow bg-background/90 backdrop-blur-sm",
                  it.statClass,
                )}
              >
                {it.stat}
              </div>
            )}
          </div>
          <div className="p-2.5 sm:p-3 flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="font-medium text-sm truncate flex-1" title={it.title}>
                {it.title}
              </p>
            </div>
            {it.code && (
              <p className="text-[11px] text-muted-foreground font-mono truncate">{it.code}</p>
            )}
            {it.subtitle && (
              <p className="text-[11px] text-muted-foreground truncate" title={it.subtitle}>
                {it.subtitle}
              </p>
            )}
            {it.badges && it.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                {it.badges.map((b, i) => (
                  <Badge
                    key={i}
                    variant={b.variant ?? "outline"}
                    className={cn("text-[10px] px-1.5 py-0 h-4", b.className)}
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
