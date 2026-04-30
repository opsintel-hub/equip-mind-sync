import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, PackageOpen, MapPin, ArrowRight, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { ExpiryAlerts } from "@/components/ExpiryAlerts";
import { BillboardEquipmentAlerts } from "@/components/BillboardEquipmentAlerts";
import BillboardEquipmentChart from "@/components/BillboardEquipmentChart";
import { LocationInventoryChart } from "@/components/LocationInventoryChart";
import { CategoryPieChart } from "@/components/CategoryPieChart";
import TransactionSummaryReport from "@/components/TransactionSummaryReport";
import { CompanyFilter } from "@/components/dashboard/CompanyFilter";
import { StockMovementChart } from "@/components/dashboard/StockMovementChart";
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
  const [pmStats, setPmStats] = useState({ overdue: 0, within30: 0 });

  useEffect(() => {
    // Run both stat aggregations in parallel
    fetchStats();
    fetchPMStats();
  }, [selectedCompanyId]);

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const companyFilter = selectedCompanyId !== "all" ? selectedCompanyId : null;

    let equipmentQuery = supabase.from("equipment").select("id", { count: "exact", head: true }).eq("is_active", true);
    if (companyFilter) equipmentQuery = equipmentQuery.eq("company_id", companyFilter);

    let receiptsQuery = supabase.from("goods_receipt").select("id", { count: "exact", head: true }).gte("receipt_date", today);
    if (companyFilter) receiptsQuery = receiptsQuery.eq("company_id", companyFilter);

    let issuesQuery = supabase.from("goods_issue").select("id", { count: "exact", head: true }).gte("issue_date", today);
    if (companyFilter) issuesQuery = issuesQuery.eq("company_id", companyFilter);

    const billboardsQuery = supabase.from("billboards").select("id", { count: "exact", head: true }).eq("status", "active");

    let loansQuery = supabase.from("equipment_loans").select("id", { count: "exact", head: true }).eq("status", "approved");
    if (companyFilter) {
      loansQuery = loansQuery.or(`from_company_id.eq.${companyFilter},to_company_id.eq.${companyFilter}`);
    }

    // Fire all 5 count queries in parallel instead of awaiting sequentially
    const [eq, rec, iss, bb, ln] = await Promise.all([
      equipmentQuery,
      receiptsQuery,
      issuesQuery,
      billboardsQuery,
      loansQuery,
    ]);

    setStats({
      totalEquipment: eq.count || 0,
      todayReceipts: rec.count || 0,
      todayIssues: iss.count || 0,
      totalBillboards: bb.count || 0,
      activeLoans: ln.count || 0,
    });
  };

  const fetchPMStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [{ data: beData }, { data: actionsData }] = await Promise.all([
      supabase.from("billboard_equipment").select(`equipment:equipment_id (expiry_date, warranty_expiry_date), billboard_id`),
      supabase.from("billboard_pm_actions").select("billboard_id, action_type, snooze_until"),
    ]);
    const excluded = new Set<string>();
    (actionsData || []).forEach((a: any) => {
      if (a.action_type === "ticket_created") excluded.add(a.billboard_id);
      else if (a.action_type === "snoozed" && a.snooze_until >= today) excluded.add(a.billboard_id);
    });
    const billboardMinDate = new Map<string, string>();
    (beData || []).forEach((be: any) => {
      const eq = be.equipment;
      if (!eq || excluded.has(be.billboard_id)) return;
      const dates = [eq.expiry_date, eq.warranty_expiry_date].filter(Boolean) as string[];
      if (dates.length === 0) return;
      const minDate = dates.sort()[0];
      const current = billboardMinDate.get(be.billboard_id);
      if (!current || minDate < current) billboardMinDate.set(be.billboard_id, minDate);
    });
    let overdue = 0; let within30 = 0;
    billboardMinDate.forEach((minDate) => {
      const diff = Math.ceil((new Date(minDate).getTime() - new Date(today).getTime()) / 86400000);
      if (diff < 0) overdue++;
      else if (diff <= 30) within30++;
    });
    setPmStats({ overdue, within30 });
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

      {/* Billboard PM Alert Widget */}
      {(pmStats.overdue > 0 || pmStats.within30 > 0) && (
        <Link to="/pm-billboard">
          <Card className="border-destructive/30 bg-gradient-to-r from-destructive/5 to-warning/5 hover-lift cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">แจ้ง PM ป้ายโฆษณา</p>
                    <p className="text-sm text-muted-foreground">ป้ายที่ต้องดำเนินการ PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {pmStats.overdue > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">{pmStats.overdue}</p>
                      <p className="text-xs text-muted-foreground">หมดแล้ว</p>
                    </div>
                  )}
                  {pmStats.within30 > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning">{pmStats.within30}</p>
                      <p className="text-xs text-muted-foreground">ภายใน 30 วัน</p>
                    </div>
                  )}
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Transaction Summary (GR/GI) */}
      <TransactionSummaryReport companyId={selectedCompanyId} />

      {/* Charts: Inventory by Location & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationInventoryChart companyId={selectedCompanyId} />
        <CategoryPieChart companyId={selectedCompanyId} />
      </div>

      {/* Stock Movement Trend */}
      <StockMovementChart companyId={selectedCompanyId} />

      {/* Billboard Equipment Chart */}
      <BillboardEquipmentChart />

      {/* Alerts Section */}
      <div className="space-y-6">
        <LowStockAlerts />
        <ExpiryAlerts />
        <BillboardEquipmentAlerts />
      </div>
    </div>
  );
};

export default Dashboard;