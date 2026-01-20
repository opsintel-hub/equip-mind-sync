import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, FileText, Clock, CheckCircle, XCircle, AlertTriangle, MapPin, RotateCcw, Image, Filter, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { CompanySelect } from "@/components/company/CompanySelect";

interface EquipmentWithDetails {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity_in_stock: number;
  serial_number: string | null;
  expiry_date: string | null;
  warranty_expiry_date: string | null;
  warehouse_entry_date: string;
}

interface IssuePurpose {
  id: string;
  name: string;
  description: string | null;
  requires_billboard: boolean;
  requires_return: boolean;
}

const IssueRequest = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [fifoSearchTerm, setFifoSearchTerm] = useState("");
  const [fifoShowExpiring, setFifoShowExpiring] = useState(true);
  const [fifoShowWarranty, setFifoShowWarranty] = useState(true);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedEquipmentImages, setSelectedEquipmentImages] = useState<string[]>([]);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState("");
  const [formData, setFormData] = useState({
    company_id: "",
    department_id: "",
    equipment_id: "",
    equipment_code: "",
    equipment_name: "",
    serial_number: "",
    quantity: "",
    unit: "ชิ้น",
    purpose_id: "",
    purpose: "",
    destination: "",
    billboard_id: "",
    requester_name: "",
    requester_phone: "",
    requester_department: "",
    notes: "",
  });

  // Fetch notification settings for advance_days
  const { data: notificationSettings } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("advance_days")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Use advance_days from settings or default to 30 days
  const advanceDays = notificationSettings?.advance_days || 30;

  // Fetch equipment with full details including expiry dates
  const { data: equipment } = useQuery({
    queryKey: ["equipment-active-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, unit, quantity_in_stock, serial_number, expiry_date, warranty_expiry_date, warehouse_entry_date")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0)
        .order("warehouse_entry_date", { ascending: true }); // FIFO ordering
      if (error) throw error;
      return data as EquipmentWithDetails[];
    },
  });

  // Fetch issue purposes
  const { data: purposes } = useQuery({
    queryKey: ["issue-purposes-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_purposes")
        .select("id, name, description, requires_billboard, requires_return")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as IssuePurpose[];
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending requests
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["goods-issue-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get selected purpose
  const selectedPurpose = purposes?.find((p) => p.id === formData.purpose_id);

  // Create request mutation
  const createRequest = useMutation({
    mutationFn: async (data: typeof formData) => {
      const purposeName = purposes?.find((p) => p.id === data.purpose_id)?.name || data.purpose;
      const { error } = await supabase.from("goods_issue_pending").insert({
        equipment_id: data.equipment_id || null,
        equipment_code: data.equipment_code || null,
        equipment_name: data.equipment_name || null,
        quantity: parseInt(data.quantity),
        unit: data.unit,
        purpose_id: data.purpose_id || null,
        purpose: purposeName || null,
        destination: data.destination || null,
        billboard_id: data.billboard_id || null,
        is_complete: !selectedPurpose?.requires_billboard || !!data.billboard_id,
        requester_name: data.requester_name,
        requester_phone: data.requester_phone || null,
        requester_department: data.requester_department || null,
        notes: data.serial_number 
          ? `Serial Number: ${data.serial_number}${data.notes ? ` | ${data.notes}` : ''}` 
          : data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ส่งคำขอเบิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending"] });
      setFormData({
        company_id: "",
        department_id: "",
        equipment_id: "",
        equipment_code: "",
        equipment_name: "",
        serial_number: "",
        quantity: "",
        unit: "ชิ้น",
        purpose_id: "",
        purpose: "",
        destination: "",
        billboard_id: "",
        requester_name: "",
        requester_phone: "",
        requester_department: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requester_name || !formData.quantity) {
      toast.error("กรุณากรอกชื่อผู้ขอเบิกและจำนวน");
      return;
    }
    createRequest.mutate(formData);
  };

  const handleEquipmentSelect = (equipmentId: string) => {
    const selected = equipment?.find((e) => e.id === equipmentId);
    if (selected) {
      setFormData({
        ...formData,
        equipment_id: selected.id,
        equipment_code: selected.code,
        equipment_name: selected.name,
        unit: selected.unit,
        serial_number: selected.serial_number || "",
      });
    }
  };

  const handleViewEquipmentImages = async (equipmentId: string, equipmentName: string) => {
    const { data, error } = await supabase
      .from("equipment_images")
      .select("image_url")
      .eq("equipment_id", equipmentId)
      .order("display_order");
    
    if (error) {
      toast.error("ไม่สามารถโหลดรูปภาพได้");
      return;
    }
    
    if (!data || data.length === 0) {
      toast.info("ไม่พบรูปภาพสินค้านี้");
      return;
    }
    
    setSelectedEquipmentImages(data.map(d => d.image_url));
    setSelectedEquipmentName(equipmentName);
    setImageDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />รอดำเนินการ</Badge>;
      case "issued":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />จ่ายแล้ว</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExpiryBadge = (expiryDate: string | null, warrantyDate: string | null) => {
    const today = new Date();
    let badges = [];
    
    if (expiryDate) {
      const days = differenceInDays(new Date(expiryDate), today);
      if (days <= 0) {
        badges.push(<Badge key="exp" className="bg-destructive/10 text-destructive text-xs">หมดอายุแล้ว</Badge>);
      } else if (days <= advanceDays) {
        badges.push(<Badge key="exp" className="bg-orange-500/10 text-orange-500 text-xs">หมดอายุใน {days} วัน</Badge>);
      }
    }
    
    if (warrantyDate) {
      const days = differenceInDays(new Date(warrantyDate), today);
      if (days <= 0) {
        badges.push(<Badge key="war" className="bg-warning/10 text-warning text-xs">ประกันหมดแล้ว</Badge>);
      } else if (days <= advanceDays) {
        badges.push(<Badge key="war" className="bg-warning/10 text-warning text-xs">ประกันหมดใน {days} วัน</Badge>);
      }
    }
    
    return badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
  };

  const filteredRequests = pendingRequests?.filter(
    (req) =>
      req.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate equipment into priority groups for FIFO with filtering
  const priorityEquipment = equipment?.filter(eq => {
    // Apply search filter
    if (fifoSearchTerm) {
      const search = fifoSearchTerm.toLowerCase();
      if (!eq.code.toLowerCase().includes(search) && 
          !eq.name.toLowerCase().includes(search) &&
          !(eq.serial_number?.toLowerCase().includes(search))) {
        return false;
      }
    }
    
    if (!eq.expiry_date && !eq.warranty_expiry_date) return false;
    const today = new Date();
    const expiryDays = eq.expiry_date ? differenceInDays(new Date(eq.expiry_date), today) : Infinity;
    const warrantyDays = eq.warranty_expiry_date ? differenceInDays(new Date(eq.warranty_expiry_date), today) : Infinity;
    
    const hasExpiring = expiryDays <= advanceDays;
    const hasWarranty = warrantyDays <= advanceDays;
    
    if (fifoShowExpiring && fifoShowWarranty) return hasExpiring || hasWarranty;
    if (fifoShowExpiring) return hasExpiring;
    if (fifoShowWarranty) return hasWarranty;
    return false;
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ขอเบิกสินค้า</h1>
        <p className="text-muted-foreground">สำหรับผู้ขอเบิกสินค้า (ต้องล็อกอิน)</p>
      </div>

      {/* Priority Alert - Items approaching expiry */}
      {priorityEquipment.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              สินค้าควรเบิกก่อน (FIFO)
            </CardTitle>
            <CardDescription>
              รายการสินค้าที่ใกล้หมดอายุหรือใกล้หมดประกันภายใน {advanceDays} วัน - แนะนำให้เบิกก่อน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* FIFO Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">กรอง:</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัส/ชื่อ..."
                  value={fifoSearchTerm}
                  onChange={(e) => setFifoSearchTerm(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>
              <Button
                type="button"
                variant={fifoShowExpiring ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFifoShowExpiring(!fifoShowExpiring)}
              >
                ใกล้หมดอายุ
              </Button>
              <Button
                type="button"
                variant={fifoShowWarranty ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFifoShowWarranty(!fifoShowWarranty)}
              >
                ใกล้หมดประกัน
              </Button>
              {fifoSearchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFifoSearchTerm("")}
                >
                  <X className="h-3 w-3 mr-1" />
                  ล้าง
                </Button>
              )}
            </div>
            
            {/* 6 Columns Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {priorityEquipment.slice(0, 12).map((eq) => (
                <div 
                  key={eq.id} 
                  className="p-2 rounded-lg border border-warning/30 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleEquipmentSelect(eq.id)}
                >
                  <div className="font-medium text-xs truncate">{eq.code}</div>
                  <div className="text-xs text-muted-foreground truncate">{eq.name}</div>
                  {eq.serial_number && (
                    <div className="text-[10px] text-muted-foreground truncate">SN: {eq.serial_number}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground">คงเหลือ: {eq.quantity_in_stock} {eq.unit}</div>
                  <div className="mt-1">
                    {getExpiryBadge(eq.expiry_date, eq.warranty_expiry_date)}
                  </div>
                </div>
              ))}
            </div>
            {priorityEquipment.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                ไม่พบสินค้าที่ตรงกับเงื่อนไข
              </div>
            )}
            {priorityEquipment.length > 12 && (
              <div className="text-center text-xs text-muted-foreground mt-2">
                แสดง 12 จาก {priorityEquipment.length} รายการ (กรอกค้นหาเพื่อดูเพิ่มเติม)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            แบบฟอร์มขอเบิกสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department & Company Selection */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">ฝ่าย *</Label>
                  <Select 
                    value={formData.department_id} 
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกฝ่าย..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">บริษัท *</Label>
                  <CompanySelect
                    value={formData.company_id}
                    onChange={(value) => setFormData({ ...formData, company_id: value, equipment_id: "", equipment_code: "", equipment_name: "" })}
                    placeholder="เลือกบริษัท..."
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                กรุณาเลือกฝ่ายและบริษัทที่จะเบิกสินค้า (ไม่สามารถเบิกข้ามบริษัทได้)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requester_name">ชื่อผู้ขอเบิก *</Label>
                <Input
                  id="requester_name"
                  value={formData.requester_name}
                  onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                  placeholder="กรอกชื่อ-นามสกุล"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requester_phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="requester_phone"
                  value={formData.requester_phone}
                  onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                  placeholder="กรอกเบอร์โทร"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requester_department">แผนก (ผู้ขอ)</Label>
                <Input
                  id="requester_department"
                  value={formData.requester_department}
                  onChange={(e) => setFormData({ ...formData, requester_department: e.target.value })}
                  placeholder="กรอกแผนกของผู้ขอ"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="equipment_code">เลือกสินค้า (เรียงตาม FIFO - ของเก่าก่อน)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select onValueChange={handleEquipmentSelect} value={formData.equipment_id}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสินค้าที่ต้องการเบิก" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                        {equipment?.map((eq) => {
                          const expiryBadge = getExpiryBadge(eq.expiry_date, eq.warranty_expiry_date);
                          const ageDays = differenceInDays(new Date(), new Date(eq.warehouse_entry_date));
                          return (
                            <SelectItem key={eq.id} value={eq.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{eq.code}</span>
                                <span className="text-muted-foreground">- {eq.name}</span>
                                {eq.serial_number && (
                                  <span className="text-xs text-muted-foreground">(SN: {eq.serial_number})</span>
                                )}
                                <span className="text-sm text-muted-foreground">[คงเหลือ: {eq.quantity_in_stock}]</span>
                                {ageDays > 30 && (
                                  <Badge variant="outline" className="text-xs">อยู่คลัง {ageDays} วัน</Badge>
                                )}
                                {expiryBadge}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.equipment_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEquipmentImages(formData.equipment_id, formData.equipment_name)}
                    >
                      <Image className="h-4 w-4 mr-1" />
                      ดูรูป
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment_name">หรือ ระบุชื่อสินค้า</Label>
                <Input
                  id="equipment_name"
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  placeholder="กรอกชื่อสินค้า (ถ้าไม่รู้รหัส)"
                  disabled={!!formData.equipment_id}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number (ถ้ามี)</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="ระบุ Serial Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">จำนวน *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="กรอกจำนวน"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">หน่วย</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="หน่วย"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose_id">วัตถุประสงค์ *</Label>
                <Select 
                  value={formData.purpose_id} 
                  onValueChange={(value) => {
                    const purpose = purposes?.find((p) => p.id === value);
                    setFormData({ 
                      ...formData, 
                      purpose_id: value, 
                      purpose: purpose?.name || "",
                      billboard_id: purpose?.requires_billboard ? formData.billboard_id : ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวัตถุประสงค์" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                    {purposes?.map((purpose) => (
                      <SelectItem key={purpose.id} value={purpose.id}>
                        <div className="flex items-center gap-2">
                          <span>{purpose.name}</span>
                          {purpose.requires_billboard && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              <MapPin className="h-3 w-3 mr-1" />ระบุป้าย
                            </Badge>
                          )}
                          {purpose.requires_return && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                              <RotateCcw className="h-3 w-3 mr-1" />ต้องคืน
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPurpose && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPurpose.description}
                    {selectedPurpose.requires_billboard && !formData.billboard_id && (
                      <span className="text-warning ml-2">(⚠️ หากไม่ระบุป้าย จะต้องกลับมาระบุภายหลัง)</span>
                    )}
                  </p>
                )}
              </div>

              {selectedPurpose?.requires_billboard && (
                <div className="space-y-2">
                  <Label>
                    ป้ายโฆษณา {selectedPurpose.requires_billboard && "(แนะนำ)"}
                  </Label>
                  <BillboardSelect
                    value={formData.billboard_id}
                    onChange={(value) => setFormData({ ...formData, billboard_id: value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="destination">ส่งไปที่</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="ระบุจุดหมาย/สถานที่"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="หมายเหตุเพิ่มเติม"
                rows={2}
              />
            </div>

            <Button type="submit" disabled={createRequest.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {createRequest.isPending ? "กำลังส่ง..." : "ส่งคำขอเบิก"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ประวัติคำขอเบิก
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่เอกสาร, รหัส, ชื่อสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่ขอ</TableHead>
                  <TableHead>รหัส/ชื่อสินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ผู้ขอเบิก</TableHead>
                  <TableHead>วัตถุประสงค์</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests?.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.document_no}</TableCell>
                      <TableCell>
                        {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                      </TableCell>
                      <TableCell>
                        {req.equipment_code && <div className="font-medium">{req.equipment_code}</div>}
                        <div className="text-sm text-muted-foreground">{req.equipment_name || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {req.quantity} {req.unit}
                      </TableCell>
                      <TableCell>
                        <div>{req.requester_name}</div>
                        {req.requester_department && (
                          <div className="text-sm text-muted-foreground">{req.requester_department}</div>
                        )}
                      </TableCell>
                      <TableCell>{req.purpose || "-"}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              รูปภาพ: {selectedEquipmentName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-4">
            {selectedEquipmentImages.map((url, index) => (
              <div key={index} className="relative aspect-square border rounded-lg overflow-hidden">
                <img 
                  src={url} 
                  alt={`${selectedEquipmentName} - รูปที่ ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => window.open(url, '_blank')}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              ปิด
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueRequest;