import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Clock, Plug, Save, RefreshCw, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULTS = {
  db_type: "mssql",
  host: "magicticket.magicsigncloud.com",
  port: 1433,
  database_name: "planb",
  table_name: "Asset",
  username: "planb_viewer",
};

const DAYS_PER_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  trigger_type: string;
  rows_fetched: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  rows_failed: number;
  error_message: string | null;
}

export function BillboardDbConnection() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [form, setForm] = useState({
    db_type: DEFAULTS.db_type,
    host: DEFAULTS.host,
    port: DEFAULTS.port,
    database_name: DEFAULTS.database_name,
    table_name: DEFAULTS.table_name,
    username: DEFAULTS.username,
    password: "",
    auto_sync_enabled: false,
    auto_sync_days: [1, 7, 14, 21] as number[],
  });

  const [logs, setLogs] = useState<SyncLog[]>([]);

  const loadConnection = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("external_db_connections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setConnectionId(data.id);
        setForm({
          db_type: data.db_type,
          host: data.host,
          port: data.port,
          database_name: data.database_name,
          table_name: data.table_name,
          username: data.username,
          password: "",
          auto_sync_enabled: data.auto_sync_enabled,
          auto_sync_days: (data.auto_sync_days as number[]) ?? [],
        });
      }
    } catch (err: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from("billboard_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);
    setLogs((data as any) ?? []);
  };

  useEffect(() => {
    loadConnection();
    loadLogs();
  }, []);

  const callEdge = async (endpoint: string, body: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sync-billboards-mssql/${endpoint}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify({
        host: form.host,
        port: form.port,
        database: form.database_name,
        table: form.table_name,
        username: form.username,
        password: form.password || undefined,
        ...body,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await callEdge("test-connection");
      toast.success(result.message || `เชื่อมต่อสำเร็จ พบ ${result.total_rows} แถว`);
    } catch (err: any) {
      toast.error("เชื่อมต่อไม่สำเร็จ: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  const saveConnection = async () => {
    const payload: any = {
      name: "Billboard MS SQL",
      db_type: form.db_type,
      host: form.host,
      port: form.port,
      database_name: form.database_name,
      table_name: form.table_name,
      username: form.username,
      password_secret_name: "MSSQL_BILLBOARD_PASSWORD",
      auto_sync_enabled: form.auto_sync_enabled,
      auto_sync_days: form.auto_sync_days,
      auto_sync_time: "04:00",
    };

    let id = connectionId;
    if (id) {
      const { error } = await supabase
        .from("external_db_connections")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("external_db_connections")
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      id = data.id;
      setConnectionId(id);
    }
    return id;
  };

  const handleSaveAndSync = async () => {
    setSaving(true);
    try {
      const id = await saveConnection();
      toast.success("บันทึกการเชื่อมต่อสำเร็จ");
      setSyncing(true);
      const result = await callEdge("sync", { connection_id: id, trigger_type: "manual" });
      toast.success(
        `Sync สำเร็จ: เพิ่ม ${result.rows_inserted}, อัปเดต ${result.rows_updated}, ข้าม ${result.rows_skipped}, ผิดพลาด ${result.rows_failed}`,
      );
      loadLogs();
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };

  const handleSyncOnly = async () => {
    if (!connectionId) {
      toast.error("กรุณาบันทึกการเชื่อมต่อก่อน");
      return;
    }
    setSyncing(true);
    try {
      const result = await callEdge("sync", { connection_id: connectionId, trigger_type: "manual" });
      toast.success(
        `Sync สำเร็จ: เพิ่ม ${result.rows_inserted}, อัปเดต ${result.rows_updated}, ข้าม ${result.rows_skipped}, ผิดพลาด ${result.rows_failed}`,
      );
      loadLogs();
    } catch (err: any) {
      toast.error("Sync ไม่สำเร็จ: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const toggleDay = (day: number) => {
    setForm((f) => {
      const has = f.auto_sync_days.includes(day);
      if (has) {
        return { ...f, auto_sync_days: f.auto_sync_days.filter((d) => d !== day) };
      }
      if (f.auto_sync_days.length >= 4) {
        toast.error("เลือกได้สูงสุด 4 วัน/เดือน");
        return f;
      }
      return { ...f, auto_sync_days: [...f.auto_sync_days, day].sort((a, b) => a - b) };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="connection" className="space-y-4">
      <TabsList>
        <TabsTrigger value="connection">การเชื่อมต่อข้อมูล</TabsTrigger>
        <TabsTrigger value="history">ประวัติการ Sync ({logs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="connection">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>เชื่อมต่อ Database</CardTitle>
                <CardDescription>
                  กำหนดค่าเชื่อมต่อ Database ภายนอก (รองรับ MS SQL Server และ PostgreSQL) — ใช้ร่วมกันทั้งระบบ
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ประเภท Database</Label>
                <Select value={form.db_type} onValueChange={(v) => setForm((f) => ({ ...f, db_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mssql">MS SQL Server</SelectItem>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Server (host:port)</Label>
                <Input
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                  placeholder="magicticket.magicsigncloud.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Database</Label>
                <Input
                  value={form.database_name}
                  onChange={(e) => setForm((f) => ({ ...f, database_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>User</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Table (ไม่บังคับ)</Label>
                <Input
                  value={form.table_name}
                  onChange={(e) => setForm((f) => ({ ...f, table_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="•••••••••••• (ใช้ค่าใน secret ถ้าเว้นว่าง)"
                />
              </div>
            </div>

            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">Auto-Sync (เซิร์ฟเวอร์รันอัตโนมัติ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {form.auto_sync_enabled ? "เปิด" : "ปิด"}
                    </span>
                    <Switch
                      checked={form.auto_sync_enabled}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, auto_sync_enabled: v }))}
                    />
                  </div>
                </div>

                {form.auto_sync_enabled && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      วันที่ในเดือน (เลือกได้สูงสุด 4 วัน — รันเวลา 04:00 น.)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {form.auto_sync_days.map((d) => (
                        <Badge
                          key={d}
                          variant="secondary"
                          className="cursor-pointer gap-1 px-3 py-1"
                          onClick={() => toggleDay(d)}
                        >
                          วันที่ {d}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                    {form.auto_sync_days.length < 4 && (
                      <Select onValueChange={(v) => toggleDay(Number(v))}>
                        <SelectTrigger className="w-full md:w-64">
                          <SelectValue placeholder="+ เพิ่มวันที่" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_PER_MONTH
                            .filter((d) => !form.auto_sync_days.includes(d))
                            .map((d) => (
                              <SelectItem key={d} value={String(d)}>
                                วันที่ {d}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                ทดสอบเชื่อมต่อ
              </Button>
              <Button onClick={handleSaveAndSync} disabled={saving || syncing}>
                {saving || syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save & Sync ทันที
              </Button>
              <Button variant="secondary" onClick={handleSyncOnly} disabled={syncing || !connectionId}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync ข้อมูลเข้าระบบ (Manual)
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>ประวัติการ Sync (30 รายการล่าสุด)</CardTitle>
            <CardDescription>บันทึกผลการ sync ทั้ง manual และ auto-sync</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">ยังไม่มีประวัติการ sync</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลาเริ่ม</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">ดึง</TableHead>
                    <TableHead className="text-right">เพิ่ม</TableHead>
                    <TableHead className="text-right">อัปเดต</TableHead>
                    <TableHead className="text-right">ข้าม</TableHead>
                    <TableHead className="text-right">ผิดพลาด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.started_at).toLocaleString("th-TH")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.trigger_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "completed"
                              ? "default"
                              : log.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{log.rows_fetched}</TableCell>
                      <TableCell className="text-right text-success">{log.rows_inserted}</TableCell>
                      <TableCell className="text-right text-primary">{log.rows_updated}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{log.rows_skipped}</TableCell>
                      <TableCell className="text-right text-destructive">{log.rows_failed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
