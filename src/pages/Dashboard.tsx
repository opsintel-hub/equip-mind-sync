import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PackageOpen, TrendingUp, TrendingDown, MapPin, ArrowRight, ArrowLeftRight } from "lucide-react";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { ExpiryAlerts } from "@/components/ExpiryAlerts";
import { BillboardEquipmentAlerts } from "@/components/BillboardEquipmentAlerts";
import BillboardEquipmentChart from "@/components/BillboardEquipmentChart";
import { LocationInventoryChart } from "@/components/LocationInventoryChart";
import { CategoryPieChart } from "@/components/CategoryPieChart";
import TransactionSummaryReport from "@/components/TransactionSummaryReport";
import { CompanyFilter } from "@/components/dashboard/CompanyFilter";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [stats, setStats] = useState({
    totalEquipment: 0,
    todayReceipts: 0,
    todayIssues: 0,
    totalBillboards: 0,
    activeLoans: 0
  });

  useEffect(() => {
    fetchStats();
  }, [selectedCompanyId]);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Build company filter
    const companyFilter = selectedCompanyId !== "all" ? selectedCompanyId : null;

    // Fetch equipment count
    let equipmentQuery = supabase.from("equipment").select("id", { count: "exact" }).eq("is_active", true);
    if (companyFilter) equipmentQuery = equipmentQuery.eq("company_id", companyFilter);
    const { count: equipmentCount } = await equipmentQuery;

    // Fetch today's receipts
    let receiptsQuery = supabase.from("goods_receipt").select("id", { count: "exact" }).gte("receipt_date", today);
    if (companyFilter) receiptsQuery = receiptsQuery.eq("company_id", companyFilter);
    const { count: receiptsCount } = await receiptsQuery;

    // Fetch today's issues
    let issuesQuery = supabase.from("goods_issue").select("id", { count: "exact" }).gte("issue_date", today);
    if (companyFilter) issuesQuery = issuesQuery.eq("company_id", companyFilter);
    const { count: issuesCount } = await issuesQuery;

    // Fetch billboards count
    const { count: billboardsCount } = await supabase.from("billboards").select("id", { count: "exact" }).eq("status", "active");

    // Fetch active loans
    let loansQuery = supabase.from("equipment_loans").select("id", { count: "exact" }).eq("status", "approved");
    if (companyFilter) {
      loansQuery = loansQuery.or(`from_company_id.eq.${companyFilter},to_company_id.eq.${companyFilter}`);
    }
    const { count: loansCount } = await loansQuery;

    setStats({
      totalEquipment: equipmentCount || 0,
      todayReceipts: receiptsCount || 0,
      todayIssues: issuesCount || 0,
      totalBillboards: billboardsCount || 0,
      activeLoans: loansCount || 0
    });
  };

  const statCards = [
    {
      title: "สินค้าคงคลัง",
      value: stats.totalEquipment.toLocaleString(),
      unit: "รายการ",
      icon: Package,
      color: "text-primary",
      bgGradient: "from-primary/10 to-primary/5",
      iconBg: "bg-primary/15",
    },
    {
      title: "รับเข้าวันนี้",
      value: stats.todayReceipts.toLocaleString(),
      unit: "รายการ",
      icon: Package,
      color: "text-success",
      bgGradient: "from-success/10 to-success/5",
      iconBg: "bg-success/15",
    },
    {
      title: "เบิกจ่ายวันนี้",
      value: stats.todayIssues.toLocaleString(),
      unit: "รายการ",
      icon: PackageOpen,
      color: "text-warning",
      bgGradient: "from-warning/10 to-warning/5",
      iconBg: "bg-warning/15",
    },
    {
      title: "ป้ายโฆษณา",
      value: stats.totalBillboards.toLocaleString(),
      unit: "จุด",
      icon: MapPin,
      color: "text-chart-4",
      bgGradient: "from-chart-4/10 to-chart-4/5",
      iconBg: "bg-chart-4/15",
    },
    {
      title: "ยืมข้ามบริษัท",
      value: stats.activeLoans.toLocaleString(),
      unit: "รายการ",
      icon: ArrowLeftRight,
      color: "text-chart-5",
      bgGradient: "from-chart-5/10 to-chart-5/5",
      iconBg: "bg-chart-5/15",
      link: "/equipment-loans"
    },
  ];

  const recentActivities = [
    { id: 1, type: "GR", description: "รับเข้าอุปกรณ์ SKU-001", time: "10 นาทีที่แล้ว", status: "success" },
    { id: 2, type: "GI", description: "เบิกจ่ายไปยังป้าย BRD-045", time: "25 นาทีที่แล้ว", status: "warning" },
    { id: 3, type: "GR", description: "รับเข้าอะไหล่ SKU-102", time: "1 ชั่วโมงที่แล้ว", status: "success" },
    { id: 4, type: "GI", description: "เบิกจ่ายไปยังทีม Engineering", time: "2 ชั่วโมงที่แล้ว", status: "warning" },
    { id: 5, type: "GR", description: "รับเข้าเครื่องมือ SKU-203", time: "3 ชั่วโมงที่แล้ว", status: "success" },
  ];

  const warehouseZones = [
    { name: "Zone A", percentage: 85, color: "bg-primary" },
    { name: "Zone B", percentage: 62, color: "bg-success" },
    { name: "Zone C", percentage: 41, color: "bg-warning" },
    { name: "Zone D", percentage: 28, color: "bg-chart-5" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">แดชบอร์ด</h1>
          <p className="text-muted-foreground">ภาพรวมระบบจัดการคลังสินค้าและอุปกรณ์</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">กรองตามบริษัท:</span>
          <CompanyFilter value={selectedCompanyId} onChange={setSelectedCompanyId} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((stat, index) => {
          const CardWrapper = stat.link ? Link : 'div';
          return (
            <CardWrapper 
              key={stat.title} 
              to={stat.link || ''}
              className="block"
            >
              <Card 
                className={`relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} border-0 hover-lift ${stat.link ? 'cursor-pointer' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                        <span className="text-sm text-muted-foreground">{stat.unit}</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardWrapper>
          );
        })}
      </div>

      {/* Transaction Summary */}
      <TransactionSummaryReport />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationInventoryChart />
        <CategoryPieChart />
      </div>

      {/* Alerts Section */}
      <div className="space-y-6">
        <LowStockAlerts />
        <ExpiryAlerts />
        <BillboardEquipmentAlerts />
      </div>

      {/* Billboard Chart */}
      <BillboardEquipmentChart />

      {/* Activity and Warehouse Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
                กิจกรรมล่าสุด
              </CardTitle>
              <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                ดูทั้งหมด
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 group cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                        activity.type === "GR" 
                          ? "bg-success/10" 
                          : "bg-warning/10"
                      }`}
                    >
                      {activity.type === "GR" ? (
                        <Package className="w-5 h-5 text-success" />
                      ) : (
                        <PackageOpen className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {activity.description}
                      </p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
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

        {/* Warehouse Status */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>สถานะคลังสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {warehouseZones.map((zone) => (
              <div key={zone.name} className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{zone.name}</span>
                  <span className="font-semibold text-foreground">{zone.percentage}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${zone.color} rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${zone.percentage}%` }} 
                  />
                </div>
              </div>
            ))}
            
            {/* Legend */}
            <div className="pt-4 mt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>พื้นที่ใช้งาน</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
