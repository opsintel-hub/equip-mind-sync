import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Package, MapPin, Send, Loader2, Info, PlusCircle, X, ImagePlus, Search, Inbox, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface EquipmentItem {
  id: string; code: string; name: string; unit: string; category: string;
  brand: string | null; serial_number: string | null; department: string | null;
  quantity_in_stock: number; location_id: string | null;
}
interface MediaPlayerItem {
  id: string; code: string; name: string; unit: string; brand: string | null;
  remote_name: string | null;
  serial_number_1: string | null; serial_number_2: string | null; department: string | null; quantity: number;
  location_id: string | null; billboard_id: string | null;
}
interface BillboardEquipmentRecord {
  id: string; billboard_id: string; equipment_id: string; quantity: number;
  installation_date: string | null; notes: string | null;
  billboard_old_code?: string; billboard_location?: string;
}
interface DefectiveUnitEntry {
  id: string; serial_number: string; reason: string; item_condition: string;
  image_file: File | null; image_preview: string | null;
}

const DefectiveReturnEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [isMediaPlayer, setIsMediaPlayer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [mediaPlayerList, setMediaPlayerList] = useState<MediaPlayerItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [detectedBillboards, setDetectedBillboards] = useState<BillboardEquipmentRecord[]>([]);
  const [selectedBillboardEquipmentId, setSelectedBillboardEquipmentId] = useState("");
  const [isLoadingBillboard, setIsLoadingBillboard] = useState(false);
  const [perUnitMode, setPerUnitMode] = useState(false);
  const [defectiveUnits, setDefectiveUnits] = useState<DefectiveUnitEntry[]>([
    { id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }
  ]);
  const [quantity, setQuantity] = useState("1");
  const [itemCondition, setItemCondition] = useState("defective");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [snLookup, setSnLookup] = useState("");
  const [snLookupLoading, setSnLookupLoading] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterDepartment, setReporterDepartment] = useState("");
  const [fromAssessmentInfo, setFromAssessmentInfo] = useState<{ assessmentLogId: string; docNo: string | null } | null>(null);
  const [existingTicket, setExistingTicket] = useState<{ id: string; document_no: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "pending">("new");
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Auto-fill reporter from logged-in user's profile + first allowed department
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [profileRes, deptRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_departments").select("department").eq("user_id", user.id).limit(1).maybeSingle(),
      ]);
      if (profileRes.data) {
        setReporterName((prev) => prev || (profileRes.data as any).full_name || "");
      }
      if (deptRes.data) {
        setReporterDepartment((prev) => prev || (deptRes.data as any).department || "");
      }
    })();
  }, [user?.id]);

  const resetSelectionForType = (value: boolean) => {
    setIsMediaPlayer(value);
    setSelectedItemId("");
    setDetectedBillboards([]);
    setSelectedBillboardEquipmentId("");
  };

  const normalizeSearch = (value: string | null | undefined) =>
    (value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, "")
      .toLowerCase()
      .trim();

  const findLocalMediaPlayer = (term: string) => {
    const normalizedTerm = normalizeSearch(term);
    return mediaPlayerList.find((mp) =>
      [mp.serial_number_1, mp.serial_number_2, mp.code, mp.name]
        .some((value) => normalizeSearch(value).includes(normalizedTerm))
    );
  };

  const findLocalEquipment = (term: string) => {
    const normalizedTerm = normalizeSearch(term);
    return equipmentList.find((eq) =>
      [eq.serial_number, eq.code, eq.name]
        .some((value) => normalizeSearch(value).includes(normalizedTerm))
    );
  };

  const getMatchedSerial = (term: string, ...serials: Array<string | null | undefined>) => {
    const normalizedTerm = normalizeSearch(term);
    return serials.find((serial) => normalizeSearch(serial).includes(normalizedTerm))?.trim() || "";
  };

  const applyLookupSelection = (itemId: string, matchedSerial?: string) => {
    setSelectedItemId(itemId);
    if (matchedSerial) {
      setPerUnitMode(true);
      setDefectiveUnits([{ id: crypto.randomUUID(), serial_number: matchedSerial, reason: "", item_condition: "defective", image_file: null, image_preview: null }]);
    } else {
      setPerUnitMode(false);
      setDefectiveUnits([{ id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }]);
    }
  };

  const handleSnLookup = async () => {
    const term = snLookup.trim();
    if (!term) { toast.error("กรุณากรอก S/N, รหัสสินค้า หรือชื่อสินค้า"); return; }
    setSnLookupLoading(true);
    try {
      const likeTerm = `%${term.replace(/[%,]/g, "")}%`;
      const localMatch = isMediaPlayer ? findLocalMediaPlayer(term) : findLocalEquipment(term);
      if (localMatch) {
        const matchedSerial = isMediaPlayer
          ? getMatchedSerial(term, (localMatch as MediaPlayerItem).serial_number_1, (localMatch as MediaPlayerItem).serial_number_2)
          : getMatchedSerial(term, (localMatch as EquipmentItem).serial_number);
        applyLookupSelection(localMatch.id, matchedSerial);
        toast.success(`พบ${isMediaPlayer ? " Media Player" : "สินค้า/อะไหล่"} — ดึงข้อมูลแล้ว`);
        return;
      }

      // 1) Search receipt S/N by selected type (covers S/N 1 and S/N 2)
      const { data: rcvRow } = await supabase
        .from("goods_receipt_pending")
        .select("equipment_id, media_player_id, is_media_player, equipment_code, serial_number, serial_number_2")
        .or(`serial_number.ilike.${likeTerm},serial_number_2.ilike.${likeTerm},equipment_code.ilike.${likeTerm},equipment_name.ilike.${likeTerm}`)
        .eq("is_media_player", isMediaPlayer)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rcvRow) {
        const id = isMediaPlayer ? rcvRow.media_player_id : rcvRow.equipment_id;
        if (id) {
          applyLookupSelection(id, getMatchedSerial(term, rcvRow.serial_number, rcvRow.serial_number_2));
          toast.success(`พบจากเอกสารรับเข้า — ดึงข้อมูลแล้ว`);
          return;
        }
      }

      // 2) Fallback to authoritative table for equipment or Media Player master rows by selected type
      if (!isMediaPlayer) {
        const { data: snRow } = await supabase
          .from("equipment_serial_numbers")
          .select("equipment_id, status")
          .ilike("serial_number", likeTerm)
          .limit(1)
          .maybeSingle();
        if (snRow?.equipment_id) {
          applyLookupSelection(snRow.equipment_id, term);
          toast.success(`พบสินค้า/อะไหล่ — ดึงข้อมูลแล้ว`);
          return;
        }
      } else {
        const { data: mpRow } = await supabase
          .from("media_players")
          .select("id, serial_number_1, serial_number_2")
          .or(`serial_number_1.ilike.${likeTerm},serial_number_2.ilike.${likeTerm},code.ilike.${likeTerm},name.ilike.${likeTerm}`)
          .limit(1)
          .maybeSingle();
        if (mpRow?.id) {
          applyLookupSelection(mpRow.id, getMatchedSerial(term, mpRow.serial_number_1, mpRow.serial_number_2));
          toast.success(`พบ Media Player — ดึงข้อมูลแล้ว`);
          return;
        }
      }

      toast.error(`ไม่พบ "${term}" ในประเภท${isMediaPlayer ? " Media Player" : "สินค้า/อะไหล่"} — กรุณาตรวจสอบประเภทหรือเลือกด้วยตนเอง`);
    } catch (e: any) {
      toast.error("ค้นหาไม่สำเร็จ: " + e.message);
    } finally {
      setSnLookupLoading(false);
    }
  };

  const selectedEquipment = useMemo(() => equipmentList.find(e => e.id === selectedItemId), [equipmentList, selectedItemId]);
  const selectedMediaPlayer = useMemo(() => mediaPlayerList.find(m => m.id === selectedItemId), [mediaPlayerList, selectedItemId]);
  const selectedBillboardRecord = useMemo(() => detectedBillboards.find(b => b.id === selectedBillboardEquipmentId), [detectedBillboards, selectedBillboardEquipmentId]);

  useEffect(() => { fetchEquipment(); fetchMediaPlayers(); fetchPendingTickets(); }, []);
  useEffect(() => {
    if (selectedItemId && !isMediaPlayer) detectBillboardForEquipment(selectedItemId);
    else if (selectedItemId && isMediaPlayer) detectBillboardForMediaPlayer(selectedItemId);
    else { setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }
  }, [selectedItemId, isMediaPlayer, mediaPlayerList]);

  // Apply prefill from Assessment Dialog navigation
  useEffect(() => {
    const fa = (routerLocation.state as any)?.fromAssessment;
    if (!fa) return;
    setIsMediaPlayer(!!fa.isMediaPlayer);
    setFromAssessmentInfo({ assessmentLogId: fa.assessmentLogId, docNo: fa.docNo || null });
    // Wait for lists to be loaded then select item
    const tryApply = () => {
      if (fa.itemId) setSelectedItemId(fa.itemId);
      if (fa.serial) {
        setPerUnitMode(true);
        setDefectiveUnits([{
          id: crypto.randomUUID(),
          serial_number: fa.serial,
          reason: fa.reason || "จากการประเมิน",
          item_condition: "defective",
          image_file: null,
          image_preview: null,
        }]);
      } else {
        setReason(fa.reason || "จากการประเมิน");
      }
    };
    tryApply();
    toast.info(`เติมข้อมูลจากการประเมิน${fa.docNo ? ` (${fa.docNo})` : ""} แล้ว — โปรดยืนยันและบันทึกเพื่อตัด Stock`);
    window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.state, equipmentList.length, mediaPlayerList.length]);

  const fetchEquipment = async () => {
    const { data } = await supabase.from("equipment").select("id, code, name, unit, category, brand, serial_number, department, quantity_in_stock, location_id").eq("is_active", true).order("code");
    if (data) setEquipmentList(data);
  };
  const fetchMediaPlayers = async () => {
    const { data } = await supabase.from("media_players").select("id, code, name, unit, brand, remote_name, serial_number_1, serial_number_2, department, quantity, location_id, billboard_id").eq("is_active", true).order("code");
    if (data) setMediaPlayerList(data as MediaPlayerItem[]);
  };
  const detectBillboardForEquipment = async (equipmentId: string) => {
    setIsLoadingBillboard(true);
    try {
      const { data } = await supabase.from("billboard_equipment").select("id, billboard_id, equipment_id, quantity, installation_date, notes").eq("equipment_id", equipmentId);
      if (data && data.length > 0) {
        const billboardIds = data.map(d => d.billboard_id);
        const { data: billboards } = await supabase.from("billboards").select("id, old_code, location_name").in("id", billboardIds);
        const enriched = data.map(be => {
          const bb = billboards?.find(b => b.id === be.billboard_id);
          return { ...be, billboard_old_code: bb?.old_code || "-", billboard_location: bb?.location_name || "-" };
        });
        setDetectedBillboards(enriched);
        if (enriched.length === 1) setSelectedBillboardEquipmentId(enriched[0].id);
      } else { setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }
    } catch { setDetectedBillboards([]); } finally { setIsLoadingBillboard(false); }
  };
  const detectBillboardForMediaPlayer = async (mediaPlayerId: string) => {
    const mp = mediaPlayerList.find(m => m.id === mediaPlayerId);
    if (mp?.billboard_id) {
      setIsLoadingBillboard(true);
      try {
        const { data: bb } = await supabase.from("billboards").select("id, old_code, location_name").eq("id", mp.billboard_id).single();
        if (bb) {
          const record: BillboardEquipmentRecord = { id: `mp-${mp.id}`, billboard_id: bb.id, equipment_id: mp.id, quantity: mp.quantity, installation_date: null, notes: null, billboard_old_code: bb.old_code || "-", billboard_location: bb.location_name || "-" };
          setDetectedBillboards([record]); setSelectedBillboardEquipmentId(record.id);
        }
      } catch { setDetectedBillboards([]); } finally { setIsLoadingBillboard(false); }
    } else { setDetectedBillboards([]); setSelectedBillboardEquipmentId(""); }
  };

  const fetchPendingTickets = async () => {
    setPendingLoading(true);
    try {
      const { data, error } = await supabase
        .from("defective_returns")
        .select("id, document_no, status, source_type, reason, notes, quantity, is_media_player, equipment_id, media_player_id, billboard_id, assessment_log_id, swap_request_id, reporter_name, reporter_department, created_at")
        .eq("status", "pending_warehouse_entry")
        .is("stock_deducted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const eqIds = [...new Set((data || []).filter((d: any) => d.equipment_id).map((d: any) => d.equipment_id))];
      const mpIds = [...new Set((data || []).filter((d: any) => d.media_player_id).map((d: any) => d.media_player_id))];
      const bbIds = [...new Set((data || []).filter((d: any) => d.billboard_id).map((d: any) => d.billboard_id))];
      const swapIds = [...new Set((data || []).filter((d: any) => d.swap_request_id).map((d: any) => d.swap_request_id))];
      const asmIds = [...new Set((data || []).filter((d: any) => d.assessment_log_id).map((d: any) => d.assessment_log_id))];

      const [eqRes, mpRes, bbRes, swapRes, asmRes] = await Promise.all([
        eqIds.length ? supabase.from("equipment").select("id, code, name, brand, serial_number, department").in("id", eqIds) : Promise.resolve({ data: [] }),
        mpIds.length ? supabase.from("media_players").select("id, code, name, remote_name, brand, serial_number_1, serial_number_2, warranty_expiry_date, department, model_id, specification").in("id", mpIds) : Promise.resolve({ data: [] }),
        bbIds.length ? supabase.from("billboards").select("id, equipment_id, old_code, location_name").in("id", bbIds) : Promise.resolve({ data: [] }),
        swapIds.length ? supabase.from("swap_requests").select("id, document_no, billboard_id, old_serial_number, new_serial_number, old_media_player_id, new_media_player_id, old_equipment_id, new_equipment_id, description").in("id", swapIds) : Promise.resolve({ data: [] }),
        asmIds.length ? supabase.from("assessment_logs").select("id, document_no").in("id", asmIds) : Promise.resolve({ data: [] }),
      ]);
      const modelIds = [...new Set(((mpRes.data || []) as any[]).map((m) => m.model_id).filter(Boolean))];
      const modelRes = modelIds.length
        ? await supabase.from("media_player_models").select("id, name").in("id", modelIds)
        : { data: [] as any[] };
      const swapBbIds = [...new Set(((swapRes.data || []) as any[]).map((s) => s.billboard_id).filter(Boolean))];
      const extraBbRes = swapBbIds.length
        ? await supabase.from("billboards").select("id, equipment_id, old_code, location_name").in("id", swapBbIds)
        : { data: [] as any[] };
      const swapMpIds = [...new Set(((swapRes.data || []) as any[]).flatMap((s) => [s.old_media_player_id, s.new_media_player_id]).filter(Boolean))];
      const swapMpRes = swapMpIds.length
        ? await supabase.from("media_players").select("id, code, name, remote_name").in("id", swapMpIds)
        : { data: [] as any[] };

      const modelMap = new Map(((modelRes.data || []) as any[]).map((m) => [m.id, m.name]));
      const eqMap = new Map((eqRes.data || []).map((e: any) => [e.id, e]));
      const mpMap = new Map((mpRes.data || []).map((m: any) => [m.id, m]));
      const bbMap = new Map([...((bbRes.data || []) as any[]), ...((extraBbRes.data || []) as any[])].map((b: any) => [b.id, b]));
      const swapMap = new Map(((swapRes.data || []) as any[]).map((s) => [s.id, s]));
      const swapMpMap = new Map(((swapMpRes.data || []) as any[]).map((m) => [m.id, m]));
      const asmMap = new Map(((asmRes.data || []) as any[]).map((a) => [a.id, a]));

      const enriched = (data || []).map((d: any) => {
        const item: any = d.is_media_player ? mpMap.get(d.media_player_id) : eqMap.get(d.equipment_id);
        const swap: any = d.swap_request_id ? swapMap.get(d.swap_request_id) : null;
        const bbId = d.billboard_id || swap?.billboard_id || null;
        const bb: any = bbId ? bbMap.get(bbId) : null;
        const asm: any = d.assessment_log_id ? asmMap.get(d.assessment_log_id) : null;
        const sns = d.is_media_player
          ? [item?.serial_number_1, item?.serial_number_2].filter(Boolean)
          : [item?.serial_number].filter(Boolean);
        const labelOf = (mp: any) => mp ? `${mp.code}${mp.remote_name ? ` (${mp.remote_name})` : mp.name ? ` - ${mp.name}` : ""}` : null;
        const swapInfo = swap ? {
          doc_no: swap.document_no,
          old_sn: swap.old_serial_number,
          new_sn: swap.new_serial_number,
          old_label: labelOf(swap.old_media_player_id ? swapMpMap.get(swap.old_media_player_id) : null),
          new_label: labelOf(swap.new_media_player_id ? swapMpMap.get(swap.new_media_player_id) : null),
          description: swap.description,
        } : null;
        return {
          ...d,
          item_code: item?.code || "-",
          item_name: item?.name || "-",
          remote_name: item?.remote_name || null,
          brand: item?.brand || null,
          model_name: item?.model_id ? modelMap.get(item.model_id) || null : null,
          specification: item?.specification || null,
          department: item?.department || null,
          warranty_expiry_date: item?.warranty_expiry_date || null,
          serial_numbers: sns,
          billboard_label: bb ? [bb.old_code, bb.equipment_id, bb.location_name].filter(Boolean).join(" - ") : null,
          assessment_doc_no: asm?.document_no || null,
          swap_info: swapInfo,
          source_label: swap ? "จาก Swap" : d.source_type === "from_assessment" ? "จากการประเมิน" : d.source_type === "billboard" ? "จากป้าย" : "ป้อนเอง",
        };
      });
      setPendingTickets(enriched);
    } catch (e: any) {
      toast.error("โหลดตั๋วรอดำเนินการไม่สำเร็จ: " + e.message);
    } finally {
      setPendingLoading(false);
    }
  };

  const handleProcessTicket = (ticket: any) => {
    // Switch to "new" tab and prefill the form, BIND to existing ticket so submit UPDATEs (not INSERTs)
    setActiveTab("new");
    setIsMediaPlayer(!!ticket.is_media_player);
    setSelectedItemId(ticket.is_media_player ? ticket.media_player_id : ticket.equipment_id);
    setReason(ticket.reason || "");
    setNotes(ticket.notes || "");
    setQuantity(String(ticket.quantity || 1));
    setPerUnitMode(false);
    setFromAssessmentInfo(ticket.assessment_log_id ? { assessmentLogId: ticket.assessment_log_id, docNo: ticket.document_no } : null);
    setExistingTicket({ id: ticket.id, document_no: ticket.document_no });
    if (ticket.reporter_name) setReporterName(ticket.reporter_name);
    if (ticket.reporter_department) setReporterDepartment(ticket.reporter_department);
    toast.info(`เลือกตั๋ว ${ticket.document_no} แล้ว — ยืนยันข้อมูลและกดบันทึกเพื่อตัด Stock เข้าคลังของเสีย`);
  };

  const equipmentOptions = useMemo(() => {
    if (isMediaPlayer) {
      return mediaPlayerList.map(mp => ({
        value: mp.id,
        label: `${mp.code} - ${mp.name}`,
        description: [mp.serial_number_1 && `S/N 1: ${mp.serial_number_1}`, mp.serial_number_2 && `S/N 2: ${mp.serial_number_2}`, `คงเหลือในคลัง: ${mp.quantity} เครื่อง`].filter(Boolean).join(" | "),
        searchableText: [mp.code, mp.name, mp.serial_number_1, mp.serial_number_2].filter(Boolean).join(" "),
      }));
    }
    return equipmentList.map(e => ({
      value: e.id,
      label: `${e.code} - ${e.name}`,
      description: [e.serial_number && `S/N: ${e.serial_number}`, `คงเหลือในคลัง: ${e.quantity_in_stock} ${e.unit || "ชิ้น"}`].filter(Boolean).join(" | "),
      searchableText: [e.code, e.name, e.serial_number].filter(Boolean).join(" "),
    }));
  }, [isMediaPlayer, mediaPlayerList, equipmentList]);

  // Cap จำนวนเฉพาะกรณี "ถอดจากป้าย" (ถอดได้ไม่เกินที่ติดตั้งอยู่)
  // กรณีอื่น (จากคลัง/หน้างาน/Swap) ไม่ cap เพราะของเสียคือ "นำเข้า" คลัง DEFECT ไม่ใช่ตัดจากคลังหลัก
  const maxQuantity = useMemo(() => {
    if (selectedBillboardRecord && !isMediaPlayer) return selectedBillboardRecord.quantity;
    return 999;
  }, [selectedBillboardRecord, isMediaPlayer]);

  // ข้อมูลคงเหลือในคลังหลัก (เพื่อแสดงเป็นข้อมูลอ้างอิงเท่านั้น)
  const stockOnHand = useMemo(() => {
    if (isMediaPlayer && selectedMediaPlayer) return selectedMediaPlayer.quantity;
    if (selectedEquipment) return selectedEquipment.quantity_in_stock;
    return null;
  }, [isMediaPlayer, selectedMediaPlayer, selectedEquipment]);

  const isFromBillboard = selectedBillboardEquipmentId !== "" && detectedBillboards.length > 0;
  const generateDocNo = () => `DR-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 9999 + 1).toString().padStart(4, "0")}`;

  // Get quarantine location for defective items
  const getQuarantineLocationId = async (): Promise<string | null> => {
    const { data } = await supabase.from("locations").select("id").eq("code", "LOC-DEFECT").maybeSingle();
    return data?.id || null;
  };

  // Deduct stock from main inventory + log movement to "คลังของเสีย"
  const deductStockToQuarantine = async (params: {
    isMP: boolean;
    itemId: string;
    qty: number;
    docNo: string;
    drId: string;
    reasonText: string;
    quarantineLocId: string | null;
  }) => {
    const { isMP, itemId, qty, docNo, drId, reasonText, quarantineLocId } = params;

    if (isMP) {
      const mp = mediaPlayerList.find(m => m.id === itemId);
      if (!mp) return;
      const stockBefore = mp.quantity || 0;
      const stockAfter = Math.max(0, stockBefore - qty);
      await supabase.from("media_players").update({
        quantity: stockAfter,
        location_id: quarantineLocId,
        status: "defective",
      }).eq("id", itemId);
      await supabase.from("stock_movements").insert({
        equipment_id: itemId,
        equipment_code: mp.code,
        equipment_name: mp.name,
        movement_type: "defective_quarantine",
        quantity: -qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reference_type: "defective_return",
        reference_id: drId,
        reference_document: docNo,
        location_id: quarantineLocId,
        notes: `[ของเสีย → คลังของเสีย] ${reasonText}`,
        item_condition: "defective",
        created_by: user?.id,
      });
    } else {
      const eq = equipmentList.find(e => e.id === itemId);
      if (!eq) return;
      const stockBefore = eq.quantity_in_stock || 0;
      const stockAfter = Math.max(0, stockBefore - qty);
      await supabase.from("equipment").update({ quantity_in_stock: stockAfter }).eq("id", itemId);
      await supabase.from("stock_movements").insert({
        equipment_id: itemId,
        equipment_code: eq.code,
        equipment_name: eq.name,
        movement_type: "defective_quarantine",
        quantity: -qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reference_type: "defective_return",
        reference_id: drId,
        reference_document: docNo,
        location_id: quarantineLocId,
        notes: `[ของเสีย → คลังของเสีย] ${reasonText}`,
        item_condition: "defective",
        created_by: user?.id,
      });
    }
  };

  const handleReset = () => {
    setSelectedItemId(""); setSelectedBillboardEquipmentId(""); setDetectedBillboards([]);
    setQuantity("1"); setItemCondition("defective"); setReason(""); setNotes("");
    setPerUnitMode(false);
    setExistingTicket(null);
    setFromAssessmentInfo(null);
    setDefectiveUnits([{ id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }]);
  };


  const handleSubmit = async () => {
    if (!selectedItemId) { toast.error("กรุณาเลือกสินค้า"); return; }
    if (!reporterName.trim() || !reporterDepartment.trim()) {
      toast.error("กรุณาระบุ 'ผู้แจ้งนำของเสียเข้าระบบ' และ 'ฝ่าย'");
      return;
    }

    const quarantineLocId = await getQuarantineLocationId();
    if (!quarantineLocId) {
      toast.error("ไม่พบ 'คลังของเสีย' ในระบบ — กรุณาติดต่อผู้ดูแล");
      return;
    }

    if (perUnitMode) {
      if (existingTicket) { toast.error("ตั๋วเดิมไม่รองรับโหมดรายชิ้น — กรุณาปิดสวิตช์ 'ระบุข้อมูลรายชิ้น'"); return; }
      const validUnits = defectiveUnits.filter(u => u.serial_number.trim() && u.reason.trim());
      if (validUnits.length === 0) { toast.error("กรุณากรอก Serial Number และเหตุผล อย่างน้อย 1 ชิ้น"); return; }
      setIsSubmitting(true);
      try {
        let successCount = 0;
        const nowIso = new Date().toISOString();
        for (const unitEntry of validUnits) {
          const docNo = generateDocNo();
          const reasonText = `S/N: ${unitEntry.serial_number} - ${unitEntry.reason}`;
          const { data: drRow, error } = await supabase.from("defective_returns").insert({
            document_no: docNo, equipment_id: isMediaPlayer ? null : selectedItemId,
            media_player_id: isMediaPlayer ? selectedItemId : null, is_media_player: isMediaPlayer,
            quantity: 1, billboard_id: selectedBillboardRecord?.billboard_id || null,
            item_condition: unitEntry.item_condition, reason: reasonText,
            status: "pending_warehouse_entry",
            source_type: fromAssessmentInfo ? "from_assessment" : (isFromBillboard ? "billboard" : "warehouse"),
            quarantine_location_id: quarantineLocId,
            stock_deducted_at: nowIso,
            dispose_status: "pending_disposal_review",
            reporter_name: reporterName.trim() || null,
            reporter_department: reporterDepartment.trim() || null,
            assessment_log_id: fromAssessmentInfo?.assessmentLogId || null,
            created_by: user?.id,
          } as any).select("id").maybeSingle();
          if (!error && drRow) {
            successCount++;
            // 🔒 Cut stock + log movement to quarantine
            await deductStockToQuarantine({
              isMP: isMediaPlayer, itemId: selectedItemId, qty: 1,
              docNo, drId: drRow.id, reasonText, quarantineLocId,
            });
            // Update equipment_serial_numbers status to defective
            if (!isMediaPlayer && unitEntry.serial_number.trim()) {
              await supabase.from("equipment_serial_numbers").update({ status: "defective" })
                .eq("equipment_id", selectedItemId)
                .eq("serial_number", unitEntry.serial_number.trim())
                .eq("status", "in_stock");
            }
          }
        }
        if (isFromBillboard && !isMediaPlayer) {
          const be = detectedBillboards.find(b => b.id === selectedBillboardEquipmentId);
          if (be) {
            const totalQty = validUnits.length;
            await supabase.from("billboard_equipment_history").insert({ billboard_id: be.billboard_id, equipment_id: selectedItemId, quantity: totalQty, installation_date: be.installation_date, uninstall_date: new Date().toISOString().split("T")[0], uninstalled_by: user?.id, uninstall_reason: `ของเสีย: ${validUnits.map(u => u.serial_number).join(", ")}`, installation_notes: be.notes });
            if (totalQty >= be.quantity) await supabase.from("billboard_equipment").delete().eq("id", be.id);
            else await supabase.from("billboard_equipment").update({ quantity: be.quantity - totalQty }).eq("id", be.id);
          }
        }
        if (isFromBillboard && isMediaPlayer) {
          const billboardId = selectedBillboardRecord?.billboard_id || null;
          if (billboardId) {
            await supabase
              .from("media_player_billboard_history")
              .update({
                uninstall_date: new Date().toISOString().split("T")[0],
                uninstall_reason: `ของเสีย: ${validUnits.map(u => u.serial_number).join(", ")}`,
                uninstalled_by: user?.id ?? null,
                return_to_stock: false,
              } as any)
              .eq("media_player_id", selectedItemId)
              .eq("billboard_id", billboardId)
              .is("uninstall_date", null);
          }
          await supabase.from("media_players").update({ billboard_id: null, status: "defective" }).eq("id", selectedItemId);
        }
        toast.success(`บันทึกของเสีย/ชำรุดสำเร็จ ${successCount} รายการ — ตัด Stock เข้า "คลังของเสีย" แล้ว`);
        handleReset();
      } catch (error: any) { toast.error("เกิดข้อผิดพลาด: " + error.message); } finally { setIsSubmitting(false); }
    } else {
      if (!reason.trim()) { toast.error("กรุณาระบุเหตุผล/สาเหตุ"); return; }
      const qty = parseInt(quantity);
      if (!qty || qty < 1) { toast.error("กรุณาระบุจำนวนที่ถูกต้อง"); return; }
      if (qty > maxQuantity) { toast.error(`จำนวนเกินกว่าที่มีอยู่ (สูงสุด ${maxQuantity})`); return; }
      setIsSubmitting(true);
      try {
        const billboardId = selectedBillboardRecord?.billboard_id || null;
        const nowIso = new Date().toISOString();
        let docNo: string;
        let drId: string;

        if (existingTicket) {
          // UPDATE existing ticket — DO NOT insert a new defective_returns row
          docNo = existingTicket.document_no;
          drId = existingTicket.id;
          const { error: updErr } = await supabase.from("defective_returns").update({
            quantity: qty,
            item_condition: itemCondition,
            reason: reason.trim(),
            billboard_id: billboardId,
            quarantine_location_id: quarantineLocId,
            stock_deducted_at: nowIso,
            dispose_status: "pending_disposal_review",
            reporter_name: reporterName.trim() || null,
            reporter_department: reporterDepartment.trim() || null,
            notes: notes.trim() || null,
          } as any).eq("id", existingTicket.id);
          if (updErr) throw updErr;
        } else {
          docNo = generateDocNo();
          const { data: drRow, error: insertError } = await supabase.from("defective_returns").insert({
            document_no: docNo, equipment_id: isMediaPlayer ? null : selectedItemId,
            media_player_id: isMediaPlayer ? selectedItemId : null, is_media_player: isMediaPlayer,
            quantity: qty, billboard_id: billboardId, item_condition: itemCondition,
            reason: reason.trim(), status: "pending_warehouse_entry",
            source_type: fromAssessmentInfo ? "from_assessment" : (isFromBillboard ? "billboard" : "warehouse"),
            quarantine_location_id: quarantineLocId,
            stock_deducted_at: nowIso,
            dispose_status: "pending_disposal_review",
            reporter_name: reporterName.trim() || null,
            reporter_department: reporterDepartment.trim() || null,
            assessment_log_id: fromAssessmentInfo?.assessmentLogId || null,
            created_by: user?.id,
          } as any).select("id").maybeSingle();
          if (insertError) throw insertError;
          if (!drRow) throw new Error("ไม่สามารถบันทึกใบนำของเสียได้");
          drId = drRow.id;
        }

        // 🔒 Cut stock + log movement to quarantine
        await deductStockToQuarantine({
          isMP: isMediaPlayer, itemId: selectedItemId, qty,
          docNo, drId, reasonText: reason.trim(), quarantineLocId,
        });
        if (isFromBillboard && billboardId && !isMediaPlayer) {
          const be = detectedBillboards.find(b => b.id === selectedBillboardEquipmentId);
          if (be) {
            await supabase.from("billboard_equipment_history").insert({ billboard_id: billboardId, equipment_id: selectedItemId, quantity: qty, installation_date: be.installation_date, uninstall_date: new Date().toISOString().split("T")[0], uninstalled_by: user?.id, uninstall_reason: `ของเสีย/ชำรุด: ${reason}`, installation_notes: be.notes });
            if (qty >= be.quantity) await supabase.from("billboard_equipment").delete().eq("id", be.id);
            else await supabase.from("billboard_equipment").update({ quantity: be.quantity - qty }).eq("id", be.id);
          }
        }
        if (isFromBillboard && isMediaPlayer && billboardId) {
          await supabase
            .from("media_player_billboard_history")
            .update({
              uninstall_date: new Date().toISOString().split("T")[0],
              uninstall_reason: `ของเสีย/ชำรุด: ${reason}`,
              uninstalled_by: user?.id ?? null,
              return_to_stock: false,
            } as any)
            .eq("media_player_id", selectedItemId)
            .eq("billboard_id", billboardId)
            .is("uninstall_date", null);
          await supabase.from("media_players").update({ billboard_id: null, status: "defective" }).eq("id", selectedItemId);
        }
        if (existingTicket) {
          toast.success(`ยืนยันตั๋ว ${docNo} แล้ว — ตัด Stock ${qty} หน่วยเข้า "คลังของเสีย"`);
        } else {
          toast.success(`บันทึกสำเร็จ (${docNo}) — ตัด Stock ${qty} หน่วยเข้า "คลังของเสีย" แล้ว`);
        }
        handleReset();
        fetchPendingTickets();
      } catch (error: any) { toast.error("เกิดข้อผิดพลาด: " + error.message); } finally { setIsSubmitting(false); }
    }
  };

  const displayItem = isMediaPlayer ? selectedMediaPlayer : selectedEquipment;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          นำของเสีย/ชำรุดเข้าระบบ
        </h1>
        <p className="text-muted-foreground">บันทึกสินค้าหรืออุปกรณ์ที่เสียหรือชำรุดเพื่อรอนำเข้าคลัง</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); if (v === "pending") fetchPendingTickets(); }}>
        <TabsList>
          <TabsTrigger value="new"><PlusCircle className="w-4 h-4 mr-1" /> สร้างใหม่</TabsTrigger>
          <TabsTrigger value="pending">
            <Inbox className="w-4 h-4 mr-1" /> ตั๋วรอดำเนินการ
            {pendingTickets.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">{pendingTickets.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                ตั๋วของเสียที่รอนำเข้าคลัง
              </CardTitle>
              <CardDescription>
                รายการที่สร้างจากการประเมิน / Swap / ป้อนเอง — ยังไม่ได้ตัด Stock เข้าคลังของเสีย
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังโหลด...
                </div>
              ) : pendingTickets.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  ไม่มีตั๋วรอดำเนินการ
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTickets.map((t) => {
                    const warrantyTxt = t.warranty_expiry_date
                      ? new Date(t.warranty_expiry_date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
                      : null;
                    const inWarranty = t.warranty_expiry_date ? new Date(t.warranty_expiry_date) >= new Date() : null;
                    return (
                    <div key={t.id} className="border rounded-lg p-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm">{t.document_no}</span>
                          <Badge variant="secondary" className="text-xs">{t.source_label}</Badge>
                          {t.is_media_player && <Badge variant="outline" className="text-xs">Media Player</Badge>}
                          {t.quantity > 1 && <Badge variant="outline" className="text-xs">× {t.quantity}</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(t.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-mono font-medium">{t.item_code}</span>
                          {t.remote_name ? <> — <span className="font-medium">{t.remote_name}</span></> : t.item_name ? <> — {t.item_name}</> : null}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {t.brand && <span>ยี่ห้อ: <span className="text-foreground">{t.brand}</span></span>}
                          {t.model_name && <span>รุ่น: <span className="text-foreground">{t.model_name}</span></span>}
                          {t.department && <span>แผนก: <span className="text-foreground">{t.department}</span></span>}
                        </div>
                        {t.serial_numbers?.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            S/N: <span className="font-mono text-foreground whitespace-pre-line">{t.serial_numbers.join("\n")}</span>
                          </div>
                        )}
                        {warrantyTxt && (
                          <div className="text-xs">
                            <Badge variant={inWarranty ? "default" : "destructive"} className="text-[10px] py-0 px-1.5 h-4">
                              {inWarranty ? "ในประกัน" : "หมดประกัน"}
                            </Badge>
                            <span className="ml-1 text-muted-foreground">หมดประกัน: {warrantyTxt}</span>
                          </div>
                        )}
                        {t.billboard_label && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> ป้าย: <span className="text-foreground">{t.billboard_label}</span>
                          </div>
                        )}
                        {t.swap_info && (
                          <div className="text-xs rounded-md border border-blue-300/60 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-950/30 px-2 py-1.5 space-y-0.5">
                            <div className="font-medium text-blue-700 dark:text-blue-300">
                              🔄 จาก Swap: <span className="font-mono">{t.swap_info.doc_no}</span>
                            </div>
                            {(t.swap_info.old_label || t.swap_info.old_sn) && (
                              <div>เครื่องเก่า (ถอดออก): <span className="text-foreground font-medium">{t.swap_info.old_label || "—"}</span>{t.swap_info.old_sn && <> · S/N: <span className="font-mono">{t.swap_info.old_sn}</span></>}</div>
                            )}
                            {(t.swap_info.new_label || t.swap_info.new_sn) && (
                              <div>เครื่องใหม่ (ติดตั้งแทน): <span className="text-foreground font-medium">{t.swap_info.new_label || "—"}</span>{t.swap_info.new_sn && <> · S/N: <span className="font-mono">{t.swap_info.new_sn}</span></>}</div>
                            )}
                            {t.swap_info.description && <div className="text-muted-foreground">อาการ: {t.swap_info.description}</div>}
                          </div>
                        )}
                        {t.assessment_doc_no && (
                          <div className="text-xs text-muted-foreground">📋 จากการประเมิน: <span className="font-mono text-foreground">{t.assessment_doc_no}</span></div>
                        )}
                        {(t.reporter_name || t.reporter_department) && (
                          <div className="text-xs text-muted-foreground">ผู้แจ้ง: <span className="text-foreground">{t.reporter_name || "—"}</span>{t.reporter_department && <> · ฝ่าย: <span className="text-foreground">{t.reporter_department}</span></>}</div>
                        )}
                        {t.reason && (
                          <div className="text-xs text-muted-foreground line-clamp-2">เหตุผล: {t.reason}</div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleProcessTicket(t)}>
                        ดำเนินการ <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ข้อมูลสินค้าเสีย/ชำรุด</CardTitle>
            <CardDescription>เลือกสินค้า ระบบจะดึงข้อมูลเดิมมาให้อัตโนมัติ รวมถึงตรวจสอบว่าติดตั้งบนป้ายโฆษณาหรือไม่</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Label className="text-sm font-medium">ประเภทที่ต้องการค้นหา:</Label>
              <span className={`text-sm ${!isMediaPlayer ? "font-semibold text-primary" : "text-muted-foreground"}`}>สินค้า/อะไหล่</span>
              <Switch checked={isMediaPlayer} onCheckedChange={resetSelectionForType} />
              <span className={`text-sm ${isMediaPlayer ? "font-semibold text-primary" : "text-muted-foreground"}`}>Media Player</span>
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Search className="w-4 h-4" /> ค้นหา{isMediaPlayer ? " Media Player" : "สินค้า/อะไหล่"}ด้วย S/N, รหัส หรือชื่อ
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder={isMediaPlayer ? "พิมพ์ S/N เช่น BCD004 หรือรหัส Media Player..." : "พิมพ์ S/N, รหัสสินค้า หรือชื่อสินค้า..."}
                  value={snLookup}
                  onChange={(e) => setSnLookup(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSnLookup(); } }}
                  className="bg-background"
                />
                <Button type="button" onClick={handleSnLookup} disabled={snLookupLoading} variant="default">
                  {snLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="ml-1">ค้นหา</span>
                </Button>
              </div>
              <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80">
                💡 เลือกประเภทก่อนค้นหา เพื่อให้ระบบค้นในชุดข้อมูลที่ถูกต้องและดึงข้อมูลเข้าฟอร์มอัตโนมัติ
              </p>
            </div>

            <div className="space-y-2">
              <Label>{isMediaPlayer ? "เลือก Media Player *" : "เลือกสินค้า/อะไหล่ *"}</Label>
              <SearchableSelect options={equipmentOptions} value={selectedItemId} onValueChange={setSelectedItemId} placeholder={isMediaPlayer ? "พิมพ์ S/N, รหัส หรือชื่อ Media Player เพื่อค้นหา..." : "พิมพ์ S/N, รหัส หรือชื่อสินค้าเพื่อค้นหา..."} searchPlaceholder="ค้นหา S/N / รหัส / ชื่อ..." emptyMessage={isMediaPlayer ? "ไม่พบ Media Player" : "ไม่พบสินค้า/อะไหล่"} />
            </div>

            {isLoadingBillboard && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบข้อมูลป้ายโฆษณา...
              </div>
            )}

            {!isLoadingBillboard && detectedBillboards.length > 0 && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <MapPin className="w-4 h-4" /> ตรวจพบว่าสินค้านี้ติดตั้งอยู่บนป้ายโฆษณา
                </div>
                {detectedBillboards.length === 1 ? (
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">ป้าย:</span> {detectedBillboards[0].billboard_old_code} - {detectedBillboards[0].billboard_location}</p>
                    <p><span className="font-medium">จำนวนติดตั้ง:</span> {detectedBillboards[0].quantity}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> ระบบจะถอดสินค้าออกจากป้ายนี้อัตโนมัติเมื่อบันทึก</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm">เลือกป้ายที่ต้องการถอดออก:</Label>
                    <Select value={selectedBillboardEquipmentId} onValueChange={setSelectedBillboardEquipmentId}>
                      <SelectTrigger><SelectValue placeholder="เลือกป้ายโฆษณา..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ไม่ระบุป้าย (จากคลัง)</SelectItem>
                        {detectedBillboards.map(be => (<SelectItem key={be.id} value={be.id}>{be.billboard_old_code} - {be.billboard_location} (จำนวน {be.quantity})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {!isLoadingBillboard && selectedItemId && detectedBillboards.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                <Info className="w-4 h-4" /> สินค้านี้ไม่ได้ติดตั้งบนป้ายโฆษณา (จากคลัง/ภาคสนาม)
              </div>
            )}

            {/* Per-unit mode */}
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch id="perUnitDefective" checked={perUnitMode} onCheckedChange={(checked) => {
                    setPerUnitMode(checked);
                    if (!checked) setDefectiveUnits([{ id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }]);
                  }} />
                  <Label htmlFor="perUnitDefective" className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                    <Package className="w-4 h-4" /> ระบุข้อมูลรายชิ้น (S/N, เหตุผล, สภาพ, รูปภาพ)
                  </Label>
                </div>
                {perUnitMode && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setDefectiveUnits(prev => [...prev, { id: crypto.randomUUID(), serial_number: "", reason: "", item_condition: "defective", image_file: null, image_preview: null }])} className="gap-1 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30">
                    <PlusCircle className="w-4 h-4" /> เพิ่มชิ้น
                  </Button>
                )}
              </div>
              {perUnitMode && (
                <>
                  <p className="text-xs text-red-600/80 dark:text-red-500/80">💡 กรอก S/N และเหตุผลของแต่ละชิ้น — ระบบจะสร้างรายการอัตโนมัติ ({defectiveUnits.length} ชิ้น)</p>
                  <div className="space-y-3">
                    {defectiveUnits.map((unitEntry, idx) => (
                      <div key={unitEntry.id} className="p-3 bg-background border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">ชิ้นที่ {idx + 1}</span>
                          {defectiveUnits.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => { if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview); setDefectiveUnits(prev => prev.filter(u => u.id !== unitEntry.id)); }}>
                              <X className="w-3 h-3 mr-1" /> ลบ
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Serial Number *</Label>
                            <Input placeholder="กรอก S/N..." value={unitEntry.serial_number} onChange={e => setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, serial_number: e.target.value } : u))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">สภาพ *</Label>
                            <Select value={unitEntry.item_condition} onValueChange={(v) => setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, item_condition: v } : u))}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                                <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">เหตุผล *</Label>
                            <Input placeholder="สาเหตุ..." value={unitEntry.reason} onChange={e => setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, reason: e.target.value } : u))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">รูปภาพ</Label>
                            <div className="flex items-center gap-2">
                              <input type="file" accept="image/*" className="hidden" id={`defect-image-${unitEntry.id}`} onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) { toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)"); return; }
                                  if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview);
                                  const preview = URL.createObjectURL(file);
                                  setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, image_file: file, image_preview: preview } : u));
                                }
                              }} />
                              {unitEntry.image_preview ? (
                                <div className="flex items-center gap-2">
                                  <img src={unitEntry.image_preview} alt="Preview" className="w-10 h-10 rounded object-cover border" />
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => { if (unitEntry.image_preview) URL.revokeObjectURL(unitEntry.image_preview); setDefectiveUnits(prev => prev.map(u => u.id === unitEntry.id ? { ...u, image_file: null, image_preview: null } : u)); }}><X className="w-3 h-3" /></Button>
                                </div>
                              ) : (
                                <Button type="button" variant="outline" size="sm" className="h-9 w-full" onClick={() => document.getElementById(`defect-image-${unitEntry.id}`)?.click()}>
                                  <ImagePlus className="w-4 h-4 mr-1" /> เลือกรูป
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!perUnitMode && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวนของเสียที่จะนำเข้า *</Label>
                    <Input type="number" min="1" max={maxQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    {maxQuantity < 999
                      ? <p className="text-xs text-muted-foreground">สูงสุด {maxQuantity} (จำนวนที่ติดตั้งบนป้าย)</p>
                      : stockOnHand !== null && <p className="text-xs text-muted-foreground">คงเหลือในคลังหลัก: {stockOnHand} (เพื่อข้อมูลอ้างอิงเท่านั้น)</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>สถานะการใช้งาน *</Label>
                    <Select value={itemCondition} onValueChange={setItemCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                        <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>เหตุผล/สาเหตุ *</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุสาเหตุที่เสียหรือชำรุด..." rows={3} />
                </div>
              </>
            )}

            {/* Reporter info — who is asking warehouse staff to put this defective item into system */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-2">
                <Label>ผู้แจ้งนำของเสียเข้าระบบ <span className="text-destructive">*</span></Label>
                <Input
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="ชื่อ-สกุลผู้แจ้ง (เช่น ช่างที่นำของมาให้คลัง)"
                />
                <p className="text-[11px] text-muted-foreground">เติมอัตโนมัติจากผู้ล็อกอิน — แก้ไขได้ถ้าแจ้งแทนคนอื่น</p>
              </div>
              <div className="space-y-2">
                <Label>ฝ่าย <span className="text-destructive">*</span></Label>
                <SimpleDepartmentSelect value={reporterDepartment} onChange={setReporterDepartment} />
                <p className="text-[11px] text-muted-foreground">เติมอัตโนมัติจากสิทธิ์ของผู้ล็อกอิน — เปลี่ยนได้</p>
              </div>
            </div>

            {fromAssessmentInfo && (
              <div className="p-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-xs">
                📋 รายการนี้มาจากการประเมิน {fromAssessmentInfo.docNo ? <span className="font-mono font-medium">{fromAssessmentInfo.docNo}</span> : null} — กดบันทึกเพื่อยืนยันและตัด Stock เข้าคลังของเสีย
              </div>
            )}

            <div className="space-y-2">
              <Label>หมายเหตุเพิ่มเติม</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุอื่นๆ (ถ้ามี)" rows={2} />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSubmit} disabled={isSubmitting || !selectedItemId} className="flex-1">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {perUnitMode ? `บันทึกของเสีย (${defectiveUnits.filter(u => u.serial_number.trim() && u.reason.trim()).length} ชิ้น)` : "บันทึกของเสีย/ชำรุด"}
              </Button>
              <Button variant="outline" onClick={handleReset}>ล้างข้อมูล</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> ข้อมูลสินค้า</CardTitle></CardHeader>
          <CardContent>
            {displayItem ? (
              <div className="space-y-3 text-sm">
                <InfoRow label="รหัส" value={(displayItem as any).code} />
                <InfoRow
                  label={isMediaPlayer ? "ชื่อ Remote" : "ชื่อ"}
                  value={isMediaPlayer ? (selectedMediaPlayer?.remote_name || (displayItem as any).name) : (displayItem as any).name}
                />
                <InfoRow label="หน่วย" value={(displayItem as any).unit} />
                {!isMediaPlayer && selectedEquipment && (<>
                  <InfoRow label="หมวดหมู่" value={selectedEquipment.category} />
                  <InfoRow label="ยี่ห้อ" value={selectedEquipment.brand || "-"} />
                  <InfoRow label="Serial No." value={selectedEquipment.serial_number || "-"} />
                  <InfoRow label="ฝ่าย" value={selectedEquipment.department || "-"} />
                  <InfoRow label="คงเหลือในคลัง" value={`${selectedEquipment.quantity_in_stock} ${selectedEquipment.unit || "ชิ้น"}`} />
                </>)}
                {isMediaPlayer && selectedMediaPlayer && (<>
                  <InfoRow label="ยี่ห้อ" value={selectedMediaPlayer.brand || "-"} />
                  <InfoRow label="Serial No." value={[selectedMediaPlayer.serial_number_1, selectedMediaPlayer.serial_number_2].filter(Boolean).join(" / ") || "-"} />
                  <InfoRow label="ฝ่าย" value={selectedMediaPlayer.department || "-"} />
                  <InfoRow label="คงเหลือในคลัง" value={`${selectedMediaPlayer.quantity} เครื่อง`} />
                </>)}
                {isFromBillboard && selectedBillboardRecord && (
                  <div className="pt-2 border-t"><Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600"><MapPin className="w-3 h-3 mr-1" /> ติดตั้งบนป้าย: {selectedBillboardRecord.billboard_old_code}</Badge></div>
                )}
                <div className="pt-2 border-t">
                  {perUnitMode ? (
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">ระบุรายชิ้น: {defectiveUnits.length} ชิ้น</Badge>
                  ) : (
                    <Badge variant="outline" className={`text-xs ${itemCondition === "defective" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600"}`}>
                      {itemCondition === "defective" ? "เสีย/ชำรุด" : "รอตรวจสอบ"}
                    </Badge>
                  )}
                </div>

                {/* Next step guidance */}
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">ขั้นตอนถัดไป:</p>
                  {isFromBillboard ? (
                    <div className="rounded-md bg-blue-500/10 border border-blue-500/30 p-2.5 space-y-1.5">
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        🔧 <span className="font-medium">ถอดออกจากป้าย + เข้าคลังของเสีย</span><br />
                        เมื่อบันทึก ระบบจะถอดของออกจากป้ายและส่งเข้าคิว <span className="font-medium">"อนุมัติการจัดการของเสีย"</span>
                      </p>
                      <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 pt-1 border-t border-blue-500/20">
                        💡 <span className="font-medium">ต้องการเบิกของใหม่ไปแทนที่ป้ายเดิมด้วย?</span><br />
                        ใช้เมนู <span className="font-mono font-medium">Swap (สลับอุปกรณ์ป้าย)</span> แทน — สร้างใบเดียวจบทั้ง รับเก่า + เบิกใหม่
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      หลังบันทึก ใบของเสียจะเข้าคิวที่หน้า <span className="font-medium">"อนุมัติการจัดการของเสีย"</span> เพื่อเลือกวิธี (ทำลายทิ้ง / จำหน่ายซาก / CSR / ซ่อมคืน)
                    </p>
                  )}
                </div>

              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">เลือกสินค้าเพื่อดูข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (<div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value || "-"}</span></div>);
}

export default DefectiveReturnEntry;
