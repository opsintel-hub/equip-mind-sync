import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const IssueRequest = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    equipment_code: "",
    equipment_name: "",
    quantity: "",
    unit: "ชิ้น",
    purpose: "",
    destination: "",
    requester_name: "",
    requester_phone: "",
    requester_department: "",
    notes: "",
  });

  // Fetch equipment for autocomplete
  const { data: equipment } = useQuery({
    queryKey: ["equipment-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, unit, quantity_in_stock")
        .eq("is_active", true)
        .order("code");
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

  // Create request mutation
  const createRequest = useMutation({
    mutationFn: async (data: typeof formData) => {
      const equipmentMatch = equipment?.find(
        (e) => e.code === data.equipment_code || e.name === data.equipment_name
      );

      const { error } = await supabase.from("goods_issue_pending").insert({
        equipment_id: equipmentMatch?.id || null,
        equipment_code: data.equipment_code || null,
        equipment_name: data.equipment_name || null,
        quantity: parseInt(data.quantity),
        unit: data.unit,
        purpose: data.purpose || null,
        destination: data.destination || null,
        requester_name: data.requester_name,
        requester_phone: data.requester_phone || null,
        requester_department: data.requester_department || null,
        notes: data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ส่งคำขอเบิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending"] });
      setFormData({
        equipment_code: "",
        equipment_name: "",
        quantity: "",
        unit: "ชิ้น",
        purpose: "",
        destination: "",
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

  const handleEquipmentSelect = (code: string) => {
    const selected = equipment?.find((e) => e.code === code);
    if (selected) {
      setFormData({
        ...formData,
        equipment_code: selected.code,
        equipment_name: selected.name,
        unit: selected.unit,
      });
    }
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

  const filteredRequests = pendingRequests?.filter(
    (req) =>
      req.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ขอเบิกสินค้า</h1>
          <p className="text-muted-foreground">สำหรับผู้ขอเบิกสินค้า - ไม่ต้องล็อกอิน</p>
        </div>

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
                  <Label htmlFor="requester_department">แผนก/ฝ่าย</Label>
                  <Input
                    id="requester_department"
                    value={formData.requester_department}
                    onChange={(e) => setFormData({ ...formData, requester_department: e.target.value })}
                    placeholder="กรอกแผนก/ฝ่าย"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_code">รหัสสินค้า</Label>
                  <Select onValueChange={handleEquipmentSelect} value={formData.equipment_code}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสินค้า (ถ้ารู้)" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment?.map((eq) => (
                        <SelectItem key={eq.id} value={eq.code}>
                          {eq.code} - {eq.name} (คงเหลือ: {eq.quantity_in_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_name">ชื่อสินค้า</Label>
                  <Input
                    id="equipment_name"
                    value={formData.equipment_name}
                    onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                    placeholder="กรอกชื่อสินค้า (ถ้าไม่รู้รหัส)"
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
                  <Label htmlFor="purpose">วัตถุประสงค์</Label>
                  <Input
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="ระบุวัตถุประสงค์"
                  />
                </div>

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
      </div>
    </DashboardLayout>
  );
};

export default IssueRequest;
