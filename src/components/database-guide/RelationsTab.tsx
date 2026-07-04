import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Search, RefreshCw, Link2, Info } from "lucide-react";
import { TABLE_GUIDE } from "@/lib/databaseGuide";
import { toast } from "sonner";

interface Relation {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  on_delete: string;
  on_update: string;
}

const deleteRuleColor: Record<string, string> = {
  CASCADE: "bg-destructive/10 text-destructive border-destructive/30",
  "SET NULL": "bg-amber-500/10 text-amber-700 border-amber-500/30",
  "NO ACTION": "bg-muted text-muted-foreground border-muted",
  RESTRICT: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  "SET DEFAULT": "bg-muted text-muted-foreground border-muted",
};

export default function RelationsTab({ onOpenTable }: { onOpenTable?: (name: string) => void }) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"from" | "to">("from");

  const fetchRelations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_public_schema_relations" as any);
      if (error) throw error;
      setRelations((data as Relation[]) || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "โหลด Relations ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelations();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return relations;
    return relations.filter(
      (r) =>
        r.source_table.toLowerCase().includes(term) ||
        r.target_table.toLowerCase().includes(term) ||
        r.source_column.toLowerCase().includes(term) ||
        r.target_column.toLowerCase().includes(term),
    );
  }, [relations, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Relation[]> = {};
    filtered.forEach((r) => {
      const key = direction === "from" ? r.source_table : r.target_table;
      (map[key] ||= []).push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, direction]);

  const stats = useMemo(() => {
    const sourceTables = new Set(relations.map((r) => r.source_table));
    const targetTables = new Set(relations.map((r) => r.target_table));
    const cascades = relations.filter((r) => r.on_delete === "CASCADE").length;
    return { total: relations.length, sourceTables: sourceTables.size, targetTables: targetTables.size, cascades };
  }, [relations]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">FK ทั้งหมด</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ตารางที่มี FK</p>
            <p className="text-2xl font-bold">{stats.sourceTables}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ตารางที่ถูกอ้างอิง</p>
            <p className="text-2xl font-bold">{stats.targetTables}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CASCADE delete</p>
            <p className="text-2xl font-bold text-destructive">{stats.cascades}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อตาราง / คอลัมน์..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={direction === "from" ? "default" : "outline"}
            size="sm"
            onClick={() => setDirection("from")}
          >
            จัดกลุ่มตาม: ต้นทาง
          </Button>
          <Button
            variant={direction === "to" ? "default" : "outline"}
            size="sm"
            onClick={() => setDirection("to")}
          >
            ปลายทาง
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRelations} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-3 flex gap-2 text-sm">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            ดึงสดจากฐานข้อมูลจริง (information_schema) — ทุก Foreign Key ที่เพิ่ม/ลบจะเห็นทันทีหลังกดรีเฟรช
          </p>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            ไม่พบความสัมพันธ์
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(([tableName, rels]) => {
            const meta = TABLE_GUIDE[tableName];
            return (
              <Card key={tableName}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenTable?.(tableName)}
                      className="flex items-center gap-2 hover:text-primary text-left"
                    >
                      <Link2 className="w-4 h-4 text-primary" />
                      <code className="font-mono">{tableName}</code>
                      {meta?.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {meta.category}
                        </Badge>
                      )}
                    </button>
                    <Badge variant="outline">{rels.length} FK</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {rels.map((r) => (
                      <div
                        key={r.constraint_name}
                        className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-accent/50 flex-wrap"
                      >
                        <button
                          onClick={() => onOpenTable?.(r.source_table)}
                          className="font-mono text-xs hover:text-primary hover:underline"
                        >
                          {r.source_table}
                          <span className="text-muted-foreground">.{r.source_column}</span>
                        </button>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <button
                          onClick={() => onOpenTable?.(r.target_table)}
                          className="font-mono text-xs font-semibold hover:text-primary hover:underline"
                        >
                          {r.target_table}
                          <span className="text-muted-foreground font-normal">.{r.target_column}</span>
                        </button>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 ml-auto ${deleteRuleColor[r.on_delete] || ""}`}
                          title="ON DELETE"
                        >
                          DEL: {r.on_delete}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
