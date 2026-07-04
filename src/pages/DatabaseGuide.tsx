import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Search, RefreshCw, AlertTriangle, Info, ChevronRight, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TABLE_GUIDE, CATEGORY_ORDER } from "@/lib/databaseGuide";
import { toast } from "sonner";
import TableDetailDialog from "@/components/database-guide/TableDetailDialog";
import RelationsTab from "@/components/database-guide/RelationsTab";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableInfo {
  name: string;
  row_count: number;
  columns: ColumnInfo[];
}

export default function DatabaseGuide() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: roleLoading } = useIsSuperAdmin();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TableInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openTable = (t: TableInfo) => {
    setSelected(t);
    setDialogOpen(true);
  };

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_public_schema_info" as any);
      if (error) throw error;
      setTables((data as TableInfo[]) || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "ไม่สามารถดึงข้อมูลได้");
      toast.error("ไม่สามารถดึงข้อมูลฐานข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && isSuperAdmin) {
      fetchSchema();
    }
  }, [roleLoading, isSuperAdmin]);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tables.filter((t) => {
      if (!term) return true;
      const meta = TABLE_GUIDE[t.name];
      return (
        t.name.toLowerCase().includes(term) ||
        meta?.description.toLowerCase().includes(term) ||
        meta?.category.toLowerCase().includes(term)
      );
    });

    const map: Record<string, TableInfo[]> = {};
    filtered.forEach((t) => {
      const cat = TABLE_GUIDE[t.name]?.category || "ยังไม่มีคำอธิบาย";
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    });

    return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({
      category: c,
      tables: map[c],
    }));
  }, [tables, search]);

  const totalRows = useMemo(
    () => tables.reduce((sum, t) => sum + (t.row_count || 0), 0),
    [tables],
  );

  if (roleLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <h2 className="text-xl font-semibold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground mb-4">
              เมนูนี้เฉพาะ Super Admin เท่านั้น
            </p>
            <Button onClick={() => navigate("/dashboard")}>กลับหน้าหลัก</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">คู่มือ Database</h1>
            <p className="text-sm text-muted-foreground">
              ดูโครงสร้างและคำอธิบายตารางทั้งหมดในระบบ (Super Admin)
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchSchema} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList>
          <TabsTrigger value="tables">ตาราง</TabsTrigger>
          <TabsTrigger value="relations">ความสัมพันธ์ (FK)</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">จำนวนตาราง</p>
                <p className="text-2xl font-bold">{tables.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">จำนวนแถวทั้งหมด</p>
                <p className="text-2xl font-bold">{totalRows.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">หมวดหมู่</p>
                <p className="text-2xl font-bold">{grouped.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">ยังไม่มีคำอธิบาย</p>
                <p className="text-2xl font-bold text-amber-600">
                  {tables.filter((t) => !TABLE_GUIDE[t.name]).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อตาราง / คำอธิบาย / หมวดหมู่..."
              className="pl-9"
            />
          </div>

          {/* Info banner */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">หมายเหตุ</p>
                <p className="text-muted-foreground">
                  รายการตารางดึงสดจากฐานข้อมูลจริง — เมื่อมีตารางใหม่จะแสดงโดยอัตโนมัติในหมวด "ยังไม่มีคำอธิบาย"
                  สามารถเพิ่มคำอธิบายได้ในไฟล์ <code className="bg-muted px-1 rounded">src/lib/databaseGuide.ts</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-destructive text-sm">{error}</CardContent>
            </Card>
          )}

          {/* Tables grouped by category */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ category, tables: catTables }) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{category}</span>
                      <Badge variant="secondary">{catTables.length} ตาราง</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catTables.map((t) => {
                        const meta = TABLE_GUIDE[t.name];
                        const quickRoute = meta?.relatedRoutes?.[0];
                        return (
                          <div
                            key={t.name}
                            className="group flex items-center gap-2 border rounded-lg px-3 py-2.5 hover:border-primary hover:bg-accent/50 transition-colors"
                          >
                            <button
                              onClick={() => openTable(t)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono font-semibold truncate">
                                  {t.name}
                                </code>
                                {!meta && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                    ใหม่
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{t.row_count.toLocaleString()} rows</span>
                                <span>•</span>
                                <span>{t.columns.length} cols</span>
                                {meta?.relatedRoutes && meta.relatedRoutes.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{meta.relatedRoutes.length} เมนู</span>
                                  </>
                                )}
                              </div>
                            </button>
                            {quickRoute && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(quickRoute.path);
                                }}
                                title={`ไปที่ ${quickRoute.label}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="hidden sm:inline">เปิด</span>
                              </Button>
                            )}
                            <button
                              onClick={() => openTable(t)}
                              className="flex-shrink-0"
                              aria-label="ดูรายละเอียด"
                            >
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {grouped.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    ไม่พบตารางที่ตรงกับการค้นหา
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="relations" className="mt-4">
          <RelationsTab
            onOpenTable={(name) => {
              const t = tables.find((x) => x.name === name);
              if (t) openTable(t);
            }}
          />
        </TabsContent>
      </Tabs>

      <TableDetailDialog
        table={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
