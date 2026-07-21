import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Wrench, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useDeptScope } from "@/hooks/useDeptScope";
import { format, differenceInDays } from "date-fns";

interface Row {
  id: string;
  loan_date: string;
  due_date: string | null;
  quantity: number;
  status: string;
  requester_name: string;
  holder_name: string | null;
  purpose: string | null;
  return_required: boolean;
  tool: {
    id: string;
    code: string;
    name: string;
    unit: string;
    department: string | null;
    is_personal_tool: boolean;
    warranty_expiry_date: string | null;
    has_warranty: boolean;
  } | null;
}

const HOLDING_STATES = ["issued", "holding_permanent"];

export default function ToolLoansReport() {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { viewableDepts } = useDeptScope();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("by-holder");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment_loans")
        .select("id, loan_date, due_date, quantity, status, requester_name, holder_name, purpose, return_required, tool:tool_id(id,code,name,unit,department,is_personal_tool,warranty_expiry_date,has_warranty)")
        .eq("item_kind", "tool")
        .in("status", HOLDING_STATES)
        .order("loan_date", { ascending: false });
      if (error) toast.error(error.message);
      else {
        let list = (data || []) as any as Row[];
        if (!isSuperAdmin && viewableDepts?.length) {
          list = list.filter(r => !r.tool?.department || viewableDepts.includes(r.tool.department));
        }
        setRows(list);
      }
      setLoading(false);
    })();
  }, [isSuperAdmin, viewableDepts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.tool?.code, r.tool?.name, r.holder_name, r.requester_name, r.tool?.department, r.purpose]
        .some(v => v && v.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const byHolder = useMemo(() => {
    const m = new Map<string, Row[]>();
    filtered.forEach(r => {
      const k = r.holder_name || r.requester_name || "(ไม่ระบุ)";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [filtered]);

  const byTool = useMemo(() => {
    const m = new Map<string, { code: string; name: string; unit: string; dept: string | null; rows: Row[] }>();
    filtered.forEach(r => {
      const k = r.tool?.id || "unknown";
      if (!m.has(k)) m.set(k, { code: r.tool?.code || "-", name: r.tool?.name || "-", unit: r.tool?.unit || "", dept: r.tool?.department || null, rows: [] });
      m.get(k)!.rows.push(r);
    });
    return [...m.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));
  }, [filtered]);

  const overdueBadge = (r: Row) => {
    if (!r.return_required || !r.due_date) return null;
    const d = differenceInDays(new Date(r.due_date), new Date());
    if (d < 0) return <Badge variant="destructive" className="text-[10px] ml-1"><AlertTriangle className="w-2 h-2 mr-0.5" />เกิน {Math.abs(d)}ว</Badge>;
    if (d <= 3) return <Badge variant="outline" className="text-[10px] ml-1 border-warning text-warning">ใกล้ครบ {d}ว</Badge>;
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" /> รายงานเครื่องมือที่ถือครอง
        </h1>
        <p className="text-sm text-muted-foreground">ดูว่าใครถือเครื่องมืออะไรอยู่ / เครื่องมือแต่ละชิ้นอยู่กับใคร</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="ค้นหา รหัส / ชื่อเครื่องมือ / ผู้ถือ / ฝ่าย"
              value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
            <div className="ml-auto text-sm text-muted-foreground">
              รวม {filtered.length} รายการ
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="by-holder"><Users className="w-3 h-3 mr-1" />ตามผู้ถือครอง ({byHolder.length})</TabsTrigger>
              <TabsTrigger value="by-tool"><Wrench className="w-3 h-3 mr-1" />ตามเครื่องมือ ({byTool.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="by-holder" className="mt-4 space-y-4">
              {loading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลด…</div>
                : byHolder.length === 0 ? <div className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</div>
                : byHolder.map(([holder, list]) => (
                <Card key={holder} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" /> {holder}
                      <Badge variant="secondary">{list.length} รายการ</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัส</TableHead>
                          <TableHead>เครื่องมือ</TableHead>
                          <TableHead className="text-center">จำนวน</TableHead>
                          <TableHead>วันเบิก</TableHead>
                          <TableHead>กำหนดคืน</TableHead>
                          <TableHead>วัตถุประสงค์</TableHead>
                          <TableHead>ประเภท</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{r.tool?.code}</TableCell>
                            <TableCell className="text-sm">{r.tool?.name}</TableCell>
                            <TableCell className="text-center">{r.quantity} {r.tool?.unit}</TableCell>
                            <TableCell className="text-xs">{format(new Date(r.loan_date), "dd/MM/yy")}</TableCell>
                            <TableCell className="text-xs">
                              {r.return_required ? (r.due_date ? format(new Date(r.due_date), "dd/MM/yy") : "-") : <span className="text-muted-foreground">ถือครองถาวร</span>}
                              {overdueBadge(r)}
                            </TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{r.purpose || "-"}</TableCell>
                            <TableCell>
                              {r.tool?.is_personal_tool ? <Badge variant="outline" className="text-[10px]">ประจำตัว</Badge> : <Badge variant="secondary" className="text-[10px]">ทั่วไป</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="by-tool" className="mt-4 space-y-4">
              {loading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลด…</div>
                : byTool.length === 0 ? <div className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</div>
                : byTool.map(([id, g]) => (
                <Card key={id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="w-4 h-4" /> {g.code} — {g.name}
                      {g.dept && <Badge variant="outline" className="text-[10px]">{g.dept}</Badge>}
                      <Badge variant="secondary">อยู่กับ {g.rows.length} คน</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ผู้ถือครอง</TableHead>
                          <TableHead>ผู้เบิก</TableHead>
                          <TableHead className="text-center">จำนวน</TableHead>
                          <TableHead>วันเบิก</TableHead>
                          <TableHead>กำหนดคืน</TableHead>
                          <TableHead>วัตถุประสงค์</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.rows.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm font-medium">{r.holder_name || r.requester_name}</TableCell>
                            <TableCell className="text-sm">{r.requester_name}</TableCell>
                            <TableCell className="text-center">{r.quantity} {g.unit}</TableCell>
                            <TableCell className="text-xs">{format(new Date(r.loan_date), "dd/MM/yy")}</TableCell>
                            <TableCell className="text-xs">
                              {r.return_required ? (r.due_date ? format(new Date(r.due_date), "dd/MM/yy") : "-") : <span className="text-muted-foreground">ถือครองถาวร</span>}
                              {overdueBadge(r)}
                            </TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">{r.purpose || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
