import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Package, AlertTriangle, Shield, Users } from "lucide-react";
import { ToolForm } from "@/components/tools/ToolForm";
import { ToolImport } from "@/components/tools/ToolImport";
import { ToolList } from "@/components/tools/ToolList";
import { supabase } from "@/integrations/supabase/client";

const ToolManagement = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    categories: 0,
    withWarranty: 0,
    personalTools: 0,
    assets: 0,
  });

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    const [totalRes, warrantyRes, personalRes, assetRes] = await Promise.all([
      supabase.from("tools").select("id", { count: "exact" }).eq("is_active", true),
      supabase.from("tools").select("id", { count: "exact" }).eq("is_active", true).eq("has_warranty", true),
      supabase.from("tools").select("id", { count: "exact" }).eq("is_active", true).eq("is_personal_tool", true),
      supabase.from("tools").select("id", { count: "exact" }).eq("is_active", true).eq("is_asset", true),
    ]);

    // Count categories
    const { data: catData } = await supabase.from("tool_categories").select("id", { count: "exact" }).eq("is_active", true);

    setStats({
      total: totalRes.count || 0,
      categories: catData?.length || 0,
      withWarranty: warrantyRes.count || 0,
      personalTools: personalRes.count || 0,
      assets: assetRes.count || 0,
    });
  };

  const summaryCards = [
    { label: "เครื่องมือทั้งหมด", value: stats.total, icon: Wrench, color: "text-primary", bg: "bg-primary/10" },
    { label: "หมวดหมู่", value: stats.categories, icon: Package, color: "text-chart-4", bg: "bg-chart-4/10" },
    { label: "มีประกัน", value: stats.withWarranty, icon: Shield, color: "text-success", bg: "bg-success/10" },
    { label: "ทรัพย์สิน", value: stats.assets, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "ประจำตัวช่าง", value: stats.personalTools, icon: Users, color: "text-chart-5", bg: "bg-chart-5/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Wrench className="h-7 w-7 sm:h-8 sm:w-8" />
              จัดการเครื่องมือ
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              ฐานข้อมูลเครื่องมือทั้งหมดในระบบ เพิ่ม แก้ไข นำเข้า และส่งออก
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ToolImport onSuccess={handleSuccess} />
            <ToolForm onSuccess={handleSuccess} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div>
            <CardTitle className="text-base sm:text-lg">รายการเครื่องมือ</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              จัดการเครื่องมือทั้งหมด พร้อมตั้งค่าการ PM ประจำ
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
              💡 <strong>หมายเหตุ:</strong> เครื่องมือที่มีการตั้งค่า "ระยะเวลาที่ต้อง PM" 
              ระบบจะสร้างงาน PM ให้อัตโนมัติตามรอบที่กำหนด
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <ToolList refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolManagement;
