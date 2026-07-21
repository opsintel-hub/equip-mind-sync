import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Wrench, AlertTriangle, Package, Warehouse, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useDeptScope } from "@/hooks/useDeptScope";
import { format, differenceInDays } from "date-fns";

interface Loan {
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

interface Tool {
  id: string;
  code: string;
  name: string;
  unit: string;
  department: string | null;
  current_quantity: number;
  is_personal_tool: boolean;
  is_asset: boolean;
  has_warranty: boolean;
  warranty_expiry_date: string | null;
  tool_category_id: string | null;
  tool_categories?: { name: string } | null;
}

const HOLDING_STATES = ["issued", "holding_permanent", "pending_return"];

const warrantyBucket = (t: Pick<Tool, "has_warranty" | "warranty_expiry_date">) => {
  if (!t.has_warranty || !t.warranty_expiry_date) return "none";
  const d = differenceInDays(new Date(t.warranty_expiry_date), new Date());
  if (d < 0) return "expired";
  if (d <= 30) return "soon";
  return "ok";
};

export default function ToolLoansReport() {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { viewableDepts } = useDeptScope();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  // Filters for "ทั้งหมด" tab
  const [fLocation, setFLocation] = useState<"all" | "warehouse" | "issued">("all");
  const [fDept, setFDept] = useState<string>("all");
  const [fWarranty, setFWarranty] = useState<string>("all");
  const [fType, setFType] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [loanRes, toolRes] = await Promise.all([
        supabase
          .from("equipment_loans")
          .select("id, loan_date, due_date, quantity, status, requester_name, holder_name, purpose, return_required, tool:tool_id(id,code,name,unit,department,is_personal_tool,warranty_expiry_date,has_warranty)")
          .eq("item_kind", "tool")
          .in("status", HOLDING_STATES)
          .order("loan_date", { ascending: false }),
        supabase
          .from("tools")
          .select("id,code,name,unit,department,current_quantity,is_personal_tool,is_asset,has_warranty,warranty_expiry_date,tool_category_id,tool_categories(name)")
          .eq("is_active", true)
          .order("code"),
      ]);
      if (loanRes.error) toast.error(loanRes.error.message);
      if (toolRes.error) toast.error(toolRes.error.message);

      let list = (loanRes.data || []) as any as Loan[];
      let tls = (toolRes.data || []) as any as Tool[];
      if (!isSuperAdmin && viewableDepts?.length) {
        list = list.filter(r => !r.tool?.department || viewableDepts.includes(r.tool.department));
        tls = tls.filter(t => !t.department || viewableDepts.includes(t.department));
      }
      setLoans(list);
      setTools(tls);
      setLoading(false);
    })();
  }, [isSuperAdmin, viewableDepts]);

  // Available department options
  const deptOptions = useMemo(() => {
    const s = new Set<string>();
    tools.forEach(t => t.department && s.add(t.department));
    return [...s].sort();
  }, [tools]);

  // Loans-by-tool index (active holdings)
  const holdingsByTool = useMemo(() => {
    const m = new Map<string, Loan[]>();
    loans.forEach(l => {
      if (!l.tool) return;
      if (!m.has(l.tool.id)) m.set(l.tool.id, []);
      m.get(l.tool.id)!.push(l);
    });
    return m;
  }, [loans]);

  // ── Tab 1: เครื่องมือทั้งหมด ─────────────────────────────
  const allToolsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter(t => {
      const holdings = holdingsByTool.get(t.id) || [];
      const issuedQty = holdings.reduce((s, h) => s + h.quantity, 0);

      // location filter
      if (fLocation === "warehouse" && (t.current_quantity ?? 0) === 0) return false;
      if (fLocation === "issued" && issuedQty === 0) return false;

      if (fDept !== "all" && t.department !== fDept) return false;
      if (fWarranty !== "all" && warrantyBucket(t) !== fWarranty) return false;
      if (fType === "asset" && !t.is_asset) return false;
      if (fType === "personal" && !t.is_personal_tool) return false;
      if (fType === "general" && (t.is_asset || t.is_personal_tool)) return false;

      if (q) {
        const holderMatch = holdings.some(h =>
          (h.holder_name || "").toLowerCase().includes(q) || (h.requester_name || "").toLowerCase().includes(q)
        );
        const hit = [t.code, t.name, t.department].some(v => v && v.toLowerCase().includes(q));
        if (!hit && !holderMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      // overdue holdings first
      const ao = (holdingsByTool.get(a.id) || []).some(h => h.due_date && new Date(h.due_date) < new Date());
      const bo = (holdingsByTool.get(b.id) || []).some(h => h.due_date && new Date(h.due_date) < new Date());
      if (ao !== bo) return ao ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
  }, [tools, holdingsByTool, search, fLocation, fDept, fWarranty, fType]);

  // ── Tab 2/3: เดิม (filter by search) ────────────────────
  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loans;
    return loans.filter(r =>
      [r.tool?.code, r.tool?.name, r.holder_name, r.requester_name, r.tool?.department, r.purpose]
        .some(v => v && v.toLowerCase().includes(q))
    );
  }, [loans, search]);

  const byHolder = useMemo(() => {
    const m = new Map<string, Loan[]>();
    filteredLoans.forEach(r => {
      const k = r.holder_name || r.requester_name || "(ไม่ระบุ)";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [filteredLoans]);

  const byTool = useMemo(() => {
    const m = new Map<string, { code: string; name: string; unit: string; dept: string | null; rows: Loan[] }>();
    filteredLoans.forEach(r => {
      const k = r.tool?.id || "unknown";
      if (!m.has(k)) m.set(k, { code: r.tool?.code || "-", name: r.tool?.name || "-", unit: r.tool?.unit || "", dept: r.tool?.department || null, rows: [] });
      m.get(k)!.rows.push(r);
    });
    return [...m.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));
  }, [filteredLoans]);

  const overdueBadge = (r: Loan) => {
    if (!r.return_required || !r.due_date) return null;
    const d = differenceInDays(new Date(r.due_date), new Date());
    if (d < 0) return <Badge variant="destructive" className="text-[10px] ml-1"><AlertTriangle className="w-2 h-2 mr-0.5" />เกิน {Math.abs(d)}ว</Badge>;
    if (d <= 3) return <Badge variant="outline" className="text-[10px] ml-1 border-warning text-warning">ใกล้ครบ {d}ว</Badge>;
    return null;
  };

  const warrantyBadgeFor = (t: { has_warranty: boolean; warranty_expiry_date: string | null }) => {
    const b = warrantyBucket(t);
    if (b === "expired") return <Badge variant="destructive" className="text-[10px]">ประกันหมด</Badge>;
    if (b === "soon") return <Badge variant="outline" className="text-[10px] border-warning text-warning">≤30ว</Badge>;
    if (b === "ok") return <Badge variant="outline" className="text-[10px]">ในประกัน</Badge>;
    return <Badge variant="secondary" className="text-[10px]">ไม่มี</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" /> รายงานเครื่องมือ
        </h1>
        <p className="text-sm text-muted-foreground">ดูเครื่องมือทั้งหมดในระบบ + ใครกำลังถืออะไรอยู่</p>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="ค้นหา รหัส / ชื่อเครื่องมือ / ผู้ถือ / ฝ่าย"
              value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
          </div>

          {tab === "all" && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Select value={fLocation} onValueChange={(v: any) => setFLocation(v)}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ที่อยู่: ทั้งหมด</SelectItem>
                  <SelectItem value="warehouse">อยู่ที่คลัง</SelectItem>
                  <SelectItem value="issued">ถูกเบิกไปแล้ว</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fDept} onValueChange={setFDept}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ฝ่าย: ทั้งหมด</SelectItem>
                  {deptOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fWarranty} onValueChange={setFWarranty}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ประกัน: ทั้งหมด</SelectItem>
                  <SelectItem value="ok">ในประกัน</SelectItem>
                  <SelectItem value="soon">ใกล้หมด ≤30ว</SelectItem>
                  <SelectItem value="expired">หมดแล้ว</SelectItem>
                  <SelectItem value="none">ไม่มีประกัน</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fType} onValueChange={setFType}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ประเภท: ทั้งหมด</SelectItem>
                  <SelectItem value="asset">ทรัพย์สิน</SelectItem>
                  <SelectItem value="personal">ประจำตัวช่าง</SelectItem>
                  <SelectItem value="general">ทั่วไป</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto text-muted-foreground">รวม {allToolsFiltered.length} รายการ</div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all"><Package className="w-3 h-3 mr-1" />เครื่องมือทั้งหมด ({tools.length})</TabsTrigger>
              <TabsTrigger value="by-holder"><Users className="w-3 h-3 mr-1" />ตามผู้ถือครอง ({byHolder.length})</TabsTrigger>
              <TabsTrigger value="by-tool"><Wrench className="w-3 h-3 mr-1" />ตามเครื่องมือ ({byTool.length})</TabsTrigger>
            </TabsList>

            {/* Tab 1: ทั้งหมด */}
            <TabsContent value="all" className="mt-4">
              {loading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลด…</div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>ฝ่าย</TableHead>
                        <TableHead className="text-center">
                          <span className="inline-flex items-center gap-1"><Warehouse className="w-3 h-3" />คลัง</span>
                        </TableHead>
                        <TableHead className="text-center">
                          <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />ถูกเบิก</span>
                        </TableHead>
                        <TableHead>ผู้ถือครอง</TableHead>
                        <TableHead>ประกัน</TableHead>
                        <TableHead>ประเภท</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allToolsFiltered.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">ไม่มีข้อมูล</TableCell></TableRow>
                      ) : allToolsFiltered.map(t => {
                        const holdings = holdingsByTool.get(t.id) || [];
                        const issuedQty = holdings.reduce((s, h) => s + h.quantity, 0);
                        const hasOverdue = holdings.some(h => h.due_date && new Date(h.due_date) < new Date());
                        const holderText = holdings.length === 0
                          ? "-"
                          : holdings.length === 1
                            ? (holdings[0].holder_name || holdings[0].requester_name)
                            : `${holdings[0].holder_name || holdings[0].requester_name} +${holdings.length - 1}`;
                        return (
                          <TableRow key={t.id} className={hasOverdue ? "bg-destructive/5" : ""}>
                            <TableCell className="text-xs font-medium">{t.code}</TableCell>
                            <TableCell className="text-sm">{t.name}</TableCell>
                            <TableCell className="text-xs">{t.department || "-"}</TableCell>
                            <TableCell className="text-center text-sm">
                              <span className={t.current_quantity > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                                {t.current_quantity} {t.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <span className={issuedQty > 0 ? "text-warning font-medium" : "text-muted-foreground"}>
                                {issuedQty} {t.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              {holderText}
                              {hasOverdue && <Badge variant="destructive" className="ml-1 text-[10px]"><AlertTriangle className="w-2 h-2 mr-0.5" />เกิน</Badge>}
                            </TableCell>
                            <TableCell>{warrantyBadgeFor(t)}</TableCell>
                            <TableCell className="space-x-1">
                              {t.is_asset && <Badge variant="outline" className="text-[10px]">ทรัพย์สิน</Badge>}
                              {t.is_personal_tool && <Badge variant="outline" className="text-[10px]">ประจำตัว</Badge>}
                              {!t.is_asset && !t.is_personal_tool && <Badge variant="secondary" className="text-[10px]">ทั่วไป</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: ตามผู้ถือครอง */}
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
                        {list
                          .slice()
                          .sort((a, b) => {
                            const ao = a.due_date && new Date(a.due_date) < new Date() ? 1 : 0;
                            const bo = b.due_date && new Date(b.due_date) < new Date() ? 1 : 0;
                            return bo - ao;
                          })
                          .map(r => {
                          const isOd = r.due_date && new Date(r.due_date) < new Date();
                          return (
                            <TableRow key={r.id} className={isOd ? "bg-destructive/5" : ""}>
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
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab 3: ตามเครื่องมือ */}
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
                        {g.rows
                          .slice()
                          .sort((a, b) => {
                            const ao = a.due_date && new Date(a.due_date) < new Date() ? 1 : 0;
                            const bo = b.due_date && new Date(b.due_date) < new Date() ? 1 : 0;
                            return bo - ao;
                          })
                          .map(r => {
                          const isOd = r.due_date && new Date(r.due_date) < new Date();
                          return (
                            <TableRow key={r.id} className={isOd ? "bg-destructive/5" : ""}>
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
                          );
                        })}
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
