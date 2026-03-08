import { useState, useEffect } from "react";
import { DSTimeline } from "@/components/direct-shipping/DSTimeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Send, Package, Clock, CheckCircle2, X, Eye, Search, Loader2, Ban, ShieldCheck, ShoppingCart, AlertTriangle, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { CompanySelect } from "@/components/company/CompanySelect";
import { SectionSelect } from "@/components/section/SectionSelect";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export default function DirectShippingEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { allowedDepartments, isSingleDepartment } = useAllowedDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Form state
  const [companyId, setCompanyId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [requestedItemsDescription, setRequestedItemsDescription] = useState("");
  const [destinationDescription, setDestinationDescription] = useState("");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [notes, setNotes] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [prDocUrl, setPrDocUrl] = useState("");
  const [poDocUrl, setPoDocUrl] = useState("");
  const [uploadingPr, setUploadingPr] = useState(false);
  const [uploadingPo, setUploadingPo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View detail
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const departmentNames = allowedDepartments.map(d => d.name);

  // Auto-fill requester name from profile
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setRequesterName(data.full_name || "");
          setRequesterPhone(data.phone || "");
        }
      });
    }
  }, [user]);

  // Auto-select department if single
  useEffect(() => {
    if (isSingleDepartment && allowedDepartments.length === 1) {
      setSelectedDepartment(allowedDepartments[0].name);
    }
  }, [isSingleDepartment, allowedDepartments]);

  // Fetch my requests
  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ["my-ds-requests", user?.id, statusFilter],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("direct_shipments")
        .select("*, companies(name)")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filteredRequests = myRequests.filter((s: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.document_no?.toLowerCase().includes(term) ||
      s.destination_description?.toLowerCase().includes(term) ||
      s.requested_items_description?.toLowerCase().includes(term)
    );
  });

  const {
    currentPage, totalPages, paginatedData,
    handlePageChange, totalItems, pageSize, handlePageSizeChange,
  } = useTablePagination(filteredRequests);

  const handleFileUpload = async (
    file: File,
    type: "pr" | "po",
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `ds-${type}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("delivery-documents")
        .upload(`direct-shipping/${fileName}`, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("delivery-documents")
        .getPublicUrl(data.path);
      setUrl(urlData.publicUrl);
      toast.success(`อัปโหลดไฟล์ ${type.toUpperCase()} สำเร็จ`);
    } catch (err: any) {
      toast.error("อัปโหลดไม่สำเร็จ: " + err.message);
    } finally {
      setUploading(false);
    }
  };


    if (!selectedDepartment) { toast.error("กรุณาเลือกฝ่าย"); return; }
    if (!requesterName) { toast.error("กรุณาระบุชื่อผู้ขอ"); return; }
    if (!requestedItemsDescription) { toast.error("กรุณาระบุรายละเอียดสินค้าที่ต้องการ"); return; }
    if (!destinationDescription) { toast.error("กรุณาระบุสถานที่ปลายทาง"); return; }

    setIsSubmitting(true);
    try {
      const { data: shipment, error } = await supabase
        .from("direct_shipments")
        .insert({
          department: selectedDepartment,
          company_id: companyId || null,
          section_id: sectionId || null,
          requester_name: requesterName,
          requester_phone: requesterPhone || null,
          purpose: purpose || null,
          requested_items_description: requestedItemsDescription,
          destination_description: destinationDescription,
          expected_arrival_date: expectedArrivalDate || null,
          notes: notes || null,
          pr_number: prNumber || null,
          po_number: poNumber || null,
          pr_document_url: prDocUrl || null,
          po_document_url: poDocUrl || null,
          created_by: user?.id,
          status: "pending_approval",
        } as any)
        .select()
        .single();

      if (error) throw error;

      const docNo = (shipment as any).document_no;

      // Create notification for managers
      await supabase.from("notifications").insert({
        title: `คำขอส่งตรงใหม่ - ${docNo}`,
        message: `${requesterName} (${selectedDepartment}) ขอส่งตรง: ${requestedItemsDescription.substring(0, 100)} → ${destinationDescription}`,
        type: "info",
        category: "stock",
        department: selectedDepartment,
        reference_id: (shipment as any).id,
        reference_type: "direct_shipment",
      });

      toast.success(`สร้างคำขอส่งตรงสำเร็จ: ${docNo}`);
      queryClient.invalidateQueries({ queryKey: ["my-ds-requests"] });

      // Reset form
      setPurpose(""); setRequestedItemsDescription("");
      setDestinationDescription(""); setExpectedArrivalDate(""); setNotes("");
      setPrNumber(""); setPoNumber(""); setPrDocUrl(""); setPoDocUrl("");
    } catch (error: any) {
      console.error("Error creating DS request:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />รออนุมัติ</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800"><ShieldCheck className="w-3 h-3 mr-1" />อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />ไม่อนุมัติ</Badge>;
      case "pending_confirmation":
        return <Badge className="bg-purple-100 text-purple-800"><ShoppingCart className="w-3 h-3 mr-1" />ส่งแล้ว-รอยืนยัน</Badge>;
      case "confirmed":
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />ยืนยันรับแล้ว</Badge>;
      case "issue_reported":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />มีปัญหา</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground"><Ban className="w-3 h-3 mr-1" />ยกเลิก</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-7 h-7 text-primary" />
          ขอส่งตรง (Direct Shipping Request)
        </h1>
        <p className="text-muted-foreground mt-1">
          สร้างคำขอให้จัดซื้อสั่งสินค้าจาก Supplier ส่งตรงไปยังปลายทาง (ไม่ผ่านคลัง) — ต้องได้รับอนุมัติก่อนดำเนินการ
        </p>
      </div>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Send className="w-5 h-5" />สร้างคำขอส่งตรง</CardTitle>
          <CardDescription>ระบุสินค้าที่ต้องการและสถานที่ปลายทาง → ส่งไปรออนุมัติ → จัดซื้อดำเนินการ → ผู้รับยืนยัน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requester info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ฝ่าย *</Label>
              <SearchableSelect
                options={departmentNames.map(d => ({ value: d, label: d }))}
                value={selectedDepartment} onValueChange={setSelectedDepartment}
                placeholder="เลือกฝ่าย..." disabled={isSingleDepartment}
              />
            </div>
            <div className="space-y-2">
              <Label>ชื่อผู้ขอ *</Label>
              <Input value={requesterName} onChange={e => setRequesterName(e.target.value)} placeholder="ชื่อ-นามสกุล" />
            </div>
            <div className="space-y-2">
              <Label>เบอร์ติดต่อ</Label>
              <Input value={requesterPhone} onChange={e => setRequesterPhone(e.target.value)} placeholder="เบอร์โทร" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>บริษัท</Label>
              <CompanySelect value={companyId} onChange={setCompanyId} />
            </div>
            <div className="space-y-2">
              <Label>แผนก</Label>
              <SectionSelect value={sectionId} onChange={setSectionId} />
            </div>
          </div>

          {/* What & Where */}
          <div className="space-y-2">
            <Label>รายละเอียดสินค้าที่ต้องการ *</Label>
            <Textarea
              value={requestedItemsDescription}
              onChange={e => setRequestedItemsDescription(e.target.value)}
              placeholder="ระบุชื่อสินค้า จำนวน รุ่น ขนาด หรือรายละเอียดอื่นๆ ที่ต้องการให้จัดซื้อสั่งให้..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>สถานที่ปลายทาง *</Label>
              <Input
                value={destinationDescription}
                onChange={e => setDestinationDescription(e.target.value)}
                placeholder="ระบุที่อยู่/ไซต์งาน/สถานที่ที่ต้องการให้ส่งไป"
              />
            </div>
            <div className="space-y-2">
              <Label>วันที่ต้องการได้รับ</Label>
              <Input type="date" value={expectedArrivalDate} onChange={e => setExpectedArrivalDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>วัตถุประสงค์/เหตุผล</Label>
            <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="เช่น ติดตั้งป้ายใหม่, ซ่อมบำรุง, โปรเจค..." />
          </div>

          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="หมายเหตุเพิ่มเติม..." rows={2} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              ส่งคำขอส่งตรง
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Requests History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">คำขอของฉัน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ค้นหาเลขที่เอกสาร, ปลายทาง..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <SearchableSelect
              options={[
                { value: "all", label: "ทุกสถานะ" },
                { value: "pending_approval", label: "รออนุมัติ" },
                { value: "approved", label: "อนุมัติแล้ว" },
                { value: "rejected", label: "ไม่อนุมัติ" },
                { value: "pending_confirmation", label: "ส่งแล้ว-รอยืนยัน" },
                { value: "confirmed", label: "ยืนยันรับแล้ว" },
                { value: "issue_reported", label: "มีปัญหา" },
                { value: "cancelled", label: "ยกเลิก" },
              ]}
              value={statusFilter} onValueChange={setStatusFilter} placeholder="สถานะ"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>วันที่ขอ</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>สินค้าที่ต้องการ</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">ยังไม่มีคำขอ</TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((s: any) => (
                      <TableRow key={s.id} className={s.status === "cancelled" || s.status === "rejected" ? "opacity-60" : ""}>
                        <TableCell className="font-mono text-sm font-medium">{s.document_no}</TableCell>
                        <TableCell>{format(new Date(s.created_at), "dd/MM/yyyy", { locale: th })}</TableCell>
                        <TableCell>{s.department || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.requested_items_description || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{s.destination_description || "-"}</TableCell>
                        <TableCell>{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => setViewDetail(s)} title="ดูรายละเอียด">
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
                  currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
                  pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>รายละเอียดคำขอส่งตรง</DialogTitle></DialogHeader>
          {viewDetail && (
            <div className="space-y-4 text-sm">
              <DSTimeline shipment={viewDetail} />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">เลขที่:</span> <span className="font-mono font-medium">{viewDetail.document_no}</span></div>
                <div><span className="text-muted-foreground">สถานะ:</span> {getStatusBadge(viewDetail.status)}</div>
                <div><span className="text-muted-foreground">ฝ่าย:</span> {viewDetail.department || "-"}</div>
                <div><span className="text-muted-foreground">บริษัท:</span> {viewDetail.companies?.name || "-"}</div>
                <div><span className="text-muted-foreground">ผู้ขอ:</span> {viewDetail.requester_name || "-"}</div>
                <div><span className="text-muted-foreground">เบอร์:</span> {viewDetail.requester_phone || "-"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">ปลายทาง:</span> {viewDetail.destination_description || "-"}</div>
                {viewDetail.expected_arrival_date && (
                  <div><span className="text-muted-foreground">ต้องการก่อน:</span> {format(new Date(viewDetail.expected_arrival_date), "dd/MM/yyyy")}</div>
                )}
                {viewDetail.purpose && (
                  <div className="col-span-2"><span className="text-muted-foreground">วัตถุประสงค์:</span> {viewDetail.purpose}</div>
                )}
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground mb-1">สินค้าที่ต้องการ:</p>
                <p className="whitespace-pre-wrap">{viewDetail.requested_items_description || "-"}</p>
              </div>
              {viewDetail.notes && (
                <div><span className="text-muted-foreground">หมายเหตุ:</span> {viewDetail.notes}</div>
              )}
              {viewDetail.rejection_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive font-medium">เหตุผลไม่อนุมัติ:</p>
                  <p>{viewDetail.rejection_reason}</p>
                </div>
              )}
              {viewDetail.supplier_name && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-800">
                  <p className="font-medium mb-1">ข้อมูลจัดซื้อ:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Supplier:</span> {viewDetail.supplier_name}</div>
                    <div><span className="text-muted-foreground">PO:</span> {viewDetail.po_number || "-"}</div>
                    <div><span className="text-muted-foreground">วันที่ส่ง:</span> {viewDetail.shipping_date ? format(new Date(viewDetail.shipping_date), "dd/MM/yyyy") : "-"}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
