import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { TechnicianToolsDialog } from "./TechnicianToolsDialog";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { parseRoster, rosterDepartments, type RosterRow } from "@/lib/technicianRoster";
import type { Tables } from "@/integrations/supabase/types";
import { Download, Upload, Plus, Pencil, Wrench, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Technician = Tables<"technicians">;
export function TechnicianRegistry() {
  const perms = useDepartmentPermissions();
  const [rows, setRows] = useState<Technician[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<RosterRow & {id?: string} | null>(null);
  const [tools, setTools] = useState<Technician | null>(null);
  const [pending, setPending] = useState<RosterRow[] | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const allowed = (action: "view" | "create" | "edit") => rosterDepartments(perms.isSuperAdmin, perms.allDepartmentNames, perms.permissions, action);
  const viewable = allowed("view");
  const editable = allowed("edit");
  const creatable = allowed("create");
  async function load() {
    setBusy(true); setError("");
    try {
      const data = await fetchAllRows<Technician>(() => supabase.from("technicians").select("*").order("created_at", {ascending:false}).order("id"));
      setRows(data);
    } catch { setError("โหลดรายชื่อไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (!perms.loading) void load(); }, [perms.loading]);
  const filtered = rows.filter(r => r.department && viewable.includes(r.department) && (!departments.length || departments.includes(r.department)) && (status === "all" || r.is_active === (status === "active")) && [r.code,r.name,r.department,r.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const pagination = useTablePagination(filtered,20);
  function download(template: boolean) {
    const data = template ? [{"รหัสช่าง":"", "ชื่อ-นามสกุล":"", "ฝ่าย":"", "เบอร์โทร":"", "หมายเหตุ":"", "สถานะ":""}] : filtered.map(r => ({"รหัสช่าง":r.code,"ชื่อ-นามสกุล":r.name,"ฝ่าย":r.department,"เบอร์โทร":r.phone ?? "","หมายเหตุ":r.notes ?? "","สถานะ":r.is_active ? "ใช้งาน":"ปิดใช้งาน"}));
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet['!cols'] = [24,32,24,18,40,16].map(wch => ({wch}));
    XLSX.utils.book_append_sheet(book,sheet,"ทะเบียนช่าง");
    if (template) XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(creatable.map(d => ({"ฝ่าย":d}))),"ฝ่ายที่นำเข้าได้");
    XLSX.writeFile(book,template ? "technician_template.xlsx":"technician_roster.xlsx");
  }
  async function readFile(selected?: File) {
    if (!selected) return;
    setError("");
    try {
      const book = XLSX.read(await selected.arrayBuffer(),{type:"array"});
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error("ไม่พบรายชื่อในไฟล์");
      const parsed = parseRoster(XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet),Array.from(new Set([...creatable,...editable])));
      if (!parsed.length || parsed.length > 5000) throw new Error("กรุณานำเข้า 1–5,000 รายชื่อ");
      setPending(parsed);
    } catch(e) { setError(e instanceof Error ? e.message : "อ่านไฟล์ไม่สำเร็จ"); }
    if (file.current) file.current.value = "";
  }
  async function importRows() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      const {data,error} = await supabase.rpc("import_technician_roster",{p_rows:JSON.parse(JSON.stringify(pending))});
      if (error) throw error;
      const result = data as {added:number;updated:number};
      toast.success(`เพิ่ม ${result.added} คน / อัปเดต ${result.updated} คน`);
      setPending(null); await load();
    } catch(e) { setError(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ ไม่มีการบันทึกบางส่วน"); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const clean = parseRoster([{"รหัสช่าง":draft.code,"ชื่อ-นามสกุล":draft.name,"ฝ่าย":draft.department,"เบอร์โทร":draft.phone,"หมายเหตุ":draft.notes,"สถานะ":draft.is_active === false ? "ปิดใช้งาน":"ใช้งาน"}],draft.id ? editable : creatable)[0];
      const payload = {...clean,code:clean.code || `TECH-${crypto.randomUUID().replace(/-/g,"").slice(0,12).toUpperCase()}`};
      const response = draft.id ? await supabase.from("technicians").update(payload).eq("id",draft.id).select("id").single() : await supabase.from("technicians").insert(payload).select("id").single();
      if (response.error) throw response.error;
      setDraft(null); toast.success("บันทึกช่างแล้ว"); await load();
    } catch(e) { toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ ตรวจรหัสหรือชื่อซ้ำ"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => download(false)} disabled={busy}><Download className="mr-2 h-4 w-4"/>ดาวน์โหลดรายชื่อปัจจุบัน</Button>
      <Button variant="outline" onClick={() => download(true)}><Download className="mr-2 h-4 w-4"/>ดาวน์โหลด Template</Button>
      {(creatable.length > 0 || editable.length > 0) && <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><Upload className="mr-2 h-4 w-4"/>นำเข้า Excel</Button>}
      {creatable.length > 0 && <Button disabled={busy} onClick={() => setDraft({name:"",department:creatable[0],phone:"",notes:"",is_active:true})}><Plus className="mr-2 h-4 w-4"/>เพิ่มช่าง</Button>}
      <Button variant="outline" size="icon" title="โหลดรายชื่อใหม่" onClick={load} disabled={busy}><RefreshCw className="h-4 w-4"/></Button>
      <input ref={file} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => void readFile(e.target.files?.[0])}/>
    </div>
    <div className="flex flex-wrap gap-2">
      <DepartmentMultiFilter value={departments} onChange={setDepartments} allowedDepartments={viewable}/>
      <Input className="w-full sm:w-64" aria-label="ค้นหาช่าง" placeholder="ค้นหารหัส ชื่อ หรือเบอร์โทร" value={search} onChange={e => setSearch(e.target.value)}/>
      <div className="w-40"><SearchableSelect value={status} onValueChange={setStatus} options={[{value:"all",label:"ทุกสถานะ"},{value:"active",label:"ใช้งาน"},{value:"inactive",label:"ปิดใช้งาน"}]}/></div>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {busy && <p role="status" className="text-muted-foreground">กำลังประมวลผลรายชื่อ…</p>}
    {pending && <section className="border rounded-md p-4 space-y-3">
      <h3 className="font-semibold">ตรวจรายการนำเข้า {pending.length} คน</h3>
      <p className="text-sm text-muted-foreground">รหัสตรงกันจะอัปเดตคนเดิม; ไม่มีรหัสจะเทียบชื่อและฝ่าย คนที่ไม่มีในไฟล์ยังคงอยู่</p>
      <div className="max-h-60 overflow-auto"><Table><TableHeader><TableRow><TableHead>ชื่อ-นามสกุล</TableHead><TableHead>ฝ่าย</TableHead></TableRow></TableHeader><TableBody>{pending.map((r,i) => <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell>{r.department}</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="flex gap-2"><Button disabled={busy} onClick={importRows}>ยืนยันนำเข้า</Button><Button variant="outline" disabled={busy} onClick={() => setPending(null)}>ยกเลิก</Button></div>
    </section>}
    <p className="font-medium">รายชื่อช่าง ({filtered.length} คน)</p>
    <div className="overflow-x-auto"><Table><TableHeader><TableRow>{["รหัสช่าง","ชื่อ-นามสกุล","ฝ่าย","เบอร์โทร","สถานะ","จัดการ"].map(t => <TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>
      {pagination.paginatedData.map(r => <TableRow key={r.id}><TableCell className="whitespace-nowrap">{r.code}</TableCell><TableCell className="min-w-40">{r.name}</TableCell><TableCell>{r.department}</TableCell><TableCell>{r.phone || "-"}</TableCell><TableCell><Badge variant={r.is_active ? "secondary":"outline"}>{r.is_active ? "ใช้งาน":"ปิดใช้งาน"}</Badge></TableCell><TableCell><div className="flex gap-1">
        {r.department && editable.includes(r.department) && <Button size="icon" variant="ghost" title={`แก้ไข ${r.name}`} onClick={() => setDraft({...r,department:r.department ?? "",phone:r.phone ?? "",notes:r.notes ?? ""})}><Pencil className="h-4 w-4"/></Button>}
        <Button size="icon" variant="ghost" title={`เครื่องมือ ${r.name}`} onClick={() => setTools(r)}><Wrench className="h-4 w-4"/></Button>
      </div></TableCell></TableRow>)}
    </TableBody></Table></div>
    {!busy && !filtered.length && <p className="text-muted-foreground">ไม่พบรายชื่อช่าง</p>}
    <TablePagination {...pagination} onPageChange={pagination.handlePageChange} onPageSizeChange={pagination.handlePageSizeChange}/>
    <Dialog open={!!draft} onOpenChange={open => {if (!open && !busy) setDraft(null);}}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{draft?.id ? "แก้ไขช่าง":"เพิ่มช่าง"}</DialogTitle></DialogHeader>{draft && <form className="space-y-3" onSubmit={e => {e.preventDefault(); void save();}}>
      <div><Label htmlFor="tech-code">รหัสช่าง</Label><Input id="tech-code" value={draft.code ?? ""} disabled={!!draft.id} onChange={e => setDraft({...draft,code:e.target.value})} placeholder="สร้างรหัสอัตโนมัติ"/></div>
      <div><Label htmlFor="tech-name">ชื่อ-นามสกุล *</Label><Input id="tech-name" required value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})}/></div>
      <div><Label>ฝ่าย *</Label><SearchableSelect value={draft.department} onValueChange={department => setDraft({...draft,department})} options={(draft.id ? editable : creatable).map(d => ({value:d,label:d}))}/></div>
      <div><Label htmlFor="tech-phone">เบอร์โทร</Label><Input id="tech-phone" value={draft.phone ?? ""} onChange={e => setDraft({...draft,phone:e.target.value})}/></div>
      <div><Label htmlFor="tech-notes">หมายเหตุ</Label><Input id="tech-notes" value={draft.notes ?? ""} onChange={e => setDraft({...draft,notes:e.target.value})}/></div>
      <div className="flex items-center gap-2"><Switch id="tech-active" checked={draft.is_active !== false} onCheckedChange={is_active => setDraft({...draft,is_active})}/><Label htmlFor="tech-active">ใช้งาน</Label></div>
      <Button type="submit" disabled={busy}>บันทึก</Button>
    </form>}</DialogContent></Dialog>
    {tools && <TechnicianToolsDialog technicianId={tools.id} technicianName={tools.name} open onOpenChange={open => {if (!open) setTools(null);}}/>}
  </div>;
}