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
import { ArrowLeft, MapPin, Building2, Monitor, Globe, Package, Calendar, AlertTriangle, Clock, Trash2, History, RotateCcw, ImageIcon, Eye, Tv } from "lucide-react";
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
  const [uninstallType, setUninstallType] = useState<"equipment" | "media_player">("equipment");
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

  // Fetch installed media players on this billboard
  const { data: installedMediaPlayers } = useQuery({
    queryKey: ["billboard-media-players", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_players")
        .select("id, code, name, serial_number_1, serial_number_2, install_date, date_of_receipt, usage_lifespan_months, item_condition, brand, specification, status")
        .eq("billboard_id", id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch installed ads on this billboard
  const { data: installedAds } = useQuery({
    queryKey: ["billboard-installed-ads", id],
    queryFn: async () => {
      // Find ad_issue_requests targeting this billboard with status completed/issued
      const { data, error } = await supabase
        .from("ad_issue_requests")
        .select(`
          id, document_no, issue_purpose, status, issued_at, received_at,
          advertisement:advertisements (code, name, photo_urls, total_quantity)
        `)
        .eq("target_billboard_id", id)
        .in("status", ["issued", "completed"])
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data || [];
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


        // Update equipment_serial_numbers: set status back to in_stock for returned S/Ns
        if (selectedEquipment.serial_number) {
          await supabase.from("equipment_serial_numbers").update({
            status: "in_stock",
            location_id: uninstallData.return_location_id || null,
            billboard_id: null,
          }).eq("equipment_id", selectedEquipment.equipment_id)
            .eq("serial_number", selectedEquipment.serial_number)
            .in("status", ["installed", "issued"]);
        }
      } else {
        // Not returning to stock - just clear billboard_id on S/N records
        if (selectedEquipment.serial_number) {
          await supabase.from("equipment_serial_numbers").update({
            status: "returned",
            billboard_id: null,
          }).eq("equipment_id", selectedEquipment.equipment_id)
            .eq("serial_number", selectedEquipment.serial_number)
            .eq("status", "installed");
        }
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

  // Media Player uninstall mutation
  const mpUninstallMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment || !user || !id) return;

      // 1. Insert into media_player_billboard_history
      const { error: historyError } = await supabase
        .from("media_player_billboard_history")
        .insert({
          media_player_id: selectedEquipment.id,
          billboard_id: id,
          installation_date: selectedEquipment.install_date,
          uninstall_date: new Date().toISOString().split('T')[0],
          uninstalled_by: user.id,
          uninstall_reason: uninstallData.uninstall_reason,
          return_to_stock: uninstallData.return_to_stock,
          return_location_id: uninstallData.return_to_stock && uninstallData.return_location_id
            ? uninstallData.return_location_id
            : null,
        });

      if (historyError) throw historyError;

      // 2. Update media_player: clear billboard_id and install_date
      const updatePayload: any = {
        billboard_id: null,
        install_date: null,
        status: uninstallData.return_to_stock ? "in_stock" : "returned",
        updated_at: new Date().toISOString(),
      };
      if (uninstallData.return_to_stock && uninstallData.return_location_id) {
        updatePayload.location_id = uninstallData.return_location_id;
      }

      const { error: updateError } = await supabase
        .from("media_players")
        .update(updatePayload)
        .eq("id", selectedEquipment.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      const successMsg = uninstallData.return_to_stock
        ? "ถอด Media Player และคืนสต็อกสำเร็จ"
        : "ถอด Media Player สำเร็จ";
      toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ["billboard-media-players", id] });
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
    setUninstallType("equipment");
    setUninstallData({ uninstall_reason: "", return_to_stock: false, return_location_id: "" });
    setUninstallDialogOpen(true);
  };

  const handleUninstallMediaPlayer = (mp: any) => {
    setSelectedEquipment(mp);
    setUninstallType("media_player");
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
                <TabsTrigger value="media-players" className="flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Media Player ({installedMediaPlayers?.length || 0})
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
                              <TableCell>
                                {(item as any).serial_number ? (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {(item as any).serial_number}
                                  </Badge>
                                ) : "-"}
                              </TableCell>
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

              <TabsContent value="media-players">
                {installedMediaPlayers && installedMediaPlayers.length > 0 ? (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>รหัส</TableHead>
                          <TableHead>ชื่อ</TableHead>
                          <TableHead>S/N 1</TableHead>
                          <TableHead>S/N 2</TableHead>
                          <TableHead>สภาพ</TableHead>
                          <TableHead>วันที่ติดตั้ง</TableHead>
                          <TableHead>ระยะเวลาติดตั้ง</TableHead>
                          <TableHead>อายุการใช้งาน</TableHead>
                          <TableHead className="text-center">โปรไฟล์</TableHead>
                          <TableHead className="text-center">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installedMediaPlayers.map((mp) => {
                          const daysInstalled = mp.install_date ? differenceInDays(new Date(), new Date(mp.install_date)) : null;
                          const usageLifespan = mp.usage_lifespan_months;
                          const receiptDate = mp.date_of_receipt;
                          let usageInfo: { label: string; className: string } | null = null;
                          if (receiptDate && usageLifespan) {
                            const totalLifespanDays = usageLifespan * 30;
                            const usedDays = differenceInDays(new Date(), new Date(receiptDate));
                            const remainingDays = totalLifespanDays - usedDays;
                            if (remainingDays <= 0) {
                              usageInfo = { label: `หมดอายุแล้ว (${Math.abs(remainingDays)} วัน)`, className: "text-destructive" };
                            } else if (remainingDays <= 90) {
                              usageInfo = { label: `เหลือ ${remainingDays} วัน`, className: "text-warning" };
                            } else {
                              usageInfo = { label: `เหลือ ${remainingDays} วัน`, className: "text-success" };
                            }
                          }
                          const conditionMap: Record<string, { label: string; className: string }> = {
                            new: { label: "ใหม่", className: "bg-success/10 text-success" },
                            good: { label: "ดี", className: "bg-primary/10 text-primary" },
                            fair: { label: "พอใช้", className: "bg-warning/10 text-warning" },
                            poor: { label: "ชำรุด", className: "bg-destructive/10 text-destructive" },
                          };
                          const cond = conditionMap[mp.item_condition] || { label: mp.item_condition, className: "" };

                          return (
                            <TableRow key={mp.id}>
                              <TableCell className="font-medium font-mono text-primary">{mp.code}</TableCell>
                              <TableCell>{mp.name}</TableCell>
                              <TableCell>
                                {mp.serial_number_1 ? (
                                  <Badge variant="outline" className="font-mono text-xs">{mp.serial_number_1}</Badge>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                {mp.serial_number_2 ? (
                                  <Badge variant="outline" className="font-mono text-xs">{mp.serial_number_2}</Badge>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${cond.className} border-0`}>{cond.label}</Badge>
                              </TableCell>
                              <TableCell>
                                {mp.install_date
                                  ? format(new Date(mp.install_date), "d MMM yyyy", { locale: th })
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
                                {usageInfo ? (
                                  <span className={`text-xs font-medium ${usageInfo.className}`}>{usageInfo.label}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/media-player-profile/${mp.id}`)}
                                  title="ดูโปรไฟล์"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUninstallMediaPlayer(mp)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="ถอด Media Player"
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
                    ยังไม่มี Media Player ที่ติดตั้ง
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

        {/* Installed Ads */}
        {installedAds && installedAds.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="w-5 h-5" />
                ภาพโฆษณาที่ติดตั้ง ({installedAds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {installedAds.map((item: any) => {
                  const ad = item.advertisement;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      {ad?.photo_urls && ad.photo_urls.length > 0 && (
                        <img src={ad.photo_urls[0]} alt={ad.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{ad?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ad?.code || "-"}</p>
                      </div>
                      <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                        {item.status === "completed" ? "ติดตั้งแล้ว" : "จ่ายแล้ว"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
              {uninstallType === "media_player" ? "ถอด Media Player ออกจากป้าย" : "ถอดอุปกรณ์ออกจากป้าย"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              {uninstallType === "media_player" ? (
                <>
                  <p><strong>Media Player:</strong> {selectedEquipment?.code} - {selectedEquipment?.name}</p>
                  {selectedEquipment?.serial_number_1 && <p><strong>S/N 1:</strong> {selectedEquipment.serial_number_1}</p>}
                  {selectedEquipment?.serial_number_2 && <p><strong>S/N 2:</strong> {selectedEquipment.serial_number_2}</p>}
                  <p><strong>วันที่ติดตั้ง:</strong> {selectedEquipment?.install_date 
                    ? format(new Date(selectedEquipment.install_date), "d MMM yyyy", { locale: th })
                    : "-"}</p>
                </>
              ) : (
                <>
                  <p><strong>อุปกรณ์:</strong> {selectedEquipment?.equipment?.code} - {selectedEquipment?.equipment?.name}</p>
                  <p><strong>จำนวน:</strong> {selectedEquipment?.quantity} {selectedEquipment?.equipment?.unit || "ชิ้น"}</p>
                  <p><strong>วันที่ติดตั้ง:</strong> {selectedEquipment?.installation_date 
                    ? format(new Date(selectedEquipment.installation_date), "d MMM yyyy", { locale: th })
                    : "-"}</p>
                </>
              )}
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
                  {uninstallType === "media_player" ? "คืน Media Player กลับสต็อก" : "คืนอุปกรณ์กลับสต็อก"}
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
                    {uninstallType === "media_player"
                      ? "ระบบจะคืน Media Player กลับเข้าสต็อกและอัปเดตสถานะเป็น 'in_stock'"
                      : `ระบบจะเพิ่มจำนวน ${selectedEquipment?.quantity} ${selectedEquipment?.equipment?.unit || "ชิ้น"} กลับเข้าสต็อก`}
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
              onClick={() => uninstallType === "media_player" ? mpUninstallMutation.mutate() : uninstallMutation.mutate()} 
              disabled={uninstallType === "media_player" ? mpUninstallMutation.isPending : uninstallMutation.isPending}
            >
              {(uninstallType === "media_player" ? mpUninstallMutation.isPending : uninstallMutation.isPending) ? "กำลังบันทึก..." : "ยืนยันการถอด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillboardDetail;
