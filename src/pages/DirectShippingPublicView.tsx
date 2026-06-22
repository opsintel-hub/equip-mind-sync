import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, MapPin, Truck, User, Phone, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { DestinationMapPreview } from "@/components/direct-shipping/DestinationMapPreview";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function DirectShippingPublicContent() {
  const { id } = useParams<{ id: string }>();

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ["ds-public-view", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const { data, error } = await supabase.rpc("public_get_direct_shipment" as any, { _id: id });
      if (error) throw error;
      if (!data) throw new Error("Not found");
      return data as any;
    },
    enabled: !!id,
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending_approval": return "รออนุมัติ";
      case "approved": return "อนุมัติแล้ว - รอดำเนินการ";
      case "pending_confirmation": return "จัดส่งแล้ว - รอยืนยันรับ";
      case "confirmed": return "ยืนยันรับสินค้าแล้ว";
      case "rejected": return "ไม่อนุมัติ";
      case "cancelled": return "ยกเลิก";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_approval": return "bg-amber-100 text-amber-800";
      case "approved": return "bg-blue-100 text-blue-800";
      case "pending_confirmation": return "bg-purple-100 text-purple-800";
      case "confirmed": return "bg-emerald-100 text-emerald-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-600";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-lg font-semibold mb-2">ไม่พบข้อมูล</h2>
            <p className="text-sm text-gray-500">ลิงก์อาจไม่ถูกต้อง หรือคำขอถูกลบแล้ว</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Truck className="w-6 h-6" />
            รายละเอียดการส่งตรง
          </h1>
          <p className="text-gray-500 mt-1">Direct Shipping - {shipment.document_no}</p>
        </div>

        {/* Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">สถานะปัจจุบัน</span>
              <Badge className={getStatusColor(shipment.status)}>{getStatusText(shipment.status)}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Shipment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />ข้อมูลคำขอ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">เลขที่:</span> <span className="font-mono font-medium">{shipment.document_no}</span></div>
              <div><span className="text-gray-500">วันที่ขอ:</span> {format(new Date(shipment.created_at), "dd/MM/yyyy", { locale: th })}</div>
              <div><span className="text-gray-500">ผู้ขอ:</span> {shipment.requester_name || "-"}</div>
              <div><span className="text-gray-500">ฝ่าย:</span> {shipment.department || "-"}</div>
              {shipment.companies?.name && <div><span className="text-gray-500">บริษัท:</span> {shipment.companies.name}</div>}
              {shipment.purpose && <div className="col-span-2"><span className="text-gray-500">วัตถุประสงค์:</span> {shipment.purpose}</div>}
              {shipment.expected_arrival_date && (
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" /><span className="text-gray-500">ต้องการก่อน:</span> {format(new Date(shipment.expected_arrival_date), "dd/MM/yyyy")}</div>
              )}
            </div>
            {shipment.requested_items_description && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-gray-500 mb-1 font-medium">สินค้าที่ต้องการ:</p>
                <p className="whitespace-pre-wrap">{shipment.requested_items_description}</p>
              </div>
            )}
            {shipment.notes && <div><span className="text-gray-500">หมายเหตุ:</span> {shipment.notes}</div>}
          </CardContent>
        </Card>

        {/* Destination */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" />สถานที่ปลายทาง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{shipment.destination_description || "-"}</p>
            {shipment.receiver_name && (
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span>ผู้รับ: {shipment.receiver_name}</span></div>
            )}
            {shipment.receiver_phone && (
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>เบอร์ผู้รับ: {shipment.receiver_phone}</span></div>
            )}
            {shipment.destination_lat && shipment.destination_lng && (
              <DestinationMapPreview lat={shipment.destination_lat} lng={shipment.destination_lng} />
            )}
          </CardContent>
        </Card>

        {/* Supplier info */}
        {shipment.supplier_name && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />ข้อมูลจัดซื้อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-gray-500">Supplier:</span> {shipment.supplier_name}</div>
              {shipment.po_number && <div><span className="text-gray-500">เลขที่ PO:</span> {shipment.po_number}</div>}
              {shipment.pr_number && <div><span className="text-gray-500">เลขที่ PR:</span> {shipment.pr_number}</div>}
              {shipment.shipping_date && <div><span className="text-gray-500">วันที่ส่ง:</span> {format(new Date(shipment.shipping_date), "dd/MM/yyyy")}</div>}
              {shipment.delivery_person_name && <div><span className="text-gray-500">ผู้ขนส่ง:</span> {shipment.delivery_person_name}</div>}
            </CardContent>
          </Card>
        )}

        {/* Items */}
        {shipment.direct_shipment_items?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />รายการสินค้า</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead>S/N</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipment.direct_shipment_items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
                      <TableCell>{item.equipment_name}</TableCell>
                      <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-sm text-gray-500">{item.serial_number || "-"}{item.serial_number_2 && ` / ${item.serial_number_2}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">ระบบจัดการคลังพัสดุ — สร้างลิงก์โดยอัตโนมัติ</p>
      </div>
    </div>
  );
}

export default function DirectShippingPublicView() {
  return (
    <QueryClientProvider client={queryClient}>
      <DirectShippingPublicContent />
    </QueryClientProvider>
  );
}
