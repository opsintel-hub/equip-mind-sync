import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MPMismatch {
  id: string;
  code: string;
  name: string;
  status: string | null;
  billboard_id: string | null;
  location_id: string | null;
  quantity: number;
  expected: number;
  reason: string;
}

interface EqSnMismatch {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number | null;
  sn_in_stock: number;
  diff: number;
}

interface EqMovementMismatch {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number | null;
  last_stock_after: number | null;
  diff: number;
}

function expectedMpQuantity(row: { billboard_id: string | null; location_id: string | null; status: string | null }) {
  if (!row.billboard_id && row.location_id && (row.status === "active" || row.status === "in_stock")) return 1;
  return 0;
}

export default function StockReconciliation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [mpMismatches, setMpMismatches] = useState<MPMismatch[]>([]);
  const [mpTotal, setMpTotal] = useState(0);
  const [snMismatches, setSnMismatches] = useState<EqSnMismatch[]>([]);
  const [mvMismatches, setMvMismatches] = useState<EqMovementMismatch[]>([]);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Media players
      const { data: mps, error: mpErr } = await supabase
        .from("media_players")
        .select("id, code, name, status, billboard_id, location_id, quantity")
        .eq("is_active", true);
      if (mpErr) throw mpErr;
      const mpList: MPMismatch[] = [];
      (mps || []).forEach((m: any) => {
        const exp = expectedMpQuantity(m);
        if ((m.quantity ?? 0) !== exp) {
          const reason =
            exp === 1
              ? "ควรนับเป็น 1 (อยู่ในคลัง พร้อมใช้)"
              : m.billboard_id
              ? "ติดตั้งบนป้าย → ต้องเป็น 0"
              : !m.location_id
              ? "in transit / ไม่ระบุคลัง → ต้องเป็น 0"
              : `สถานะ ${m.status} → ต้องเป็น 0`;
          mpList.push({
            ...m,
            quantity: m.quantity ?? 0,
            expected: exp,
            reason,
          });
        }
      });
      setMpTotal(mps?.length || 0);
      setMpMismatches(mpList);

      // 2) Equipment vs serial numbers (only for items that have any SN)
      const { data: eqs, error: eqErr } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock")
        .eq("is_active", true);
      if (eqErr) throw eqErr;

      const { data: sns, error: snErr } = await supabase
        .from("equipment_serial_numbers")
        .select("equipment_id, status");
      if (snErr) throw snErr;

      const snCount = new Map<string, number>();
      const snHas = new Set<string>();
      (sns || []).forEach((s: any) => {
        snHas.add(s.equipment_id);
        if (s.status === "in_stock") {
          snCount.set(s.equipment_id, (snCount.get(s.equipment_id) || 0) + 1);
        }
      });

      const snList: EqSnMismatch[] = [];
      (eqs || []).forEach((e: any) => {
        if (!snHas.has(e.id)) return; // skip non-serialized items
        const c = snCount.get(e.id) || 0;
        const q = e.quantity_in_stock ?? 0;
        if (c !== q) {
          snList.push({
            id: e.id,
            code: e.code,
            name: e.name,
            quantity_in_stock: q,
            sn_in_stock: c,
            diff: q - c,
          });
        }
      });
      setSnMismatches(snList);

      // 3) Equipment vs last stock_movements.stock_after
      const { data: lastMv, error: mvErr } = await supabase
        .from("stock_movements")
        .select("equipment_id, stock_after, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (mvErr) throw mvErr;
      const lastByEq = new Map<string, number>();
      (lastMv || []).forEach((m: any) => {
        if (!lastByEq.has(m.equipment_id) && m.stock_after !== null) {
          lastByEq.set(m.equipment_id, m.stock_after);
        }
      });
      const mvList: EqMovementMismatch[] = [];
      (eqs || []).forEach((e: any) => {
        const last = lastByEq.get(e.id);
        if (last === undefined) return;
        const q = e.quantity_in_stock ?? 0;
        if (last !== q) {
          mvList.push({
            id: e.id,
            code: e.code,
            name: e.name,
            quantity_in_stock: q,
            last_stock_after: last,
            diff: q - last,
          });
        }
      });
      setMvMismatches(mvList);
    } catch (e: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const fixMediaPlayers = async () => {
    if (mpMismatches.length === 0) return;
    setFixing(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const r of mpMismatches) {
        const { error } = await supabase
          .from("media_players")
          .update({ quantity: r.expected })
          .eq("id", r.id);
        if (error) fail++;
        else ok++;
      }
      toast.success(`แก้ไขสำเร็จ ${ok} รายการ${fail ? `, ล้มเหลว ${fail}` : ""}`);
      await run();
    } finally {
      setFixing(false);
    }
  };

  const totalIssues = mpMismatches.length + snMismatches.length + mvMismatches.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">ตรวจสอบความสอดคล้องยอดคงคลัง</h1>
          <p className="text-sm text-muted-foreground">
            เทียบยอดข้าม StockCard / InventoryReport / MediaPlayerReport / GlobalSearch (อ่านจาก single source of truth เดียวกัน)
          </p>
        </div>
        <Button onClick={run} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          ตรวจซ้ำ
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard label="Media Players ทั้งหมด" value={mpTotal} tone="muted" />
        <SummaryCard label="MP quantity ผิด rule" value={mpMismatches.length} tone={mpMismatches.length ? "danger" : "ok"} />
        <SummaryCard label="Equipment vs S/N ไม่ตรง" value={snMismatches.length} tone={snMismatches.length ? "danger" : "ok"} />
        <SummaryCard label="Equipment vs Stock Card ไม่ตรง" value={mvMismatches.length} tone={mvMismatches.length ? "danger" : "ok"} />
      </div>

      {totalIssues === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="font-medium">ยอดคงคลังตรงกันทุกแหล่ง</p>
            <p className="text-sm text-muted-foreground mt-1">
              media_players.quantity, equipment.quantity_in_stock, equipment_serial_numbers และ stock_movements สอดคล้องกัน
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mp">
        <TabsList>
          <TabsTrigger value="mp">Media Player ({mpMismatches.length})</TabsTrigger>
          <TabsTrigger value="sn">Equipment vs S/N ({snMismatches.length})</TabsTrigger>
          <TabsTrigger value="mv">Equipment vs Stock Card ({mvMismatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mp">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Media Player ที่ quantity ไม่ตรงกับ rule
              </CardTitle>
              {mpMismatches.length > 0 && (
                <Button onClick={fixMediaPlayers} disabled={fixing} size="sm">
                  {fixing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
                  แก้ไข quantity อัตโนมัติ ({mpMismatches.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {mpMismatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">ทุกเครื่องตรงตาม rule</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส / ชื่อ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">ปัจจุบัน</TableHead>
                      <TableHead className="text-right">ที่ถูกต้อง</TableHead>
                      <TableHead>เหตุผล</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mpMismatches.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.code}</div>
                          <div className="text-xs text-muted-foreground">{r.name}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.status || "-"}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-red-600">{r.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-green-700">{r.expected}</TableCell>
                        <TableCell className="text-xs">{r.reason}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/media-player/${r.id}`)}>เปิด</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sn">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                equipment.quantity_in_stock ≠ จำนวน S/N สถานะ in_stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snMismatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">ตรงกันทุกรายการ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส / ชื่อ</TableHead>
                      <TableHead className="text-right">quantity_in_stock</TableHead>
                      <TableHead className="text-right">S/N in_stock</TableHead>
                      <TableHead className="text-right">ส่วนต่าง</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snMismatches.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.code}</div>
                          <div className="text-xs text-muted-foreground">{r.name}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{r.quantity_in_stock}</TableCell>
                        <TableCell className="text-right font-mono">{r.sn_in_stock}</TableCell>
                        <TableCell className={`text-right font-mono ${r.diff === 0 ? "" : "text-red-600"}`}>{r.diff > 0 ? `+${r.diff}` : r.diff}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/stock-card?equipmentId=${r.id}`)}>เปิด</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mv">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                equipment.quantity_in_stock ≠ stock_movements ล่าสุด (stock_after)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mvMismatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">ตรงกันทุกรายการ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส / ชื่อ</TableHead>
                      <TableHead className="text-right">quantity_in_stock</TableHead>
                      <TableHead className="text-right">stock_after ล่าสุด</TableHead>
                      <TableHead className="text-right">ส่วนต่าง</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mvMismatches.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.code}</div>
                          <div className="text-xs text-muted-foreground">{r.name}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{r.quantity_in_stock}</TableCell>
                        <TableCell className="text-right font-mono">{r.last_stock_after}</TableCell>
                        <TableCell className={`text-right font-mono ${r.diff === 0 ? "" : "text-red-600"}`}>{r.diff > 0 ? `+${r.diff}` : r.diff}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/stock-card?equipmentId=${r.id}`)}>เปิด</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "muted" | "danger" | "ok" }) {
  const toneCls =
    tone === "danger"
      ? "text-red-600"
      : tone === "ok"
      ? "text-green-600"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
