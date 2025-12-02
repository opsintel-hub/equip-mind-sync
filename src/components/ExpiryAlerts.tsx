import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Calendar } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";

interface ExpiryAlert {
  id: string;
  code: string;
  name: string;
  department: string;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  days_until_expiry: number;
  days_until_warranty_expiry: number;
  alert_type: "expiry" | "warranty" | "both";
}

export function ExpiryAlerts() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, hasPermission } = useDepartmentPermissions();

  useEffect(() => {
    fetchAlerts();
  }, [isAdmin]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      let query = supabase
        .from("equipment")
        .select("id, code, name, department, expiry_date, warranty_expiry_date")
        .eq("is_active", true);

      const { data, error } = await query;

      if (error) throw error;

      const expiryAlerts: ExpiryAlert[] = [];
      const today = new Date();

      data?.forEach((item) => {
        const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
        const warrantyDate = item.warranty_expiry_date ? new Date(item.warranty_expiry_date) : null;
        
        const daysUntilExpiry = expiryDate 
          ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        
        const daysUntilWarrantyExpiry = warrantyDate
          ? Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;

        const shouldAlertExpiry = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
        const shouldAlertWarranty = daysUntilWarrantyExpiry <= 30 && daysUntilWarrantyExpiry >= 0;

        if ((shouldAlertExpiry || shouldAlertWarranty) && 
            (isAdmin || (item.department && hasPermission(item.department, 'view')))) {
          let alertType: "expiry" | "warranty" | "both" = "expiry";
          if (shouldAlertExpiry && shouldAlertWarranty) {
            alertType = "both";
          } else if (shouldAlertWarranty) {
            alertType = "warranty";
          }

          expiryAlerts.push({
            id: item.id,
            code: item.code,
            name: item.name,
            department: item.department || "-",
            expiry_date: item.expiry_date,
            warranty_expiry_date: item.warranty_expiry_date,
            days_until_expiry: daysUntilExpiry,
            days_until_warranty_expiry: daysUntilWarrantyExpiry,
            alert_type: alertType,
          });
        }
      });

      setAlerts(expiryAlerts.sort((a, b) => 
        Math.min(a.days_until_expiry, a.days_until_warranty_expiry) - 
        Math.min(b.days_until_expiry, b.days_until_warranty_expiry)
      ));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">กำลังโหลด...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-warning" />
            <CardTitle>แจ้งเตือนวันหมดอายุและรับประกัน</CardTitle>
            {alerts.length > 0 && (
              <Badge variant="destructive">{alerts.length}</Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            รีเฟรช
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ไม่มีอุปกรณ์ที่ใกล้หมดอายุหรือหมดประกันภายใน 30 วัน
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่ออุปกรณ์</TableHead>
                <TableHead>ฝ่าย</TableHead>
                <TableHead>ประเภทการแจ้งเตือน</TableHead>
                <TableHead>วันหมดอายุ</TableHead>
                <TableHead>วันหมดประกัน</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium">{alert.code}</TableCell>
                  <TableCell>{alert.name}</TableCell>
                  <TableCell>{alert.department}</TableCell>
                  <TableCell>
                    {alert.alert_type === "both" ? (
                      <Badge variant="destructive">หมดอายุและประกัน</Badge>
                    ) : alert.alert_type === "expiry" ? (
                      <Badge variant="destructive">หมดอายุ</Badge>
                    ) : (
                      <Badge className="bg-warning text-warning-foreground">หมดประกัน</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {alert.expiry_date ? (
                      <div>
                        <div>{new Date(alert.expiry_date).toLocaleDateString("th-TH")}</div>
                        {alert.days_until_expiry <= 30 && (
                          <div className="text-xs text-muted-foreground">
                            เหลือ {alert.days_until_expiry} วัน
                          </div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {alert.warranty_expiry_date ? (
                      <div>
                        <div>{new Date(alert.warranty_expiry_date).toLocaleDateString("th-TH")}</div>
                        {alert.days_until_warranty_expiry <= 30 && (
                          <div className="text-xs text-muted-foreground">
                            เหลือ {alert.days_until_warranty_expiry} วัน
                          </div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {Math.min(alert.days_until_expiry, alert.days_until_warranty_expiry) <= 7 ? (
                      <Badge variant="destructive">เร่งด่วน</Badge>
                    ) : Math.min(alert.days_until_expiry, alert.days_until_warranty_expiry) <= 14 ? (
                      <Badge className="bg-warning text-warning-foreground">ต้องดำเนินการ</Badge>
                    ) : (
                      <Badge variant="secondary">ติดตาม</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}