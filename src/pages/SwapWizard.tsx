import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, ListChecks, PlusCircle, RefreshCw, MapPin, Wrench, Package, User, Camera, ClipboardList, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { SwapWizardDialog } from "@/components/swap/SwapWizardDialog";
import { SwapWarehouseReceive } from "@/components/swap/SwapWarehouseReceive";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EquipmentImageUpload } from "@/components/equipment/EquipmentImageUpload";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { PhotoGalleryDialog } from "@/components/ui/PhotoGalleryDialog";

interface SwapRequest {
  id: string;
  document_no: string;
  billboard_id: string | null;
  symptom_id: string | null;
  symptom_other: string | null;
  description: string | null;
  technician_name: string | null;
  technician_phone: string | null;
  priority: string;
  status: string;
  created_at: string;
  notes: string | null;
  defective_return_id?: string | null;
  reported_asset_type?: string | null;
  reported_item_name?: string | null;
  reported_item_code?: string | null;
  reported_serial_number?: string | null;
  reported_photos?: string[] | null;
  received_by_name?: string | null;
  reported_media_player_id?: string | null;
  reported_equipment_id?: string | null;
  // enriched (display-only)
  _billboard_label?: string;
  _model_name?: string;
  _remote_name?: string;
  _symptom_label?: string;
}

interface InstalledItemOption {
  value: string;
  label: string;
  description?: string;
  searchableText?: string;
  asset_type: "equipment" | "media_player";
  equipment_id?: string | null;
  media_player_id?: string | null;
  serial_number?: string | null;
  item_code?: string;
  item_name?: string;
  remote_name?: string;
  model_name?: string;
  billboard_equipment_id?: string;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "รอดำเนินการ", variant: "secondary" },
  in_progress: { label: "กำลัง Swap", variant: "default" },
  completed: { label: "Swap แล้ว", variant: "default" },
  rejected: { label: "Reject", variant: "destructive" },
  cancelled: { label: "ยกเลิก", variant: "outline" },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "ต่ำ",
  normal: "ปกติ",
  high: "สูง",
  urgent: "ด่วนมาก",
};

export default function SwapWizard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasFunctionAccess } = useFunctionPermissions();
  const canManage = hasFunctionAccess("swap_request_manage");
  const canCreate = hasFunctionAccess("swap_request_create");
  const [activeTab, setActiveTab] = useState(canCreate ? "new" : "list");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | null>(null);

  // Form state for new request
  const [billboardId, setBillboardId] = useState("");
  const [symptomId, setSymptomId] = useState("");
  const [symptomOther, setSymptomOther] = useState("");
  const [description, setDescription] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [technicianPhone, setTechnicianPhone] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  // Reported asset (ของที่ช่างเอามาคืน)
  const [installedItems, setInstalledItems] = useState<InstalledItemOption[]>([]);
  const [installedLoading, setInstalledLoading] = useState(false);
  const [reportedSelectKey, setReportedSelectKey] = useState("");
  const [reportedAssetType, setReportedAssetType] = useState<"equipment" | "media_player">("equipment");
  const [reportedItemName, setReportedItemName] = useState("");
  const [reportedModelName, setReportedModelName] = useState("");
  const [reportedItemCode, setReportedItemCode] = useState("");
  const [reportedSerial, setReportedSerial] = useState("");
  const [reportedPhotos, setReportedPhotos] = useState<string[]>([]);
  const [receivedByName, setReceivedByName] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("swap_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
      setRequests([]);
      setLoading(false);
      return;
    }
    const rows = (data as SwapRequest[]) || [];

    // Enrich with billboard label + media player model/remote_name
    const bbIds = Array.from(new Set(rows.map((r) => r.billboard_id).filter(Boolean) as string[]));
    const mpIds = Array.from(new Set(rows.map((r) => r.reported_media_player_id).filter(Boolean) as string[]));

    const [bbRes, mpRes] = await Promise.all([
      bbIds.length
        ? supabase.from("billboards").select("id, old_code, location_name, equipment_id").in("id", bbIds)
        : Promise.resolve({ data: [] as any[] }),
      mpIds.length
        ? supabase.from("media_players").select("id, remote_name, model_id").in("id", mpIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bbMap = new Map<string, any>((bbRes.data || []).map((b: any) => [b.id, b]));
    const mpMap = new Map<string, any>((mpRes.data || []).map((m: any) => [m.id, m]));

    const modelIds = Array.from(new Set(Array.from(mpMap.values()).map((m: any) => m.model_id).filter(Boolean)));
    let modelMap = new Map<string, string>();
    if (modelIds.length) {
      const { data: models } = await supabase
        .from("media_player_models" as any)
        .select("id, name")
        .in("id", modelIds as string[]);
      modelMap = new Map((models as any[] || []).map((m: any) => [m.id, m.name]));
    }

    // Symptom name lookup
    const symIds = Array.from(new Set(rows.map((r) => r.symptom_id).filter(Boolean) as string[]));
    let symMap = new Map<string, string>();
    if (symIds.length) {
      const { data: syms } = await supabase
        .from("mp_symptoms")
        .select("id, name")
        .in("id", symIds);
      symMap = new Map((syms as any[] || []).map((s: any) => [s.id, s.name]));
    }

    const enriched = rows.map((r) => {
      const bb = r.billboard_id ? bbMap.get(r.billboard_id) : null;
      const mp = r.reported_media_player_id ? mpMap.get(r.reported_media_player_id) : null;
      return {
        ...r,
        _billboard_label: bb ? formatBillboardLabel(bb.old_code, bb.location_name, bb.equipment_id) : undefined,
        _remote_name: mp?.remote_name || undefined,
        _model_name: mp?.model_id ? modelMap.get(mp.model_id) : undefined,
        _symptom_label: r.symptom_id ? symMap.get(r.symptom_id) : undefined,
      };
    });
    setRequests(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // When billboard changes — load installed items so the technician can pick from a real list
  useEffect(() => {
    if (!billboardId) {
      setInstalledItems([]);
      setReportedSelectKey("");
      return;
    }
    (async () => {
      setInstalledLoading(true);
      const [eqRes, mpRes] = await Promise.all([
        supabase
          .from("billboard_equipment")
          .select("id, equipment_id, serial_number, quantity, equipment:equipment_id(id, code, name)")
          .eq("billboard_id", billboardId),
        supabase
          .from("media_players")
          .select("id, code, name, remote_name, model_id, serial_number_1, serial_number_2")
          .eq("billboard_id", billboardId)
          .eq("is_active", true),
      ]);

      // Resolve model names
      const modelIds = Array.from(new Set(((mpRes.data || []) as any[]).map((m) => m.model_id).filter(Boolean)));
      let modelMap = new Map<string, string>();
      if (modelIds.length) {
        const { data: models } = await supabase
          .from("media_player_models" as any)
          .select("id, name")
          .in("id", modelIds as string[]);
        modelMap = new Map(((models as any[]) || []).map((m: any) => [m.id, m.name]));
      }

      const opts: InstalledItemOption[] = [];
      (eqRes.data || []).forEach((b: any) => {
        opts.push({
          value: `be:${b.id}`,
          label: `${b.equipment?.code || "—"} — ${b.equipment?.name || "Equipment"}`,
          description: `S/N: ${b.serial_number || "—"} • จำนวน: ${b.quantity}`,
          searchableText: `${b.equipment?.code || ""} ${b.equipment?.name || ""} ${b.serial_number || ""}`,
          asset_type: "equipment",
          equipment_id: b.equipment_id,
          serial_number: b.serial_number,
          item_code: b.equipment?.code,
          item_name: b.equipment?.name,
          billboard_equipment_id: b.id,
        });
      });
      (mpRes.data || []).forEach((mp: any) => {
        const sn = [mp.serial_number_1, mp.serial_number_2].filter(Boolean).join(" / ");
        const modelName = mp.model_id ? modelMap.get(mp.model_id) || "" : "";
        const displayName = mp.remote_name || mp.name || "Media Player";
        opts.push({
          value: `mp:${mp.id}`,
          label: `${mp.code || "—"} — ${displayName}${modelName ? ` (${modelName})` : ""} [Media Player]`,
          description: `S/N: ${sn || "—"}`,
          searchableText: `${mp.code || ""} ${mp.name || ""} ${mp.remote_name || ""} ${modelName} ${sn} media player`,
          asset_type: "media_player",
          media_player_id: mp.id,
          serial_number: mp.serial_number_1 || null,
          item_code: mp.code,
          item_name: mp.remote_name || mp.name,
          remote_name: mp.remote_name || "",
          model_name: modelName,
        });
      });
      opts.push({
        value: "__manual__",
        label: "+ กรอกรายการเอง (ไม่พบในป้าย)",
        description: "เลือกหากของที่ช่างเอามาไม่ตรงกับรายการบนป้าย",
        searchableText: "manual กรอกเอง",
        asset_type: "equipment",
      });
      setInstalledItems(opts);
      setInstalledLoading(false);
    })();
  }, [billboardId]);

  // When user picks an installed item, autofill name/code/serial
  useEffect(() => {
    if (!reportedSelectKey) return;
    if (reportedSelectKey === "__manual__") {
      setReportedItemName("");
      setReportedModelName("");
      setReportedItemCode("");
      setReportedSerial("");
      return;
    }
    const item = installedItems.find((o) => o.value === reportedSelectKey);
    if (item) {
      setReportedAssetType(item.asset_type);
      setReportedItemName(item.remote_name || item.item_name || "");
      setReportedModelName(item.model_name || "");
      setReportedItemCode(item.item_code || "");
      setReportedSerial(item.serial_number || "");
    }
  }, [reportedSelectKey, installedItems]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const completed = requests.filter((r) => r.status === "completed").length;
    return { total, pending, inProgress, completed };
  }, [requests]);

  // Filter + pagination for the request list
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed" | "rejected">("all");
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRequests = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.document_no?.toLowerCase().includes(q) ||
        r.reported_item_code?.toLowerCase().includes(q) ||
        r.reported_item_name?.toLowerCase().includes(q) ||
        r.reported_serial_number?.toLowerCase().includes(q) ||
        r.technician_name?.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRequests = useMemo(
    () => filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRequests, safePage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchText, pageSize]);


  const resetForm = () => {
    setBillboardId("");
    setSymptomId("");
    setSymptomOther("");
    setDescription("");
    setTechnicianName("");
    setTechnicianPhone("");
    setPriority("normal");
    setReportedSelectKey("");
    setReportedAssetType("equipment");
    setReportedItemName("");
    setReportedModelName("");
    setReportedItemCode("");
    setReportedSerial("");
    setReportedPhotos([]);
    setReceivedByName("");
  };

  const handleSubmit = async () => {
    if (!billboardId) {
      toast.error("กรุณาเลือกป้ายโฆษณา");
      return;
    }
    if (!symptomId && !symptomOther.trim()) {
      toast.error("กรุณาระบุอาการเสีย");
      return;
    }
    if (!reportedItemName.trim() && !reportedItemCode.trim() && !reportedSerial.trim()) {
      toast.error("กรุณาระบุของที่ช่างเอามาคืน (ชื่อ/รหัส/S/N อย่างน้อย 1 อย่าง)");
      return;
    }
    if (!technicianName.trim()) {
      toast.error("กรุณาระบุชื่อช่างผู้แจ้ง");
      return;
    }
    const selected = installedItems.find((o) => o.value === reportedSelectKey);
    setSubmitting(true);
    const { data: inserted, error } = await supabase.from("swap_requests").insert({
      billboard_id: billboardId,
      symptom_id: symptomId || null,
      symptom_other: symptomOther.trim() || null,
      description: description.trim() || null,
      technician_name: technicianName.trim() || null,
      technician_phone: technicianPhone.trim() || null,
      priority,
      status: "in_progress",
      created_by: user?.id ?? null,
      document_no: "",
      reported_asset_type: reportedAssetType,
      reported_equipment_id: selected?.equipment_id || null,
      reported_media_player_id: selected?.media_player_id || null,
      reported_billboard_equipment_id: selected?.billboard_equipment_id || null,
      reported_item_name: reportedItemName.trim() || null,
      reported_item_code: reportedItemCode.trim() || null,
      reported_serial_number: reportedSerial.trim() || null,
      reported_photos: reportedPhotos,
      received_by: user?.id ?? null,
      received_by_name: receivedByName.trim() || null,
      received_at: receivedByName.trim() ? new Date().toISOString() : null,
    } as any).select("id, document_no").single();
    if (error) {
      setSubmitting(false);
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }

    // Auto-uninstall the reported item from billboard immediately
    // so Stock Card timeline reflects "ปลดออกจากป้าย" right after the swap request is created.
    const swapDocNo = inserted?.document_no || "Swap";
    const today = new Date().toISOString().slice(0, 10);
    const reason = `Swap ${swapDocNo}: ${symptomOther.trim() || description.trim() || "นำกลับมาประเมิน"}`;

    if (selected?.asset_type === "equipment" && selected.billboard_equipment_id && selected.equipment_id) {
      const { data: beRow } = await supabase
        .from("billboard_equipment")
        .select("quantity, installation_date")
        .eq("id", selected.billboard_equipment_id)
        .maybeSingle();
      await supabase.from("billboard_equipment_history").insert({
        billboard_id: billboardId,
        equipment_id: selected.equipment_id,
        quantity: (beRow as any)?.quantity || 1,
        installation_date: (beRow as any)?.installation_date || null,
        uninstall_date: today,
        uninstall_reason: reason,
        uninstalled_by: user?.id ?? null,
        return_to_stock: false,
      });
      await supabase.from("billboard_equipment").delete().eq("id", selected.billboard_equipment_id);
      if (selected.serial_number) {
        await supabase
          .from("equipment_serial_numbers")
          .update({ status: "pending_return", billboard_id: null } as any)
          .eq("equipment_id", selected.equipment_id)
          .eq("serial_number", selected.serial_number);
      }
    } else if (selected?.asset_type === "media_player" && selected.media_player_id) {
      // Close any open MP installation history rows for this billboard
      await supabase
        .from("media_player_billboard_history")
        .update({
          uninstall_date: today,
          uninstall_reason: reason,
          uninstalled_by: user?.id ?? null,
          return_to_stock: false,
        } as any)
        .eq("media_player_id", selected.media_player_id)
        .eq("billboard_id", billboardId)
        .is("uninstall_date", null);
      await supabase
        .from("media_players")
        .update({ billboard_id: null, status: "pending_assessment" } as any)
        .eq("id", selected.media_player_id);
    }

    setSubmitting(false);
    toast.success("สร้างคำขอ Swap แล้ว — ปลดเครื่องเก่าออกจากป้ายเรียบร้อย รอคลังจัด Spare");
    resetForm();
    setActiveTab("list");
    fetchRequests();
  };

  const openWizard = (req: SwapRequest) => {
    setSelectedRequest(req);
    setWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
            Swap Wizard — สลับอุปกรณ์/Media Player
          </h1>
          <p className="text-muted-foreground mt-1">
            ระบบสลับ Spare กับเครื่องที่ติดตั้งหน้างาน รองรับทั้งอุปกรณ์ทั่วไปและ Media Player
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          โหลดใหม่
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>คำขอทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รอดำเนินการ</CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>กำลัง Swap</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Swap แล้ว</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {canCreate && (
            <TabsTrigger value="new">
              <PlusCircle className="h-4 w-4 mr-2" /> แจ้ง Swap ใหม่
            </TabsTrigger>
          )}
          {canManage && (
            <TabsTrigger value="list">
              <ListChecks className="h-4 w-4 mr-2" /> รายการคำขอ
            </TabsTrigger>
          )}
        </TabsList>



        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>รายการคำขอ Swap ล่าสุด</CardTitle>
              <CardDescription>คลิก "ดำเนินการ" เพื่อเริ่ม Wizard 3 ขั้น • กรองและค้นหาได้ด้านล่าง</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter bar */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="flex-1">
                  <TabsList className="flex flex-wrap h-auto">
                    <TabsTrigger value="all">ทั้งหมด ({stats.total})</TabsTrigger>
                    <TabsTrigger value="in_progress">กำลัง Swap ({stats.inProgress})</TabsTrigger>
                    <TabsTrigger value="completed">Swap แล้ว ({stats.completed})</TabsTrigger>
                    <TabsTrigger value="rejected">Reject</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="ค้นหา: เลขที่/รหัส/ชื่อ/S/N/ช่าง"
                  className="md:w-72"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {requests.length === 0 ? 'ยังไม่มีคำขอ — กดแท็บ "แจ้ง Swap ใหม่" เพื่อเริ่ม' : "ไม่พบรายการที่ตรงตามตัวกรอง"}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {pagedRequests.map((req) => {
                      const status = STATUS_LABELS[req.status] || { label: req.status, variant: "outline" as const };
                      const itemLine = [req.reported_item_code, req.reported_item_name].filter(Boolean).join(" — ") || "—";
                      return (
                        <div
                          key={req.id}
                          className="flex items-start justify-between gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors flex-wrap"
                        >
                          <div className="flex-1 min-w-[200px] space-y-1.5">
                            {/* Row 1: Doc no + status badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold">{req.document_no}</span>
                              <Badge variant={status.variant}>{status.label}</Badge>
                              {req.priority !== "normal" && (
                                <Badge variant="outline">Priority: {PRIORITY_LABELS[req.priority]}</Badge>
                              )}
                              <Badge variant="outline" className="font-mono text-xs">S/N: {req.reported_serial_number || "—"}</Badge>
                              {(req.reported_photos?.length ?? 0) > 0 && (
                                <PhotoGalleryDialog
                                  photos={req.reported_photos!}
                                  title={`รูปประกอบ ${req.document_no}`}
                                />
                              )}
                            </div>
                            {/* Row 2: Item */}
                            <div className="text-sm">
                              <span className="font-medium text-foreground">อุปกรณ์:</span>{" "}
                              <span className={itemLine === "—" ? "text-muted-foreground" : "font-medium"}>{itemLine}</span>
                            </div>
                            {/* Row 3: Billboard / Model / Remote — always rendered */}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-primary" />
                                <span className="font-medium text-foreground">ป้าย:</span>
                                <span className={req._billboard_label ? "" : "text-muted-foreground"}>{req._billboard_label || "—"}</span>
                              </span>
                              <span>
                                <span className="font-medium text-foreground">โมเดล:</span>{" "}
                                <span className={req._model_name ? "" : "text-muted-foreground"}>{req._model_name || "—"}</span>
                              </span>
                              <span>
                                <span className="font-medium text-foreground">Remote:</span>{" "}
                                <span className={req._remote_name ? "" : "text-muted-foreground"}>{req._remote_name || "—"}</span>
                              </span>
                            </div>
                            {/* Row 4: Symptom / description */}
                            <div className="text-sm">
                              <span className="font-medium text-foreground">อาการ:</span>{" "}
                              <span className={(req._symptom_label || req.symptom_other || req.description) ? "" : "text-muted-foreground"}>
                                {[req._symptom_label, req.symptom_other, req.description].filter(Boolean).join(" — ") || "—"}
                              </span>
                            </div>
                            {/* Row 5: Tech / Receiver / Date */}
                            <div className="text-xs text-muted-foreground">
                              ช่าง: {req.technician_name || "—"}
                              {" • "}รับโดย: {req.received_by_name || "—"}
                              {" • "}{format(new Date(req.created_at), "dd MMM yyyy HH:mm", { locale: th })}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {(req.status === "pending" || req.status === "in_progress") && (
                              <Button size="sm" onClick={() => openWizard(req)}>
                                <ArrowLeftRight className="h-4 w-4 mr-1" /> ดำเนินการ Swap
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>แสดง</span>
                      <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as 10 | 20 | 50)}>
                        <SelectTrigger className="h-8 w-[70px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="tabular-nums">
                        รายการ · {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredRequests.length)} จาก {filteredRequests.length}
                      </span>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          หน้า {safePage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          ถัดไป <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4 space-y-4">
          {/* Section 1: ข้อมูลป้าย */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                1. ข้อมูลป้ายโฆษณา
              </CardTitle>
              <CardDescription>เลือกรหัสป้ายที่ช่างไปดำเนินการ Swap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ป้ายโฆษณา <span className="text-destructive">*</span></Label>
                  <BillboardSelect value={billboardId} onChange={setBillboardId} />
                </div>
                <div className="space-y-2">
                  <Label>ระดับความสำคัญ</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">ต่ำ</option>
                    <option value="normal">ปกติ</option>
                    <option value="high">สูง</option>
                    <option value="urgent">ด่วนมาก</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: ของที่ช่างเอามาคืน */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                2. อุปกรณ์/Media Player ที่ช่างถอดและนำกลับมา <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>
                {billboardId
                  ? "เลือกจากรายการที่ติดตั้งบนป้ายนี้ หรือกดกรอกเอง หากไม่ตรงกับรายการ"
                  : "กรุณาเลือกป้ายโฆษณาก่อนในขั้นตอนที่ 1"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {billboardId ? (
                <>
                  <div className="space-y-2">
                    <Label>เลือกจากรายการที่ติดตั้งบนป้าย</Label>
                    <SearchableSelect
                      options={installedItems}
                      value={reportedSelectKey}
                      onValueChange={setReportedSelectKey}
                      placeholder={installedLoading ? "กำลังโหลด..." : "ค้นหาด้วยรหัส, ชื่อ, S/N"}
                      searchPlaceholder="พิมพ์เพื่อค้นหา..."
                      isLoading={installedLoading}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="space-y-2">
                      <Label>อาการเสียของเครื่องนี้ <span className="text-destructive">*</span></Label>
                      <SymptomSelect value={symptomId} onChange={setSymptomId} />
                    </div>
                    <div className="space-y-2">
                      <Label>อาการอื่น (ถ้าไม่มีในรายการ)</Label>
                      <Input
                        value={symptomOther}
                        onChange={(e) => setSymptomOther(e.target.value)}
                        placeholder="ระบุอาการเพิ่มเติมของเครื่องนี้"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>รายละเอียดอาการ / สิ่งที่ช่างสังเกตเห็น</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="อธิบายอาการเสียของเครื่องที่ถอดมา..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ประเภท</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={reportedAssetType}
                        onChange={(e) => setReportedAssetType(e.target.value as any)}
                        disabled={reportedSelectKey !== "" && reportedSelectKey !== "__manual__"}
                      >
                        <option value="equipment">อุปกรณ์ทั่วไป (Equipment)</option>
                        <option value="media_player">Media Player</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>รหัส (Code)</Label>
                      <Input
                        value={reportedItemCode}
                        onChange={(e) => setReportedItemCode(e.target.value)}
                        placeholder="เช่น EQ001 / MP-PB 0001"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>ชื่อ (Remote Name)</Label>
                      <Input
                        value={reportedItemName}
                        onChange={(e) => setReportedItemName(e.target.value)}
                        placeholder="Remote Name / ชื่อเรียก"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>โมเดล</Label>
                      <Input
                        value={reportedModelName}
                        onChange={(e) => setReportedModelName(e.target.value)}
                        placeholder="รุ่น/Model"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>หมายเลขเครื่อง (S/N)</Label>
                      <Input
                        value={reportedSerial}
                        onChange={(e) => setReportedSerial(e.target.value)}
                        placeholder="S/N ที่อ่านจากตัวเครื่อง"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> รูปถ่ายของที่นำมาคืน (สูงสุด 5 รูป)
                    </Label>
                    <EquipmentImageUpload
                      images={reportedPhotos}
                      onChange={setReportedPhotos}
                      maxImages={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      ถ่ายให้เห็นตัวเครื่อง, S/N, และจุดที่เสียหายเพื่อใช้ประกอบการประเมินที่คลัง
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  เลือกป้ายโฆษณาในขั้นที่ 1 เพื่อแสดงรายการอุปกรณ์ที่ติดตั้งอยู่
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: ผู้แจ้ง + ผู้รับเรื่อง */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                3. ผู้แจ้ง / ผู้รับเรื่อง
              </CardTitle>
              <CardDescription>ข้อมูลช่างที่นำของมาคืน และเจ้าหน้าที่คลังที่รับเรื่อง</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อช่างผู้แจ้ง <span className="text-destructive">*</span></Label>
                  <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="ชื่อ-สกุล" />
                </div>
                <div className="space-y-2">
                  <Label>เบอร์ติดต่อช่าง</Label>
                  <Input value={technicianPhone} onChange={(e) => setTechnicianPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                </div>
                <div className="space-y-2">
                  <Label>เจ้าหน้าที่คลังที่รับเรื่อง</Label>
                  <Input value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} placeholder="ชื่อผู้รับ" />
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm flex items-start gap-2">
                <ClipboardList className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <div>
                  <div className="font-medium">ขั้นตอนถัดไป</div>
                  <div className="text-muted-foreground">
                    หลังบันทึก คำขอจะอยู่สถานะ "รอดำเนินการ" — เจ้าหน้าที่คลังจะกด <strong>"ดำเนินการ Swap"</strong> เพื่อเลือก Spare และจัดส่งให้ช่างต่อไป
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm} disabled={submitting}>
                  ล้างฟอร์ม
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} size="lg">
                  <Wrench className="h-4 w-4 mr-1" />
                  {submitting ? "กำลังบันทึก..." : "สร้างคำขอ Swap"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SwapWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        request={selectedRequest}
        onCompleted={() => {
          setWizardOpen(false);
          setSelectedRequest(null);
          fetchRequests();
        }}
      />
    </div>
  );
}
