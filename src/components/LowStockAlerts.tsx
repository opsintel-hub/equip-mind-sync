import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Package, RefreshCw } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import type { Database } from "@/integrations/supabase/types";

type LowStockAlert = Database["public"]["Tables"]["low_stock_alerts"]["Row"];

export function LowStockAlerts() {
  const { getViewableDepartments, isAdmin } = useDepartmentPermissions();
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchAlerts();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('low-stock-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'low_stock_alerts'
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const viewableDepartments = getViewableDepartments();
      
      let query = supabase
        .from("low_stock_alerts")
        .select("*")
        .eq("is_resolved", false)
        .order("alert_date", { ascending: false });

      // Filter by viewable departments if not admin
      if (!isAdmin) {
        query = query.in("department", viewableDepartments);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStock = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-low-stock");

      if (error) throw error;

      toast.success("ตรวจสอบสต็อกเรียบร้อยแล้ว", {
        description: `พบสินค้าสต็อกต่ำ ${data.low_stock_items} รายการ สร้างการแจ้งเตือนใหม่ ${data.new_alerts_created} รายการ`,
      });

      fetchAlerts();
    } catch (error: any) {
      console.error("Error checking stock:", error);
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบสต็อก");
    } finally {
      setChecking(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("low_stock_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("ทำเครื่องหมายว่าแก้ไขแล้ว");
      fetchAlerts();
    } catch (error: any) {
      console.error("Error resolving alert:", error);
      toast.error("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle>แจ้งเตือนสต็อกต่ำ</CardTitle>
            {alerts.length > 0 && (
              <Badge variant="destructive">{alerts.length}</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckStock}
            disabled={checking}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            ตรวจสอบสต็อก
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <Alert>
            <Package className="w-4 h-4" />
            <AlertDescription>
              ไม่มีการแจ้งเตือนสต็อกต่ำในขณะนี้
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่ออุปกรณ์</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead className="text-center">สต็อกปัจจุบัน</TableHead>
                  <TableHead className="text-center">สต็อกต่ำสุด</TableHead>
                  <TableHead className="text-center">ต้องสั่งซื้อ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const needToOrder = Math.max(0, alert.min_stock_level - alert.current_stock + Math.ceil(alert.min_stock_level * 0.5));
                  
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.equipment_code}</TableCell>
                      <TableCell>{alert.equipment_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{alert.department}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{alert.current_stock}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{alert.min_stock_level}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{needToOrder}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          แก้ไขแล้ว
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
