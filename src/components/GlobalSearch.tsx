import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Cpu, MonitorSpeaker, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatBillboardLabel } from "@/lib/billboardUtils";

type ResultType = "equipment" | "media_player" | "billboard";

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
}

const TYPE_META: Record<ResultType, { label: string; icon: any; color: string }> = {
  equipment: { label: "อุปกรณ์", icon: Package, color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  media_player: { label: "Media Player", icon: MonitorSpeaker, color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  billboard: { label: "ป้ายโฆษณา", icon: Cpu, color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const q = debounced;
      const like = `%${q}%`;

      const [eqRes, snRes, mpRes, bbRes] = await Promise.all([
        supabase
          .from("equipment")
          .select("id, code, name, brand, serial_number")
          .eq("is_active", true)
          .or(`code.ilike.${like},name.ilike.${like},brand.ilike.${like},serial_number.ilike.${like}`)
          .limit(15),
        supabase
          .from("equipment_serial_numbers")
          .select("id, serial_number, status, equipment:equipment_id(id, code, name, brand)")
          .ilike("serial_number", like)
          .limit(15),
        supabase
          .from("media_players")
          .select("id, code, name, brand, specification, serial_number_1, serial_number_2, status")
          .or(
            `code.ilike.${like},name.ilike.${like},brand.ilike.${like},specification.ilike.${like},serial_number_1.ilike.${like},serial_number_2.ilike.${like}`
          )
          .limit(15),
        supabase
          .from("billboards")
          .select("id, equipment_id, old_code, location_name, department, size, status")
          .or(`equipment_id.ilike.${like},old_code.ilike.${like},location_name.ilike.${like}`)
          .limit(15),
      ]);

      if (cancelled) return;

      const merged: SearchResult[] = [];

      (eqRes.data || []).forEach((e: any) => {
        merged.push({
          id: `eq:${e.id}`,
          type: "equipment",
          title: `${e.code} - ${e.name}`,
          subtitle: e.brand || undefined,
          meta: e.serial_number ? `S/N: ${e.serial_number}` : undefined,
          href: `/stock-card?equipmentId=${e.id}`,
        });
      });

      const seenEqSn = new Set<string>();
      (snRes.data || []).forEach((s: any) => {
        const eq = s.equipment;
        if (!eq) return;
        const key = `${eq.id}::${s.serial_number}`;
        if (seenEqSn.has(key)) return;
        seenEqSn.add(key);
        merged.push({
          id: `sn:${s.id}`,
          type: "equipment",
          title: `${eq.code} - ${eq.name}`,
          subtitle: eq.brand || undefined,
          meta: `S/N: ${s.serial_number} • ${s.status}`,
          href: `/stock-card?equipmentId=${eq.id}`,
        });
      });

      (mpRes.data || []).forEach((m: any) => {
        const sns = [m.serial_number_1, m.serial_number_2].filter(Boolean).join(" / ");
        merged.push({
          id: `mp:${m.id}`,
          type: "media_player",
          title: `${m.code} - ${m.name}`,
          subtitle: [m.brand, m.specification].filter(Boolean).join(" • ") || undefined,
          meta: [sns && `S/N: ${sns}`, m.status && `สถานะ: ${m.status}`].filter(Boolean).join(" • "),
          href: `/media-player/${m.id}`,
        });
      });

      (bbRes.data || []).forEach((b: any) => {
        merged.push({
          id: `bb:${b.id}`,
          type: "billboard",
          title: formatBillboardLabel(b.old_code, b.location_name, b.equipment_id),
          subtitle: [b.department, b.size].filter(Boolean).join(" | ") || undefined,
          meta: b.equipment_id ? `Equipment ID: ${b.equipment_id}` : undefined,
          href: `/billboards/${b.id}`,
        });
      });

      setResults(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const g: Record<ResultType, SearchResult[]> = { equipment: [], media_player: [], billboard: [] };
    results.forEach((r) => g[r.type].push(r));
    return g;
  }, [results]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setTerm("");
    navigate(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 text-muted-foreground font-normal"
        title="ค้นหาทั่วระบบ (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">ค้นหา S/N, รุ่น, ป้าย...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">ค้นหาทั่วระบบ</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="พิมพ์ S/N, รหัส, ชื่อ, รุ่น, ยี่ห้อ, รหัสป้าย, สถานที่..."
                className="pl-9 h-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ค้นรวมจาก: อุปกรณ์ + Serial Numbers • Media Player (S/N1, S/N2) • ป้ายโฆษณา (Old Code, Equipment ID, สถานที่)
            </p>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {!debounced || debounced.length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-12">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
              ) : loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">กำลังค้นหา...</span>
                </div>
              ) : results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">ไม่พบรายการที่ตรงกับ "{debounced}"</p>
              ) : (
                (Object.keys(grouped) as ResultType[]).map((type) => {
                  const items = grouped[type];
                  if (items.length === 0) return null;
                  const meta = TYPE_META[type];
                  const Icon = meta.icon;
                  return (
                    <div key={type} className="mb-3">
                      <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-background/95 backdrop-blur z-[1]">
                        <Badge variant="secondary" className={meta.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{items.length} รายการ</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleSelect(r.href)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors group"
                          >
                            <div className="font-medium text-sm truncate">{r.title}</div>
                            {r.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                            )}
                            {r.meta && (
                              <div className="text-xs text-muted-foreground/80 truncate whitespace-pre-line">{r.meta}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
