import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeftRight, Plus, Search, Wrench, ShieldAlert, Send, RotateCcw, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";

interface ToolOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_quantity: number;
  department: string | null;
  requires_approval: boolean;
  return_required: boolean;
  is_personal_tool: boolean;
  warranty_expiry_date: string | null;
  has_warranty: boolean;
}

interface Loan {
  id: string;
  tool_id: string | null;
  quantity: number;
  loan_date: string;
  due_date: string | null;
  return_date: string | null;
  returned_quantity: number;
  status: string;
  requester_name: string;
  holder_name: string | null;
  purpose: string | null;
  return_required: boolean;
  notes: string | null;
  return_notes: string | null;
  created_at: string;
  approved_at: string | null;
  issued_at: string | null;
  tool?: ToolOption | null;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon?: any }> = {
  pending:          { label: "รออนุมัติ", variant: "outline", icon: ShieldAlert },
  pending_issue:    { label: "รอจ่าย", variant: "secondary", icon: Send },
  issued:           { label: "อยู่กับผู้เบิก", variant: "default", icon: ArrowLeftRight },
  holding_permanent:{ label: "ถือครองถาวร", variant: "default", icon: ArrowLeftRight },
  returned:         { label: "คืนแล้ว", variant: "outline", icon: CheckCircle2 },
  cancelled:        { label: "ยกเลิก", variant: "destructive", icon: XCircle },
};

export type ToolLoansMode = "request" | "issue" | "return" | "all";

interface ToolLoansProps {
  mode?: ToolLoansMode;
}

export default function ToolLoans({ mode = "all" }: ToolLoansProps) {
  const { user } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { isAdmin } = useFunctionPermissions();
  const { viewableDepts } = useDeptScope();
  const { actorName } = useCurrentUserProfile();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    tool_id: "",
    quantity: 1,
    purpose: "งานทั่วไป",
    purpose_detail: "",
    due_date: "",
    requester_name: "",
    notes: "",
  });

  const [returnOpen, setReturnOpen] = useState<Loan | null>(null);
  const [returnForm, setReturnForm] = useState({ returned_quantity: 1, condition: "normal", notes: "" });

  const canManageWarehouse = isSuperAdmin || isAdmin;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [loanRes, toolRes] = await Promise.all([
      supabase
        .from("equipment_loans")
        .select("*, tool:tool_id(id,code,name,unit,current_quantity,department,requires_approval,return_required,is_personal_tool,warranty_expiry_date,has_warranty)")
        .eq("item_kind", "tool")
        .order("created_at", { ascending: false }),
      (() => {
        let q = supabase.from("tools").select("id,code,name,unit,current_quantity,department,requires_approval,return_required,is_personal_tool,warranty_expiry_date,has_warranty")
          .eq("is_active", true);
        if (!isSuperAdmin && viewableDepts && viewableDepts.length > 0) q = q.in("department", viewableDepts);
        return q.order("code");
      })(),
    ]);
    if (loanRes.error) toast.error("โหลดข้อมูลเบิกไม่สำเร็จ: " + loanRes.error.message);
    else setLoans((loanRes.data || []) as any);
    if (toolRes.error) toast.error("โหลดเครื่องมือไม่สำเร็จ: " + toolRes.error.message);
    else setTools((toolRes.data || []) as any);
    setLoading(false);
  }, [isSuperAdmin, viewableDepts]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectedTool = tools.find(t => t.id === form.tool_id);

  const handleCreate = async () => {
    if (!form.tool_id) return toast.error("กรุณาเลือกเครื่องมือ");
    if (!form.requester_name.trim()) return toast.error("กรุณากรอกชื่อผู้เบิก");
    if (!selectedTool) return;
    if (form.quantity < 1 || form.quantity > selectedTool.current_quantity) {
      return toast.error(`จำนวนต้องอยู่ระหว่าง 1 ถึง ${selectedTool.current_quantity}`);
    }
    const returnReq = selectedTool.return_required;
    const status = selectedTool.requires_approval ? "pending" : "pending_issue";
    const purposeFinal = form.purpose === "อื่นๆ" ? (form.purpose_detail || "อื่นๆ")
                        : form.purpose === "PM" ? `PM: ${form.purpose_detail || "-"}`
                        : form.purpose;
    const { error } = await supabase.from("equipment_loans").insert({
      item_kind: "tool",
      tool_id: form.tool_id,
      quantity: form.quantity,
      loan_date: new Date().toISOString().slice(0, 10),
      due_date: form.due_date || (returnReq ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      status,
      requester_name: form.requester_name.trim(),
      purpose: purposeFinal,
      notes: form.notes || null,
      return_required: returnReq,
      created_by: user?.id,
    });
    if (error) return toast.error("บันทึกไม่สำเร็จ: " + error.message);
    toast.success(status === "pending" ? "ส่งคำขอ — รออนุมัติ" : "ส่งคำขอ — รอคลังจ่าย");
    setCreateOpen(false);
    setForm({ tool_id: "", quantity: 1, purpose: "งานทั่วไป", purpose_detail: "", due_date: "", requester_name: "", notes: "" });
    fetchAll();
  };

  const handleApprove = async (loan: Loan) => {
    const { error } = await supabase.from("equipment_loans").update({
      status: "pending_issue",
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    }).eq("id", loan.id);
    if (error) return toast.error(error.message);
    toast.success("อนุมัติแล้ว — พร้อมจ่าย");
    fetchAll();
  };

  const handleIssue = async (loan: Loan) => {
    if (!loan.tool) return;
    const newQty = (loan.tool.current_quantity ?? 0) - loan.quantity;
    if (newQty < 0) return toast.error("สต็อกไม่พอ");
    const finalStatus = loan.return_required ? "issued" : "holding_permanent";
    const { error: e1 } = await supabase.from("tools").update({ current_quantity: newQty }).eq("id", loan.tool.id);
    if (e1) return toast.error("ตัดสต็อกไม่สำเร็จ: " + e1.message);
    const { error: e2 } = await supabase.from("equipment_loans").update({
      status: finalStatus,
      issued_at: new Date().toISOString(),
      issued_by: user?.id,
      holder_user_id: user?.id,
      holder_name: loan.requester_name,
    }).eq("id", loan.id);
    if (e2) return toast.error(e2.message);
    toast.success(loan.return_required ? "จ่ายแล้ว — อยู่กับผู้เบิก" : "จ่ายแล้ว — ถือครองถาวร");
    fetchAll();
  };

  const handleCancel = async (loan: Loan) => {
    const { error } = await supabase.from("equipment_loans").update({ status: "cancelled" }).eq("id", loan.id);
    if (error) return toast.error(error.message);
    toast.success("ยกเลิกแล้ว");
    fetchAll();
  };

  const handleReturn = async () => {
    if (!returnOpen || !returnOpen.tool) return;
    const rQty = Math.max(0, Math.min(returnOpen.quantity, returnForm.returned_quantity));
    const newStock = (returnOpen.tool.current_quantity ?? 0) + rQty;
    const { error: e1 } = await supabase.from("tools").update({ current_quantity: newStock }).eq("id", returnOpen.tool.id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("equipment_loans").update({
      status: "returned",
      return_date: new Date().toISOString().slice(0, 10),
      returned_quantity: rQty,
      returned_by: user?.id,
      return_notes: `[${returnForm.condition}] ${returnForm.notes}`.trim(),
    }).eq("id", returnOpen.id);
    if (e2) return toast.error(e2.message);
    toast.success("รับคืนเรียบร้อย");
    setReturnOpen(null);
    setReturnForm({ returned_quantity: 1, condition: "normal", notes: "" });
    fetchAll();
  };

  const filter = (l: Loan) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [l.tool?.code, l.tool?.name, l.requester_name, l.holder_name, l.purpose]
      .some(v => v && v.toLowerCase().includes(q));
  };

  // Mode-based filter: request page shows my own requests; issue page shows warehouse queue; return page shows items currently issued
  const modeFilter = (l: Loan) => {
    if (mode === "request") return l.created_by === user?.id || l.requester_name === actorName;
    if (mode === "issue")   return ["pending", "pending_issue"].includes(l.status);
    if (mode === "return")  return l.status === "issued" && l.return_required;
    return true;
  };

  const activeStates = ["pending", "pending_issue", "issued", "holding_permanent"];
  const activeLoans  = loans.filter(l => activeStates.includes(l.status)).filter(modeFilter).filter(filter);
  const historyLoans = loans.filter(l => !activeStates.includes(l.status)).filter(modeFilter).filter(filter);

  const headerMeta = {
    request: { title: "ขอเบิกเครื่องมือ",   desc: "สร้างคำขอเบิกเครื่องมือของฉัน" },
    issue:   { title: "คลังจ่ายเครื่องมือ",  desc: "คิวรออนุมัติ / รอจ่าย ให้เจ้าหน้าที่คลังดำเนินการ" },
    return:  { title: "ขอคืนเครื่องมือ",     desc: "รายการเครื่องมือที่ต้องคืน" },
    all:     { title: "เบิก-คืนเครื่องมือ",  desc: "ขอเบิก / จ่าย / คืน เครื่องมือ พร้อมติดตามผู้ถือครองและการรับประกัน" },
  }[mode];


  const warrantyBadge = (t?: ToolOption | null) => {
    if (!t || !t.has_warranty || !t.warranty_expiry_date) return null;
    const days = differenceInDays(new Date(t.warranty_expiry_date), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px]">ประกันหมด</Badge>;
    if (days <= 30) return <Badge variant="outline" className="text-[10px] border-warning text-warning">ประกัน ≤ 30 วัน</Badge>;
    return null;
  };

  const renderTable = (rows: Loan[], isHistory: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>เครื่องมือ</TableHead>
            <TableHead className="text-center">จำนวน</TableHead>
            <TableHead>วัตถุประสงค์</TableHead>
            <TableHead>ผู้เบิก</TableHead>
            <TableHead>ผู้ถือครอง</TableHead>
            <TableHead>กำหนดคืน</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">ไม่มีข้อมูล</TableCell></TableRow>
          ) : rows.map(l => {
            const meta = STATUS_META[l.status] || { label: l.status, variant: "outline" as const };
            const overdue = l.status === "issued" && l.due_date && new Date(l.due_date) < new Date();
            return (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{format(new Date(l.created_at), "dd/MM/yy", { locale: th })}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{l.tool?.code}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {l.tool?.name}
                    {warrantyBadge(l.tool)}
                  </div>
                </TableCell>
                <TableCell className="text-center">{l.quantity} {l.tool?.unit}</TableCell>
                <TableCell className="text-xs max-w-[180px] truncate">{l.purpose || "-"}</TableCell>
                <TableCell className="text-sm">{l.requester_name}</TableCell>
                <TableCell className="text-sm">{l.holder_name || "-"}</TableCell>
                <TableCell className="text-xs">
                  {l.return_required ? (l.due_date ? format(new Date(l.due_date), "dd/MM/yy") : "-") : <span className="text-muted-foreground">ไม่ต้องคืน</span>}
                  {overdue && <Badge variant="destructive" className="ml-1 text-[10px]"><AlertTriangle className="w-2 h-2 mr-0.5" />เกิน</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={meta.variant} className="gap-1">
                    {meta.icon && <meta.icon className="w-3 h-3" />}
                    {meta.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {!isHistory && (
                    <div className="flex justify-end gap-1">
                      {l.status === "pending" && canManageWarehouse && (
                        <Button size="sm" variant="secondary" onClick={() => handleApprove(l)}>อนุมัติ</Button>
                      )}
                      {l.status === "pending_issue" && canManageWarehouse && (
                        <Button size="sm" onClick={() => handleIssue(l)}><Send className="w-3 h-3 mr-1" />จ่าย</Button>
                      )}
                      {l.status === "issued" && (
                        <Button size="sm" variant="outline" onClick={() => { setReturnOpen(l); setReturnForm({ returned_quantity: l.quantity - (l.returned_quantity || 0), condition: "normal", notes: "" }); }}>
                          <RotateCcw className="w-3 h-3 mr-1" />คืน
                        </Button>
                      )}
                      {(l.status === "pending" || l.status === "pending_issue") && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(l)}><XCircle className="w-3 h-3" /></Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            เบิก-คืนเครื่องมือ
          </h1>
          <p className="text-sm text-muted-foreground">ขอเบิก / จ่าย / คืน เครื่องมือ พร้อมติดตามผู้ถือครองและการรับประกัน</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />ขอเบิกเครื่องมือ</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="ค้นหา รหัส / ชื่อ / ผู้เบิก / ผู้ถือ / วัตถุประสงค์"
              value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="active">กำลังดำเนินการ ({activeLoans.length})</TabsTrigger>
              <TabsTrigger value="history">ประวัติ ({historyLoans.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
              {loading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลด…</div> : renderTable(activeLoans, false)}
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              {loading ? <div className="text-center py-8 text-muted-foreground">กำลังโหลด…</div> : renderTable(historyLoans, true)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ขอเบิกเครื่องมือ</DialogTitle>
            <DialogDescription>เลือกเครื่องมือและระบุวัตถุประสงค์ — เครื่องมือที่ต้องอนุมัติจะเข้าคิว "รออนุมัติ" ก่อน</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>เครื่องมือ *</Label>
              <Select value={form.tool_id} onValueChange={v => setForm(f => ({ ...f, tool_id: v, quantity: 1 }))}>
                <SelectTrigger><SelectValue placeholder="เลือกเครื่องมือ" /></SelectTrigger>
                <SelectContent>
                  {tools.filter(t => t.current_quantity > 0).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.code} — {t.name} (คงเหลือ {t.current_quantity} {t.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTool && (
                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                  {selectedTool.requires_approval && <Badge variant="outline">ต้องอนุมัติก่อนจ่าย</Badge>}
                  {!selectedTool.return_required && <Badge variant="secondary">ไม่ต้องคืน</Badge>}
                  {selectedTool.is_personal_tool && <Badge variant="outline">ประจำตัวช่าง</Badge>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>จำนวน *</Label>
                <Input type="number" min={1} max={selectedTool?.current_quantity ?? 1}
                  value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>กำหนดคืน</Label>
                <Input type="date" value={form.due_date} disabled={!selectedTool?.return_required}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>ผู้เบิก *</Label>
              <Input value={form.requester_name} onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} placeholder="ชื่อผู้ที่จะรับเครื่องมือไปใช้" />
            </div>
            <div>
              <Label>วัตถุประสงค์</Label>
              <Select value={form.purpose} onValueChange={v => setForm(f => ({ ...f, purpose: v, purpose_detail: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="งานทั่วไป">งานทั่วไป</SelectItem>
                  <SelectItem value="Calibrate">Calibrate</SelectItem>
                  <SelectItem value="PM">PM ตามตั๋ว</SelectItem>
                  <SelectItem value="ซ่อม">ใช้ซ่อม</SelectItem>
                  <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
              {(form.purpose === "PM" || form.purpose === "อื่นๆ") && (
                <Input className="mt-2" placeholder={form.purpose === "PM" ? "เลขที่ตั๋ว PM (TPM-xxxx) หรือรายละเอียด" : "ระบุ"}
                  value={form.purpose_detail} onChange={e => setForm(f => ({ ...f, purpose_detail: e.target.value }))} />
              )}
            </div>
            <div>
              <Label>หมายเหตุ</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleCreate}>ส่งคำขอ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returnOpen} onOpenChange={o => !o && setReturnOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รับคืนเครื่องมือ</DialogTitle>
            <DialogDescription>{returnOpen?.tool?.code} — {returnOpen?.tool?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>จำนวนที่คืน (จ่ายไป {returnOpen?.quantity})</Label>
              <Input type="number" min={0} max={returnOpen?.quantity ?? 1}
                value={returnForm.returned_quantity}
                onChange={e => setReturnForm(f => ({ ...f, returned_quantity: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>สภาพหลังคืน</Label>
              <Select value={returnForm.condition} onValueChange={v => setReturnForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="needs_pm">ต้อง PM</SelectItem>
                  <SelectItem value="needs_repair">ต้องซ่อม</SelectItem>
                  <SelectItem value="damaged">ชำรุด</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>หมายเหตุการคืน</Label>
              <Textarea rows={2} value={returnForm.notes} onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(null)}>ยกเลิก</Button>
            <Button onClick={handleReturn}>ยืนยันรับคืน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
