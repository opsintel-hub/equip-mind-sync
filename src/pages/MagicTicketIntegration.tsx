import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Copy, KeyRound, Link2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/magic-ticket`;
const dt = (v?: string | null) => (v ? format(new Date(v), "d MMM yy HH:mm:ss", { locale: th }) : "-");
const EVENT_LABEL: Record<string, string> = { install: "ติดตั้ง", return_good: "คืนของดี", return_defective: "คืนของเสีย" };

export default function MagicTicketIntegration() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("__all__");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("Magic Ticket Adapter");
  const [env, setEnv] = useState("UAT");
  const [creating, setCreating] = useState(false);

  const events = useQuery({
    queryKey: ["magic-ticket-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("magic_ticket_events").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const keys = useQuery({
    queryKey: ["magic-ticket-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("magic_ticket_api_keys").select("id, name, environment, key_prefix, is_active, created_at, last_used_at, revoked_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const maps = useQuery({
    queryKey: ["magic-ticket-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("magic_ticket_ticket_map").select("*").order("last_event_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (events.data || []).filter((e) => (status === "__all__" || e.status === status) &&
      (!t || [e.ticket_code, e.gi_document_no, e.item_code, e.serial_number, e.employee_name, e.billboard_old_code, e.event_id]
        .some((v) => v?.toLowerCase().includes(t))));
  }, [events.data, search, status]);
  const pg = useTablePagination(filtered, 20);

  const createKey = async () => {
    setCreating(true);
    const { data, error } = await supabase.rpc("magic_ticket_create_api_key", { p_name: keyName, p_environment: env });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewKey((data as { api_key: string }).api_key);
    qc.invalidateQueries({ queryKey: ["magic-ticket-keys"] });
  };
  const revoke = async (id: string) => {
    if (!confirm("ยกเลิก API key นี้? Magic Ticket จะเรียกด้วย key นี้ไม่ได้ทันที")) return;
    const { error } = await supabase.rpc("magic_ticket_revoke_api_key", { p_id: id });
    if (error) return toast.error(error.message);
    toast.success("ยกเลิก key แล้ว");
    qc.invalidateQueries({ queryKey: ["magic-ticket-keys"] });
  };
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("คัดลอกแล้ว"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Link2 className="h-8 w-8 text-primary" />Magic Ticket Integration</h1>
        <p className="text-muted-foreground mt-2">เฟส 1: Magic Ticket ดึงใบเบิกที่จ่ายแล้ว และส่งผลติดตั้ง/คืนกลับมา</p>
      </div>
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Base URL:</span>
          <code className="font-mono break-all">{BASE_URL}</code>
          <Button size="icon" variant="ghost" onClick={() => copy(BASE_URL)} aria-label="คัดลอก Base URL"><Copy className="h-4 w-4" /></Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Log เหตุการณ์</TabsTrigger>
          <TabsTrigger value="map">Ticket ↔ ใบเบิก</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Ticket, เลขเอกสาร, รหัสสินค้า, S/N, พนักงาน, OldCode" value={search}
                onChange={(e) => { setSearch(e.target.value); pg.handlePageChange(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); pg.handlePageChange(1); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">ทุกสถานะ</SelectItem>
                <SelectItem value="applied">สำเร็จ</SelectItem>
                <SelectItem value="rejected">ถูกปฏิเสธ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => events.refetch()}><RefreshCw className="h-4 w-4" />รีเฟรช</Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1300px]">
              <TableHeader><TableRow>
                <TableHead>เวลา</TableHead><TableHead>ผล</TableHead><TableHead>Ticket / Project</TableHead>
                <TableHead>ใบเบิก</TableHead><TableHead>สินค้า / S/N</TableHead><TableHead>เหตุการณ์</TableHead>
                <TableHead className="text-right">จำนวน</TableHead><TableHead>ป้าย (OldCode)</TableHead><TableHead>พนักงาน</TableHead><TableHead>ข้อความ</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {!pg.paginatedData.length ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {events.isLoading ? "กำลังโหลด..." : "ยังไม่มีเหตุการณ์"}</TableCell></TableRow> :
                  pg.paginatedData.map((e) => <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs">{dt(e.created_at)}</TableCell>
                    <TableCell><Badge variant={e.status === "applied" ? "default" : "destructive"}>{e.status === "applied" ? "สำเร็จ" : `${e.http_status} ${e.result_code}`}</Badge></TableCell>
                    <TableCell><div className="font-mono">{e.ticket_code || "-"}</div><div className="text-xs text-muted-foreground">{e.department_code || "-"}</div></TableCell>
                    <TableCell className="font-mono whitespace-nowrap">{e.gi_document_no || "-"}</TableCell>
                    <TableCell><div className="font-mono">{e.item_code || "-"}</div><div className="text-xs font-mono whitespace-pre-line">{e.serial_number || ""}</div></TableCell>
                    <TableCell>{EVENT_LABEL[e.event_type || ""] || e.event_type || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.quantity ?? "-"}</TableCell>
                    <TableCell>{e.billboard_old_code || "-"}</TableCell>
                    <TableCell>{e.employee_name || "-"}</TableCell>
                    <TableCell className="max-w-72 text-xs">{e.message}</TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={pg.currentPage} totalPages={pg.totalPages} pageSize={pg.pageSize} totalItems={pg.totalItems}
            onPageChange={pg.handlePageChange} onPageSizeChange={pg.handlePageSizeChange} />
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>ใบเบิก</TableHead><TableHead>Project</TableHead>
                <TableHead className="text-right">จำนวนเหตุการณ์</TableHead><TableHead>ครั้งแรก</TableHead><TableHead>ล่าสุด</TableHead></TableRow></TableHeader>
              <TableBody>
                {!(maps.data || []).length ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ยังไม่มีการผูก Ticket</TableCell></TableRow> :
                  maps.data!.map((m) => <TableRow key={m.id}>
                    <TableCell className="font-mono">{m.ticket_code}</TableCell><TableCell className="font-mono">{m.gi_document_no}</TableCell>
                    <TableCell>{m.department_code || "-"}</TableCell><TableCell className="text-right">{m.event_count}</TableCell>
                    <TableCell className="text-xs">{dt(m.first_event_at)}</TableCell><TableCell className="text-xs">{dt(m.last_event_at)}</TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />สร้าง API Key</CardTitle>
              <CardDescription>ระบบแสดง key เต็มเพียงครั้งเดียว ให้ส่งให้ทีม Magic Ticket ทางช่องทางที่ปลอดภัย</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Input className="max-w-xs" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="ชื่อ key" />
              <Select value={env} onValueChange={setEnv}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="UAT">UAT</SelectItem><SelectItem value="PROD">PROD</SelectItem></SelectContent>
              </Select>
              <Button onClick={createKey} disabled={creating}>{creating ? "กำลังสร้าง..." : "สร้าง key"}</Button>
            </CardContent>
          </Card>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>ชื่อ</TableHead><TableHead>สภาพแวดล้อม</TableHead><TableHead>ขึ้นต้นด้วย</TableHead>
                <TableHead>สถานะ</TableHead><TableHead>สร้างเมื่อ</TableHead><TableHead>ใช้ล่าสุด</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {(keys.data || []).map((k) => <TableRow key={k.id}>
                  <TableCell>{k.name}</TableCell><TableCell><Badge variant="outline">{k.environment}</Badge></TableCell>
                  <TableCell className="font-mono">{k.key_prefix}…</TableCell>
                  <TableCell><Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "ใช้งาน" : "ยกเลิกแล้ว"}</Badge></TableCell>
                  <TableCell className="text-xs">{dt(k.created_at)}</TableCell><TableCell className="text-xs">{dt(k.last_used_at)}</TableCell>
                  <TableCell>{k.is_active && <Button size="sm" variant="outline" onClick={() => revoke(k.id)}>ยกเลิก</Button>}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key ใหม่</DialogTitle>
            <DialogDescription>คัดลอกเก็บไว้ตอนนี้ ปิดหน้าต่างแล้วจะดู key เต็มอีกไม่ได้</DialogDescription>
          </DialogHeader>
          <code className="block rounded-md border p-3 font-mono text-sm break-all">{newKey}</code>
          <DialogFooter><Button onClick={() => newKey && copy(newKey)} className="gap-2"><Copy className="h-4 w-4" />คัดลอก</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
