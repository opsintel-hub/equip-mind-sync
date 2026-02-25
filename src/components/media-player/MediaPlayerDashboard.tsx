import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, CheckCircle, Package, AlertTriangle, Wrench, Clock, Settings2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface DashboardProps {
  statusCounts: {
    total: number;
    active: number;
    spare: number;
    fixOrBreak: number;
    claim: number;
    waitingCode: number;
    warrantyExpiring: number;
    warrantyExpired: number;
  };
  statusDistribution: { name: string; value: number; color: string }[];
  modelDistribution: { name: string; count: number }[];
  departmentDistribution: { name: string; count: number }[];
}

const STATUS_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#eab308", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"];

const MediaPlayerDashboard = ({ statusCounts, statusDistribution, modelDistribution, departmentDistribution }: DashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Row 1: Main summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">จำนวนทั้งหมด</p>
                <p className="text-3xl font-bold">{statusCounts.total}</p>
              </div>
              <Monitor className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active (ติดตั้งแล้ว)</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รวมเครื่อง Spare</p>
                <p className="text-3xl font-bold text-blue-600">{statusCounts.spare}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fix or Break (ซ่อม)</p>
                <p className="text-3xl font-bold text-orange-600">{statusCounts.fixOrBreak}</p>
              </div>
              <Wrench className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Alert cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Claim (เคลม)</p>
                <p className="text-3xl font-bold text-destructive">{statusCounts.claim}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รอรหัส (ทรัพย์สิน/Equip)</p>
                <p className="text-3xl font-bold text-yellow-600">{statusCounts.waitingCode}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-400/30 bg-gradient-to-br from-orange-400/10 to-orange-400/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">หมดประกัน</p>
                <p className="text-3xl font-bold text-orange-600">{statusCounts.warrantyExpired}</p>
              </div>
              <Settings2 className="w-8 h-8 text-orange-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-400/30 bg-gradient-to-br from-red-400/10 to-red-400/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ใกล้หมดประกัน (ตั้งค่าได้)</p>
                <p className="text-3xl font-bold text-red-500">{statusCounts.warrantyExpiring}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5" />
              สัดส่วนสถานะเครื่อง
            </CardTitle>
            <CardDescription>สัดส่วนตามสถานะของ Media Player</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
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

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              📊 จำนวนแยกตาม Model
            </CardTitle>
            <CardDescription>สัดส่วนตามประเภทของ Media Player</CardDescription>
          </CardHeader>
          <CardContent>
            {modelDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={modelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="จำนวน" fill="#3b82f6">
                    {modelDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</div>
            )}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              🏢 สินค้าคงคลังแยกตามตำแหน่ง
            </CardTitle>
            <CardDescription>สัดส่วนตามฝ่ายของ Media Player</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="จำนวน" fill="#f97316">
                    {departmentDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
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
    </div>
  );
};

export default MediaPlayerDashboard;
