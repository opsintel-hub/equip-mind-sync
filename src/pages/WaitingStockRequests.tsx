import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, Clock, CheckCircle, Bell, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { LocationSelect } from "@/components/equipment/LocationSelect";
import BillboardSelect from "@/components/billboard/BillboardSelect";

interface WaitingRequest {
  id: string;
  document_no: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  quantity: number;
  unit: string;
  purpose: string | null;
  destination: string | null;
  requester_name: string;
  requester_phone: string | null;
  requester_department: string | null;
  notes: string | null;
  status: string;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  partial_issue_count: number | null;
  last_partial_issue_at: string | null;
  created_at: string;
}

interface EquipmentWithStock {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number;
}

const WaitingStockRequests = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<WaitingRequest | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueData, setIssueData] = useState({
    issued_quantity: "",
    issued_location_id: "",
    notes: "",
    install_to_billboard: false,
    billboard_id: "",
  });

  // Fetch waiting_stock requests only
  const { data: waitingRequests, isLoading } = useQuery({
    queryKey: ["waiting-stock-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*")
        .eq("status", "waiting_stock")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as WaitingRequest[];
    },
  });

  // Fetch equipment for stock check
  const { data: equipment } = useQuery({
    queryKey: ["equipment-active-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, code, name, quantity_in_stock")
        .eq("is_active", true);
      if (error) throw error;
      return data as EquipmentWithStock[];
    },
  });

  // Issue remaining goods mutation
  const issueGoods = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) return;

      const issuedQty = parseInt(issueData.issued_quantity);
      const remainingQty = (selectedRequest.remaining_quantity || 0) - issuedQty;
      const previousIssued = selectedRequest.issued_quantity || 0;
      const totalIssued = previousIssued + issuedQty;
      const partialCount = (selectedRequest.partial_issue_count || 0) + 1;

      // Determine new status
      let newStatus: string;
      if (remainingQty <= 0) {
        newStatus = "issued";
      } else {
        newStatus = "waiting_stock";
      }

      // Update pending request
      const { error: updateError } = await supabase
        .from("goods_issue_pending")
        .update({
          status: newStatus,
          issued_quantity: totalIssued,
          remaining_quantity: Math.max(0, remainingQty),
          partial_issue_count: partialCount,
          last_partial_issue_at: new Date().toISOString(),
          issued_at: new Date().toISOString(),
          issued_by: user.id,
          issued_location_id: issueData.issued_location_id || null,
          notes: issueData.notes || selectedRequest.notes,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // Update equipment stock
      if (selectedRequest.equipment_id && issuedQty > 0) {
        const currentEquipment = equipment?.find((e) => e.id === selectedRequest.equipment_id);
        if (currentEquipment) {
          const newStock = Math.max(0, currentEquipment.quantity_in_stock - issuedQty);
          const { error: stockError } = await supabase
            .from("equipment")
            .update({ quantity_in_stock: newStock })
            .eq("id", selectedRequest.equipment_id);
          if (stockError) throw stockError;

          // Create goods_issue record
          const { error: issueError } = await supabase
            .from("goods_issue")
            .insert({
              document_no: selectedRequest.document_no + `-P${partialCount}`,
              equipment_id: selectedRequest.equipment_id,
              quantity: issuedQty,
              location_id: issueData.issued_location_id || currentEquipment.id,
              issue_date: new Date().toISOString().split('T')[0],
              requester: selectedRequest.requester_name,
              purpose: selectedRequest.purpose,
              notes: issueData.notes || `จ่ายเพิ่มเติม ${issuedQty} (รอ: ${Math.max(0, remainingQty)})`,
              created_by: user.id,
            });
          if (issueError) console.error("Error creating goods_issue:", issueError);
        }
      }

      // If installing to billboard
      if (issueData.install_to_billboard && issueData.billboard_id && selectedRequest.equipment_id) {
        const { error: billboardError } = await supabase
          .from("billboard_equipment")
          .insert({
            billboard_id: issueData.billboard_id,
            equipment_id: selectedRequest.equipment_id,
            quantity: issuedQty,
            installation_date: new Date().toISOString().split('T')[0],
            notes: issueData.notes || `เบิกจากเอกสาร ${selectedRequest.document_no}`,
            created_by: user.id,
          });
        if (billboardError) throw billboardError;
      }

      return { remainingQty, newStatus };
    },
    onSuccess: (result) => {
      let message = "";
      if (result?.newStatus === "issued") {
        message = "จ่ายสินค้าครบตามคำขอแล้ว";
      } else {
        message = `จ่ายสินค้าเพิ่มเติมสำเร็จ ยังรออีก ${result?.remainingQty} ชิ้น`;
      }
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["waiting-stock-requests"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-active-stock"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      setIssueDialogOpen(false);
      setSelectedRequest(null);
      setIssueData({ issued_quantity: "", issued_location_id: "", notes: "", install_to_billboard: false, billboard_id: "" });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const getAvailableStock = (equipmentId: string | null) => {
    if (!equipmentId) return null;
    const eq = equipment?.find((e) => e.id === equipmentId);
    return eq?.quantity_in_stock ?? null;
  };

  const handleIssue = (request: WaitingRequest) => {
    const availableStock = getAvailableStock(request.equipment_id);
    const remainingQty = request.remaining_quantity || 0;
    const qtyToIssue = availableStock !== null ? Math.min(remainingQty, availableStock) : remainingQty;
    
    setSelectedRequest(request);
    setIssueData({
      issued_quantity: qtyToIssue.toString(),
      issued_location_id: "",
      notes: "",
      install_to_billboard: false,
      billboard_id: "",
    });
    setIssueDialogOpen(true);
  };

  const canIssue = (request: WaitingRequest) => {
    const availableStock = getAvailableStock(request.equipment_id);
    return availableStock !== null && availableStock > 0;
  };

  const filteredRequests = waitingRequests?.filter(
    (req) =>
      req.document_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const requestsWithStock = filteredRequests?.filter((r) => canIssue(r)).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">คำขอรอสินค้า</h1>
          <p className="text-muted-foreground">รายการคำขอเบิกที่รอสินค้าเข้าคลัง</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2 bg-orange-100 text-orange-800">
            <Clock className="h-4 w-4 mr-1" />
            รอสินค้า: {waitingRequests?.length || 0} รายการ
          </Badge>
          {requestsWithStock > 0 && (
            <Badge variant="default" className="text-lg px-4 py-2 bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              พร้อมจ่าย: {requestsWithStock} รายการ
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            รายการรอสินค้าเข้าคลัง
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
                  <TableHead>ขอ/จ่ายแล้ว/รอ</TableHead>
                  <TableHead>คงเหลือในคลัง</TableHead>
                  <TableHead>ผู้ขอเบิก</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      ไม่มีคำขอรอสินค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests?.map((req) => {
                    const availableStock = getAvailableStock(req.equipment_id);
                    const hasStock = availableStock !== null && availableStock > 0;
                    return (
                      <TableRow key={req.id} className={hasStock ? "bg-green-50" : "bg-orange-50"}>
                        <TableCell className="font-medium">{req.document_no}</TableCell>
                        <TableCell>
                          {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                        </TableCell>
                        <TableCell>
                          {req.equipment_code && <div className="font-medium">{req.equipment_code}</div>}
                          <div className="text-sm text-muted-foreground">{req.equipment_name || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span>ขอ: {req.quantity}</span>
                            {req.issued_quantity && req.issued_quantity > 0 && (
                              <span className="text-green-600 ml-2">จ่าย: {req.issued_quantity}</span>
                            )}
                          </div>
                          <div className="text-orange-600 font-semibold">
                            รอ: {req.remaining_quantity || 0} {req.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          {availableStock !== null ? (
                            <Badge className={hasStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {availableStock} ชิ้น
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{req.requester_name}</div>
                          {req.requester_phone && (
                            <div className="text-xs text-muted-foreground">{req.requester_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>{req.requester_department || "-"}</TableCell>
                        <TableCell>
                          {hasStock ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              พร้อมจ่าย
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">
                              <Clock className="h-3 w-3 mr-1" />
                              รอสินค้า
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleIssue(req)}
                            disabled={!hasStock}
                            className={hasStock ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            จ่ายสินค้า
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Issue Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>จ่ายสินค้าที่รอ</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">เอกสาร:</span>
                  <span className="font-medium">{selectedRequest.document_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">สินค้า:</span>
                  <span className="font-medium">{selectedRequest.equipment_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ขอทั้งหมด:</span>
                  <span>{selectedRequest.quantity} {selectedRequest.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">จ่ายแล้ว:</span>
                  <span className="text-green-600">{selectedRequest.issued_quantity || 0}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-orange-600">รอจ่าย:</span>
                  <span className="text-orange-600">{selectedRequest.remaining_quantity || 0} {selectedRequest.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">คลังมี:</span>
                  <span className="text-blue-600 font-medium">
                    {getAvailableStock(selectedRequest.equipment_id) || 0} ชิ้น
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>จำนวนที่จะจ่าย *</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.min(
                    selectedRequest.remaining_quantity || 0,
                    getAvailableStock(selectedRequest.equipment_id) || 0
                  )}
                  value={issueData.issued_quantity}
                  onChange={(e) => setIssueData({ ...issueData, issued_quantity: e.target.value })}
                  placeholder="ระบุจำนวน"
                />
                <p className="text-xs text-muted-foreground">
                  จ่ายได้สูงสุด: {Math.min(
                    selectedRequest.remaining_quantity || 0,
                    getAvailableStock(selectedRequest.equipment_id) || 0
                  )} ชิ้น
                </p>
              </div>

              <div className="space-y-2">
                <Label>ตำแหน่งจัดเก็บ</Label>
                <LocationSelect
                  value={issueData.issued_location_id}
                  onChange={(val) => setIssueData({ ...issueData, issued_location_id: val })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="install_to_billboard"
                  checked={issueData.install_to_billboard}
                  onCheckedChange={(checked) =>
                    setIssueData({ ...issueData, install_to_billboard: checked as boolean })
                  }
                />
                <Label htmlFor="install_to_billboard">ติดตั้งที่ป้าย</Label>
              </div>

              {issueData.install_to_billboard && (
                <div className="space-y-2">
                  <Label>เลือกป้าย *</Label>
                  <BillboardSelect
                    value={issueData.billboard_id}
                    onChange={(val) => setIssueData({ ...issueData, billboard_id: val })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={issueData.notes}
                  onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => issueGoods.mutate()}
              disabled={
                issueGoods.isPending ||
                !issueData.issued_quantity ||
                parseInt(issueData.issued_quantity) <= 0 ||
                (issueData.install_to_billboard && !issueData.billboard_id)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              ยืนยันจ่ายสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitingStockRequests;
