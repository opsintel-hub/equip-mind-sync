import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Check, X, ChevronLeft, Package, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SwapRejectReasonSelect } from "@/components/media-player/SwapRejectReasonSelect";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";

interface SwapRequest {
  id: string;
  document_no: string;
  billboard_id: string | null;
  description: string | null;
  symptom_other: string | null;
  symptom_id?: string | null;
  defective_return_id?: string | null;
  reported_asset_type?: string | null;
  reported_billboard_equipment_id?: string | null;
  reported_equipment_id?: string | null;
  reported_media_player_id?: string | null;
  reported_item_code?: string | null;
  reported_item_name?: string | null;
  reported_serial_number?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: SwapRequest | null;
  onCompleted: () => void;
}

interface SpareOption {
  value: string;
  label: string;
  description?: string;
  type: "media_player" | "equipment";
  serial_number?: string | null;
  location_id?: string | null;
  // Cross-model support
  equipment_id?: string | null;
  item_code?: string | null;
  item_name?: string | null;
  // Detail (for richer display)
  brand?: string | null;
  specification?: string | null;
  model_name?: string | null;
  category?: string | null;
  status?: string | null;
  warranty_expiry_date?: string | null;
  unit_price?: number | null;
  remote_name?: string | null;
}

interface OldOption {
  value: string;
  label: string;
  description?: string;
  type: "media_player" | "equipment";
  serial_number?: string | null;
  billboard_equipment_id: string;
  equipment_id?: string;
  media_player_id?: string;
  brand?: string | null;
  specification?: string | null;
  model_name?: string | null;
  category?: string | null;
  install_date?: string | null;
  remote_name?: string | null;
  billboard_label?: string | null;
}

export function SwapWizardDialog({ open, onOpenChange, request, onCompleted }: Props) {
  const { user } = useAuth();
  const { allowedDepartments, isAdmin } = useAllowedDepartments();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Spare selection
  const [spareOptions, setSpareOptions] = useState<SpareOption[]>([]);
  const [spareValue, setSpareValue] = useState("");

  // Step 2: Old unit selection
  const [oldOptions, setOldOptions] = useState<OldOption[]>([]);
  const [oldValue, setOldValue] = useState("");
  const [returnDept, setReturnDept] = useState("");
  const [returnWarehouseId, setReturnWarehouseId] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");

  // Step 3: Confirm/Reject
  const [result, setResult] = useState<"approved" | "rejected">("approved");
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [rejectReasonOther, setRejectReasonOther] = useState("");
  const [notes, setNotes] = useState("");
  const [crossModelAck, setCrossModelAck] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSpareValue("");
      setOldValue("");
      setReturnDept("");
      setReturnWarehouseId("");
      setReturnLocationId("");
      setResult("approved");
      setRejectReasonId("");
      setRejectReasonOther("");
      setNotes("");
      setCrossModelAck(false);
      loadSpares();
      if (request?.billboard_id) loadOldUnits(request.billboard_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.id, isAdmin, allowedDepartments.length]);

  // Auto-select old unit when entering step 2 if there's only ONE matching unit on the billboard.
  // "Matching" = same equipment id (for equipment spares) or first available media player slot.
  useEffect(() => {
    if (step !== 2 || oldValue || oldOptions.length === 0) return;
    const spare = spareOptions.find((o) => o.value === spareValue);
    if (!spare) return;

    // Try to match by equipment id first (when spare is equipment)
    if (spare.type === "equipment") {
      const spareEqId = spare.value.split(":")[1];
      const matches = oldOptions.filter((o) => {
        // billboard_equipment row: equipment_id is in label/desc — we use billboard_equipment_id mapping via desc
        // The OldOption stores equipment id implicitly via the billboard_equipment record
        return (o as any).equipment_id === spareEqId;
      });
      if (matches.length === 1) {
        setOldValue(matches[0].value);
        return;
      }
    }

    // If only one unit installed total → auto select
    if (oldOptions.length === 1) {
      setOldValue(oldOptions[0].value);
    }
  }, [step, oldOptions, spareValue, spareOptions, oldValue]);

  const loadSpares = async () => {
    setLoading(true);
    // Media Players: available spare = not installed, not defective/pending/in-transit
    const { data: mps, error: mpError } = await supabase
      .from("media_players")
      .select("id, code, name, serial_number_1, serial_number_2, status, location_id, billboard_id, brand, specification, model_id, warranty_expiry_date, unit_price, remote_name")
      .is("billboard_id", null)
      .not("status", "in", "(defective,pending_assessment,claim,pending_warehouse_return,under_repair,in_claim)")
      .order("created_at", { ascending: false })
      .limit(300);

    // Lookup model names separately (no FK relationship for embed)
    const modelIds = Array.from(new Set((mps || []).map((m: any) => m.model_id).filter(Boolean)));
    let modelMap: Record<string, string> = {};
    if (modelIds.length > 0) {
      const { data: models } = await supabase
        .from("media_player_models")
        .select("id, name")
        .in("id", modelIds);
      (models || []).forEach((m: any) => { modelMap[m.id] = m.name; });
    }

    // Equipment: pull serial numbers in_stock
    const { data: esns } = await supabase
      .from("equipment_serial_numbers")
      .select("id, equipment_id, serial_number, status, location_id, equipment:equipment_id(id, code, name, brand, category, description, warranty_expiry_date, unit_price)")
      .eq("status", "in_stock")
      .limit(300);

    const opts: SpareOption[] = [];
    if (mpError) {
      toast.error("โหลดรายการ Spare Media Player ไม่สำเร็จ: " + mpError.message);
    }

    (mps || []).forEach((m: any) => {
      const serial = [m.serial_number_1, m.serial_number_2].filter(Boolean).join(" / ");
      const modelName = m.model_id ? modelMap[m.model_id] : null;
      const detailBits = [
        m.brand ? `ยี่ห้อ ${m.brand}` : null,
        modelName ? `รุ่น ${modelName}` : null,
        m.specification ? `Spec ${m.specification}` : null,
      ].filter(Boolean).join(" • ");
      opts.push({
        value: `mp:${m.id}`,
        label: `${m.code} ${m.name ? "- " + m.name : ""}`,
        description: `S/N: ${serial || "—"} • สถานะ: ${m.status || "—"}${detailBits ? "\n" + detailBits : ""}`,
        type: "media_player",
        serial_number: serial || null,
        location_id: m.location_id,
        equipment_id: null,
        item_code: m.code,
        item_name: m.name,
        brand: m.brand,
        specification: m.specification,
        model_name: modelName,
        status: m.status,
        warranty_expiry_date: m.warranty_expiry_date,
        unit_price: m.unit_price,
        remote_name: m.remote_name,
      });
    });
    (esns || []).forEach((s: any) => {
      const detailBits = [
        s.equipment?.brand ? `ยี่ห้อ ${s.equipment.brand}` : null,
        s.equipment?.category ? `หมวด ${s.equipment.category}` : null,
        s.equipment?.description ? `Spec ${s.equipment.description}` : null,
      ].filter(Boolean).join(" • ");
      opts.push({
        value: `eq:${s.equipment_id}:${s.id}`,
        label: `${s.equipment?.code || ""} ${s.equipment?.name ? "- " + s.equipment.name : ""}`,
        description: `S/N: ${s.serial_number} • สถานะ: ${s.status}${detailBits ? "\n" + detailBits : ""}`,
        type: "equipment",
        serial_number: s.serial_number,
        location_id: s.location_id,
        equipment_id: s.equipment_id,
        item_code: s.equipment?.code,
        item_name: s.equipment?.name,
        brand: s.equipment?.brand,
        specification: s.equipment?.description,
        category: s.equipment?.category,
        status: s.status,
        warranty_expiry_date: s.equipment?.warranty_expiry_date,
        unit_price: s.equipment?.unit_price,
      });
    });

    // Sort: same code first → same type/category → others
    // ใช้รหัส/ชื่อของอุปกรณ์ที่รายงานในคำขอ Swap เป็นเกณฑ์เปรียบเทียบ
    const reportedCode = (request?.reported_item_code || "").toLowerCase().trim();
    const reportedName = (request?.reported_item_name || "").toLowerCase().trim();
    const reportedEqId = request?.reported_equipment_id || null;
    const reportedType = request?.reported_asset_type === "media_player" ? "media_player" : "equipment";

    const compatScore = (o: SpareOption): number => {
      // 0 = ตรงรหัส (ดีที่สุด), 1 = รุ่นใกล้เคียง (ชื่อใกล้/ประเภทเดียวกัน), 2 = ข้ามรุ่น
      if (reportedEqId && o.equipment_id && o.equipment_id === reportedEqId) return 0;
      if (reportedCode && o.item_code && o.item_code.toLowerCase() === reportedCode) return 0;
      if (o.type === reportedType) {
        if (reportedName && o.item_name && (o.item_name.toLowerCase().includes(reportedName) || reportedName.includes(o.item_name.toLowerCase()))) return 1;
        return 1;
      }
      return 2;
    };

    opts.sort((a, b) => compatScore(a) - compatScore(b));
    setSpareOptions(opts);
    setLoading(false);
  };

  // Helper: ระดับความเข้ากันของ Spare ที่เลือกเทียบกับเครื่องเก่า
  const getCompatibility = (): { level: "exact" | "similar" | "cross"; label: string } => {
    const spare = selectedSpare;
    const old = selectedOld;
    if (!spare || !old) return { level: "cross", label: "—" };
    const spareEqId = spare.equipment_id || (spare.type === "equipment" ? spare.value.split(":")[1] : null);
    const oldEqId = old.equipment_id || null;
    if (spare.type !== old.type) return { level: "cross", label: "ข้ามประเภท (Media Player ↔ Equipment)" };
    if (spareEqId && oldEqId && spareEqId === oldEqId) return { level: "exact", label: "ตรงรหัสอุปกรณ์" };
    const spareCode = (spare.item_code || "").toLowerCase();
    const oldCode = (request?.reported_item_code || "").toLowerCase();
    if (spareCode && oldCode && spareCode === oldCode) return { level: "exact", label: "ตรงรหัสอุปกรณ์" };
    return { level: spare.type === old.type ? "similar" : "cross", label: spare.type === old.type ? "ข้ามรุ่น (ประเภทเดียวกัน)" : "ข้ามประเภท" };
  };

  const loadOldUnits = async (billboardId: string) => {
    const { data: be } = await supabase
      .from("billboard_equipment")
      .select("id, equipment_id, serial_number, quantity, installation_date, equipment:equipment_id(id, code, name, brand, category, description)")
      .eq("billboard_id", billboardId);

    // ดึงรายการ Media Player ที่ติดตั้งบนป้ายนี้ ณ ปัจจุบัน
    const { data: mpsOnBb } = await supabase
      .from("media_players")
      .select("id, code, name, serial_number_1, serial_number_2, brand, specification, install_date, model_id, remote_name")
      .eq("billboard_id", billboardId);

    const oldModelIds = Array.from(new Set((mpsOnBb || []).map((m: any) => m.model_id).filter(Boolean)));
    const oldModelMap: Record<string, string> = {};
    if (oldModelIds.length > 0) {
      const { data: oldModels } = await supabase
        .from("media_player_models")
        .select("id, name")
        .in("id", oldModelIds);
      (oldModels || []).forEach((m: any) => { oldModelMap[m.id] = m.name; });
    }

    // Fetch billboard label (Location) เพื่อแสดงเป็น Location ของเครื่องเก่า
    let billboardLabel: string | null = null;
    {
      const { data: bb } = await supabase
        .from("billboards")
        .select("old_code, location_name, equipment_id")
        .eq("id", billboardId)
        .maybeSingle();
      if (bb) {
        const parts = [bb.old_code, bb.location_name].filter(Boolean);
        billboardLabel = parts.join(" - ") || null;
      }
    }

    // หา remote_name + รายละเอียดของเครื่องที่รายงาน (ถ้าเป็น media player)
    let reportedRemoteName: string | null = null;
    let reportedBrand: string | null = null;
    let reportedSpec: string | null = null;
    let reportedModelName: string | null = null;
    if (request?.reported_asset_type === "media_player" && request.reported_media_player_id) {
      const found = (mpsOnBb || []).find((m: any) => m.id === request.reported_media_player_id);
      if (found) {
        reportedRemoteName = found.remote_name || null;
        reportedBrand = found.brand || null;
        reportedSpec = found.specification || null;
        reportedModelName = found.model_id ? oldModelMap[found.model_id] : null;
      } else {
        const { data: rmp } = await supabase
          .from("media_players")
          .select("remote_name, model_id, brand, specification")
          .eq("id", request.reported_media_player_id)
          .maybeSingle();
        if (rmp) {
          reportedRemoteName = rmp.remote_name || null;
          reportedBrand = rmp.brand || null;
          reportedSpec = rmp.specification || null;
          if (rmp.model_id) {
            const { data: mm } = await supabase
              .from("media_player_models")
              .select("name")
              .eq("id", rmp.model_id)
              .maybeSingle();
            reportedModelName = mm?.name || null;
          }
        }
      }
    }

    const opts: OldOption[] = [];
    const seenIds = new Set<string>();

    // Prefer the item already reported in the swap request. It may have been auto-uninstalled
    // when the request was created, so it will no longer appear in billboard_equipment.
    if (request?.reported_item_name || request?.reported_item_code || request?.reported_serial_number) {
      const v = request.reported_asset_type === "media_player" && request.reported_media_player_id
        ? `mp:${request.reported_media_player_id}`
        : `reported:${request.id}`;
      opts.push({
        value: v,
        label: `${request.reported_item_code || "—"} ${request.reported_item_name ? "- " + request.reported_item_name : ""}`,
        description: `S/N: ${request.reported_serial_number || "—"} • จากคำขอ Swap${billboardLabel ? "\nLocation: " + billboardLabel : ""}`,
        type: request.reported_asset_type === "media_player" ? "media_player" : "equipment",
        serial_number: request.reported_serial_number,
        billboard_equipment_id: request.reported_billboard_equipment_id || "",
        equipment_id: request.reported_equipment_id || undefined,
        media_player_id: request.reported_media_player_id || undefined,
        brand: reportedBrand,
        specification: reportedSpec,
        model_name: reportedModelName,
        remote_name: reportedRemoteName,
        billboard_label: billboardLabel,
      });
      seenIds.add(v);
    }

    (mpsOnBb || []).forEach((m: any) => {
      const v = `mp:${m.id}`;
      if (seenIds.has(v)) return;
      const serial = [m.serial_number_1, m.serial_number_2].filter(Boolean).join(" / ");
      const modelName = m.model_id ? oldModelMap[m.model_id] : null;
      const detailBits = [
        m.brand ? `ยี่ห้อ ${m.brand}` : null,
        modelName ? `รุ่น ${modelName}` : null,
        m.specification ? `Spec ${m.specification}` : null,
      ].filter(Boolean).join(" • ");
      opts.push({
        value: v,
        label: `${m.code} ${m.name ? "- " + m.name : ""}`,
        description: `S/N: ${serial || "—"} • ติดตั้ง ${m.install_date || "—"}${billboardLabel ? "\nLocation: " + billboardLabel : ""}${detailBits ? "\n" + detailBits : ""}`,
        type: "media_player",
        serial_number: serial || null,
        billboard_equipment_id: "",
        media_player_id: m.id,
        brand: m.brand,
        specification: m.specification,
        model_name: modelName,
        install_date: m.install_date,
        remote_name: m.remote_name,
        billboard_label: billboardLabel,
      });
      seenIds.add(v);
    });

    (be || []).forEach((b: any) => {
      const v = `be:${b.id}`;
      if (seenIds.has(v)) return;
      const detailBits = [
        b.equipment?.brand ? `ยี่ห้อ ${b.equipment.brand}` : null,
        b.equipment?.category ? `หมวด ${b.equipment.category}` : null,
        b.equipment?.description ? `Spec ${b.equipment.description}` : null,
      ].filter(Boolean).join(" • ");
      opts.push({
        value: v,
        label: `${b.equipment?.code || ""} ${b.equipment?.name ? "- " + b.equipment.name : ""}`,
        description: `S/N: ${b.serial_number || "—"} • จำนวน: ${b.quantity}${billboardLabel ? "\nLocation: " + billboardLabel : ""}${detailBits ? "\n" + detailBits : ""}`,
        type: "equipment",
        serial_number: b.serial_number,
        billboard_equipment_id: b.id,
        equipment_id: b.equipment_id,
        brand: b.equipment?.brand,
        specification: b.equipment?.description,
        category: b.equipment?.category,
        install_date: b.installation_date,
        billboard_label: billboardLabel,
      });
      seenIds.add(v);
    });
    setOldOptions(opts);
  };

  const selectedSpare = spareOptions.find((o) => o.value === spareValue);
  const selectedOld = oldOptions.find((o) => o.value === oldValue);

  const canNext1 = !!spareValue;
  const canNext2 = !!oldValue;

  // ตรวจ cross-model: spare กับ old ต่างรหัส/ต่าง equipment_id หรือไม่
  const isCrossModel = (() => {
    if (!selectedSpare || !selectedOld) return false;
    if (selectedSpare.type !== selectedOld.type) return true;
    const spareEqId = selectedSpare.equipment_id || (selectedSpare.type === "equipment" ? selectedSpare.value.split(":")[1] : null);
    const oldEqId = selectedOld.equipment_id || null;
    if (spareEqId && oldEqId) return spareEqId !== oldEqId;
    const spareCode = (selectedSpare.item_code || "").toLowerCase();
    const oldCode = (request?.reported_item_code || "").toLowerCase();
    if (spareCode && oldCode) return spareCode !== oldCode;
    return false;
  })();

  const canSubmit =
    result === "approved"
      ? (!isCrossModel || crossModelAck)
      : !!rejectReasonId || !!rejectReasonOther.trim();

  const handleSubmit = async () => {
    if (!request) return;
    setSubmitting(true);

    // Parse spare
    let spareMpId: string | null = null;
    let spareEqId: string | null = null;
    if (selectedSpare?.type === "media_player") {
      spareMpId = selectedSpare.value.split(":")[1];
    } else if (selectedSpare?.type === "equipment") {
      spareEqId = selectedSpare.value.split(":")[1];
    }

    // Parse old
    let oldBeId: string | null = null;
    let oldEqId: string | null = null;
    let oldMpId: string | null = null;
    if (selectedOld) {
      oldBeId = selectedOld.billboard_equipment_id || null;
      oldEqId = selectedOld.equipment_id || null;
      oldMpId = selectedOld.media_player_id || (selectedOld.type === "media_player" ? selectedOld.value.split(":")[1] : null);
    }

    // Insert execution
    const { error: execError } = await supabase.from("swap_executions").insert({
      swap_request_id: request.id,
      spare_type: selectedSpare?.type || "equipment",
      spare_media_player_id: spareMpId,
      spare_equipment_id: spareEqId,
      spare_serial_number: selectedSpare?.serial_number || null,
      spare_source_location_id: selectedSpare?.location_id || null,
      old_billboard_equipment_id: oldBeId,
      old_equipment_id: oldEqId,
      old_media_player_id: oldMpId,
      old_serial_number: selectedOld?.serial_number || null,
      return_location_id: returnLocationId || null,
      result,
      reject_reason_id: result === "rejected" ? rejectReasonId || null : null,
      reject_reason_other: result === "rejected" ? rejectReasonOther.trim() || null : null,
      notes: [
        isCrossModel && result === "approved" ? `[CROSS-MODEL SWAP] Spare: ${selectedSpare?.item_code || "—"} ↔ Old: ${request?.reported_item_code || selectedOld?.label || "—"}` : null,
        notes.trim() || null,
      ].filter(Boolean).join("\n") || null,
      executed_by: user?.id ?? null,
    });

    if (execError) {
      setSubmitting(false);
      toast.error("บันทึก execution ไม่สำเร็จ: " + execError.message);
      return;
    }

    // Update request with old/new fields + status + completion
    const newStatus = result === "approved" ? "completed" : "rejected";
    await supabase.from("swap_requests").update({
      status: newStatus,
      asset_type: selectedSpare?.type || "equipment",
      old_equipment_id: oldEqId,
      old_media_player_id: oldMpId,
      old_serial_number: selectedOld?.serial_number || null,
      new_equipment_id: spareEqId,
      new_media_player_id: spareMpId,
      new_serial_number: selectedSpare?.serial_number || null,
      completed_at: new Date().toISOString(),
      completed_by: user?.id ?? null,
    }).eq("id", request.id);

    // NOTE: ไม่สร้าง defective_return อัตโนมัติแล้ว — เครื่องเก่าจะเข้าสถานะ "รอประเมิน"
    // ผ่าน assessment_logs (สร้างด้านล่าง) ผลประเมินถึงจะตัดสินว่าเข้าของเสีย/เคลม/ซ่อม/คืน Spare

    // === Asset movement on Approved Swap ===
    // 1) Uninstall เครื่องเก่า  2) Install Spare ที่ป้าย  3) Log stock_movements
    if (result === "approved" && request.billboard_id) {
      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      const swapNote = `Swap ${request.document_no}`;

      // ---------- (1) เครื่องเก่า: ถอดออกจากป้าย ----------
      try {
        if (oldMpId) {
          // ปิด history ที่ยังเปิดอยู่ (ของเครื่องเก่า)
          await supabase
            .from("media_player_billboard_history")
            .update({
              uninstall_date: today,
              uninstall_reason: swapNote,
              uninstalled_by: user?.id ?? null,
              return_to_stock: true,
              return_location_id: returnLocationId || null,
            })
            .eq("media_player_id", oldMpId)
            .is("uninstall_date", null);

          // เคลียร์ billboard_equipment ของเครื่องเก่า (ถ้ามีถูกเก็บไว้ตอนเบิก)
          await supabase
            .from("billboard_equipment")
            .delete()
            .eq("billboard_id", request.billboard_id)
            .eq("equipment_id", oldMpId);

          // เคลียร์ billboard_id + install_date + เปลี่ยน status เป็น pending_warehouse_return
          // (เครื่องอยู่กับช่าง รอเข้าคลัง — location_id ยังว่างไว้จนกว่าคลังจะกดยืนยันรับ)
          // quantity=0 เพราะยังไม่อยู่ในคลังใดๆ (รายงานคงคลังต้องไม่นับ)
          await supabase
            .from("media_players")
            .update({
              billboard_id: null,
              install_date: null,
              location_id: null,
              status: "pending_warehouse_return",
              quantity: 0,
            } as any)
            .eq("id", oldMpId);

          // log stock movement: return_from_billboard (ยังไม่เข้าคลัง — location ว่าง)
          const { data: oldMp } = await supabase
            .from("media_players")
            .select("code, name")
            .eq("id", oldMpId)
            .maybeSingle();
          await supabase.from("stock_movements").insert({
            equipment_id: oldMpId,
            equipment_code: oldMp?.code || "",
            equipment_name: oldMp?.name || "",
            movement_type: "return_from_billboard",
            quantity: 1,
            stock_before: 0,
            stock_after: 0,
            reference_type: "swap",
            reference_id: request.id,
            reference_document: request.document_no,
            location_id: null,
            notes: `ถอดจากป้าย — ${swapNote} (รอเข้าคลัง: ${selectedOld?.label || ""})`,
            item_condition: "pending_warehouse_return",
            created_by: user?.id ?? null,
          } as any);
        } else if (oldBeId) {
          // Equipment: ลบ billboard_equipment + เปลี่ยน S/N status เป็น pending_warehouse_return
          await supabase.from("billboard_equipment").delete().eq("id", oldBeId);
          if (selectedOld?.serial_number) {
            await supabase
              .from("equipment_serial_numbers")
              .update({ status: "pending_warehouse_return", location_id: null } as any)
              .eq("serial_number", selectedOld.serial_number);
          }
          if (oldEqId) {
            const { data: oldEq } = await supabase
              .from("equipment")
              .select("code, name")
              .eq("id", oldEqId)
              .maybeSingle();
            await supabase.from("stock_movements").insert({
              equipment_id: oldEqId,
              equipment_code: oldEq?.code || "",
              equipment_name: oldEq?.name || "",
              movement_type: "return_from_billboard",
              quantity: 1,
              stock_before: 0,
              stock_after: 0,
              reference_type: "swap",
              reference_id: request.id,
              reference_document: request.document_no,
              location_id: null,
              notes: `ถอดจากป้าย — ${swapNote} (รอเข้าคลัง)`,
              item_condition: "pending_warehouse_return",
              created_by: user?.id ?? null,
            } as any);
          }
        }
      } catch (e: any) {
        console.error("Uninstall old unit failed:", e);
      }

      // ---------- (2) Spare: ติดตั้งที่ป้าย ----------
      try {
        if (spareMpId) {
          // สร้าง history ใหม่
          await supabase.from("media_player_billboard_history").insert({
            media_player_id: spareMpId,
            billboard_id: request.billboard_id,
            installation_date: today,
            installation_notes: swapNote,
            installed_by: user?.id ?? null,
          } as any);

          // อัปเดต media_players (Spare ติดตั้งที่ป้าย — quantity=0 เพราะออกจากคลังแล้ว)
          await supabase
            .from("media_players")
            .update({
              billboard_id: request.billboard_id,
              install_date: today,
              location_id: null,
              quantity: 0,
            } as any)
            .eq("id", spareMpId);

          const { data: spMp } = await supabase
            .from("media_players")
            .select("code, name")
            .eq("id", spareMpId)
            .maybeSingle();
          await supabase.from("stock_movements").insert({
            equipment_id: spareMpId,
            equipment_code: spMp?.code || "",
            equipment_name: spMp?.name || "",
            movement_type: "install_to_billboard",
            quantity: 1,
            stock_before: 1,
            stock_after: 0,
            reference_type: "swap",
            reference_id: request.id,
            reference_document: request.document_no,
            location_id: selectedSpare?.location_id || null,
            notes: `ติดตั้งจาก Swap — ${swapNote}`,
            created_by: user?.id ?? null,
          } as any);
        } else if (spareEqId) {
          // Equipment Spare → เพิ่ม billboard_equipment
          await supabase.from("billboard_equipment").insert({
            billboard_id: request.billboard_id,
            equipment_id: spareEqId,
            serial_number: selectedSpare?.serial_number || null,
            quantity: 1,
            installation_date: today,
            installation_notes: swapNote,
            installed_by: user?.id ?? null,
          } as any);

          const { data: spEq } = await supabase
            .from("equipment")
            .select("code, name")
            .eq("id", spareEqId)
            .maybeSingle();
          await supabase.from("stock_movements").insert({
            equipment_id: spareEqId,
            equipment_code: spEq?.code || "",
            equipment_name: spEq?.name || "",
            movement_type: "install_to_billboard",
            quantity: 1,
            stock_before: 1,
            stock_after: 0,
            reference_type: "swap",
            reference_id: request.id,
            reference_document: request.document_no,
            location_id: selectedSpare?.location_id || null,
            notes: `ติดตั้งจาก Swap — ${swapNote}`,
            created_by: user?.id ?? null,
          } as any);
        }
      } catch (e: any) {
        console.error("Install spare failed:", e);
      }
    }

    // Auto-create assessment_log สถานะ "รอประเมิน" สำหรับเครื่องเก่า
    // เพื่อให้เจ้าหน้าที่คลังเข้าหน้า "บันทึกการประเมิน" แล้วเห็นรายการได้ทันที
    if (result === "approved" && selectedOld) {
      await supabase.from("assessment_logs").insert({
        media_player_id: oldMpId,
        equipment_id: oldEqId,
        serial_number: selectedOld.serial_number || null,
        source_type: "swap",
        source_reference_id: request.id,
        symptom_id: request.symptom_id || null,
        symptom_description: request.description || request.symptom_other || null,
        status: "pending",
        notes: `จากการ Swap (${request.document_no})`,
        created_by: user?.id ?? null,
      } as any);
    }

    setSubmitting(false);
    toast.success(
      result === "approved"
        ? "บันทึก Swap สำเร็จ — เครื่องเก่าเข้าสถานะ 'รอประเมิน' รอช่างประเมินผล"
        : "บันทึก Reject สำเร็จ"
    );
    onCompleted();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Swap Wizard — {request.document_no}
          </DialogTitle>
          <DialogDescription>
            {request.description || request.symptom_other || "ดำเนินการ Swap เครื่อง"}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package className="h-5 w-5" /> ขั้น 1: เลือก Spare ที่จะนำเข้าใช้
              </h3>
              <p className="text-sm text-muted-foreground">เลือกเครื่อง Media Player หรืออุปกรณ์ที่จะนำไปติดตั้งทดแทน</p>
            </div>
            <SearchableSelect
              options={spareOptions}
              value={spareValue}
              onValueChange={setSpareValue}
              placeholder="ค้นหาด้วยรหัส / ชื่อ / S/N"
              searchPlaceholder="พิมพ์เพื่อค้นหา..."
              emptyMessage="ไม่พบ Spare ที่พร้อมใช้งานในคลัง"
              isLoading={loading}
            />
            {!loading && spareOptions.length === 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
                ไม่มี Spare พร้อมใช้งาน — ต้องรับของเข้าคลังหรือเปลี่ยนสถานะ Media Player เป็น in_stock/active ก่อน
              </div>
            )}
            {selectedSpare && (() => {
              const spareEqId = selectedSpare.equipment_id || (selectedSpare.type === "equipment" ? selectedSpare.value.split(":")[1] : null);
              const reportedEqId = request?.reported_equipment_id || null;
              const reportedCode = (request?.reported_item_code || "").toLowerCase();
              const spareCode = (selectedSpare.item_code || "").toLowerCase();
              const isExact = (reportedEqId && spareEqId === reportedEqId) || (reportedCode && spareCode === reportedCode);
              const isCrossType = request?.reported_asset_type && (
                (request.reported_asset_type === "media_player" && selectedSpare.type !== "media_player") ||
                (request.reported_asset_type !== "media_player" && selectedSpare.type === "media_player")
              );
              const compatVariant = isExact ? "default" : isCrossType ? "destructive" : "secondary";
              const compatText = isExact ? "✓ ตรงรหัสกับเครื่องเก่า" : isCrossType ? "⚠ ข้ามประเภท" : "↻ ข้ามรุ่น/รหัส";
              return (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="default">{selectedSpare.type === "media_player" ? "Media Player" : "Equipment"}</Badge>
                      <Badge variant={compatVariant as any}>{compatText}</Badge>
                      <span className="font-medium">{selectedSpare.label}</span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">{selectedSpare.description}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                      {selectedSpare.model_name && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">รุ่น:</span> <span className="font-medium">{selectedSpare.model_name}</span></div>}
                      {selectedSpare.remote_name && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">Remote Name:</span> <span className="font-medium">{selectedSpare.remote_name}</span></div>}
                      {selectedSpare.category && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">หมวด:</span> <span className="font-medium">{selectedSpare.category}</span></div>}
                      {selectedSpare.warranty_expiry_date && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">ประกันถึง:</span> <span className="font-medium">{selectedSpare.warranty_expiry_date}</span></div>}
                    </div>
                    {!isExact && request?.reported_item_code && (
                      <div className="text-xs text-muted-foreground mt-2">
                        เครื่องเก่าที่รายงาน: <span className="font-medium">{request.reported_item_code} {request.reported_item_name ? "- " + request.reported_item_name : ""}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
              💡 ระบบเรียง Spare ที่เข้ากันมากที่สุดไว้บนสุด — แต่คุณสามารถเลือก Spare ข้ามรหัส/ข้ามรุ่นได้ ถ้า Spec ใช้แทนกันได้
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (() => {
          const spareEqId = selectedSpare?.type === "equipment" ? selectedSpare.value.split(":")[1] : null;
          const sameTypeMatches = spareEqId ? oldOptions.filter((o) => (o as any).equipment_id === spareEqId) : [];
          const showNoMatchWarning = spareEqId && sameTypeMatches.length === 0 && oldOptions.length > 0;
          const isAutoSelected = !!oldValue && (oldOptions.length === 1 || sameTypeMatches.length === 1);

          return (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> ขั้น 2: เลือกเครื่องเก่าที่ต้องการถอด
                </h3>
                <p className="text-sm text-muted-foreground">รายการอุปกรณ์ที่ติดตั้งบนป้ายปัจจุบัน</p>
              </div>

              {isAutoSelected && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success-foreground flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                  <div>
                    <div className="font-medium text-success">ระบบเลือกเครื่องเก่าให้อัตโนมัติแล้ว</div>
                    <div className="text-muted-foreground">หากต้องการเปลี่ยน เลือกใหม่จาก dropdown ด้านล่าง</div>
                  </div>
                </div>
              )}

              {showNoMatchWarning && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm flex items-start gap-2">
                  <Package className="h-4 w-4 mt-0.5 text-warning flex-shrink-0" />
                  <div>
                    <div className="font-medium text-warning-foreground">ป้ายนี้ไม่มีอุปกรณ์ชนิดเดียวกับ Spare ที่เลือกติดตั้งอยู่</div>
                    <div className="text-muted-foreground">คุณยังเลือกถอดอุปกรณ์ชนิดอื่นแทนได้ หรือย้อนกลับไปเลือก Spare ใหม่</div>
                  </div>
                </div>
              )}

              {oldOptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  ไม่พบอุปกรณ์ที่ติดตั้งบนป้ายนี้
                </div>
              ) : (
                <SearchableSelect
                  options={oldOptions}
                  value={oldValue}
                  onValueChange={setOldValue}
                  placeholder="เลือกเครื่องเก่า"
                  searchPlaceholder="ค้นหา..."
                />
              )}
              {selectedOld && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{selectedOld.type === "media_player" ? "Media Player" : "Equipment"}</Badge>
                      <span className="font-medium">{selectedOld.label}</span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">{selectedOld.description}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
                      {selectedOld.billboard_label && <div className="bg-muted/40 rounded px-2 py-1 col-span-2 sm:col-span-3"><span className="text-muted-foreground">Location ป้าย:</span> <span className="font-medium">{selectedOld.billboard_label}</span></div>}
                      {selectedOld.model_name && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">รุ่น:</span> <span className="font-medium">{selectedOld.model_name}</span></div>}
                      {selectedOld.remote_name && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">Remote Name:</span> <span className="font-medium">{selectedOld.remote_name}</span></div>}
                      {selectedOld.brand && <div className="bg-muted/40 rounded px-2 py-1"><span className="text-muted-foreground">ยี่ห้อ:</span> <span className="font-medium">{selectedOld.brand}</span></div>}
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="text-sm font-medium">คลังปลายทางสำหรับเครื่องเก่า (Incoming)</div>
                <p className="text-xs text-muted-foreground">เลือกฝ่าย → คลัง → ตำแหน่งจัดเก็บ ตามลำดับ (แสดงเฉพาะคลังของฝ่ายที่คุณมีสิทธิ์)</p>
                <div className="space-y-2">
                  <Label>ฝ่าย</Label>
                  <SimpleDepartmentSelect
                    value={returnDept}
                    onChange={(v) => {
                      setReturnDept(v);
                      setReturnWarehouseId("");
                      setReturnLocationId("");
                    }}
                  />
                </div>
                <WarehouseLocationSelect
                  department={returnDept}
                  warehouseId={returnWarehouseId}
                  onWarehouseChange={setReturnWarehouseId}
                  locationId={returnLocationId}
                  onLocationChange={setReturnLocationId}
                />
              </div>
            </div>
          );
        })()}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">ขั้น 3: ตรวจสอบและยืนยัน</h3>
              <p className="text-sm text-muted-foreground">เปรียบเทียบเครื่องและตัดสินใจ Approve / Reject</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 space-y-1">
                  <Badge variant="secondary">Spare เข้าใหม่</Badge>
                  <div className="font-medium mt-2">{selectedSpare?.label}</div>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    <div className="col-span-2"><span className="text-muted-foreground">S/N:</span> <span className="font-medium">{selectedSpare?.serial_number || "—"}</span></div>
                    <div><span className="text-muted-foreground">ยี่ห้อ:</span> <span className="font-medium">{selectedSpare?.brand || "—"}</span></div>
                    <div><span className="text-muted-foreground">รุ่น:</span> <span className="font-medium">{selectedSpare?.model_name || "—"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Spec:</span> <span className="font-medium">{selectedSpare?.specification || "—"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Remote Name:</span> <span className="font-medium">{selectedSpare?.remote_name || "—"}</span></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 space-y-1">
                  <Badge variant="outline">เครื่องเก่าที่ถอด</Badge>
                  <div className="font-medium mt-2">{selectedOld?.label || "—"}</div>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    <div className="col-span-2"><span className="text-muted-foreground">S/N:</span> <span className="font-medium">{selectedOld?.serial_number || "—"}</span></div>
                    <div><span className="text-muted-foreground">ยี่ห้อ:</span> <span className="font-medium">{selectedOld?.brand || "—"}</span></div>
                    <div><span className="text-muted-foreground">รุ่น:</span> <span className="font-medium">{selectedOld?.model_name || "—"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Spec:</span> <span className="font-medium">{selectedOld?.specification || "—"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Remote Name:</span> <span className="font-medium">{selectedOld?.remote_name || "—"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Location ป้ายเก่า:</span> <span className="font-medium">{selectedOld?.billboard_label || "—"}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isCrossModel && result === "approved" && (
              <div className="rounded-lg border-2 border-warning/50 bg-warning/10 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-warning-foreground">⚠ Swap ข้ามรหัส / ข้ามรุ่น</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Spare ที่เลือกไม่ตรงรหัสกับเครื่องเก่า — กรุณายืนยันว่า Spec ใช้ทดแทนกันได้ ระบบจะบันทึก flag <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">CROSS-MODEL SWAP</span> ไว้ใน execution log
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crossModelAck}
                    onChange={(e) => setCrossModelAck(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>ยืนยันว่า Spec ของ Spare นี้ใช้ทดแทนเครื่องเก่าได้</span>
                </label>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={result === "approved" ? "default" : "outline"}
                onClick={() => setResult("approved")}
                className="h-auto py-4"
              >
                <Check className="h-5 w-5 mr-2" /> Approve — ดำเนินการ Swap
              </Button>
              <Button
                type="button"
                variant={result === "rejected" ? "destructive" : "outline"}
                onClick={() => setResult("rejected")}
                className="h-auto py-4"
              >
                <X className="h-5 w-5 mr-2" /> Reject — ไม่ Swap
              </Button>
            </div>

            {result === "rejected" && (
              <div className="space-y-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="space-y-2">
                  <Label>เหตุผลที่ Reject *</Label>
                  <SwapRejectReasonSelect value={rejectReasonId} onChange={setRejectReasonId} />
                </div>
                <div className="space-y-2">
                  <Label>เหตุผลอื่น ๆ</Label>
                  <Input
                    value={rejectReasonOther}
                    onChange={(e) => setRejectReasonOther(e.target.value)}
                    placeholder="ระบุเหตุผลถ้าไม่มีในรายการ"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="บันทึกเพิ่มเติม..." />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>ปิด</Button>
            {step < 3 && (
              <Button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              >
                ถัดไป <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
