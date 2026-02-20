import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { History, BarChart3, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { PMHistoryList } from "@/components/pm/PMHistoryList";
import * as XLSX from "xlsx";
import type { DateRange } from "react-day-picker";

// Workaround: query profiles separately to avoid relation join error

interface BillboardPMHistoryRecord {
  id: string;
  billboard_id: string;
  action_label: string;
  pm_reason: string;
  equipment_snapshot: any;
  billboard_snapshot: any;
  notes: string | null;
  actioned_by: string | null;
  actioned_at: string;
  actioned_by_name?: string;
  billboards: {
    old_code: string | null;
    equipment_id: string;
    department: string | null;
    media_type: string | null;
    location_name: string | null;
    region: string | null;
  } | null;
  pm_action_types: {
    name: string;
    is_snooze: boolean;
  } | null;
}

export default function PMHistory() {
  const [historyData, setHistoryData] = useState<BillboardPMHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterDept, setFilterDept] = useState("all");
  const [filterMediaType, setFilterMediaType] = useState("all");
  const [filterPmReason, setFilterPmReason] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("billboard_pm_history")
        .select(`
          *,
          billboards:billboard_id (old_code, equipment_id, department, media_type, location_name, region),
          pm_action_types:action_type_id (name, is_snooze),
          profiles:actioned_by (full_name)
        `)
        .order("actioned_at", { ascending: false });

      if (dateRange?.from) {
        query = query.gte("actioned_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte("actioned_at", dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistoryData(data || []);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [dateRange]);

  const filtered = useMemo(() => {
    return historyData.filter(r => {
      if (filterDept !== "all" && r.billboards?.department !== filterDept) return false;
      if (filterMediaType !== "all" && r.billboards?.media_type !== filterMediaType) return false;
      if (filterPmReason !== "all" && r.pm_reason !== filterPmReason) return false;
      if (filterAction !== "all") {
        const isSnooze = r.pm_action_types?.is_snooze;
        if (filterAction === "ticket" && isSnooze) return false;
        if (filterAction === "snooze" && !isSnooze) return false;
      }
      return true;
    });
  }, [historyData, filterDept, filterMediaType, filterPmReason, filterAction]);

  const distinctDepts = [...new Set(historyData.map(r => r.billboards?.department).filter(Boolean))].sort();
  const distinctMediaTypes = [...new Set(historyData.map(r => r.billboards?.media_type).filter(Boolean))].sort();

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const month = format(new Date(r.actioned_at), "MMM yyyy", { locale: th });
      map.set(month, (map.get(month) || 0) + 1);
    });
    return Array.from(map.entries()).map(([month, count]) => ({ month, count })).slice(-12);
  }, [filtered]);

  // Top billboards
  const topBillboards = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    filtered.forEach(r => {
      const key = r.billboard_id;
      const label = r.billboards?.old_code || r.billboard_id.slice(0, 8);
      const existing = map.get(key);
      map.set(key, { label, count: (existing?.count || 0) + 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10).map(v => ({ name: v.label, count: v.count }));
  }, [filtered]);

  // Parts frequency from snapshots
  const topParts = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    filtered.forEach(r => {
      if (Array.isArray(r.equipment_snapshot)) {
        r.equipment_snapshot.forEach((item: any) => {
          const key = item.code || item.id;
          const label = `${item.code} ${item.name}`;
          const existing = map.get(key);
          map.set(key, { label, count: (existing?.count || 0) + 1 });
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10).map(v => ({ name: v.label, count: v.count }));
  }, [filtered]);

  const summaryTickets = filtered.filter(r => !r.pm_action_types?.is_snooze).length;
  const summarySnooze = filtered.filter(r => r.pm_action_types?.is_snooze).length;

  const clearFilters = () => {
    setFilterDept("all");
    setFilterMediaType("all");
    setFilterPmReason("all");
    setFilterAction("all");
    setDateRange(undefined);
  };

  const handleExport = () => {
    const rows = filtered.map(r => ({
      "วันที่ดำเนินการ": format(new Date(r.actioned_at), "dd/MM/yyyy HH:mm", { locale: th }),
      "Old Code": r.billboards?.old_code || "-",
      "Equipment ID": r.billboards?.equipment_id || "-",
      "ฝ่าย": r.billboards?.department || "-",
      "Media Type": r.billboards?.media_type || "-",
      "Location": r.billboards?.location_name || "-",
      "เหตุผล PM": r.pm_reason,
      "Action": r.action_label,
      "หมายเหตุ": r.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM History");
    XLSX.writeFile(wb, `pm_history_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ประวัติ PM ป้าย</h1>
        <p className="text-muted-foreground">ประวัติการดำเนินการ PM ป้ายโฆษณาทั้งหมด พร้อมสถิติ</p>
      </div>

      <Tabs defaultValue="billboard_pm">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="billboard_pm" className="gap-2">
            <History className="w-4 h-4" />
            ประวัติ PM ป้าย (Magic Ticket)
          </TabsTrigger>
          <TabsTrigger value="recurring_pm" className="gap-2">
            <History className="w-4 h-4" />
            ประวัติ PM แบบ Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billboard_pm" className="space-y-6 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">รายการทั้งหมด</p>
                <p className="text-3xl font-bold">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">สร้างตั๋ว</p>
                <p className="text-3xl font-bold text-primary">{summaryTickets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">ซ่อนชั่วคราว (Snooze)</p>
                <p className="text-3xl font-bold text-warning">{summarySnooze}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                ตัวกรอง
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="w-3 h-3" />ล้าง
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={setDateRange}
                  className="w-[280px]"
                />
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="ฝ่าย" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกฝ่าย</SelectItem>
                    {distinctDepts.map(d => <SelectItem key={d as string} value={d as string}>{d as string}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMediaType} onValueChange={setFilterMediaType}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Media Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุก Media Type</SelectItem>
                    {distinctMediaTypes.map(m => <SelectItem key={m as string} value={m as string}>{m as string}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPmReason} onValueChange={setFilterPmReason}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="เหตุผล PM" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกเหตุผล</SelectItem>
                    <SelectItem value="expiry">หมดอายุ</SelectItem>
                    <SelectItem value="warranty_expiry">หมดประกัน</SelectItem>
                    <SelectItem value="both">ทั้งสองอย่าง</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุก Action</SelectItem>
                    <SelectItem value="ticket">สร้างตั๋ว</SelectItem>
                    <SelectItem value="snooze">ซ่อนชั่วคราว</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  PM รายเดือน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">10 ป้ายที่ PM บ่อยสุด</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topBillboards} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">อะไหล่ที่เปลี่ยนบ่อย</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topParts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">รายการทั้งหมด ({filtered.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="w-4 h-4" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูล</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>Old Code</TableHead>
                        <TableHead>Equipment ID</TableHead>
                        <TableHead>ฝ่าย</TableHead>
                        <TableHead>Media Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>เหตุผล PM</TableHead>
                        <TableHead>อะไหล่</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>ผู้ดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(record => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {format(new Date(record.actioned_at), "dd/MM/yyyy HH:mm", { locale: th })}
                          </TableCell>
                          <TableCell className="font-medium">{record.billboards?.old_code || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{record.billboards?.equipment_id}</TableCell>
                          <TableCell>{record.billboards?.department || "-"}</TableCell>
                          <TableCell>{record.billboards?.media_type || "-"}</TableCell>
                          <TableCell>{record.billboards?.location_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record.pm_reason === "expiry" ? "destructive" : "secondary"} className="text-xs">
                              {record.pm_reason === "expiry" ? "หมดอายุ" : record.pm_reason === "warranty_expiry" ? "หมดประกัน" : "ทั้งสองอย่าง"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {Array.isArray(record.equipment_snapshot)
                              ? record.equipment_snapshot.map((e: any) => `${e.code} ${e.name}`).join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.pm_action_types?.is_snooze ? "secondary" : "default"} className="text-xs">
                              {record.action_label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{record.actioned_by_name || record.actioned_by?.slice(0, 8) || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring_pm" className="mt-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">ประวัติ PM แบบ Recurring</h2>
              <p className="text-muted-foreground text-sm">ประวัติการทำ PM ตามตาราง PM ที่กำหนดไว้ล่วงหน้า</p>
            </div>
            <PMHistoryList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
