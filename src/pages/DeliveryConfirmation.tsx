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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CheckCircle, AlertTriangle, Camera, Upload, Package, Truck, Eye, X, Store, CalendarClock } from "lucide-react";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

const ISSUE_TYPES = [
  { value: "damaged_in_transit", label: "สินค้าชำรุดระหว่างการจัดส่ง" },
  { value: "incomplete", label: "สินค้าไม่ครบ" },
  { value: "wrong_model", label: "สินค้าผิดรุ่น" },
  { value: "wrong_size", label: "สินค้าผิดขนาด" },
  { value: "wrong_type", label: "สินค้าผิดประเภท" },
  { value: "water_damage", label: "สินค้ามีน้ำเข้า" },
  { value: "impact_damage", label: "สินค้าแตกจากการถูกกระแทก" },
];

const DeliveryConfirmation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [hasIssue, setHasIssue] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewConfirmation, setViewConfirmation] = useState<any>(null);


  // Fetch issued requests with delivery pickup_type
  const { data: deliveryRequests, isLoading } = useQuery({
    queryKey: ["delivery-confirmation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .eq("pickup_type", "delivery")
        .in("status", ["issued", "partial_issued"])
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: existingConfirmations } = useQuery({
    queryKey: ["existing-delivery-confirmations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_confirmations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allItems } = useQuery({
    queryKey: ["delivery-confirmation-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getItemsForRequest = (requestId: string) => {
    return allItems?.filter((item: any) => item.pending_id === requestId) || [];
  };

  const isAlreadyConfirmed = (requestId: string) => {
    return existingConfirmations?.some((c: any) => c.goods_issue_pending_id === requestId);
  };

  const getConfirmation = (requestId: string) => {
    return existingConfirmations?.find((c: any) => c.goods_issue_pending_id === requestId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedRequest?.document_no || 'dc'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from("delivery-confirmations").upload(fileName, file);
      if (error) { toast.error(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`); continue; }
      const { data: urlData } = supabase.storage.from("delivery-confirmations").getPublicUrl(fileName);
      newUrls.push(urlData.publicUrl);
    }
    setUploadedFiles(prev => [...prev, ...newUrls]);
    setUploading(false);
    toast.success(`อัปโหลดสำเร็จ ${newUrls.length} ไฟล์`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmDelivery = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) throw new Error("Missing data");
      const { error } = await supabase.from("delivery_confirmations").insert({
        goods_issue_pending_id: selectedRequest.id,
        document_no: selectedRequest.document_no,
        confirmed_by: user.id,
        status: hasIssue ? "issue_reported" : "confirmed",
        issue_type: hasIssue ? issueType : null,
        issue_description: hasIssue ? issueDescription : null,
        notes: notes || null,
        photo_urls: uploadedFiles.length > 0 ? uploadedFiles : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(hasIssue ? "บันทึกปัญหาการรับสินค้าสำเร็จ" : "ยืนยันรับสินค้าสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["delivery-confirmation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["existing-delivery-confirmations"] });
      resetForm();
    },
    onError: (error) => toast.error("เกิดข้อผิดพลาด: " + error.message),
  });

  const resetForm = () => {
    setConfirmDialogOpen(false);
    setSelectedRequest(null);
    setHasIssue(false);
    setIssueType("");
    setIssueDescription("");
    setNotes("");
    setUploadedFiles([]);
  };

  const getPickupBadge = (type: string) => {
    switch (type) {
      case "wait_onsite": return <Badge variant="destructive" className="gap-1"><Store className="h-3 w-3" />รอรับที่คลัง</Badge>;
      case "scheduled": return <Badge className="bg-blue-100 text-blue-800 gap-1"><CalendarClock className="h-3 w-3" />นัดรับ</Badge>;
      case "delivery": return <Badge className="bg-purple-100 text-purple-800 gap-1"><Truck className="h-3 w-3" />จัดส่ง</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  // Filter logic
  const filteredRequests = deliveryRequests?.filter((req: any) => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!req.document_no?.toLowerCase().includes(term) &&
          !req.equipment_name?.toLowerCase().includes(term) &&
          !req.requester_name?.toLowerCase().includes(term)) return false;
    }
    // Status filter
    if (statusFilter !== "all") {
      const confirmed = isAlreadyConfirmed(req.id);
      const confirmation = getConfirmation(req.id);
      if (statusFilter === "pending" && confirmed) return false;
      if (statusFilter === "confirmed" && (!confirmed || confirmation?.status === "issue_reported")) return false;
      if (statusFilter === "issue_reported" && (!confirmed || confirmation?.status !== "issue_reported")) return false;
    }
    // Department filter
    if (departmentFilter.length > 0 && !departmentFilter.includes(req.requester_department)) return false;
    // Date range
    if (dateRange?.from) {
      const d = new Date(req.created_at);
      if (d < dateRange.from) return false;
      if (dateRange.to && d > dateRange.to) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="h-6 w-6" />
          ยืนยันรับสินค้า
        </h1>
        <p className="text-muted-foreground">ยืนยันการรับสินค้าที่จัดส่ง พร้อมแจ้งปัญหาและแนบหลักฐาน</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />รายการรอยืนยันรับ</CardTitle>
          <CardDescription>แสดงเฉพาะรายการที่เลือก "จัดส่ง" และจ่ายสินค้าแล้ว</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหาเลขที่เอกสาร, ชื่อสินค้า, ชื่อผู้เบิก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="สถานะ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอยืนยัน</SelectItem>
                <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                <SelectItem value="issue_reported">แจ้งปัญหา</SelectItem>
              </SelectContent>
            </Select>
            <DepartmentMultiFilter value={departmentFilter} onChange={setDepartmentFilter} />
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่จ่าย</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>ผู้ขอเบิก / ฝ่าย</TableHead>
                  <TableHead>รูปแบบการรับ</TableHead>
                  <TableHead>ปลายทาง</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : filteredRequests?.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">ไม่พบรายการ</TableCell></TableRow>
                ) : (
                  filteredRequests?.map((req: any) => {
                    const confirmed = isAlreadyConfirmed(req.id);
                    const confirmation = getConfirmation(req.id);
                    const items = getItemsForRequest(req.id);
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.document_no}</TableCell>
                        <TableCell>{req.issued_at ? format(new Date(req.issued_at), "dd/MM/yyyy HH:mm", { locale: th }) : "-"}</TableCell>
                        <TableCell>{req.companies?.name || "-"}</TableCell>
                        <TableCell>
                          <div>{req.requester_name}</div>
                          {req.requester_department && <div className="text-xs text-muted-foreground">{req.requester_department}</div>}
                        </TableCell>
                        <TableCell>{getPickupBadge(req.pickup_type)}</TableCell>
                        <TableCell>{req.destination || "-"}</TableCell>
                        <TableCell>
                          {items.length > 0 ? (
                            <Badge variant="outline">{items.length} รายการ</Badge>
                          ) : (
                            <div className="text-sm">{req.equipment_name || "-"}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {confirmed ? (
                            confirmation?.status === "issue_reported" ? (
                              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />แจ้งปัญหา</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />ยืนยันแล้ว</Badge>
                            )
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">รอยืนยัน</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {confirmed ? (
                            <Button size="sm" variant="outline" onClick={() => { setViewConfirmation(getConfirmation(req.id)); setViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4 mr-1" />ดูรายละเอียด
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => { setSelectedRequest(req); setConfirmDialogOpen(true); }}>
                              <CheckCircle className="h-4 w-4 mr-1" />ยืนยันรับ
                            </Button>
                          )}
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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />ยืนยันรับสินค้า - {selectedRequest?.document_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">ผู้ขอเบิก:</span> <span className="font-medium">{selectedRequest?.requester_name}</span></div>
                  <div><span className="text-muted-foreground">ฝ่าย:</span> <span className="font-medium">{selectedRequest?.requester_department || "-"}</span></div>
                  <div><span className="text-muted-foreground">ปลายทาง:</span> <span className="font-medium">{selectedRequest?.destination || "-"}</span></div>
                  <div><span className="text-muted-foreground">สินค้า:</span> <span className="font-medium">{selectedRequest?.equipment_name || "-"}</span></div>
                </div>
                {selectedRequest && getItemsForRequest(selectedRequest.id).length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="font-medium mb-2">รายการสินค้า:</p>
                    <div className="space-y-1">
                      {getItemsForRequest(selectedRequest.id).map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm bg-background rounded px-2 py-1">
                          <span>{item.equipment_code} - {item.equipment_name}</span>
                          <span className="font-medium">{item.issued_quantity || item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Label className="text-base font-medium">มีปัญหากับสินค้าที่ได้รับหรือไม่?</Label>
              <div className="flex gap-3">
                <Button type="button" variant={!hasIssue ? "default" : "outline"} onClick={() => setHasIssue(false)} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />รับสินค้าครบถ้วน
                </Button>
                <Button type="button" variant={hasIssue ? "destructive" : "outline"} onClick={() => setHasIssue(true)} className="flex-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />แจ้งปัญหา
                </Button>
              </div>
            </div>

            {hasIssue && (
              <div className="space-y-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <div className="space-y-2">
                  <Label>ประเภทปัญหา *</Label>
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger><SelectValue placeholder="เลือกประเภทปัญหา" /></SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียดปัญหา</Label>
                  <Textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="อธิบายรายละเอียดปัญหาที่พบ..." rows={3} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2"><Camera className="h-4 w-4" />แนบหลักฐาน (รูปภาพ/วิดีโอ)</Label>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" id="delivery-file-upload" disabled={uploading} />
                <label htmlFor="delivery-file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูปภาพหรือวิดีโอ"}</p>
                  <p className="text-xs text-muted-foreground mt-1">รองรับ JPG, PNG, MP4, MOV</p>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedFiles.map((url, index) => (
                    <div key={index} className="relative group">
                      {url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                        <video src={url} className="w-full h-24 object-cover rounded-lg" />
                      ) : (
                        <img src={url} alt={`หลักฐาน ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      )}
                      <button onClick={() => removeFile(index)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>หมายเหตุเพิ่มเติม</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>ยกเลิก</Button>
            <Button onClick={() => { if (hasIssue && !issueType) { toast.error("กรุณาเลือกประเภทปัญหา"); return; } confirmDelivery.mutate(); }}
              disabled={confirmDelivery.isPending} variant={hasIssue ? "destructive" : "default"}>
              {confirmDelivery.isPending ? "กำลังบันทึก..." : hasIssue ? "บันทึกปัญหา" : "ยืนยันรับสินค้า"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Confirmation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>รายละเอียดการยืนยัน</DialogTitle></DialogHeader>
          {viewConfirmation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">เลขที่:</span> <span className="font-medium">{viewConfirmation.document_no}</span></div>
                <div><span className="text-muted-foreground">วันที่ยืนยัน:</span> <span className="font-medium">{format(new Date(viewConfirmation.confirmed_at), "dd/MM/yyyy HH:mm", { locale: th })}</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">สถานะ:</span>{" "}
                  {viewConfirmation.status === "issue_reported" ? <Badge variant="destructive">แจ้งปัญหา</Badge> : <Badge className="bg-green-100 text-green-800">ยืนยันแล้ว</Badge>}
                </div>
              </div>
              {viewConfirmation.issue_type && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">ปัญหา: {ISSUE_TYPES.find(t => t.value === viewConfirmation.issue_type)?.label || viewConfirmation.issue_type}</p>
                  {viewConfirmation.issue_description && <p className="text-sm text-muted-foreground">{viewConfirmation.issue_description}</p>}
                </div>
              )}
              {viewConfirmation.notes && (
                <div><p className="text-sm text-muted-foreground">หมายเหตุ:</p><p className="text-sm">{viewConfirmation.notes}</p></div>
              )}
              {viewConfirmation.photo_urls?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">หลักฐาน ({viewConfirmation.photo_urls.length} ไฟล์)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewConfirmation.photo_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                          <video src={url} className="w-full h-32 object-cover rounded-lg" controls />
                        ) : (
                          <img src={url} alt={`หลักฐาน ${i + 1}`} className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryConfirmation;