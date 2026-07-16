import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Monitor, Loader2, MapPin, AlertCircle } from "lucide-react";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { useDeptScope } from "@/hooks/useDeptScope";

interface SearchRow {
  id: string;
  code: string;
  name: string;
  serial_number_1: string | null;
  serial_number_2: string | null;
  status: string | null;
  device_type: string | null;
  asset_code: string | null;
  created_at: string;
  location_id: string | null;
  billboard_id: string | null;
  locations?: { name: string } | null;
  billboard?: { equipment_id: string; old_code: string | null; location_name: string | null } | null;
  receipt_serials?: string[];
}

export function ProfileSearch() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { isSuperAdmin, viewableDepts, deptKey } = useDeptScope();
  const scopeDepts = isSuperAdmin ? null : ((viewableDepts && viewableDepts.length > 0) ? viewableDepts : ["__no_dept_permission__"]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const term = `%${searchTerm}%`;

      const selectStr = `
        id, code, name, serial_number_1, serial_number_2, status, device_type,
        asset_code, created_at, location_id, billboard_id, department,
        locations(name),
        billboard:billboards(equipment_id, old_code, location_name)
      `;

      let directQ = supabase
        .from("media_players")
        .select(selectStr)
        .eq("is_active", true)
        .or(`code.ilike.${term},name.ilike.${term},serial_number_1.ilike.${term},serial_number_2.ilike.${term},asset_code.ilike.${term}`)
        .order("code")
        .order("created_at")
        .limit(50);
      if (scopeDepts) directQ = directQ.in("department", scopeDepts);
      const { data: directResults } = await directQ;

      const { data: receiptMatches } = await supabase
        .from("goods_receipt_pending")
        .select("media_player_id, serial_number")
        .not("media_player_id", "is", null)
        .ilike("serial_number", term)
        .limit(20);

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

      let combined: SearchRow[] = ((directResults as any[]) || []).map((r: any) => ({
        ...r,
        receipt_serials: receiptSnMap[r.id] || [],
      }));

      if (extraIds.length > 0) {
        const { data: extraPlayers } = await supabase
          .from("media_players")
          .select(selectStr)
          .in("id", extraIds);
        if (extraPlayers) {
          combined = [
            ...combined,
            ...((extraPlayers as any[]) || []).map((r: any) => ({
              ...r,
              receipt_serials: receiptSnMap[r.id] || [],
            })),
          ];
        }
      }

      // Sort by code then created_at to keep groups together
      combined.sort((a, b) => (a.code || "").localeCompare(b.code || "") || (a.created_at || "").localeCompare(b.created_at || ""));

      setSearchResults(combined);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Count duplicate codes for unit numbering
  const codeCounts: Record<string, number> = {};
  searchResults.forEach((r) => { codeCounts[r.code] = (codeCounts[r.code] || 0) + 1; });
  const codeIndex: Record<string, number> = {};

  const statusColor = (s: string | null) => {
    switch (s) {
      case "active":
      case "installed":
        return "bg-green-50 text-green-700 border-green-300";
      case "pending_assessment":
      case "under_repair":
      case "in_claim":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "defective":
        return "bg-red-50 text-red-700 border-red-300";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300";
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วย S/N, รหัส, ชื่อ, หรือ Asset Code..."
            className="pl-11 h-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {searchResults.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              พบ {searchResults.length} เครื่อง — รหัสซ้ำกันแสดงเลขเครื่อง (#1, #2, ...) เพื่อแยกแต่ละเครื่องชัดเจน
            </p>
            <div className="max-w-3xl mx-auto mt-2 border rounded-lg overflow-hidden divide-y">
              {searchResults.map((r) => {
                const isDup = codeCounts[r.code] > 1;
                if (isDup) codeIndex[r.code] = (codeIndex[r.code] || 0) + 1;
                const unitNo = isDup ? codeIndex[r.code] : null;
                const sn1 = r.serial_number_1?.trim();
                const sn2 = r.serial_number_2?.trim();
                const hasSn = sn1 || sn2 || (r.receipt_serials && r.receipt_serials.length > 0);
                const locText = r.billboard
                  ? `🪧 ${formatBillboardLabel(r.billboard.old_code, r.billboard.location_name, r.billboard.equipment_id)}`
                  : r.locations?.name
                    ? `📦 ${r.locations.name}`
                    : "📦 ไม่ระบุตำแหน่ง";

                return (
                  <button
                    key={r.id}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3"
                    onClick={() => {
                      setSearchTerm("");
                      setSearchResults([]);
                      navigate(`/media-player/${r.id}`, { replace: true });
                    }}
                  >
                    <Monitor className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono font-semibold text-sm">{r.code}</p>
                        {unitNo && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                            เครื่องที่ #{unitNo} จาก {codeCounts[r.code]}
                          </Badge>
                        )}
                        {r.status && (
                          <Badge variant="outline" className={`text-xs ${statusColor(r.status)}`}>
                            {r.status}
                          </Badge>
                        )}
                        {!hasSn && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> ยังไม่มี S/N
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{r.name}</p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {hasSn && (
                          <div className="font-mono">
                            S/N:{" "}
                            {r.receipt_serials && r.receipt_serials.length > 0
                              ? r.receipt_serials.join(" / ")
                              : `${sn1 || "-"}${sn2 ? ` / ${sn2}` : ""}`}
                          </div>
                        )}
                        {r.asset_code && <div>🏷️ Asset: {r.asset_code}</div>}
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {locText}</div>
                        <div className="text-[10px] opacity-60">ID: {r.id.slice(0, 8)}… • สร้าง: {new Date(r.created_at).toLocaleDateString("th-TH")}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
          <p className="text-center text-muted-foreground mt-4">ไม่พบข้อมูลที่ตรงกัน</p>
        )}
      </CardContent>
    </Card>
  );
}
