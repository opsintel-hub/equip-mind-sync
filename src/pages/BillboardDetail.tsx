import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Building2, Monitor, Globe, Package, Calendar, AlertTriangle, Clock, Trash2, History, RotateCcw } from "lucide-react";
import BillboardQRCode from "@/components/billboard/BillboardQRCode";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { logStockMovement } from "@/lib/stockMovement";

interface UninstallData {
  uninstall_reason: string;
  return_to_stock: boolean;
  return_location_id: string;
}

const BillboardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [uninstallDialogOpen, setUninstallDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [uninstallData, setUninstallData] = useState<UninstallData>({
    uninstall_reason: "",
    return_to_stock: false,
    return_location_id: "",
  });
  const [returnDepartment, setReturnDepartment] = useState("");
  const [returnWarehouseId, setReturnWarehouseId] = useState("");

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

  const { data: installedEquipment, refetch: refetchEquipment } = useQuery({
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
            category,
            expiry_date,
            warranty_expiry_date,
            quantity_in_stock
          )
        `)
        .eq("billboard_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: equipmentHistory } = useQuery({
    queryKey: ["billboard-equipment-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboard_equipment_history")
        .select("*")
        .eq("billboard_id", id)
        .order("uninstall_date", { ascending: false });
      if (error) throw error;
      
      // Fetch equipment details for each history record
      const equipmentIds = [...new Set(data.map(h => h.equipment_id))];
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("id, code, name, unit, category")
        .in("id", equipmentIds);
      
      const equipmentMap = new Map(equipmentData?.map(e => [e.id, e]) || []);
      
      return data.map(h => ({
        ...h,
        equipment: equipmentMap.get(h.equipment_id) || null
      }));
    },
    enabled: !!id,
  });

  const uninstallMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment || !user || !id) return;

      // 1. Insert into history table
      const { error: historyError } = await supabase
        .from("billboard_equipment_history")
        .insert({
          billboard_id: id,
          equipment_id: selectedEquipment.equipment_id,
          quantity: selectedEquipment.quantity,
          installation_date: selectedEquipment.installation_date,
          uninstall_date: new Date().toISOString().split('T')[0],
          installed_by: selectedEquipment.created_by,
          uninstalled_by: user.id,
          installation_notes: selectedEquipment.notes,
          uninstall_reason: uninstallData.uninstall_reason,
          return_to_stock: uninstallData.return_to_stock,
          return_location_id: uninstallData.return_to_stock && uninstallData.return_location_id 
            ? uninstallData.return_location_id 
            : null,
        });

      if (historyError) throw historyError;

      // 2. If returning to stock, fetch current stock from database and update
      if (uninstallData.return_to_stock && selectedEquipment.equipment_id) {
        // Fetch current stock from database (not from cache)
        const { data: currentEquipmentData, error: fetchError } = await supabase
          .from("equipment")
          .select("quantity_in_stock")
          .eq("id", selectedEquipment.equipment_id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        const currentStock = currentEquipmentData?.quantity_in_stock || 0;
        const newStock = currentStock + selectedEquipment.quantity;
        
        const { error: stockError } = await supabase
          .from("equipment")
          .update({ quantity_in_stock: newStock })
          .eq("id", selectedEquipment.equipment_id);
        
        if (stockError) throw stockError;

        // Log stock movement for return from billboard
        await logStockMovement({
          equipment_id: selectedEquipment.equipment_id,
          equipment_code: selectedEquipment.equipment?.code || "",
          equipment_name: selectedEquipment.equipment?.name || "",
          movement_type: "return_from_billboard",
          quantity: selectedEquipment.quantity,
          stock_before: currentStock,
          stock_after: newStock,
          reference_type: "billboard_equipment",
          reference_id: selectedEquipment.id,
          reference_document: billboard?.equipment_id || "",
          location_id: uninstallData.return_location_id || undefined,
          notes: uninstallData.uninstall_reason || undefined,
        });
      }

      // 3. Delete from billboard_equipment
      const { error: deleteError } = await supabase
        .from("billboard_equipment")
        .delete()
        .eq("id", selectedEquipment.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      const successMsg = uninstallData.return_to_stock 
        ? "ถอดอุปกรณ์และคืนสต็อกสำเร็จ" 
        : "ถอดอุปกรณ์สำเร็จ";
      toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ["billboard-equipment", id] });
      queryClient.invalidateQueries({ queryKey: ["billboard-equipment-history", id] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active-details"] });
      setUninstallDialogOpen(false);
      setSelectedEquipment(null);
      setUninstallData({ uninstall_reason: "", return_to_stock: false, return_location_id: "" });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleUninstall = (equipment: any) => {
    setSelectedEquipment(equipment);
    setUninstallData({ uninstall_reason: "", return_to_stock: false, return_location_id: "" });
    setUninstallDialogOpen(true);
  };

  const calculateDaysInstalled = (installDate: string | null) => {
    if (!installDate) return null;
    const days = differenceInDays(new Date(), new Date(installDate));
    return days;
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: "expired", days: Math.abs(days), label: "หมดอายุ" };
    if (days <= 30) return { status: "warning", days, label: "ใกล้หมดอายุ" };
    return { status: "ok", days, label: "ปกติ" };
  };

  const getWarrantyStatus = (warrantyDate: string | null) => {
    if (!warrantyDate) return null;
    const days = differenceInDays(new Date(warrantyDate), new Date());
    if (days < 0) return { status: "expired", days: Math.abs(days), label: "หมดประกัน" };
    if (days <= 30) return { status: "warning", days, label: "ใกล้หมดประกัน" };
    return { status: "ok", days, label: "มีประกัน" };
  };

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
        <div className="ml-auto flex items-center gap-2">
          <BillboardQRCode 
            billboardId={billboard.id} 
            billboardCode={billboard.equipment_id}
            locationName={billboard.location_name || undefined}
          />
          {getStatusBadge(billboard.status)}
        </div>
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
                <span className="text-muted-foreground">Size:</span>
                <p className="font-medium">{(billboard as any).size || "-"}</p>
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

        {/* Equipment Section with Tabs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              อุปกรณ์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="installed" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="installed" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  ติดตั้งอยู่ ({installedEquipment?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  ประวัติการถอด ({equipmentHistory?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="installed">
                {installedEquipment && installedEquipment.length > 0 ? (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>รหัสอุปกรณ์</TableHead>
                          <TableHead>ชื่ออุปกรณ์</TableHead>
                          <TableHead>S/N</TableHead>
                          <TableHead>หมวดหมู่</TableHead>
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead>วันที่ติดตั้ง</TableHead>
                          <TableHead>ระยะเวลาติดตั้ง</TableHead>
                          <TableHead>วันหมดอายุ</TableHead>
                          <TableHead>วันหมดประกัน</TableHead>
                          <TableHead>หมายเหตุ</TableHead>
                          <TableHead className="text-center">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installedEquipment.map((item) => {
                          const daysInstalled = calculateDaysInstalled(item.installation_date);
                          const expiryStatus = getExpiryStatus(item.equipment?.expiry_date);
                          const warrantyStatus = getWarrantyStatus(item.equipment?.warranty_expiry_date);

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.equipment?.code || "-"}</TableCell>
                              <TableCell>{item.equipment?.name || "-"}</TableCell>
                              <TableCell>{item.equipment?.category || "-"}</TableCell>
                              <TableCell className="text-right">
                                {item.quantity} {item.equipment?.unit || "ชิ้น"}
                              </TableCell>
                              <TableCell>
                                {item.installation_date 
                                  ? format(new Date(item.installation_date), "d MMM yyyy", { locale: th })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {daysInstalled !== null ? (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <span>{daysInstalled} วัน</span>
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                {item.equipment?.expiry_date ? (
                                  <div className="space-y-1">
                                    <div className="text-xs">
                                      {format(new Date(item.equipment.expiry_date), "d MMM yyyy", { locale: th })}
                                    </div>
                                    {expiryStatus && (
                                      <Badge 
                                        variant={expiryStatus.status === "expired" ? "destructive" : expiryStatus.status === "warning" ? "default" : "secondary"}
                                        className={`text-xs ${expiryStatus.status === "warning" ? "bg-warning/10 text-warning hover:bg-warning/20" : ""}`}
                                      >
                                        {expiryStatus.status === "expired" && <AlertTriangle className="w-3 h-3 mr-1" />}
                                        {expiryStatus.label} {expiryStatus.status !== "ok" && `(${expiryStatus.days} วัน)`}
                                      </Badge>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                {item.equipment?.warranty_expiry_date ? (
                                  <div className="space-y-1">
                                    <div className="text-xs">
                                      {format(new Date(item.equipment.warranty_expiry_date), "d MMM yyyy", { locale: th })}
                                    </div>
                                    {warrantyStatus && (
                                      <Badge 
                                        variant={warrantyStatus.status === "expired" ? "destructive" : warrantyStatus.status === "warning" ? "default" : "secondary"}
                                        className={`text-xs ${warrantyStatus.status === "warning" ? "bg-warning/10 text-warning hover:bg-warning/20" : ""}`}
                                      >
                                        {warrantyStatus.status === "expired" && <AlertTriangle className="w-3 h-3 mr-1" />}
                                        {warrantyStatus.label} {warrantyStatus.status !== "ok" && `(${warrantyStatus.days} วัน)`}
                                      </Badge>
                                    )}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUninstall(item)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="ถอดอุปกรณ์"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    ยังไม่มีอุปกรณ์ที่ติดตั้ง
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {equipmentHistory && equipmentHistory.length > 0 ? (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>รหัสอุปกรณ์</TableHead>
                          <TableHead>ชื่ออุปกรณ์</TableHead>
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead>วันที่ติดตั้ง</TableHead>
                          <TableHead>วันที่ถอด</TableHead>
                          <TableHead>ระยะเวลาใช้งาน</TableHead>
                          <TableHead>เหตุผลการถอด</TableHead>
                          <TableHead>คืนสต็อก</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipmentHistory.map((item) => {
                          const daysUsed = item.installation_date && item.uninstall_date
                            ? differenceInDays(new Date(item.uninstall_date), new Date(item.installation_date))
                            : null;

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.equipment?.code || "-"}</TableCell>
                              <TableCell>{item.equipment?.name || "-"}</TableCell>
                              <TableCell className="text-right">
                                {item.quantity} {item.equipment?.unit || "ชิ้น"}
                              </TableCell>
                              <TableCell>
                                {item.installation_date 
                                  ? format(new Date(item.installation_date), "d MMM yyyy", { locale: th })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {item.uninstall_date 
                                  ? format(new Date(item.uninstall_date), "d MMM yyyy", { locale: th })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {daysUsed !== null ? (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <span>{daysUsed} วัน</span>
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{item.uninstall_reason || "-"}</TableCell>
                              <TableCell>
                                {item.return_to_stock ? (
                                  <Badge className="bg-success/10 text-success">
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    คืนแล้ว
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">ไม่คืน</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    ยังไม่มีประวัติการถอดอุปกรณ์
                  </div>
                )}
              </TabsContent>
            </Tabs>
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

      {/* Uninstall Dialog */}
      <Dialog open={uninstallDialogOpen} onOpenChange={setUninstallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              ถอดอุปกรณ์ออกจากป้าย
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p><strong>อุปกรณ์:</strong> {selectedEquipment?.equipment?.code} - {selectedEquipment?.equipment?.name}</p>
              <p><strong>จำนวน:</strong> {selectedEquipment?.quantity} {selectedEquipment?.equipment?.unit || "ชิ้น"}</p>
              <p><strong>วันที่ติดตั้ง:</strong> {selectedEquipment?.installation_date 
                ? format(new Date(selectedEquipment.installation_date), "d MMM yyyy", { locale: th })
                : "-"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uninstall_reason">เหตุผลในการถอด</Label>
              <Textarea
                id="uninstall_reason"
                value={uninstallData.uninstall_reason}
                onChange={(e) => setUninstallData({ ...uninstallData, uninstall_reason: e.target.value })}
                placeholder="ระบุเหตุผล เช่น หมดอายุ, ชำรุด, เปลี่ยนรุ่นใหม่..."
                rows={2}
              />
            </div>

            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-dashed">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="return_to_stock"
                  checked={uninstallData.return_to_stock}
                  onCheckedChange={(checked) => 
                    setUninstallData({ 
                      ...uninstallData, 
                      return_to_stock: checked === true,
                      return_location_id: checked ? uninstallData.return_location_id : ""
                    })
                  }
                />
                <Label htmlFor="return_to_stock" className="flex items-center gap-2 cursor-pointer">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  คืนอุปกรณ์กลับสต็อก
                </Label>
              </div>
              
              {uninstallData.return_to_stock && (
                <div className="space-y-2 ml-6">
                  <div className="space-y-2">
                    <Label>ฝ่าย</Label>
                    <SimpleDepartmentSelect
                      value={returnDepartment || billboard?.department || ""}
                      onChange={(val) => { setReturnDepartment(val); setReturnWarehouseId(""); setUninstallData({ ...uninstallData, return_location_id: "" }); }}
                    />
                  </div>
                  <WarehouseLocationSelect
                    department={returnDepartment || billboard?.department || ""}
                    warehouseId={returnWarehouseId}
                    onWarehouseChange={setReturnWarehouseId}
                    locationId={uninstallData.return_location_id}
                    onLocationChange={(value) => setUninstallData({ ...uninstallData, return_location_id: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    ระบบจะเพิ่มจำนวน {selectedEquipment?.quantity} {selectedEquipment?.equipment?.unit || "ชิ้น"} กลับเข้าสต็อก
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUninstallDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => uninstallMutation.mutate()} 
              disabled={uninstallMutation.isPending}
            >
              {uninstallMutation.isPending ? "กำลังบันทึก..." : "ยืนยันการถอด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillboardDetail;
