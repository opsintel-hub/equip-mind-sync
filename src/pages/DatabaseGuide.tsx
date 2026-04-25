import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Search, RefreshCw, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { TABLE_GUIDE, CATEGORY_ORDER } from "@/lib/databaseGuide";
import { toast } from "sonner";
import TableDetailDialog from "@/components/database-guide/TableDetailDialog";

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
                <Accordion type="multiple" className="space-y-1">
                  {catTables.map((t) => {
                    const meta = TABLE_GUIDE[t.name];
                    return (
                      <AccordionItem
                        key={t.name}
                        value={t.name}
                        className="border rounded-lg px-3"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <code className="text-sm font-mono font-semibold">{t.name}</code>
                            <Badge variant="outline" className="text-xs">
                              {t.row_count.toLocaleString()} rows
                            </Badge>
                            {!meta && (
                              <Badge variant="destructive" className="text-xs">
                                ยังไม่มีคำอธิบาย
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 space-y-3">
                          {meta?.description && (
                            <p className="text-sm">{meta.description}</p>
                          )}
                          {meta?.relatedRoutes && meta.relatedRoutes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-muted-foreground self-center">
                                เมนูที่เกี่ยวข้อง:
                              </span>
                              {meta.relatedRoutes.map((r) => (
                                <Link key={r.path} to={r.path}>
                                  <Badge
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground gap-1"
                                  >
                                    {r.label}
                                    <ExternalLink className="w-3 h-3" />
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          )}
                          {/* Columns preview */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                คอลัมน์ ({t.columns.length})
                              </p>
                              {t.columns.length > COLUMN_PREVIEW_LIMIT && (
                                <span className="text-xs text-muted-foreground">
                                  แสดง {COLUMN_PREVIEW_LIMIT} จาก {t.columns.length} แถว
                                </span>
                              )}
                            </div>
                            <div className="border rounded-md overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="h-8">ชื่อ</TableHead>
                                    <TableHead className="h-8">ประเภท</TableHead>
                                    <TableHead className="h-8 w-20">Null</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {t.columns.slice(0, COLUMN_PREVIEW_LIMIT).map((c) => (
                                    <TableRow key={c.name}>
                                      <TableCell className="py-1.5 font-mono text-xs">
                                        {c.name}
                                      </TableCell>
                                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                                        {c.type}
                                      </TableCell>
                                      <TableCell className="py-1.5 text-xs">
                                        {c.nullable ? (
                                          <Badge variant="outline" className="text-xs">YES</Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-xs">NO</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
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
    </div>
  );
}
