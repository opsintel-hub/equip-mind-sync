import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, Plus, Send, Package, Clock, CheckCircle2, X, Eye, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { CompanySelect } from "@/components/company/CompanySelect";
import { SectionSelect } from "@/components/section/SectionSelect";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { logStockMovement } from "@/lib/stockMovement";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Equipment {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity_in_stock: number;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface CartItem {
  id: string;
  equipment_id: string | null;
  equipment_code: string;
  equipment_name: string;
  quantity: number;
  unit: string;
  serial_number: string;
  lot_number: string;
  unit_price: number | null;
  notes: string;
}

export default function DirectShippingEntry() {
  const queryClient = useQueryClient();
  const { allowedDepartments, isAdmin, isSingleDepartment } = useAllowedDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [shippingDate, setShippingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [destinationDescription, setDestinationDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemEquipmentId, setItemEquipmentId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemSerialNumber, setItemSerialNumber] = useState("");
  const [itemLotNumber, setItemLotNumber] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  // View detail dialog
  const [viewDetail, setViewDetail] = useState<any>(null);

  // Search & filter for history
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch equipment
  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment-for-ds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipment")
        .select("id, code, name, unit, quantity_in_stock")
        .eq("is_active", true)
        .order("code");
      return (data || []) as Equipment[];
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-for-ds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code");
      return (data || []) as Supplier[];
    },
  });

  // Fetch direct shipments history
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ["direct-shipments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("direct_shipments")
        .select("*, companies(name), suppliers(name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch items for detail view
  const { data: detailItems = [] } = useQuery({
    queryKey: ["ds-items", viewDetail?.id],
    queryFn: async () => {
      if (!viewDetail?.id) return [];
      const { data } = await supabase
        .from("direct_shipment_items")
        .select("*")
        .eq("direct_shipment_id", viewDetail.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!viewDetail?.id,
  });

  const selectedEquipment = equipment.find((e) => e.id === itemEquipmentId);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Filter shipments by search
  const filteredShipments = shipments.filter((s: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.document_no?.toLowerCase().includes(term) ||
      s.supplier_name?.toLowerCase().includes(term) ||
      s.po_number?.toLowerCase().includes(term) ||
      s.destination_description?.toLowerCase().includes(term)
    );
  });

  const departmentNames = allowedDepartments.map(d => d.name);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedShipments,
    handlePageChange,
    totalItems,
    pageSize,
    handlePageSizeChange,
  } = useTablePagination(filteredShipments);

  const addToCart = () => {
    if (!itemEquipmentId) {
      toast.error("กรุณาเลือกสินค้า");
      return;
    }
    if (!itemQuantity || parseInt(itemQuantity) < 1) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }

    const eq = equipment.find((e) => e.id === itemEquipmentId);
    if (!eq) return;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      equipment_id: eq.id,
      equipment_code: eq.code,
      equipment_name: eq.name,
      quantity: parseInt(itemQuantity),
      unit: eq.unit,
      serial_number: itemSerialNumber,
      lot_number: itemLotNumber,
      unit_price: itemUnitPrice ? parseFloat(itemUnitPrice) : null,
      notes: itemNotes,
    };

    setCart((prev) => [...prev, newItem]);
    resetItemForm();
    toast.success("เพิ่มรายการแล้ว");
  };

  const resetItemForm = () => {
    setItemEquipmentId("");
    setItemQuantity("1");
    setItemSerialNumber("");
    setItemLotNumber("");
    setItemUnitPrice("");
    setItemNotes("");
    setShowItemForm(false);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedDepartment) {
      toast.error("กรุณาเลือกฝ่าย");
      return;
    }
    if (cart.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Create header
      const { data: shipment, error: headerError } = await supabase
        .from("direct_shipments")
        .insert({
          supplier_id: supplierId || null,
          supplier_name: selectedSupplier?.name || "",
          department: selectedDepartment,
          company_id: companyId || null,
          section_id: sectionId || null,
          destination_description: destinationDescription,
          po_number: poNumber,
          shipping_date: shippingDate || null,
          expected_arrival_date: expectedArrivalDate || null,
          delivery_person_name: deliveryPersonName,
          notes,
          created_by: userData?.user?.id,
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create items
      const items = cart.map((item) => ({
        direct_shipment_id: shipment.id,
        equipment_id: item.equipment_id,
        equipment_code: item.equipment_code,
        equipment_name: item.equipment_name,
        quantity: item.quantity,
        unit: item.unit,
        serial_number: item.serial_number || null,
        lot_number: item.lot_number || null,
        unit_price: item.unit_price || 0,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("direct_shipment_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Log stock movements (virtual receive + virtual issue for each item)
      for (const item of cart) {
        if (item.equipment_id) {
          // Fetch current stock
          const { data: eqData } = await supabase
            .from("equipment")
            .select("quantity_in_stock")
            .eq("id", item.equipment_id)
            .single();

          const currentStock = eqData?.quantity_in_stock || 0;

          // Virtual receive
          await logStockMovement({
            equipment_id: item.equipment_id,
            equipment_code: item.equipment_code,
            equipment_name: item.equipment_name,
            movement_type: "receive",
            quantity: item.quantity,
            stock_before: currentStock,
            stock_after: currentStock + item.quantity,
            reference_type: "direct_shipment",
            reference_id: shipment.id,
            reference_document: shipment.document_no,
            notes: `[Direct Shipping] รับเข้าเสมือน - ${destinationDescription || selectedDepartment}`,
          });

          // Virtual issue
          await logStockMovement({
            equipment_id: item.equipment_id,
            equipment_code: item.equipment_code,
            equipment_name: item.equipment_name,
            movement_type: "issue",
            quantity: item.quantity,
            stock_before: currentStock + item.quantity,
            stock_after: currentStock,
            reference_type: "direct_shipment",
            reference_id: shipment.id,
            reference_document: shipment.document_no,
            notes: `[Direct Shipping] จ่ายออกเสมือน - ส่งตรงถึง ${destinationDescription || selectedDepartment}`,
          });
        }
      }

      toast.success(`บันทึก Direct Shipping สำเร็จ: ${shipment.document_no}`);
      queryClient.invalidateQueries({ queryKey: ["direct-shipments"] });

      // Reset form
      setSupplierId("");
      setCompanyId("");
      setSectionId("");
      setPoNumber("");
      setShippingDate(format(new Date(), "yyyy-MM-dd"));
      setExpectedArrivalDate("");
      setDeliveryPersonName("");
      setDestinationDescription("");
      setNotes("");
      setCart([]);
    } catch (error: any) {
      console.error("Error creating direct shipment:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_confirmation":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" />รอยืนยัน</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />ยืนยันแล้ว</Badge>;
      case "issue_reported":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" />มีปัญหา</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-7 h-7 text-primary" />
          Direct Shipping Entry
        </h1>
        <p className="text-muted-foreground mt-1">
          บันทึกการส่งสินค้าจาก Supplier ไปยังปลายทางโดยตรง (ไม่ผ่านคลัง)
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">สร้างรายการ Direct Shipping</CardTitle>
          <CardDescription>Supplier ส่งสินค้าไปยังหน่วยงานปลายทางโดยตรง ระบบจะบันทึก virtual receipt + issue อัตโนมัติ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ฝ่าย *</Label>
              <SearchableSelect
                options={departmentNames.map((d) => ({ value: d, label: d }))}
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                placeholder="เลือกฝ่าย..."
                disabled={isSingleDepartment}
              />
            </div>
            <div className="space-y-2">
              <Label>บริษัท</Label>
              <CompanySelect
                value={companyId}
                onChange={setCompanyId}
                departmentId={undefined}
              />
            </div>
            <div className="space-y-2">
              <Label>แผนก</Label>
              <SectionSelect
                value={sectionId}
                onChange={setSectionId}
                departmentId={undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ผู้จัดจำหน่าย (Supplier)</Label>
              <SearchableSelect
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.code} - ${s.name}`,
                  searchableText: `${s.code} ${s.name}`,
                }))}
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="เลือก Supplier..."
                searchPlaceholder="ค้นหา..."
                emptyMessage="ไม่พบ Supplier"
              />
            </div>
            <div className="space-y-2">
              <Label>เลขที่ PO</Label>
              <Input
                placeholder="PO Number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ผู้ส่งสินค้า</Label>
              <Input
                placeholder="ชื่อผู้ส่ง/ผู้ขนส่ง"
                value={deliveryPersonName}
                onChange={(e) => setDeliveryPersonName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>วันที่ส่ง</Label>
              <Input
                type="date"
                value={shippingDate}
                onChange={(e) => setShippingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>วันที่คาดว่าจะถึง</Label>
              <Input
                type="date"
                value={expectedArrivalDate}
                onChange={(e) => setExpectedArrivalDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>สถานที่ปลายทาง</Label>
              <Input
                placeholder="ระบุที่อยู่/สถานที่ปลายทาง"
                value={destinationDescription}
                onChange={(e) => setDestinationDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea
              placeholder="หมายเหตุเพิ่มเติม..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Cart items */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                รายการสินค้า ({cart.length} รายการ)
              </h3>
              <Button size="sm" onClick={() => setShowItemForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                เพิ่มรายการ
              </Button>
            </div>

            {cart.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead>หน่วย</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">ราคา/ชิ้น</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
                      <TableCell>{item.equipment_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.serial_number || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.lot_number || "-"}</TableCell>
                      <TableCell className="text-right">{item.unit_price ? `฿${item.unit_price.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {cart.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีรายการสินค้า</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting || cart.length === 0} size="lg">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              บันทึก Direct Shipping
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>เพิ่มรายการสินค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>สินค้า *</Label>
              <SearchableSelect
                options={equipment.map((eq) => ({
                  value: eq.id,
                  label: `${eq.code} - ${eq.name}`,
                  searchableText: `${eq.code} ${eq.name}`,
                }))}
                value={itemEquipmentId}
                onValueChange={setItemEquipmentId}
                placeholder="เลือกสินค้า..."
                searchPlaceholder="พิมพ์รหัสหรือชื่อ..."
                emptyMessage="ไม่พบสินค้า"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวน *</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>หน่วย</Label>
                <Input value={selectedEquipment?.unit || "ชิ้น"} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  placeholder="S/N"
                  value={itemSerialNumber}
                  onChange={(e) => setItemSerialNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lot Number</Label>
                <Input
                  placeholder="Lot"
                  value={itemLotNumber}
                  onChange={(e) => setItemLotNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ราคาต่อชิ้น (฿)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={itemUnitPrice}
                onChange={(e) => setItemUnitPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Input
                placeholder="หมายเหตุ..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)}>ยกเลิก</Button>
            <Button onClick={addToCart}>เพิ่มรายการ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ประวัติ Direct Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่เอกสาร, Supplier, PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <SearchableSelect
              options={[
                { value: "all", label: "ทุกสถานะ" },
                { value: "pending_confirmation", label: "รอยืนยัน" },
                { value: "confirmed", label: "ยืนยันแล้ว" },
                { value: "issue_reported", label: "มีปัญหา" },
              ]}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="สถานะ"
            />
          </div>

          {shipmentsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead>วันที่ส่ง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        ยังไม่มีรายการ Direct Shipping
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedShipments.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm font-medium">{s.document_no}</TableCell>
                        <TableCell>{s.supplier_name || s.suppliers?.name || "-"}</TableCell>
                        <TableCell>{s.department || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.destination_description || "-"}</TableCell>
                        <TableCell>{s.shipping_date ? format(new Date(s.shipping_date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell>{getStatusBadge(s.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setViewDetail(s)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>รายละเอียด Direct Shipping</DialogTitle>
          </DialogHeader>
          {viewDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">เลขที่:</span> <span className="font-mono font-medium">{viewDetail.document_no}</span></div>
                <div><span className="text-muted-foreground">สถานะ:</span> {getStatusBadge(viewDetail.status)}</div>
                <div><span className="text-muted-foreground">Supplier:</span> {viewDetail.supplier_name || "-"}</div>
                <div><span className="text-muted-foreground">ฝ่าย:</span> {viewDetail.department || "-"}</div>
                <div><span className="text-muted-foreground">PO:</span> {viewDetail.po_number || "-"}</div>
                <div><span className="text-muted-foreground">ปลายทาง:</span> {viewDetail.destination_description || "-"}</div>
                <div><span className="text-muted-foreground">วันที่ส่ง:</span> {viewDetail.shipping_date ? format(new Date(viewDetail.shipping_date), "dd/MM/yyyy") : "-"}</div>
                <div><span className="text-muted-foreground">คาดว่าจะถึง:</span> {viewDetail.expected_arrival_date ? format(new Date(viewDetail.expected_arrival_date), "dd/MM/yyyy") : "-"}</div>
              </div>
              {viewDetail.notes && (
                <div className="text-sm"><span className="text-muted-foreground">หมายเหตุ:</span> {viewDetail.notes}</div>
              )}

              <div>
                <h4 className="font-semibold mb-2">รายการสินค้า</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead className="text-right">ราคา</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.equipment_code}</TableCell>
                        <TableCell>{item.equipment_name}</TableCell>
                        <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-sm">{item.serial_number || "-"}</TableCell>
                        <TableCell className="text-right">{item.unit_price ? `฿${Number(item.unit_price).toLocaleString()}` : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
