import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { CalendarClock } from "lucide-react";

interface WeeklyPatternChartProps {
  companyId?: string;
}

const DAY_LABELS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]; // Mon-Sun
const DAY_FULL = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

type Row = { movement_type: string; quantity: number; created_at: string };

interface DayRow {
  day: string;
  dayFull: string;
  receiveQty: number;
  issueQty: number;
  receiveCount: number;
  issueCount: number;
  totalCount: number;
}

const RECEIVE_TYPES = ["receive", "transfer_in", "return_from_billboard"];
const ISSUE_TYPES = ["issue", "transfer_out", "install_to_billboard"];

export const WeeklyPatternChart = ({ companyId }: WeeklyPatternChartProps) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<"30" | "90" | "180" | "365">("90");
  const [metric, setMetric] = useState<"qty" | "count">("qty");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const start = subDays(new Date(), Number(rangeDays));
        const all: Row[] = [];
        const pageSize = 1000;
        let from = 0;
        while (true) {
          let q = supabase
            .from("stock_movements")
            .select("movement_type, quantity, created_at")
            .gte("created_at", start.toISOString())
            .order("created_at")
            .range(from, from + pageSize - 1);
          if (companyId && companyId !== "all") q = q.eq("company_id", companyId);
          const { data, error } = await q;
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...(data as Row[]));
          if (data.length < pageSize) break;
          from += pageSize;
        }
        if (!cancelled) setRows(all);
      } catch (e) {
        console.error("Error fetching weekly pattern:", e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [rangeDays, companyId]);

  const { dayData, heat, maxHeat, busiestDay, busiestHour } = useMemo(() => {
    const days: DayRow[] = DAY_LABELS.map((d, i) => ({
      day: d,
      dayFull: DAY_FULL[i],
      receiveQty: 0,
      issueQty: 0,
      receiveCount: 0,
      issueCount: 0,
      totalCount: 0,
    }));
    // heat[dayIdx][hour]
    const heatGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const idx = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
      const hour = d.getHours();
      const qty = Math.abs(Number(r.quantity) || 0);
      const isReceive = RECEIVE_TYPES.includes(r.movement_type);
      const isIssue = ISSUE_TYPES.includes(r.movement_type);
      if (isReceive) {
        days[idx].receiveQty += qty;
        days[idx].receiveCount += 1;
      } else if (isIssue) {
        days[idx].issueQty += qty;
        days[idx].issueCount += 1;
      } else {
        return;
      }
      days[idx].totalCount += 1;
      heatGrid[idx][hour] += 1;
    });

    let max = 0;
    heatGrid.forEach((r) => r.forEach((v) => (max = Math.max(max, v))));

    const busiest = days.reduce((a, b) => (b.totalCount > a.totalCount ? b : a), days[0]);
    const hourTotals = Array(24).fill(0) as number[];
    heatGrid.forEach((r) => r.forEach((v, h) => (hourTotals[h] += v)));
    const bestHour = hourTotals.indexOf(Math.max(...hourTotals));

    return {
      dayData: days,
      heat: heatGrid,
      maxHeat: max,
      busiestDay: busiest,
      busiestHour: Math.max(...hourTotals) > 0 ? bestHour : null,
    };
  }, [rows]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = dayData.find((d) => d.day === label);
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-2">วัน{row?.dayFull}</p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color || e.fill }} />
            <span className="text-muted-foreground">{e.name}:</span>
            <span className="font-medium">{Number(e.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              รูปแบบการรับ-เบิกจ่ายรายวัน (จันทร์-อาทิตย์)
            </CardTitle>
            <CardDescription>
              ดูว่าวันไหน/ช่วงเวลาไหนงานหนัก เพื่อวางแผนกำลังคน
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">แสดงผล:</span>
            <Select value={metric} onValueChange={(v) => setMetric(v as "qty" | "count")}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qty">ปริมาณ (ชิ้น)</SelectItem>
                <SelectItem value="count">จำนวนครั้ง</SelectItem>
              </SelectContent>
            </Select>
            <div className="h-5 w-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">ย้อนหลัง:</span>
            <Select value={rangeDays} onValueChange={(v) => setRangeDays(v as typeof rangeDays)}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 วัน</SelectItem>
                <SelectItem value="90">90 วัน</SelectItem>
                <SelectItem value="180">6 เดือน</SelectItem>
                <SelectItem value="365">1 ปี</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>
        ) : rows.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-muted-foreground">
            ไม่มีข้อมูลการเคลื่อนไหวในช่วงเวลานี้
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dayData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
                <Bar
                  yAxisId="left"
                  dataKey={metric === "qty" ? "receiveQty" : "receiveCount"}
                  name={metric === "qty" ? "รับเข้า (ชิ้น)" : "รับเข้า (ครั้ง)"}
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey={metric === "qty" ? "issueQty" : "issueCount"}
                  name={metric === "qty" ? "เบิกออก (ชิ้น)" : "เบิกออก (ครั้ง)"}
                  fill="hsl(var(--warning))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalCount"
                  name="จำนวนครั้งรวม"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Heatmap: weekday x hour */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-medium">ความหนาแน่นตามชั่วโมง (จำนวนครั้ง)</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>น้อย</span>
                  {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
                    <span
                      key={o}
                      className="inline-block w-4 h-3 rounded-sm"
                      style={{ backgroundColor: `hsl(var(--primary) / ${o})` }}
                    />
                  ))}
                  <span>มาก</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid" style={{ gridTemplateColumns: "40px repeat(24, minmax(0,1fr))" }}>
                    <div />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="text-[10px] text-muted-foreground text-center">
                        {h}
                      </div>
                    ))}
                    {heat.map((rowHours, di) => (
                      <Fragment key={`row-${di}`}>
                        <div className="text-xs text-muted-foreground pr-1 flex items-center">
                          {DAY_LABELS[di]}
                        </div>
                        {rowHours.map((v, h) => (
                          <div
                            key={`${di}-${h}`}
                            title={`วัน${DAY_FULL[di]} ${h}:00 — ${v} ครั้ง`}
                            className="h-6 m-[1px] rounded-sm border border-border/40"
                            style={{
                              backgroundColor:
                                v > 0 && maxHeat > 0
                                  ? `hsl(var(--primary) / ${0.15 + (v / maxHeat) * 0.85})`
                                  : "hsl(var(--muted))",
                            }}
                          />
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                วันที่งานหนักที่สุด: <span className="font-semibold">วัน{busiestDay?.dayFull}</span> (
                {busiestDay?.totalCount.toLocaleString()} ครั้ง)
              </div>
              {busiestHour !== null && (
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  ช่วงเวลาที่หนาแน่นที่สุด:{" "}
                  <span className="font-semibold">
                    {busiestHour}:00-{busiestHour + 1}:00 น.
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
