import { useEffect, useMemo, useState } from "react";
import { isMonitor } from "@/lib/deviceTypes";
import { DeviceTypeBadge } from "@/components/media-player/DeviceTypeBadge";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileCheck2, ListChecks, PlusCircle, RefreshCw, Search, ShieldCheck, ShieldAlert, PackageCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { ClaimResultSelect, type ClaimResultKind } from "@/components/media-player/ClaimResultSelect";
import { SupplierSelect } from "@/components/supplier/SupplierSelect";
import { LocationSelect } from "@/components/location/LocationSelect";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { useNavigate } from "react-router-dom";

interface ClaimRecord {
  id: string;
  document_no: string;
  subject_type: string;
  media_player_id: string | null;
  equipment_id: string | null;
  serial_number: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  manufacturer: string | null;
  warranty_expiry_date: string | null;
  is_under_warranty: boolean;
  warranty_notes: string | null;
  submitted_at: string | null;
  submitter_name: string | null;
  claim_ticket_no: string | null;
  symptom_id: string | null;
  symptom_description: string | null;
  returned_at: string | null;
  receiver_name: string | null;
  claim_result_id: string | null;
  result_notes: string | null;
  cost_amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  return_location_id?: string | null;
  restock_decision?: string | null;
  replacement_serial?: string | null;
  closed_at?: string | null;
}

interface SubjectOption {
  id: string;
  type: "media_player" | "equipment";
  code: string;
  name: string;
  serial: string | null;
  warranty: string | null;
  supplier_id: string | null;
  device_type?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "รอส่งเคลม", variant: "secondary" },
  submitted: { label: "ส่งเคลมแล้ว", variant: "default" },
  returned: { label: "รับกลับแล้ว", variant: "default" },
  closed: { label: "ปิดงาน", variant: "outline" },
  cancelled: { label: "ยกเลิก", variant: "destructive" },
};

export default function ClaimTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasFunctionAccess } = useFunctionPermissions();
  const canView = hasFunctionAccess("claim_view");
  const canCreate = hasFunctionAccess("claim_create");
  const [activeTab, setActiveTab] = useState(canView ? "list" : "new");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Form state
  const [subjectKey, setSubjectKey] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [warrantyDate, setWarrantyDate] = useState("");
  const [claimTicketNo, setClaimTicketNo] = useState("");
  const [symptomId, setSymptomId] = useState("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Return dialog state
  const [returnDialogId, setReturnDialogId] = useState<string | null>(null);
  const [claimResultId, setClaimResultId] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [restockDecision, setRestockDecision] = useState<"refurb" | "defective" | "replacement">("refurb");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [replacementSerial, setReplacementSerial] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("claim_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } else {
      setRecords((data as ClaimRecord[]) || []);
    }
    setLoading(false);
  };

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    const [mpRes, eqRes] = await Promise.all([
      supabase
        .from("media_players")
        .select("id, code, name, serial_number, warranty_expiry_date, supplier_id, device_type")
        .order("code")
        .limit(500),
      supabase
        .from("equipment_serial_numbers")
        .select("id, serial_number, warranty_expiry_date, equipment:equipment_id(id, code, name, supplier_id)")
        .order("serial_number")
        .limit(500),
    ]);

    const items: SubjectOption[] = [];
    (mpRes.data || []).forEach((mp: any) => {
      items.push({
        id: mp.id,
        type: "media_player",
        code: mp.code,
        name: mp.name || "Media Player",
        serial: mp.serial_number,
        warranty: mp.warranty_expiry_date,
        supplier_id: mp.supplier_id,
        device_type: mp.device_type || "MEDIA_PLAYER",
      });
    });
    (eqRes.data || []).forEach((sn: any) => {
      items.push({
        id: sn.id,
        type: "equipment",
        code: sn.equipment?.code || "—",
        name: sn.equipment?.name || "Equipment",
        serial: sn.serial_number,
        warranty: sn.warranty_expiry_date,
        supplier_id: sn.equipment?.supplier_id,
      });
    });
    setSubjects(items);
    setSubjectsLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    fetchSubjects();
  }, []);

  // Apply prefill from navigation state
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill || subjects.length === 0) return;
    const { isMediaPlayer, itemId, serial, symptomDescription: sym } = prefill;
    const subj = subjects.find((s) =>
      isMediaPlayer
        ? s.type === "media_player" && s.id === itemId
        : s.type === "equipment" && (s.serial === serial || (!serial && s.code === itemId))
    );
    if (subj) {
      setSubjectKey(`${subj.type === "media_player" ? "mp" : "eq"}:${subj.id}`);
    }
    if (sym) setSymptomDescription(sym);
    setActiveTab("new");
    toast.info("เติมข้อมูลจากรายการของเสียให้แล้ว — โปรดตรวจสอบและบันทึก");
    window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  const subjectOptions = useMemo(
    () =>
      subjects.map((s) => ({
        value: `${s.type === "media_player" ? "mp" : "eq"}:${s.id}`,
        label: `${s.code} — ${s.name}${s.serial ? ` (S/N: ${s.serial})` : ""}`,
        description: s.type === "media_player" ? (isMonitor(s.device_type) ? "จอภาพ (Monitor)" : "Media Player") : "Equipment",
        searchableText: `${s.code} ${s.name} ${s.serial || ""}`,
      })),
    [subjects]
  );

  // Auto-fill warranty + supplier when subject is selected
  useEffect(() => {
    if (!subjectKey) return;
    const [, id] = subjectKey.split(":");
    const subject = subjects.find((s) => s.id === id);
    if (subject) {
      if (subject.warranty) setWarrantyDate(subject.warranty);
      if (subject.supplier_id) setSupplierId(subject.supplier_id);
    }
  }, [subjectKey, subjects]);

  const isUnderWarranty = useMemo(() => {
    if (!warrantyDate) return null;
    return new Date(warrantyDate) >= new Date();
  }, [warrantyDate]);

  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter((r) => r.status === "pending").length;
    const submitted = records.filter((r) => r.status === "submitted").length;
    const returned = records.filter((r) => r.status === "returned" || r.status === "closed").length;
    return { total, pending, submitted, returned };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.document_no.toLowerCase().includes(q) ||
          (r.serial_number || "").toLowerCase().includes(q) ||
          (r.claim_ticket_no || "").toLowerCase().includes(q) ||
          (r.supplier_name || "").toLowerCase().includes(q) ||
          (r.submitter_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, searchTerm, statusFilter]);

  const resetForm = () => {
    setSubjectKey("");
    setSupplierId("");
    setManufacturer("");
    setWarrantyDate("");
    setClaimTicketNo("");
    setSymptomId("");
    setSymptomDescription("");
    setSubmitterName("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!subjectKey) {
      toast.error("กรุณาเลือกอุปกรณ์/Media Player ที่จะเคลม");
      return;
    }
    if (!symptomId && !symptomDescription.trim()) {
      toast.error("กรุณาระบุอาการเสีย");
      return;
    }
    if (isUnderWarranty === false) {
      const ok = window.confirm("⚠️ อุปกรณ์นี้หมดประกันแล้ว — ต้องการบันทึกการเคลมต่อหรือไม่?");
      if (!ok) return;
    }

    const [prefix, id] = subjectKey.split(":");
    const isMP = prefix === "mp";
    const subject = subjects.find((s) => s.id === id);

    setSubmitting(true);
    const { error } = await supabase.from("claim_records").insert({
      document_no: "",
      subject_type: isMP ? "media_player" : "equipment",
      media_player_id: isMP ? id : null,
      equipment_id: !isMP ? null : null, // serial id is on equipment_serial_numbers; we keep equipment_id null and store serial
      serial_number: subject?.serial || null,
      supplier_id: supplierId || null,
      manufacturer: manufacturer.trim() || null,
      warranty_expiry_date: warrantyDate || null,
      is_under_warranty: isUnderWarranty ?? true,
      symptom_id: symptomId || null,
      symptom_description: symptomDescription.trim() || null,
      claim_ticket_no: claimTicketNo.trim() || null,
      submitter_name: submitterName.trim() || null,
      submitted_by: user?.id ?? null,
      submitted_at: claimTicketNo.trim() ? new Date().toISOString() : null,
      status: claimTicketNo.trim() ? "submitted" : "pending",
      notes: notes.trim() || null,
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("บันทึกการเคลมแล้ว");
    resetForm();
    setActiveTab("list");
    fetchRecords();
  };

  const markSubmitted = async (record: ClaimRecord) => {
    const ticket = window.prompt("ระบุเลขที่ใบส่งเคลม / RMA:", record.claim_ticket_no || "");
    if (ticket === null) return;
    const { error } = await supabase
      .from("claim_records")
      .update({
        status: "submitted",
        claim_ticket_no: ticket || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    toast.success("อัปเดตเป็น 'ส่งเคลมแล้ว'");
    fetchRecords();
  };

  const openReturnDialog = (record: ClaimRecord) => {
    setReturnDialogId(record.id);
    setClaimResultId(record.claim_result_id || "");
    setResultNotes(record.result_notes || "");
    setReceiverName(record.receiver_name || "");
    setCostAmount(record.cost_amount?.toString() || "");
    setRestockDecision((record.restock_decision as any) || "refurb");
    setReturnLocationId(record.return_location_id || "");
    setReplacementSerial(record.replacement_serial || "");
  };

  const handleReturnSubmit = async () => {
    if (!returnDialogId) return;
    const record = records.find((r) => r.id === returnDialogId);
    if (!record) return;
    if (!claimResultId) {
      toast.error("กรุณาเลือกผลการเคลม");
      return;
    }
    if (restockDecision !== "defective" && !returnLocationId) {
      toast.error("กรุณาเลือกคลังที่จะนำเครื่องกลับเข้า");
      return;
    }
    if (restockDecision === "replacement" && !replacementSerial.trim()) {
      toast.error("กรุณาระบุ S/N เครื่องทดแทนที่ vendor ส่งให้");
      return;
    }

    setReturnSubmitting(true);
    try {
      // 1) Update claim record → returned
      const { error: claimErr } = await supabase
        .from("claim_records")
        .update({
          status: "returned",
          claim_result_id: claimResultId,
          result_notes: resultNotes.trim() || null,
          receiver_name: receiverName.trim() || null,
          cost_amount: costAmount ? parseFloat(costAmount) : 0,
          returned_at: new Date().toISOString(),
          returned_by: user?.id ?? null,
          restock_decision: restockDecision,
          return_location_id: restockDecision === "defective" ? null : returnLocationId,
          replacement_serial: restockDecision === "replacement" ? replacementSerial.trim() : null,
        })
        .eq("id", returnDialogId);
      if (claimErr) throw claimErr;

      // 2) Flip media_player based on decision (only if linked to MP)
      if (record.media_player_id) {
        const { data: mpRow } = await supabase
          .from("media_players")
          .select("id, code, name, company_id")
          .eq("id", record.media_player_id)
          .maybeSingle();

        if (restockDecision === "refurb") {
          await supabase
            .from("media_players")
            .update({
              status: "in_stock",
              quantity: 1,
              location_id: returnLocationId,
              billboard_id: null,
              is_refurbished: true,
              refurbished_at: new Date().toISOString(),
            })
            .eq("id", record.media_player_id);
        } else if (restockDecision === "replacement") {
          await supabase
            .from("media_players")
            .update({
              status: "in_stock",
              quantity: 1,
              location_id: returnLocationId,
              billboard_id: null,
              serial_number_1: replacementSerial.trim(),
              is_refurbished: false,
              refurbished_at: null,
            })
            .eq("id", record.media_player_id);
        } else {
          // defective → keep status defective, qty 0
          await supabase
            .from("media_players")
            .update({ status: "defective", quantity: 0 })
            .eq("id", record.media_player_id);
        }

        // 3) Stock movement for refurb/replacement
        if (mpRow && restockDecision !== "defective") {
          await supabase.from("stock_movements").insert({
            equipment_id: record.media_player_id,
            equipment_code: mpRow.code,
            equipment_name: mpRow.name,
            movement_type: "claim_return_in",
            quantity: 1,
            stock_before: 0,
            stock_after: 1,
            reference_type: "claim_record",
            reference_id: record.id,
            reference_document: record.document_no,
            location_id: returnLocationId,
            company_id: mpRow.company_id,
            item_condition: restockDecision === "refurb" ? "refurbished" : "new",
            created_by: user?.id ?? null,
            notes:
              restockDecision === "refurb"
                ? "รับกลับจากเคลม — สถานะ Refurbished พร้อมเบิก"
                : `รับเครื่องทดแทนจาก vendor — S/N ใหม่: ${replacementSerial.trim()}`,
          });
        }
      }

      toast.success("บันทึกการรับกลับและคืนคลังเรียบร้อย");
      if (restockDecision === "defective") {
        toast.info("เครื่องถูกตั้งสถานะ defective — กรุณาเข้าเมนู 'นำของเสียเข้าระบบ' เพื่อจัดการต่อ");
      }
      setReturnDialogId(null);
      fetchRecords();
    } catch (e: any) {
      toast.error("อัปเดตไม่สำเร็จ: " + (e.message || e));
    } finally {
      setReturnSubmitting(false);
    }
  };

  const closeRecord = async (record: ClaimRecord) => {
    const { error } = await supabase
      .from("claim_records")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: user?.id ?? null,
      })
      .eq("id", record.id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    toast.success("ปิดงานเคลมแล้ว");
    fetchRecords();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck2 className="h-8 w-8 text-primary" />
            ติดตามการเคลมทรัพย์สิน
          </h1>
          <p className="text-muted-foreground mt-1">
            จัดการการส่งเคลมอุปกรณ์/Media Player/อะไหล่ พร้อมตรวจสอบสถานะประกันอัตโนมัติ
          </p>
        </div>
        <Button variant="outline" onClick={fetchRecords} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          โหลดใหม่
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รอส่งเคลม</CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ส่งเคลมแล้ว</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.submitted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รับกลับ/ปิดงาน</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.returned}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {canView && (
            <TabsTrigger value="list">
              <ListChecks className="h-4 w-4 mr-2" /> รายการเคลม
            </TabsTrigger>
          )}
          {canCreate && (
            <TabsTrigger value="new">
              <PlusCircle className="h-4 w-4 mr-2" /> สร้างคำเคลมใหม่
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>รายการเคลมทั้งหมด</CardTitle>
                  <CardDescription>ติดตามสถานะการเคลม ตั้งแต่ส่งจนถึงรับกลับ</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <SearchableSelect
                    options={[
                      { value: "all", label: "ทุกสถานะ" },
                      { value: "pending", label: "รอส่งเคลม" },
                      { value: "submitted", label: "ส่งเคลมแล้ว" },
                      { value: "returned", label: "รับกลับแล้ว" },
                      { value: "closed", label: "ปิดงาน" },
                      { value: "cancelled", label: "ยกเลิก" },
                    ]}
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    triggerClassName="w-[160px]"
                  />
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาเลขที่ / S/N / RMA..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[260px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  ยังไม่มีรายการเคลม — กดแท็บ "สร้างคำเคลมใหม่" เพื่อเริ่ม
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecords.map((record) => {
                    const status = STATUS_LABELS[record.status] || { label: record.status, variant: "outline" as const };
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors flex-wrap"
                      >
                        <div className="flex-1 min-w-[250px] space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold">{record.document_no}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {record.is_under_warranty ? (
                              <Badge variant="outline" className="text-success border-success/50">
                                <ShieldCheck className="h-3 w-3 mr-1" /> ในประกัน
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-destructive border-destructive/50">
                                <ShieldAlert className="h-3 w-3 mr-1" /> หมดประกัน
                              </Badge>
                            )}
                            {record.serial_number && <Badge variant="outline">S/N: {record.serial_number}</Badge>}
                            {record.claim_ticket_no && (
                              <Badge variant="secondary">RMA: {record.claim_ticket_no}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {record.symptom_description || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ผู้จัดจำหน่าย: {record.supplier_name || "—"} • ผู้ส่ง: {record.submitter_name || "—"} •{" "}
                            สร้าง: {format(new Date(record.created_at), "dd MMM yyyy", { locale: th })}
                            {record.cost_amount && record.cost_amount > 0 && (
                              <> • ค่าใช้จ่าย: ฿{record.cost_amount.toLocaleString()}</>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {record.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => markSubmitted(record)}>
                              <Send className="h-3.5 w-3.5 mr-1" /> ส่งเคลม
                            </Button>
                          )}
                          {record.status === "submitted" && (
                            <Button size="sm" variant="outline" onClick={() => openReturnDialog(record)}>
                              <PackageCheck className="h-3.5 w-3.5 mr-1" /> รับกลับ
                            </Button>
                          )}
                          {record.status === "returned" && (
                            <Button size="sm" variant="outline" onClick={() => closeRecord(record)}>
                              ปิดงาน
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>สร้างคำเคลมใหม่</CardTitle>
              <CardDescription>
                ระบบจะตรวจสอบประกันอัตโนมัติจากข้อมูลอุปกรณ์ — ทุก dropdown มาจาก Master Data หมวด Media Player
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>อุปกรณ์/Media Player ที่จะเคลม *</Label>
                <SearchableSelect
                  options={subjectOptions}
                  value={subjectKey}
                  onValueChange={setSubjectKey}
                  placeholder="ค้นหาด้วยรหัส, ชื่อ หรือ S/N"
                  isLoading={subjectsLoading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ผู้จัดจำหน่าย</Label>
                  <SupplierSelect value={supplierId} onChange={setSupplierId} />
                </div>
                <div className="space-y-2">
                  <Label>ผู้ผลิต / Brand</Label>
                  <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="เช่น Samsung, LG" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันหมดประกัน</Label>
                  <Input type="date" value={warrantyDate} onChange={(e) => setWarrantyDate(e.target.value)} />
                  {warrantyDate && (
                    <div className="text-xs">
                      {isUnderWarranty ? (
                        <span className="text-success flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> อยู่ในประกัน
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> หมดประกันแล้ว
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>เลขที่ใบส่งเคลม / RMA (ถ้ามี)</Label>
                  <Input
                    value={claimTicketNo}
                    onChange={(e) => setClaimTicketNo(e.target.value)}
                    placeholder="ปล่อยว่างถ้ายังไม่ได้ส่ง"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>อาการเสีย *</Label>
                  <SymptomSelect value={symptomId} onChange={setSymptomId} />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อผู้ส่งเคลม</Label>
                  <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="ชื่อ-สกุล" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>คำอธิบายอาการ</Label>
                <Textarea
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  placeholder="ระบุอาการ, สาเหตุที่สันนิษฐาน"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุเพิ่มเติม</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>
                  ล้างฟอร์ม
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "บันทึกการเคลม"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Return Dialog (inline modal) */}
      {returnDialogId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReturnDialogId(null)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>บันทึกการรับกลับจากการเคลม</CardTitle>
              <CardDescription>ระบุผลเคลม + ปลายทางของเครื่อง (จะ flip สถานะ Media Player ให้อัตโนมัติ)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ผลการเคลม *</Label>
                <ClaimResultSelect value={claimResultId} onChange={setClaimResultId} />
              </div>

              <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                <Label className="font-semibold">ปลายทางหลังรับกลับ *</Label>
                <RadioGroup value={restockDecision} onValueChange={(v) => setRestockDecision(v as any)}>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="refurb" id="rd-refurb" className="mt-1" />
                    <label htmlFor="rd-refurb" className="text-sm cursor-pointer">
                      <div className="font-medium text-success">✅ กลับเข้าคลังพร้อมเบิก (Refurbished)</div>
                      <div className="text-xs text-muted-foreground">vendor ซ่อมเสร็จ ใช้งานได้ปกติ</div>
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="replacement" id="rd-replace" className="mt-1" />
                    <label htmlFor="rd-replace" className="text-sm cursor-pointer">
                      <div className="font-medium text-primary">🔄 เปลี่ยนเครื่องใหม่จาก vendor (Replacement)</div>
                      <div className="text-xs text-muted-foreground">vendor ส่งเครื่องใหม่มาแทน — ต้องกรอก S/N ใหม่</div>
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="defective" id="rd-defect" className="mt-1" />
                    <label htmlFor="rd-defect" className="text-sm cursor-pointer">
                      <div className="font-medium text-destructive">❌ ซ่อมไม่ได้ / เครื่องเสียถาวร</div>
                      <div className="text-xs text-muted-foreground">นำเข้าระบบของเสียเพื่อจำหน่ายต่อ</div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {restockDecision !== "defective" && (
                <div className="space-y-2">
                  <Label>คลังปลายทาง *</Label>
                  <LocationSelect value={returnLocationId} onChange={setReturnLocationId} />
                </div>
              )}

              {restockDecision === "replacement" && (
                <div className="space-y-2">
                  <Label>S/N เครื่องทดแทนจาก vendor *</Label>
                  <Input
                    value={replacementSerial}
                    onChange={(e) => setReplacementSerial(e.target.value)}
                    placeholder="กรอก S/N เครื่องใหม่ที่ vendor ส่งให้"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อผู้รับกลับ</Label>
                  <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ค่าใช้จ่าย (บาท)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>หมายเหตุการรับกลับ</Label>
                <Textarea value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReturnDialogId(null)} disabled={returnSubmitting}>
                  ยกเลิก
                </Button>
                <Button onClick={handleReturnSubmit} disabled={returnSubmitting}>
                  {returnSubmitting ? "กำลังบันทึก..." : "บันทึก + คืนคลัง"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
