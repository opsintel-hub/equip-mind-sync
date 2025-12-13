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
import { AlertTriangle, MapPin, Calendar, ExternalLink } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BillboardEquipmentAlert {
  id: string;
  billboard_id: string;
  billboard_equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  billboard_code: string;
  billboard_location: string;
  department: string;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  days_until_expiry: number;
  days_until_warranty_expiry: number;
  alert_type: "expiry" | "warranty" | "both";
  quantity: number;
}

export function BillboardEquipmentAlerts() {
  const [alerts, setAlerts] = useState<BillboardEquipmentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, hasPermission } = useDepartmentPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, [isAdmin]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      // Fetch billboard equipment with equipment details
      const { data, error } = await supabase
        .from("billboard_equipment")
        .select(`
          id,
          billboard_id,
          quantity,
          equipment:equipment_id (
            id,
            code,
            name,
            expiry_date,
            warranty_expiry_date
          ),
          billboards:billboard_id (
            id,
            equipment_id,
            location_name,
            department
          )
        `);

      if (error) throw error;

      const billboardAlerts: BillboardEquipmentAlert[] = [];
      const today = new Date();

      data?.forEach((item: any) => {
        if (!item.equipment || !item.billboards) return;
        
        const expiryDate = item.equipment.expiry_date ? new Date(item.equipment.expiry_date) : null;
        const warrantyDate = item.equipment.warranty_expiry_date ? new Date(item.equipment.warranty_expiry_date) : null;
        
        const daysUntilExpiry = expiryDate 
          ? differenceInDays(expiryDate, today)
          : Infinity;
        
        const daysUntilWarrantyExpiry = warrantyDate
          ? differenceInDays(warrantyDate, today)
          : Infinity;

        // Alert for expired or expiring within 30 days
        const shouldAlertExpiry = daysUntilExpiry <= 30;
        const shouldAlertWarranty = daysUntilWarrantyExpiry <= 30;

        if ((shouldAlertExpiry || shouldAlertWarranty) && 
            (isAdmin || (item.billboards.department && hasPermission(item.billboards.department, 'view')))) {
          
          let alertType: "expiry" | "warranty" | "both" = "expiry";
          if (shouldAlertExpiry && shouldAlertWarranty) {
            alertType = "both";
          } else if (shouldAlertWarranty) {
            alertType = "warranty";
          }

          billboardAlerts.push({
            id: item.equipment.id,
            billboard_id: item.billboard_id,
            billboard_equipment_id: item.id,
            equipment_code: item.equipment.code,
            equipment_name: item.equipment.name,
            billboard_code: item.billboards.equipment_id,
            billboard_location: item.billboards.location_name || "-",
            department: item.billboards.department || "-",
            expiry_date: item.equipment.expiry_date,
            warranty_expiry_date: item.equipment.warranty_expiry_date,
            days_until_expiry: daysUntilExpiry,
            days_until_warranty_expiry: daysUntilWarrantyExpiry,
            alert_type: alertType,
            quantity: item.quantity,
          });
        }
      });

      setAlerts(billboardAlerts.sort((a, b) => 
        Math.min(a.days_until_expiry, a.days_until_warranty_expiry) - 
        Math.min(b.days_until_expiry, b.days_until_warranty_expiry)
      ));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">หมดแล้ว ({Math.abs(days)} วัน)</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="destructive">เร่งด่วน ({days} วัน)</Badge>;
    }
    if (days <= 14) {
      return <Badge className="bg-warning text-warning-foreground">ต้องดำเนินการ ({days} วัน)</Badge>;
    }
    return <Badge variant="secondary">ติดตาม ({days} วัน)</Badge>;
  };

  if (loading) {
    return <div className="text-center py-4">กำลังโหลด...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-warning" />
            <CardTitle>แจ้งเตือนอุปกรณ์ในป้ายโฆษณา</CardTitle>
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
              ไม่มีอุปกรณ์ในป้ายโฆษณาที่ใกล้หมดอายุหรือหมดประกัน
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ป้ายโฆษณา</TableHead>
                  <TableHead>พื้นที่</TableHead>
                  <TableHead>รหัสอุปกรณ์</TableHead>
                  <TableHead>ชื่ออุปกรณ์</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สถานะวันหมดอายุ</TableHead>
                  <TableHead>สถานะประกัน</TableHead>
                  <TableHead className="text-center">ดู</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.billboard_equipment_id}>
                    <TableCell className="font-medium">{alert.billboard_code}</TableCell>
                    <TableCell className="text-sm">{alert.billboard_location}</TableCell>
                    <TableCell>{alert.equipment_code}</TableCell>
                    <TableCell>{alert.equipment_name}</TableCell>
                    <TableCell className="text-right">{alert.quantity}</TableCell>
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
                      {alert.expiry_date ? getStatusBadge(alert.days_until_expiry) : "-"}
                    </TableCell>
                    <TableCell>
                      {alert.warranty_expiry_date ? getStatusBadge(alert.days_until_warranty_expiry) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/billboards/${alert.billboard_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
