import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Package, Building2, Monitor, Globe, Calendar, AlertTriangle, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { th } from "date-fns/locale";

const BillboardPublicView = () => {
  const { id } = useParams<{ id: string }>();

  const { data: billboard, isLoading, error } = useQuery({
    queryKey: ["billboard-public", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_get_billboard" as any, { _id: id });
      if (error) throw error;
      if (!data) throw new Error("not_found");
      return data as any;
    },
    enabled: !!id,
  });


  const { data: installedEquipment } = useQuery({
    queryKey: ["billboard-equipment-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_equipment")
        .select(`
          *,
          equipment:equipment_id (
            id,
            code,
            name,
            unit,
            category,
            expiry_date,
            warranty_expiry_date
          )
        `)
        .eq("billboard_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: "expired", days: Math.abs(days), label: "หมดอายุแล้ว" };
    if (days <= 30) return { status: "warning", days, label: `เหลือ ${days} วัน` };
    return { status: "ok", days, label: "ปกติ" };
  };

  const getWarrantyStatus = (warrantyDate: string | null) => {
    if (!warrantyDate) return null;
    const days = differenceInDays(new Date(warrantyDate), new Date());
    if (days < 0) return { status: "expired", days: Math.abs(days), label: "หมดประกันแล้ว" };
    if (days <= 30) return { status: "warning", days, label: `เหลือ ${days} วัน` };
    return { status: "ok", days, label: "มีประกัน" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success">ใช้งาน</Badge>;
      case "maintenance":
        return <Badge className="bg-warning/10 text-warning">บำรุงรักษา</Badge>;
      case "inactive":
        return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error || !billboard) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ไม่พบข้อมูลป้ายโฆษณา หรือ QR Code ไม่ถูกต้อง
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{billboard.equipment_id}</h1>
          </div>
          <p className="opacity-90">{billboard.description || billboard.location_name || "ป้ายโฆษณา"}</p>
          <div className="mt-3">
            {getStatusBadge(billboard.status)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              ข้อมูลพื้นฐาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Equipment ID:</span>
                <p className="font-medium text-primary">{billboard.equipment_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Old Code:</span>
                <p className="font-medium">{billboard.old_code || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium">{billboard.location_name || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization & Media Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" />
                ข้อมูลองค์กร
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium">{billboard.department || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BKK/UPC:</span>
                  <span className="font-medium">{billboard.bkk_upc || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="w-4 h-4" />
                ข้อมูลสื่อ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Media Type:</span>
                  <span className="font-medium">{billboard.media_type || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Media Class:</span>
                  <span className="font-medium">{billboard.media_class || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{(billboard as any).size || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4" />
              ข้อมูลพื้นที่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Region:</span>
                <p className="font-medium">{billboard.region || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">District:</span>
                <p className="font-medium">{billboard.district || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Territory:</span>
                <p className="font-medium">{billboard.territory || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installed Equipment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4" />
              อุปกรณ์ที่ติดตั้ง ({installedEquipment?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {installedEquipment && installedEquipment.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead>วันที่ติดตั้ง</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installedEquipment.map((item: any) => {
                      const expiryStatus = getExpiryStatus(item.equipment?.expiry_date);
                      const warrantyStatus = getWarrantyStatus(item.equipment?.warranty_expiry_date);
                      const hasIssue = expiryStatus?.status !== "ok" || warrantyStatus?.status !== "ok";
                      
                      return (
                        <TableRow key={item.id} className={hasIssue ? "bg-destructive/5" : ""}>
                          <TableCell className="font-medium text-primary">
                            {item.equipment?.code || "-"}
                          </TableCell>
                          <TableCell>{item.equipment?.name || "-"}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.equipment?.unit || "ชิ้น"}
                          </TableCell>
                          <TableCell>
                            {item.installation_date 
                              ? format(new Date(item.installation_date), "dd/MM/yyyy", { locale: th })
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {expiryStatus && expiryStatus.status !== "ok" && (
                                <Badge variant="destructive" className="text-xs w-fit">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {expiryStatus.label}
                                </Badge>
                              )}
                              {warrantyStatus && warrantyStatus.status !== "ok" && (
                                <Badge className="bg-warning/10 text-warning text-xs w-fit">
                                  <Shield className="h-3 w-3 mr-1" />
                                  {warrantyStatus.label}
                                </Badge>
                              )}
                              {!hasIssue && (
                                <Badge variant="secondary" className="text-xs w-fit">ปกติ</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                ไม่มีอุปกรณ์ติดตั้งอยู่
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {billboard.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">หมายเหตุ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{billboard.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>อัปเดตล่าสุด: {format(new Date(billboard.updated_at), "dd/MM/yyyy HH:mm", { locale: th })}</p>
        </div>
      </div>
    </div>
  );
};

export default BillboardPublicView;
