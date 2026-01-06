import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, CheckCircle2, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    equipment_expiry?: number;
    warranty_expiry?: number;
    pm_tasks_created?: number;
    notifications_created?: number;
  };
  error?: string;
}

export const EdgeFunctionTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const runEdgeFunction = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("check-expiring-equipment", {
        body: {},
      });

      if (error) {
        throw error;
      }

      setResult({
        success: true,
        message: "Edge Function ทำงานสำเร็จ",
        details: data,
      });

      toast.success("ตรวจสอบเสร็จสิ้น - ดูผลลัพธ์ด้านล่าง");
    } catch (error: any) {
      console.error("Edge function error:", error);
      setResult({
        success: false,
        message: "Edge Function ทำงานไม่สำเร็จ",
        error: error.message,
      });
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const checkNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("ไม่สามารถดึงข้อมูล Notifications ได้");
      return;
    }

    if (data && data.length > 0) {
      toast.success(`พบ ${data.length} Notifications ล่าสุด`);
    } else {
      toast.info("ไม่มี Notifications ในระบบ");
    }
  };

  const checkPMTasks = async () => {
    const { data, error } = await supabase
      .from("equipment_pm_tasks")
      .select("*, equipment_pm_schedules(title)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("ไม่สามารถดึงข้อมูล PM Tasks ได้");
      return;
    }

    if (data && data.length > 0) {
      toast.success(`พบ ${data.length} PM Tasks ที่รอดำเนินการ`);
    } else {
      toast.info("ไม่มี PM Tasks ที่รอดำเนินการ");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              ทดสอบระบบแจ้งเตือน
            </CardTitle>
            <CardDescription>
              เรียก Edge Function check-expiring-equipment เพื่อตรวจสอบอุปกรณ์ใกล้หมดอายุและสร้าง PM Tasks
            </CardDescription>
          </div>
          <Button onClick={runEdgeFunction} disabled={isRunning} variant="default">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังตรวจสอบ...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                เรียก Edge Function
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkNotifications}>
            <Bell className="mr-2 h-4 w-4" />
            ตรวจสอบ Notifications
          </Button>
          <Button variant="outline" size="sm" onClick={checkPMTasks}>
            <Clock className="mr-2 h-4 w-4" />
            ตรวจสอบ PM Tasks
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? "bg-success/5 border-success/20"
                : "bg-destructive/5 border-destructive/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <span className="font-medium">{result.message}</span>
            </div>

            {result.success && result.details && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-background rounded-md">
                  <p className="text-xs text-muted-foreground">อุปกรณ์ใกล้หมดอายุ</p>
                  <p className="text-xl font-bold">
                    {result.details.equipment_expiry || 0}
                  </p>
                </div>
                <div className="p-3 bg-background rounded-md">
                  <p className="text-xs text-muted-foreground">ใกล้หมดประกัน</p>
                  <p className="text-xl font-bold">
                    {result.details.warranty_expiry || 0}
                  </p>
                </div>
                <div className="p-3 bg-background rounded-md">
                  <p className="text-xs text-muted-foreground">PM Tasks สร้างใหม่</p>
                  <p className="text-xl font-bold">
                    {result.details.pm_tasks_created || 0}
                  </p>
                </div>
                <div className="p-3 bg-background rounded-md">
                  <p className="text-xs text-muted-foreground">Notifications</p>
                  <p className="text-xl font-bold">
                    {result.details.notifications_created || 0}
                  </p>
                </div>
              </div>
            )}

            {result.error && (
              <p className="text-sm text-destructive mt-2">{result.error}</p>
            )}
          </div>
        )}

        {/* Info */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Edge Function ทำหน้าที่อะไรบ้าง?</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 bg-muted/30 rounded-lg mt-2 text-sm space-y-2">
              <p className="font-medium">check-expiring-equipment จะตรวจสอบ:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>1. อุปกรณ์ในคลังที่ใกล้หมดอายุ (expiry_date) ภายใน 30 วัน</li>
                <li>2. อุปกรณ์ในคลังที่ใกล้หมดประกัน (warranty_expiry_date) ภายใน 30 วัน</li>
                <li>3. อุปกรณ์บนป้ายโฆษณาที่ใกล้หมดอายุ/ประกัน</li>
                <li>4. PM Schedules ที่ครบกำหนด → สร้าง PM Task อัตโนมัติ</li>
                <li>5. สร้าง Notifications สำหรับทุกรายการที่ต้องแจ้งเตือน</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 italic">
                หมายเหตุ: ในระบบ Production ควรตั้ง Cron Job เรียก Function นี้ทุกวัน
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
