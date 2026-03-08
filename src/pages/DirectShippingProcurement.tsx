import { useState } from "react";
import { DateRange } from "react-day-picker";
import { DSTimeline } from "@/components/direct-shipping/DSTimeline";
import { DestinationMapPreview } from "@/components/direct-shipping/DestinationMapPreview";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShoppingCart, Search, Loader2, Eye, Plus, Package, X, Send, Monitor, Clock, CheckCircle2, Ban, AlertTriangle, Truck, MapPin, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { logStockMovement } from "@/lib/stockMovement";

interface CartItem {
  id: string;
  equipment_id: string | null;
  media_player_id: string | null;
  is_media_player: boolean;
  equipment_code: string;
  equipment_name: string;
  quantity: number;
  unit: string;
  serial_number: string;
  serial_number_2: string;
  lot_number: string;
  unit_price: number | null;
  notes: string;
}

export default function DirectShippingProcurement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [processDialog, setProcessDialog] = useState<any>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);

  // Process form state
  const [supplierId, setSupplierId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [shippingDate, setShippingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [processNotes, setProcessNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [isMediaPlayerItem, setIsMediaPlayerItem] = useState(false);
  const [itemEquipmentId, setItemEquipmentId] = useState("");
  const [itemMediaPlayerId, setItemMediaPlayerId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemSerialNumber, setItemSerialNumber] = useState("");
  const [itemSerialNumber2, setItemSerialNumber2] = useState("");
  const [itemLotNumber, setItemLotNumber] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  // Cancel
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Fetch data
  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment-for-ds-proc"],
    queryFn: async () => {
      const { data } = await supabase.from("equipment").select("id, code, name, unit, quantity_in_stock").eq("is_active", true).order("code");
      return data || [];
    },
  });

  const { data: mediaPlayers = [] } = useQuery({
    queryKey: ["media-players-for-ds-proc"],
    queryFn: async () => {
      const { data } = await supabase.from("media_players").select("id, code, name, unit, serial_number_1, serial_number_2").eq("is_active", true).order("code");
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-for-ds-proc"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, code, name").eq("is_active", true).order("code");
      return data || [];
    },
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["ds-procurement-requests", statusFilter],
    queryFn: async () => {
      let query = supabase.from("direct_shipments").select("*, companies(name), suppliers(name), direct_shipment_items(id, equipment_code, equipment_name, quantity, unit, serial_number, serial_number_2, is_media_player, unit_price)").order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = requests.filter((r: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!(r.document_no?.toLowerCase().includes(term) || r.requester_name?.toLowerCase().includes(term) || r.destination_description?.toLowerCase().includes(term) || r.supplier_name?.toLowerCase().includes(term))) return false;
    }
    if (dateRange?.from) {
      const d = new Date(r.created_at);
      if (d < dateRange.from) return false;
      if (dateRange.to && d > new Date(dateRange.to.getTime() + 86400000)) return false;
    }
    return true;
  });

  const { currentPage, totalPages, paginatedData, handlePageChange, totalItems, pageSize, handlePageSizeChange } = useTablePagination(filtered);

  const selectedSupplier = suppliers.find((s: any) => s.id === supplierId);

  const resetItemForm = () => {
    setItemEquipmentId(""); setItemMediaPlayerId(""); setItemQuantity("1");
    setItemSerialNumber(""); setItemSerialNumber2(""); setItemLotNumber("");
    setItemUnitPrice(""); setItemNotes(""); setIsMediaPlayerItem(false); setShowItemForm(false);
  };

  const addToCart = () => {
    if (isMediaPlayerItem) {
      if (!itemMediaPlayerId) { toast.error("กรุณาเลือก Media Player"); return; }
      const mp: any = mediaPlayers.find((m: any) => m.id === itemMediaPlayerId);
      if (!mp) return;
      setCart(prev => [...prev, {
        id: crypto.randomUUID(), equipment_id: null, media_player_id: mp.id, is_media_player: true,
        equipment_code: mp.code, equipment_name: mp.name, quantity: parseInt(itemQuantity) || 1, unit: mp.unit,
        serial_number: itemSerialNumber || mp.serial_number_1 || "", serial_number_2: itemSerialNumber2 || mp.serial_number_2 || "",
        lot_number: itemLotNumber, unit_price: itemUnitPrice ? parseFloat(itemUnitPrice) : null, notes: itemNotes,
      }]);
    } else {
      if (!itemEquipmentId) { toast.error("กรุณาเลือกสินค้า"); return; }
      const eq: any = equipment.find((e: any) => e.id === itemEquipmentId);
      if (!eq) return;
      setCart(prev => [...prev, {
        id: crypto.randomUUID(), equipment_id: eq.id, media_player_id: null, is_media_player: false,
        equipment_code: eq.code, equipment_name: eq.name, quantity: parseInt(itemQuantity) || 1, unit: eq.unit,
        serial_number: itemSerialNumber, serial_number_2: "", lot_number: itemLotNumber,
        unit_price: itemUnitPrice ? parseFloat(itemUnitPrice) : null, notes: itemNotes,
      }]);
    }
    resetItemForm();
    toast.success("เพิ่มรายการแล้ว");
  };

  const handleProcess = async () => {
    if (!processDialog || !user) return;
    if (cart.length === 0) { toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }

    setIsSubmitting(true);
    try {
      // Update header with procurement info
      const { error: headerError } = await supabase.from("direct_shipments").update({
        supplier_id: supplierId || null,
        supplier_name: selectedSupplier?.name || "",
        po_number: poNumber || null,
        shipping_date: shippingDate || null,
        delivery_person_name: deliveryPersonName || null,
        notes: processDialog.notes ? `${processDialog.notes}\n[จัดซื้อ] ${processNotes}` : processNotes || null,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        status: "pending_confirmation",
      } as any).eq("id", processDialog.id);

      if (headerError) throw headerError;

      // Insert items
      const items = cart.map(item => ({
        direct_shipment_id: processDialog.id,
        equipment_id: item.equipment_id, media_player_id: item.media_player_id, is_media_player: item.is_media_player,
        equipment_code: item.equipment_code, equipment_name: item.equipment_name,
        quantity: item.quantity, unit: item.unit,
        serial_number: item.serial_number || null, serial_number_2: item.serial_number_2 || null,
        lot_number: item.lot_number || null, unit_price: item.unit_price || 0, notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase.from("direct_shipment_items").insert(items);
      if (itemsError) throw itemsError;

      // Log virtual stock movements
      for (const item of cart) {
        if (item.equipment_id) {
          const { data: eqData } = await supabase.from("equipment").select("quantity_in_stock").eq("id", item.equipment_id).single();
          const currentStock = eqData?.quantity_in_stock || 0;
          const dest = processDialog.destination_description || processDialog.department;

          await logStockMovement({
            equipment_id: item.equipment_id, equipment_code: item.equipment_code, equipment_name: item.equipment_name,
            movement_type: "receive", quantity: item.quantity,
            stock_before: currentStock, stock_after: currentStock + item.quantity,
            reference_type: "direct_shipment", reference_id: processDialog.id, reference_document: processDialog.document_no,
            notes: `[Direct Shipping] รับเข้าเสมือน - ${dest}`,
          });
          await logStockMovement({
            equipment_id: item.equipment_id, equipment_code: item.equipment_code, equipment_name: item.equipment_name,
            movement_type: "issue", quantity: item.quantity,
            stock_before: currentStock + item.quantity, stock_after: currentStock,
            reference_type: "direct_shipment", reference_id: processDialog.id, reference_document: processDialog.document_no,
            notes: `[Direct Shipping] จ่ายออกเสมือน - ส่งตรงถึง ${dest}`,
          });
        }
      }

      // Create notification for requester
      await supabase.from("notifications").insert({
        title: `สินค้าส่งตรงแล้ว - ${processDialog.document_no}`,
        message: `คำขอ ${processDialog.document_no} ถูกส่งแล้ว จาก ${selectedSupplier?.name || "Supplier"} ไปยัง ${processDialog.destination_description} — กรุณายืนยันการรับสินค้า`,
        type: "info",
        category: "stock",
        department: processDialog.department,
        reference_id: processDialog.id,
        reference_type: "direct_shipment",
        user_id: processDialog.created_by,
      });

      toast.success(`ดำเนินการส่งตรงสำเร็จ: ${processDialog.document_no}`);
      queryClient.invalidateQueries({ queryKey: ["ds-procurement-requests"] });
      setProcessDialog(null);
      setCart([]); setSupplierId(""); setPoNumber(""); setShippingDate(format(new Date(), "yyyy-MM-dd"));
      setDeliveryPersonName(""); setProcessNotes("");
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId || !user) return;
    try {
      const { error } = await supabase.from("direct_shipments").update({
        status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: user.id, cancel_reason: cancelReason || null,
      }).eq("id", cancelId);
      if (error) throw error;
      toast.success("ยกเลิกคำขอเรียบร้อยแล้ว");
      queryClient.invalidateQueries({ queryKey: ["ds-procurement-requests"] });
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setCancelId(null); setCancelReason("");
    }
  };

  const copyShipmentInfo = (r: any) => {
    const mapsLink = r.destination_lat && r.destination_lng
      ? `https://www.google.com/maps?q=${r.destination_lat},${r.destination_lng}`
      : null;
    const publicLink = `${window.location.origin}/ds-view/${r.id}`;

    let text = `📦 คำขอส่งตรง: ${r.document_no}\n`;
    text += `━━━━━━━━━━━━━━━━\n`;
    text += `👤 ผู้ขอ: ${r.requester_name || "-"}\n`;
    text += `📱 เบอร์ผู้ขอ: ${r.requester_phone || "-"}\n`;
    text += `🏢 ฝ่าย: ${r.department || "-"}\n`;
    if (r.purpose) text += `📝 วัตถุประสงค์: ${r.purpose}\n`;
    text += `\n📋 สินค้าที่ต้องการ:\n${r.requested_items_description || "-"}\n`;
    text += `\n📍 ปลายทาง: ${r.destination_description || "-"}\n`;
    if (r.receiver_name) text += `👤 ผู้รับ: ${r.receiver_name}\n`;
    if (r.receiver_phone) text += `📱 เบอร์ผู้รับ: ${r.receiver_phone}\n`;
    if (mapsLink) text += `🗺️ แผนที่: ${mapsLink}\n`;
    if (r.expected_arrival_date) text += `📅 ต้องการก่อน: ${format(new Date(r.expected_arrival_date), "dd/MM/yyyy")}\n`;
    if (r.notes) text += `💬 หมายเหตุ: ${r.notes}\n`;
    text += `\n🔗 ดูรายละเอียดเพิ่มเติม: ${publicLink}`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success("คัดลอกข้อมูลแล้ว พร้อมส่งผ่าน LINE/Chat");
    }).catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };

  const copyShareLink = (r: any) => {
    const publicLink = `${window.location.origin}/ds-view/${r.id}`;
    navigator.clipboard.writeText(publicLink).then(() => {
      toast.success("คัดลอกลิงก์แล้ว");
    }).catch(() => toast.error("ไม่สามารถคัดลอกได้"));
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-blue-100 text-blue-800"><CheckCircle2 className="w-3 h-3 mr-1" />อนุมัติ-รอดำเนินการ</Badge>;
      case "pending_confirmation": return <Badge className="bg-purple-100 text-purple-800"><Truck className="w-3 h-3 mr-1" />ส่งแล้ว-รอยืนยัน</Badge>;
      case "confirmed": return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />ยืนยันรับแล้ว</Badge>;
      case "issue_reported": return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />มีปัญหา</Badge>;
      case "cancelled": return <Badge variant="outline" className="text-muted-foreground"><Ban className="w-3 h-3 mr-1" />ยกเลิก</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-7 h-7 text-primary" />
          จัดซื้อ - ดำเนินการส่งตรง
        </h1>
        <p className="text-muted-foreground mt-1">ดำเนินการจัดซื้อและบันทึกการส่งตรงสำหรับคำขอที่อนุมัติแล้ว</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">รายการคำขอส่งตรง</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="approved">รอดำเนินการ</option>
              <option value="pending_confirmation">ส่งแล้ว-รอยืนยัน</option>
              <option value="confirmed">ยืนยันรับแล้ว</option>
              <option value="issue_reported">มีปัญหา</option>
              <option value="cancelled">ยกเลิก</option>
              <option value="all">ทั้งหมด</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>วันที่ขอ</TableHead>
                    <TableHead>ผู้ขอ / ฝ่าย</TableHead>
                    <TableHead>สินค้าที่ต้องการ</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead>Supplier / PO</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">ไม่พบรายการ</TableCell></TableRow>
                  ) : (
                    paginatedData.map((r: any) => (
                      <TableRow key={r.id} className={r.status === "cancelled" ? "opacity-60" : ""}>
                        <TableCell className="font-mono text-sm font-medium">{r.document_no}</TableCell>
                        <TableCell>{format(new Date(r.created_at), "dd/MM/yyyy", { locale: th })}</TableCell>
                        <TableCell>
                          <div>{r.requester_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{r.department}</div>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">{r.requested_items_description || "-"}</TableCell>
                        <TableCell className="max-w-[130px] truncate">{r.destination_description || "-"}</TableCell>
                        <TableCell>
                          {r.supplier_name ? <div className="text-sm">{r.supplier_name}{r.po_number && <span className="text-xs text-muted-foreground ml-1">({r.po_number})</span>}</div> : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewDetail(r)} title="ดูรายละเอียด"><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => copyShipmentInfo(r)} title="คัดลอกข้อมูลส่ง LINE"><Copy className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => copyShareLink(r)} title="คัดลอกลิงก์แชร์"><Share2 className="w-4 h-4" /></Button>
                            {r.status === "approved" && (
                              <>
                                <Button size="sm" onClick={() => { setProcessDialog(r); setCart([]); setSupplierId(""); setPoNumber(""); setProcessNotes(""); }}>
                                  <ShoppingCart className="w-3 h-3 mr-1" />ดำเนินการ
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { setCancelId(r.id); setCancelReason(""); }}>
                                  <Ban className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={!!processDialog} onOpenChange={() => setProcessDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ดำเนินการส่งตรง - {processDialog?.document_no}</DialogTitle>
          </DialogHeader>
          {processDialog && (
            <div className="space-y-6">
              {/* Request info summary */}
               <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">ผู้ขอ:</span> <span className="font-medium">{processDialog.requester_name}</span></div>
                    <div><span className="text-muted-foreground">เบอร์ผู้ขอ:</span> {processDialog.requester_phone || "-"}</div>
                    <div><span className="text-muted-foreground">ฝ่าย:</span> {processDialog.department}</div>
                    <div><span className="text-muted-foreground">บริษัท:</span> {processDialog.companies?.name || "-"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">ปลายทาง:</span> {processDialog.destination_description}</div>
                    {processDialog.receiver_name && (
                      <div><span className="text-muted-foreground">ผู้รับ:</span> {processDialog.receiver_name}</div>
                    )}
                    {processDialog.receiver_phone && (
                      <div><span className="text-muted-foreground">เบอร์ผู้รับ:</span> {processDialog.receiver_phone}</div>
                    )}
                    {processDialog.expected_arrival_date && (
                      <div><span className="text-muted-foreground">ต้องการก่อน:</span> {format(new Date(processDialog.expected_arrival_date), "dd/MM/yyyy")}</div>
                    )}
                    {processDialog.purpose && (
                      <div className="col-span-2"><span className="text-muted-foreground">วัตถุประสงค์:</span> {processDialog.purpose}</div>
                    )}
                    {processDialog.pr_number && (
                      <div><span className="text-muted-foreground">เลขที่ PR:</span> {processDialog.pr_number}</div>
                    )}
                    {processDialog.po_number && (
                      <div><span className="text-muted-foreground">เลขที่ PO:</span> {processDialog.po_number}</div>
                    )}
                    <div className="col-span-2 p-2 bg-background rounded border"><span className="text-muted-foreground">สินค้าที่ขอ:</span> {processDialog.requested_items_description}</div>
                  </div>
                  {/* PR/PO Documents */}
                  {(processDialog.pr_document_url || processDialog.po_document_url) && (
                    <div className="flex gap-3">
                      {processDialog.pr_document_url && (
                        <a href={processDialog.pr_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">📄 เอกสาร PR</a>
                      )}
                      {processDialog.po_document_url && (
                        <a href={processDialog.po_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">📄 เอกสาร PO</a>
                      )}
                    </div>
                  )}
                  {/* Map Preview */}
                  {processDialog.destination_lat && processDialog.destination_lng && (
                    <DestinationMapPreview lat={processDialog.destination_lat} lng={processDialog.destination_lng} />
                  )}
                </CardContent>
              </Card>

              {/* Procurement info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <SearchableSelect
                    options={suppliers.map((s: any) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
                    value={supplierId} onValueChange={setSupplierId}
                    placeholder="เลือก Supplier..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>เลขที่ PO</Label>
                  <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO Number" />
                </div>
                <div className="space-y-2">
                  <Label>วันที่ส่ง</Label>
                  <Input type="date" value={shippingDate} onChange={e => setShippingDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ผู้ขนส่ง</Label>
                  <Input value={deliveryPersonName} onChange={e => setDeliveryPersonName(e.target.value)} placeholder="ชื่อผู้ขนส่ง" />
                </div>
              </div>

              {/* Cart */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" />รายการสินค้าจริง ({cart.length} รายการ)</h3>
                  <Button size="sm" onClick={() => setShowItemForm(true)}><Plus className="w-4 h-4 mr-1" />เพิ่มรายการ</Button>
                </div>
                {cart.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ประเภท</TableHead><TableHead>รหัส</TableHead><TableHead>ชื่อ</TableHead>
                        <TableHead className="text-center">จำนวน</TableHead><TableHead>S/N</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.is_media_player ? <Badge variant="outline" className="gap-1"><Monitor className="w-3 h-3" />MP</Badge> : <Badge variant="outline">อุปกรณ์</Badge>}</TableCell>
                          <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
                          <TableCell>{item.equipment_name}</TableCell>
                          <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.serial_number || "-"}{item.serial_number_2 && ` / ${item.serial_number_2}`}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))}><X className="w-4 h-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>ยังไม่มีรายการ</p></div>
                )}
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุจัดซื้อ</Label>
                <Textarea value={processNotes} onChange={e => setProcessNotes(e.target.value)} placeholder="หมายเหตุ..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog(null)}>ยกเลิก</Button>
            <Button onClick={handleProcess} disabled={isSubmitting || cart.length === 0}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              บันทึกและส่งสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>เพิ่มรายการสินค้า</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Switch checked={isMediaPlayerItem} onCheckedChange={v => { setIsMediaPlayerItem(v); setItemEquipmentId(""); setItemMediaPlayerId(""); setItemSerialNumber(""); setItemSerialNumber2(""); }} />
              <Label className="flex items-center gap-2"><Monitor className="w-4 h-4" />เป็น Media Player</Label>
            </div>
            {isMediaPlayerItem ? (
              <div className="space-y-2">
                <Label>Media Player *</Label>
                <SearchableSelect
                  options={mediaPlayers.map((mp: any) => ({ value: mp.id, label: `${mp.code} - ${mp.name}` }))}
                  value={itemMediaPlayerId} onValueChange={v => {
                    setItemMediaPlayerId(v);
                    const mp: any = mediaPlayers.find((m: any) => m.id === v);
                    if (mp) { setItemSerialNumber(mp.serial_number_1 || ""); setItemSerialNumber2(mp.serial_number_2 || ""); }
                  }}
                  placeholder="เลือก Media Player..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>สินค้า *</Label>
                <SearchableSelect
                  options={equipment.map((eq: any) => ({ value: eq.id, label: `${eq.code} - ${eq.name}` }))}
                  value={itemEquipmentId} onValueChange={setItemEquipmentId}
                  placeholder="เลือกสินค้า..."
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>จำนวน *</Label><Input type="number" min="1" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)} /></div>
              <div className="space-y-2"><Label>{isMediaPlayerItem ? "S/N 1" : "Serial Number"}</Label><Input value={itemSerialNumber} onChange={e => setItemSerialNumber(e.target.value)} /></div>
            </div>
            {isMediaPlayerItem && (
              <div className="space-y-2"><Label>S/N 2</Label><Input value={itemSerialNumber2} onChange={e => setItemSerialNumber2(e.target.value)} /></div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Lot Number</Label><Input value={itemLotNumber} onChange={e => setItemLotNumber(e.target.value)} /></div>
              <div className="space-y-2"><Label>ราคาต่อชิ้น (฿)</Label><Input type="number" step="0.01" value={itemUnitPrice} onChange={e => setItemUnitPrice(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)}>ยกเลิก</Button>
            <Button onClick={addToCart}>เพิ่มรายการ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียด - {viewDetail?.document_no}</DialogTitle></DialogHeader>
          {viewDetail && (
            <div className="space-y-4 text-sm">
              <DSTimeline shipment={viewDetail} />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">ผู้ขอ:</span> {viewDetail.requester_name || "-"}</div>
                <div><span className="text-muted-foreground">เบอร์ผู้ขอ:</span> {viewDetail.requester_phone || "-"}</div>
                <div><span className="text-muted-foreground">ฝ่าย:</span> {viewDetail.department}</div>
                <div><span className="text-muted-foreground">บริษัท:</span> {viewDetail.companies?.name || "-"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">ปลายทาง:</span> {viewDetail.destination_description}</div>
                {viewDetail.receiver_name && (
                  <div><span className="text-muted-foreground">ผู้รับ:</span> {viewDetail.receiver_name}</div>
                )}
                {viewDetail.receiver_phone && (
                  <div><span className="text-muted-foreground">เบอร์ผู้รับ:</span> {viewDetail.receiver_phone}</div>
                )}
                {viewDetail.expected_arrival_date && (
                  <div><span className="text-muted-foreground">ต้องการก่อน:</span> {format(new Date(viewDetail.expected_arrival_date), "dd/MM/yyyy")}</div>
                )}
                {viewDetail.purpose && <div className="col-span-2"><span className="text-muted-foreground">วัตถุประสงค์:</span> {viewDetail.purpose}</div>}
                <div className="col-span-2"><span className="text-muted-foreground">สินค้าที่ขอ:</span> {viewDetail.requested_items_description}</div>
                {viewDetail.pr_number && <div><span className="text-muted-foreground">เลขที่ PR:</span> {viewDetail.pr_number}</div>}
                {viewDetail.po_number && <div><span className="text-muted-foreground">เลขที่ PO:</span> {viewDetail.po_number}</div>}
                {viewDetail.supplier_name && <div><span className="text-muted-foreground">Supplier:</span> {viewDetail.supplier_name}</div>}
                {viewDetail.shipping_date && <div><span className="text-muted-foreground">วันที่ส่ง:</span> {format(new Date(viewDetail.shipping_date), "dd/MM/yyyy")}</div>}
              </div>
              {/* PR/PO Documents */}
              {(viewDetail.pr_document_url || viewDetail.po_document_url) && (
                <div className="flex gap-3">
                  {viewDetail.pr_document_url && (
                    <a href={viewDetail.pr_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">📄 เอกสาร PR</a>
                  )}
                  {viewDetail.po_document_url && (
                    <a href={viewDetail.po_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">📄 เอกสาร PO</a>
                  )}
                </div>
              )}
              {viewDetail.notes && (
                <div><span className="text-muted-foreground">หมายเหตุ:</span> {viewDetail.notes}</div>
              )}
              {/* Map Preview */}
              {viewDetail.destination_lat && viewDetail.destination_lng && (
                <DestinationMapPreview lat={viewDetail.destination_lat} lng={viewDetail.destination_lng} />
              )}
              {viewDetail.direct_shipment_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">รายการสินค้าจริง</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>รหัส</TableHead><TableHead>ชื่อ</TableHead><TableHead className="text-center">จำนวน</TableHead><TableHead>S/N</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {viewDetail.direct_shipment_items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
                          <TableCell>{item.equipment_name}</TableCell>
                          <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                          <TableCell>{item.serial_number || "-"}{item.serial_number_2 && ` / ${item.serial_number_2}`}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Copy & Share buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => copyShipmentInfo(viewDetail)}>
                  <Copy className="w-4 h-4 mr-1" />คัดลอกข้อมูลส่ง LINE
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => copyShareLink(viewDetail)}>
                  <Share2 className="w-4 h-4 mr-1" />คัดลอกลิงก์แชร์
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยกเลิกคำขอส่งตรง</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">กรุณาระบุเหตุผลในการยกเลิก</p>
            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="เหตุผล..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>ปิด</Button>
            <Button variant="destructive" onClick={handleCancel}>ยืนยันยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
