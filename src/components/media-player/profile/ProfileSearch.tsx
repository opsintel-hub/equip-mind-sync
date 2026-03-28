import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Monitor, Loader2 } from "lucide-react";
import { SearchResult } from "./types";

export function ProfileSearch() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const term = `%${searchTerm}%`;

      // Search media_players directly
      const { data: directResults } = await supabase
        .from("media_players")
        .select("id, code, name, serial_number_1, serial_number_2")
        .eq("is_active", true)
        .or(`code.ilike.${term},name.ilike.${term},serial_number_1.ilike.${term},serial_number_2.ilike.${term}`)
        .limit(10);

      // Also search goods_receipt_pending for delivery S/N
      const { data: receiptMatches } = await supabase
        .from("goods_receipt_pending")
        .select("media_player_id, serial_number")
        .not("media_player_id", "is", null)
        .ilike("serial_number", term)
        .limit(10);

      // Build receipt S/N map for display
      const receiptSnMap: Record<string, string[]> = {};
      (receiptMatches || []).forEach((r: any) => {
        const pid = r.media_player_id;
        const sn = r.serial_number?.trim();
        if (!pid || !sn) return;
        if (!receiptSnMap[pid]) receiptSnMap[pid] = [];
        if (!receiptSnMap[pid].includes(sn)) receiptSnMap[pid].push(sn);
      });

      const directIds = new Set((directResults || []).map((r: any) => r.id));
      const extraIds = (receiptMatches || [])
        .map((r: any) => r.media_player_id)
        .filter((id: string) => !directIds.has(id));

      let combined: SearchResult[] = (directResults || []).map((r: any) => ({
        ...r,
        receipt_serials: receiptSnMap[r.id] || [],
      }));

      if (extraIds.length > 0) {
        const { data: extraPlayers } = await supabase
          .from("media_players")
          .select("id, code, name, serial_number_1, serial_number_2")
          .in("id", extraIds);
        if (extraPlayers) {
          combined = [
            ...combined,
            ...(extraPlayers as any[]).map((r: any) => ({
              ...r,
              receipt_serials: receiptSnMap[r.id] || [],
            })),
          ];
        }
      }

      setSearchResults(combined);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วย Serial Number, รหัส, หรือชื่อ Media Player..."
            className="pl-11 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {searchResults.length > 0 && (
          <div className="max-w-xl mx-auto mt-2 border rounded-lg overflow-hidden divide-y">
            {searchResults.map((r) => (
              <button
                key={r.id}
                className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                  navigate(`/media-player/${r.id}`, { replace: true });
                }}
              >
                <Monitor className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-sm">{r.code}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {r.name}
                    {r.receipt_serials && r.receipt_serials.length > 0
                      ? ` • S/N (นำเข้า): ${r.receipt_serials.join(", ")}`
                      : r.serial_number_1
                        ? ` • S/N: ${r.serial_number_1}${r.serial_number_2 ? ` / ${r.serial_number_2}` : ""}`
                        : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
          <p className="text-center text-muted-foreground mt-4">ไม่พบข้อมูลที่ตรงกัน</p>
        )}
      </CardContent>
    </Card>
  );
}
