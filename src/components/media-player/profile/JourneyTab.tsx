import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, ExternalLink } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MediaPlayerRow, BillboardJourney } from "./types";
import { formatBillboardLabel } from "@/lib/billboardUtils";

interface JourneyTabProps {
  player: MediaPlayerRow;
  journeys: BillboardJourney[];
}

export function JourneyTab({ player, journeys }: JourneyTabProps) {
  const navigate = useNavigate();

  const currentBillboard = useMemo(() => {
    if (!player.billboard) return null;
    return formatBillboardLabel(player.billboard.old_code, player.billboard.location_name, player.billboard.equipment_id);
  }, [player]);

  const usagePieData = useMemo(() => {
    if (!player.date_of_receipt) return [];
    const totalDays = differenceInDays(new Date(), parseISO(player.date_of_receipt));
    if (totalDays <= 0) return [];
    const installedDays = journeys.reduce((sum, j) => sum + (j.duration_days || 0), 0);
    const currentInstallDays = player.install_date ? differenceInDays(new Date(), parseISO(player.install_date)) : 0;
    const totalInstalled = installedDays + currentInstallDays;
    const warehouseDays = Math.max(0, totalDays - totalInstalled);
    return [
      { name: "ติดตั้งหน้างาน", value: totalInstalled, color: "hsl(var(--primary))" },
      { name: "อยู่ในคลัง", value: warehouseDays, color: "hsl(var(--muted-foreground))" },
    ].filter(d => d.value > 0);
  }, [player, journeys]);

  return (
    <div className="space-y-6">
      {/* Current installation */}
      {currentBillboard && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">ติดตั้งอยู่ปัจจุบัน</p>
                <button
                  className="font-semibold text-primary hover:underline flex items-center gap-1"
                  onClick={() => navigate(`/billboards/${player.billboard?.id}`)}
                >
                  {currentBillboard}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                {player.install_date && (
                  <p className="text-xs text-muted-foreground">
                    ตั้งแต่ {format(parseISO(player.install_date), "dd MMM yyyy", { locale: th })}
                    {" "}({differenceInDays(new Date(), parseISO(player.install_date))} วัน)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ประวัติการติดตั้ง/ถอด</CardTitle>
              <CardDescription>รายการป้ายที่เคยติดตั้ง</CardDescription>
            </CardHeader>
            <CardContent>
              {journeys.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">ยังไม่มีประวัติ</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ป้ายโฆษณา</TableHead>
                      <TableHead>วันติดตั้ง</TableHead>
                      <TableHead>วันถอด</TableHead>
                      <TableHead className="text-right">จำนวนวัน</TableHead>
                      <TableHead>เหตุผล</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeys.map((j, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <button
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                            onClick={() => navigate(`/billboards/${j.billboard_id}`)}
                          >
                            {j.billboard_name}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">
                          {j.installation_date ? format(parseISO(j.installation_date), "dd/MM/yy") : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {j.uninstall_date
                            ? format(parseISO(j.uninstall_date), "dd/MM/yy")
                            : <span className="text-primary font-medium">กำลังติดตั้ง</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {j.duration_days !== null ? `${j.duration_days} วัน` : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {j.uninstall_reason || (j.uninstall_date ? "-" : "ใช้งานอยู่")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สัดส่วนเวลาใช้งาน</CardTitle>
            <CardDescription>วันในคลัง vs วันติดตั้ง</CardDescription>
          </CardHeader>
          <CardContent>
            {usagePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={usagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value} วัน)`}
                    labelLine={false}
                  >
                    {usagePieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} วัน`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-sm text-muted-foreground">ยังไม่มีข้อมูลวันรับเข้าคลัง</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
