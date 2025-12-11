import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin, Building2, Monitor, Globe, Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BillboardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: billboard, isLoading } = useQuery({
    queryKey: ["billboard", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: installedEquipment } = useQuery({
    queryKey: ["billboard-equipment", id],
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
            category
          )
        `)
        .eq("billboard_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success hover:bg-success/20">ใช้งาน</Badge>;
      case "maintenance":
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">บำรุงรักษา</Badge>;
      case "inactive":
        return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!billboard) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/billboards")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับ
        </Button>
        <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลป้ายโฆษณา</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/billboards")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับ
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{billboard.equipment_id}</h1>
          <p className="text-muted-foreground">{billboard.description || "รายละเอียดป้ายโฆษณา"}</p>
        </div>
        <div className="ml-auto">{getStatusBadge(billboard.status)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              ข้อมูลพื้นฐาน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                <span className="text-muted-foreground">Description:</span>
                <p className="font-medium">{billboard.description || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium">{billboard.location_name || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5" />
              ข้อมูลองค์กร
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Department:</span>
                <p className="font-medium">{billboard.department || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">BKK/UPC:</span>
                <p className="font-medium">{billboard.bkk_upc || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Monitor className="w-5 h-5" />
              ข้อมูลสื่อ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Media Type:</span>
                <p className="font-medium">{billboard.media_type || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Media Class:</span>
                <p className="font-medium">{billboard.media_class || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Media Segment:</span>
                <p className="font-medium">{billboard.media_segment || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Target Monitoring:</span>
                <p className="font-medium">{billboard.target_monitoring || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5" />
              ข้อมูลพื้นที่
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
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

        {/* Route Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              ข้อมูล Route
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Route Install/Demolish:</span>
                <p className="font-medium">{billboard.route_install_demolish || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Route Report Photo:</span>
                <p className="font-medium">{billboard.route_report_photo || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Route PM:</span>
                <p className="font-medium">{billboard.route_pm || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Route Monitoring:</span>
                <p className="font-medium">{billboard.route_monitoring || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extra Fields */}
        {(billboard.extra_1 || billboard.extra_2 || billboard.extra_3) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลเพิ่มเติม</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Extra 1:</span>
                  <p className="font-medium">{billboard.extra_1 || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Extra 2:</span>
                  <p className="font-medium">{billboard.extra_2 || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Extra 3:</span>
                  <p className="font-medium">{billboard.extra_3 || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installed Equipment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              อุปกรณ์ที่ติดตั้ง ({installedEquipment?.length || 0} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {installedEquipment && installedEquipment.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>รหัสอุปกรณ์</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead>วันที่ติดตั้ง</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installedEquipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.equipment?.code || "-"}</TableCell>
                        <TableCell>{item.equipment?.name || "-"}</TableCell>
                        <TableCell>{item.equipment?.category || "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.equipment?.unit || "ชิ้น"}
                        </TableCell>
                        <TableCell>
                          {item.installation_date 
                            ? new Date(item.installation_date).toLocaleDateString("th-TH") 
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                ยังไม่มีอุปกรณ์ที่ติดตั้ง
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {billboard.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">หมายเหตุ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{billboard.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BillboardDetail;
