import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PackageOpen, TrendingUp, MapPin } from "lucide-react";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { ExpiryAlerts } from "@/components/ExpiryAlerts";
import { LocationInventoryChart } from "@/components/LocationInventoryChart";
import { CategoryPieChart } from "@/components/CategoryPieChart";
import TransactionSummaryReport from "@/components/TransactionSummaryReport";

const Dashboard = () => {
  const stats = [
    {
      title: "สินค้าคงคลัง",
      value: "2,547",
      unit: "รายการ",
      icon: Package,
      trend: "+12.5%",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "รับเข้าวันนี้",
      value: "156",
      unit: "รายการ",
      icon: Package,
      trend: "+5.2%",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "เบิกจ่ายวันนี้",
      value: "89",
      unit: "รายการ",
      icon: PackageOpen,
      trend: "-2.1%",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "ป้ายโฆษณา",
      value: "324",
      unit: "จุด",
      icon: MapPin,
      trend: "+8.3%",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ];

  const recentActivities = [
    { id: 1, type: "GR", description: "รับเข้าอุปกรณ์ SKU-001", time: "10 นาทีที่แล้ว", status: "success" },
    { id: 2, type: "GI", description: "เบิกจ่ายไปยังป้าย BRD-045", time: "25 นาทีที่แล้ว", status: "warning" },
    { id: 3, type: "GR", description: "รับเข้าอะไหล่ SKU-102", time: "1 ชั่วโมงที่แล้ว", status: "success" },
    { id: 4, type: "GI", description: "เบิกจ่ายไปยังทีม Engineering", time: "2 ชั่วโมงที่แล้ว", status: "warning" },
    { id: 5, type: "GR", description: "รับเข้าเครื่องมือ SKU-203", time: "3 ชั่วโมงที่แล้ว", status: "success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">แดชบอร์ด</h1>
        <p className="text-muted-foreground">ภาพรวมระบบจัดการคลังสินค้า</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
                <span className="text-sm text-muted-foreground">{stat.unit}</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success font-medium">{stat.trend}</span>
                <span className="text-sm text-muted-foreground">จากเดือนที่แล้ว</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TransactionSummaryReport />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationInventoryChart />
        <CategoryPieChart />
      </div>

      <LowStockAlerts />
      
      <ExpiryAlerts />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        activity.type === "GR" ? "bg-success/10" : "bg-warning/10"
                      }`}
                    >
                      {activity.type === "GR" ? (
                        <Package className="w-5 h-5 text-success" />
                      ) : (
                        <PackageOpen className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.status === "success"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {activity.type}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สถานะคลังสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zone A</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zone B</span>
                <span className="font-medium">62%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: "62%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zone C</span>
                <span className="font-medium">41%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-warning rounded-full" style={{ width: "41%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zone D</span>
                <span className="font-medium">28%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-chart-5 rounded-full" style={{ width: "28%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
