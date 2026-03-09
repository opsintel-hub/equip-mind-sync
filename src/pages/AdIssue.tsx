import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdIssueList } from "@/components/ad/AdIssueList";
import { FileOutput, Clock, CheckCircle2, Package, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const AdIssue = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ pending: 0, issued: 0, completed: 0 });

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    const [pendingRes, issuedRes, completedRes] = await Promise.all([
      supabase.from("ad_issue_requests").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("ad_issue_requests").select("id", { count: "exact" }).eq("status", "issued"),
      supabase.from("ad_issue_requests").select("id", { count: "exact" }).eq("status", "completed"),
    ]);
    setStats({
      pending: pendingRes.count || 0,
      issued: issuedRes.count || 0,
      completed: completedRes.count || 0,
    });
  };

  const summaryCards = [
    { label: "รอเบิก", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "เบิกแล้ว", value: stats.issued, icon: FileOutput, color: "text-primary", bg: "bg-primary/10" },
    { label: "ติดตั้งเสร็จ", value: stats.completed, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">จ่ายภาพโฆษณา</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ดูคำขอเบิกทั้งหมด ยืนยันจ่ายออก และยืนยันการติดตั้ง
          </p>
        </div>
        <Link
          to="/ad-entry"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          ดูภาพโฆษณาทั้งหมด
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileOutput className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">เอกสารเบิกภาพโฆษณา</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                รายการเอกสารเบิกทั้งหมด ทั้งที่สร้างอัตโนมัติและสร้างเอง
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <AdIssueList refresh={refreshKey} onUpdated={handleRefresh} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdIssue;
