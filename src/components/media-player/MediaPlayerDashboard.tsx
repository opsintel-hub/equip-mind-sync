import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, MapPin, Package, AlertTriangle, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface MediaPlayer {
  id: string;
  billboard_id: string | null;
  cms_type_id: string | null;
  is_asset: boolean | null;
  warranty_expiry_date: string | null;
  waiting_asset_code: boolean | null;
  waiting_equipment_id: boolean | null;
}

interface CMSType {
  id: string;
  name: string;
}

const COLORS = ["#22c55e", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899"];

const MediaPlayerDashboard = () => {
  const { data: mediaPlayers, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["media-players-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, billboard_id, cms_type_id, is_asset, warranty_expiry_date, waiting_asset_code, waiting_equipment_id")
        .eq("is_active", true);
      if (error) throw error;
      return data as MediaPlayer[];
    },
  });

  const { data: cmsTypes } = useQuery({
    queryKey: ["cms-types-for-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_types")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      return data as CMSType[];
    },
  });

  if (isLoadingPlayers) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          กำลังโหลดข้อมูลสถิติ...
        </CardContent>
      </Card>
    );
  }

  const total = mediaPlayers?.length || 0;
  const installedCount = mediaPlayers?.filter((p) => p.billboard_id).length || 0;
  const availableCount = total - installedCount;
  const waitingCodeCount = mediaPlayers?.filter((p) => p.waiting_asset_code || p.waiting_equipment_id).length || 0;

  // Warranty check
  const today = new Date();
  const warrantyExpiringCount = mediaPlayers?.filter((p) => {
    if (!p.warranty_expiry_date) return false;
    const expDate = new Date(p.warranty_expiry_date);
    const diffDays = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length || 0;

  const warrantyExpiredCount = mediaPlayers?.filter((p) => {
    if (!p.warranty_expiry_date) return false;
    return new Date(p.warranty_expiry_date) < today;
  }).length || 0;

  // Status pie chart data
  const statusData = [
    { name: "ติดตั้งแล้ว", value: installedCount, color: "#22c55e" },
    { name: "พร้อมใช้งาน", value: availableCount, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  // CMS type distribution
  const cmsDistribution = cmsTypes?.map((cms) => ({
    name: cms.name,
    count: mediaPlayers?.filter((p) => p.cms_type_id === cms.id).length || 0,
  })).filter((d) => d.count > 0) || [];

  const noCmsCount = mediaPlayers?.filter((p) => !p.cms_type_id).length || 0;
  if (noCmsCount > 0) {
    cmsDistribution.push({ name: "ไม่ระบุ", count: noCmsCount });
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                <p className="text-3xl font-bold">{total}</p>
              </div>
              <Monitor className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ติดตั้งแล้ว</p>
                <p className="text-3xl font-bold text-green-600">{installedCount}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">พร้อมใช้งาน</p>
                <p className="text-3xl font-bold text-blue-600">{availableCount}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รอรหัส</p>
                <p className="text-3xl font-bold text-yellow-600">{waitingCodeCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ใกล้หมดประกัน</p>
                <p className="text-3xl font-bold text-orange-600">{warrantyExpiringCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">หมดประกัน</p>
                <p className="text-3xl font-bold text-red-600">{warrantyExpiredCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              สถานะการติดตั้ง
            </CardTitle>
            <CardDescription>แสดงสัดส่วน Media Player ที่ติดตั้งแล้วและพร้อมใช้งาน</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</div>
            )}
          </CardContent>
        </Card>

        {/* CMS Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              จำนวนตามประเภท CMS
            </CardTitle>
            <CardDescription>แสดงจำนวน Media Player แยกตามประเภท CMS</CardDescription>
          </CardHeader>
          <CardContent>
            {cmsDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cmsDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" name="จำนวน" fill="#8b5cf6">
                    {cmsDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(warrantyExpiringCount > 0 || warrantyExpiredCount > 0 || waitingCodeCount > 0) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              การแจ้งเตือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {warrantyExpiredCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  หมดประกัน: {warrantyExpiredCount} เครื่อง
                </Badge>
              )}
              {warrantyExpiringCount > 0 && (
                <Badge className="bg-orange-100 text-orange-800 text-sm">
                  ใกล้หมดประกัน (30 วัน): {warrantyExpiringCount} เครื่อง
                </Badge>
              )}
              {waitingCodeCount > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 text-sm">
                  รอรหัสทรัพย์สิน/Equipment ID: {waitingCodeCount} เครื่อง
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MediaPlayerDashboard;
