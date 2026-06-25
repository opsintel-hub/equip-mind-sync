import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Search, Loader2, MapPin, Plus, Download, Image as ImageIcon, FileText, Camera, X, Eye, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MediaPlayerImageUpload } from "@/components/media-player/MediaPlayerImageUpload";
import * as XLSX from "xlsx";
import MediaPlayerDashboard from "@/components/media-player/MediaPlayerDashboard";
import { MediaPlayerCodePrefixSelect } from "@/components/media-player/MediaPlayerCodePrefixSelect";
import { CMSTypeSelect } from "@/components/media-player/CMSTypeSelect";
import { MediaPlayerNameSelect } from "@/components/media-player/MediaPlayerNameSelect";
import { SpecificationSelect } from "@/components/media-player/SpecificationSelect";
import { ModelSelect } from "@/components/media-player/ModelSelect";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { BrandSelect } from "@/components/equipment/BrandSelect";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { SUB_MEDIA_TYPES, SEVEN_ELEVEN_DEPT_NAME } from "@/lib/mediaPlayerSubTypes";
import { DeviceTypeTabs, type DeviceTypeFilter } from "@/components/media-player/DeviceTypeTabs";
import { DeviceTypeBadge } from "@/components/media-player/DeviceTypeBadge";
import { DeviceTypeSelect } from "@/components/media-player/DeviceTypeSelect";
import { type DeviceType, deviceLabel } from "@/lib/deviceTypes";

interface Billboard {
  id: string;
  equipment_id: string;
  old_code: string | null;
  location_name: string | null;
}

interface MediaPlayer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  cms_type_id: string | null;
  specification: string | null;
  serial_number_1: string | null;
  serial_number_2: string | null;
  billboard_id: string | null;
  install_date: string | null;
  company_id: string | null;
  location_id: string | null;
  department: string | null;
  brand: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  depreciation_months: number | null;
  usage_lifespan_months: number | null;
  warranty_expiry_date: string | null;
  supplier_id: string | null;
  model_id: string | null;
  is_asset: boolean | null;
  asset_code: string | null;
  equipment_id_code: string | null;
  waiting_asset_code: boolean | null;
  waiting_equipment_id: boolean | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  status: string | null;
  remote_name: string | null;
  activate_windows: string | null;
  po_number: string | null;
  pr_number: string | null;
  invoice_number: string | null;
  date_of_receipt: string | null;
  order_for_project: string | null;
  image_url: string | null;
  po_document_url: string | null;
  pr_document_url: string | null;
  invoice_document_url: string | null;
  sub_media_type: string | null;
  device_type: string | null;
  billboard?: Billboard;
}

const MediaPlayerEntry = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaPlayers, setMediaPlayers] = useState<MediaPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<MediaPlayer | null>(null);
  const [editPlayer, setEditPlayer] = useState<MediaPlayer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    cms_type_id: "",
    specification: "",
    brand: "",
    model_id: "",
  });
  const [imageUploadPlayer, setImageUploadPlayer] = useState<MediaPlayer | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [codePreview, setCodePreview] = useState("");
  
  // Filters for dashboard tab
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCmsType, setFilterCmsType] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterModel, setFilterModel] = useState("all");
  const [filterAlert, setFilterAlert] = useState("all");
  const [filterSubMediaType, setFilterSubMediaType] = useState("all");
  const [filterDeviceType, setFilterDeviceType] = useState<DeviceTypeFilter>("ALL");
  const [formDeviceType, setFormDeviceType] = useState<DeviceType>("MEDIA_PLAYER");
  const [editDeviceType, setEditDeviceType] = useState<DeviceType>("MEDIA_PLAYER");
  const [alertDays, setAlertDays] = useState(30);

  // Filter data
  const [cmsTypesForFilter, setCmsTypesForFilter] = useState<{id: string; name: string}[]>([]);
  const [companiesForFilter, setCompaniesForFilter] = useState<{id: string; name: string}[]>([]);
  const [statusesForFilter, setStatusesForFilter] = useState<{value: string; label: string}[]>([]);
  const [modelsForFilter, setModelsForFilter] = useState<{id: string; name: string}[]>([]);
  const [departmentsForFilter, setDepartmentsForFilter] = useState<{id: string; name: string}[]>([]);
  
  // Simplified form - only setup fields
  const [formData, setFormData] = useState({
    name: "",       // now stores media_player_names id
    cms_type_id: "",
    specification: "", // now stores media_player_specifications id
    brand: "",
    model_id: "",
  });

  // Image upload in form
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    fetchMediaPlayers();
    fetchFiltersData();
  }, []);

  const fetchFiltersData = async () => {
    const [cmsRes, compRes, statusRes, modelRes, deptRes] = await Promise.all([
      supabase.from("cms_types").select("id, name").eq("is_active", true).order("name"),
      supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
      supabase.from("media_player_statuses").select("value, label").eq("is_active", true).order("label"),
      supabase.from("media_player_models").select("id, name").eq("is_active", true).order("name"),
      supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
    ]);
    if (cmsRes.data) setCmsTypesForFilter(cmsRes.data);
    if (compRes.data) setCompaniesForFilter(compRes.data);
    if (statusRes.data) setStatusesForFilter(statusRes.data);
    if (modelRes.data) setModelsForFilter(modelRes.data);
    if (deptRes.data) setDepartmentsForFilter(deptRes.data);
  };

  // Fetch media_player_names for display in table
  const [mediaPlayerNames, setMediaPlayerNames] = useState<{id: string; name: string}[]>([]);
  const [mediaPlayerSpecs, setMediaPlayerSpecs] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [namesRes, specsRes] = await Promise.all([
        supabase.from("media_player_names" as any).select("id, name").eq("is_active", true),
        supabase.from("media_player_specifications" as any).select("id, name").eq("is_active", true),
      ]);
      if (namesRes.data) setMediaPlayerNames(namesRes.data as any);
      if (specsRes.data) setMediaPlayerSpecs(specsRes.data as any);
    };
    fetchLookups();
  }, []);

  const fetchMediaPlayers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("media_players")
      .select(`
        *,
        billboard:billboards(id, equipment_id, old_code, location_name)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setMediaPlayers(data as unknown as MediaPlayer[]);
    }
    setIsLoading(false);
  };

  const handleCodeGenerated = useCallback((code: string) => {
    setCodePreview(code);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("กรุณาเลือกชื่อสินค้า");
      return;
    }

    if (!selectedPrefix) {
      toast.error("กรุณาเลือก Prefix รหัส");
      return;
    }

    if (formImages.length === 0) {
      toast.error("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป");
      return;
    }

    // Resolve name from media_player_names
    const selectedName = mediaPlayerNames.find(n => n.id === formData.name);
    const selectedSpec = mediaPlayerSpecs.find(s => s.id === formData.specification);

    setIsSaving(true);
    try {
      const { data: codeData, error: codeError } = await supabase.rpc("get_next_media_player_code", {
        p_prefix: selectedPrefix,
      });
      
      if (codeError) throw codeError;
      const code = codeData as string;
      
      const { data: insertData, error } = await supabase
        .from("media_players")
        .insert({
          code,
          name: selectedName?.name || "",
          cms_type_id: formData.cms_type_id || null,
          specification: selectedSpec?.name || null,
          brand: formData.brand || null,
          model_id: formData.model_id || null,
          quantity: 0, // เริ่มต้นเป็น 0 — จะถูกเพิ่มจริงเมื่อรับเข้าคลังผ่าน Receive Goods (ป้องกันยอด stock เกินจริง)
          unit: "เครื่อง",
          device_type: formDeviceType,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Upload images
      const mediaPlayerId = (insertData as any).id;
      for (let i = 0; i < formImages.length; i++) {
        const file = formImages[i];
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${mediaPlayerId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("media-player-images")
          .upload(fileName, file);

        if (uploadError) {
          console.warn("Storage upload failed:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("media-player-images")
          .getPublicUrl(fileName);

        await supabase
          .from("media_player_images" as any)
          .insert({
            media_player_id: mediaPlayerId,
            image_url: urlData.publicUrl,
            display_order: i,
          });
      }

      toast.success(`บันทึกข้อมูล Media Player สำเร็จ (${code}) พร้อมรูปภาพ ${formImages.length} รูป`);
      resetForm();
      fetchMediaPlayers();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cms_type_id: "",
      specification: "",
      brand: "",
      model_id: "",
    });
    setSelectedPrefix("");
    setCodePreview("");
    // Clean up image previews
    formImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setFormImages([]);
    setFormImagePreviews([]);
  };

  const handleFormImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const maxNew = 10 - formImages.length;
    if (maxNew <= 0) {
      toast.error("อัปโหลดได้สูงสุด 10 รูป");
      return;
    }
    const newFiles = files.slice(0, maxNew);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setFormImages(prev => [...prev, ...newFiles]);
    setFormImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFormImage = (index: number) => {
    URL.revokeObjectURL(formImagePreviews[index]);
    setFormImages(prev => prev.filter((_, i) => i !== index));
    setFormImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const filteredPlayers = useMemo(() => {
    const today = new Date();
    return mediaPlayers.filter(player => {
      const matchSearch = !searchTerm || 
        player.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.serial_number_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.pr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCompany = filterCompany === "all" || player.company_id === filterCompany;
      const matchStatus = filterStatus === "all" || (player.status || "active") === filterStatus;
      const matchCmsType = filterCmsType === "all" || player.cms_type_id === filterCmsType;
      const matchDepartment = filterDepartment === "all" || player.department === filterDepartment;
      const matchModel = filterModel === "all" || player.model_id === filterModel;
      const matchSubMediaType = filterSubMediaType === "all" || player.sub_media_type === filterSubMediaType;
      const matchDeviceType = filterDeviceType === "ALL" || (player.device_type || "MEDIA_PLAYER") === filterDeviceType;

      let matchAlert = true;
      if (filterAlert === "warranty_expired") {
        matchAlert = !!player.warranty_expiry_date && new Date(player.warranty_expiry_date) < today;
      } else if (filterAlert === "warranty_expiring") {
        if (!player.warranty_expiry_date) { matchAlert = false; }
        else {
          const diff = Math.floor((new Date(player.warranty_expiry_date).getTime() - today.getTime()) / (1000*60*60*24));
          matchAlert = diff > 0 && diff <= alertDays;
        }
      } else if (filterAlert === "waiting_code") {
        matchAlert = !!(player.waiting_asset_code || player.waiting_equipment_id);
      }
      
      return matchSearch && matchCompany && matchStatus && matchCmsType && matchDepartment && matchModel && matchAlert && matchSubMediaType && matchDeviceType;
    });
  }, [mediaPlayers, searchTerm, filterCompany, filterStatus, filterCmsType, filterDepartment, filterModel, filterAlert, alertDays, filterSubMediaType, filterDeviceType]);

  const dashboardStats = useMemo(() => {
    const today = new Date();
    const total = mediaPlayers.length;
    const statusMap: Record<string, number> = {};
    let waitingCode = 0;
    let warrantyExpiring = 0;
    let warrantyExpired = 0;
    const modelMap: Record<string, number> = {};
    const deptMap: Record<string, number> = {};

    mediaPlayers.forEach(p => {
      const st = p.status || "active";
      statusMap[st] = (statusMap[st] || 0) + 1;
      if (p.waiting_asset_code || p.waiting_equipment_id) waitingCode++;
      if (p.warranty_expiry_date) {
        const diff = Math.floor((new Date(p.warranty_expiry_date).getTime() - today.getTime()) / (1000*60*60*24));
        if (diff < 0) warrantyExpired++;
        else if (diff <= alertDays) warrantyExpiring++;
      }
      const modelId = p.model_id;
      if (modelId) {
        const modelName = modelsForFilter.find(m => m.id === modelId)?.name || "ไม่ระบุ";
        modelMap[modelName] = (modelMap[modelName] || 0) + 1;
      }
      const dept = p.department || "ไม่ระบุ";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const active = statusMap["active"] || 0;
    const claim = statusMap["claim"] || 0;
    const fixOrBreak = Object.entries(statusMap)
      .filter(([k]) => k.includes("fix") || k.includes("break"))
      .reduce((sum, [, v]) => sum + v, 0);
    const spare = Object.entries(statusMap)
      .filter(([k]) => k.includes("spare"))
      .reduce((sum, [, v]) => sum + v, 0);
    const pendingAssessment = statusMap["pending_assessment"] || 0;
    const underRepair = statusMap["under_repair"] || 0;
    const inClaim = statusMap["in_claim"] || 0;
    const refurbished = mediaPlayers.filter((p: any) => p.is_refurbished === true).length;

    const colorList = ["#22c55e", "#3b82f6", "#f97316", "#eab308", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"];
    const statusDistribution = Object.entries(statusMap)
      .filter(([, v]) => v > 0)
      .map(([k, v], i) => {
        const label = statusesForFilter.find(s => s.value === k)?.label || k;
        return { name: label, value: v, color: colorList[i % colorList.length] };
      });

    const modelDistribution = Object.entries(modelMap)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const departmentDistribution = Object.entries(deptMap)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return {
      statusCounts: { total, active, spare, fixOrBreak, claim, waitingCode, warrantyExpiring, warrantyExpired, pendingAssessment, underRepair, inClaim, refurbished },
      statusDistribution,
      modelDistribution,
      departmentDistribution,
    };
  }, [mediaPlayers, alertDays, statusesForFilter, modelsForFilter]);

  const getCMSTypeName = (id: string | null) => {
    const cms = cmsTypesForFilter.find(c => c.id === id);
    return cms?.name || "-";
  };

  const getStatusLabel = (status: string | null) => {
    const s = statusesForFilter.find(st => st.value === (status || "active"));
    return s?.label || status || "Active";
  };

  const handleOpenEditDialog = (player: MediaPlayer) => {
    const nameId = mediaPlayerNames.find(n => n.name === player.name)?.id || "";
    const specId = mediaPlayerSpecs.find(s => s.name === player.specification)?.id || "";
    setEditPlayer(player);
    setEditDeviceType((player.device_type as DeviceType) || "MEDIA_PLAYER");
    setEditForm({
      name: nameId,
      cms_type_id: player.cms_type_id || "",
      specification: specId,
      brand: player.brand || "",
      model_id: player.model_id || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editPlayer) return;
    const selectedName = mediaPlayerNames.find(n => n.id === editForm.name);
    const selectedSpec = mediaPlayerSpecs.find(s => s.id === editForm.specification);
    if (!selectedName) {
      toast.error("กรุณาเลือกชื่อสินค้า");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("media_players")
        .update({
          name: selectedName.name,
          cms_type_id: editForm.cms_type_id || null,
          specification: selectedSpec?.name || null,
          brand: editForm.brand || null,
          model_id: editForm.model_id || null,
        } as any)
        .eq("id", editPlayer.id);

      if (error) throw error;
      toast.success("แก้ไขข้อมูลสำเร็จ");
      setEditPlayer(null);
      fetchMediaPlayers();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const getCompanyName = (id: string | null) => {
    const c = companiesForFilter.find(co => co.id === id);
    return c?.name || "-";
  };

  const handleExportExcel = () => {
    const exportData = filteredPlayers.map((p) => ({
      "รหัส": p.code,
      "ประเภทอุปกรณ์": deviceLabel(p.device_type),
      "ฝ่าย": p.department || "-",
      "Sub Media Type": p.sub_media_type || "-",
      "บริษัท": getCompanyName(p.company_id),
      "ยี่ห้อสินค้า": p.name,
      "Model": modelsForFilter.find(m => m.id === p.model_id)?.name || "-",
      "ชื่อ": p.remote_name || "-",
      "ประเภทสินค้า": getCMSTypeName(p.cms_type_id),
      "Specification": p.specification || "-",
      "S/N 1": p.serial_number_1 || "-",
      "S/N 2": p.serial_number_2 || "-",
      "Activate Windows": p.activate_windows || "-",
      "ป้ายโฆษณา": getBillboardDisplay(p) || "ยังไม่ติดตั้ง",
      "วันที่ติดตั้ง": p.install_date || "-",
      "สถานะ": getStatusLabel(p.status),
      "ราคา (บาท)": p.unit_price || 0,
      "ค่าเสื่อม (เดือน)": p.depreciation_months || "-",
      "อายุใช้งาน (เดือน)": p.usage_lifespan_months || "-",
      "วันหมดประกัน": p.warranty_expiry_date || "-",
      "รหัสทรัพย์สิน": p.asset_code || (p.waiting_asset_code ? "รอรหัส" : "-"),
      "Equipment ID": p.equipment_id_code || (p.waiting_equipment_id ? "รอรหัส" : "-"),
      "PO": p.po_number || "-",
      "PR": p.pr_number || "-",
      "Invoice": p.invoice_number || "-",
      "Order For Project": p.order_for_project || "-",
      "หมายเหตุ": p.description || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MediaPlayers");
    XLSX.writeFile(wb, `media_players_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  const getBillboardDisplay = (player: MediaPlayer) => {
    if (!player.billboard_id) return null;
    const billboard = player.billboard;
    if (!billboard) return player.billboard_id;
    return formatBillboardLabel(billboard.old_code, billboard.location_name, billboard.equipment_id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <Monitor className="w-8 h-8" />
          จัดการ Media Player / จอภาพ
        </h1>
        <p className="text-muted-foreground">ตั้งค่าและลงทะเบียน Media Player และจอภาพในระบบ</p>
      </div>

      <DeviceTypeTabs
        value={filterDeviceType}
        onChange={(v) => {
          setFilterDeviceType(v);
          // When user picks a specific tab, lock the new-form device_type to match
          if (v === "MEDIA_PLAYER" || v === "MONITOR") setFormDeviceType(v);
        }}
      />

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            เพิ่ม{filterDeviceType === "MONITOR" ? "จอภาพ" : "Media Player"}ใหม่
          </TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* Tab 1: Simplified Add Form */}
        <TabsContent value="add">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ข้อมูลทั่วไป */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-xs">
                  <DeviceTypeSelect
                    value={formDeviceType}
                    onChange={setFormDeviceType}
                    required
                    disabled={filterDeviceType === "MEDIA_PLAYER" || filterDeviceType === "MONITOR"}
                    hint={
                      filterDeviceType === "MEDIA_PLAYER" || filterDeviceType === "MONITOR"
                        ? `ล็อกตามแท็บที่เลือก: ${deviceLabel(filterDeviceType)}`
                        : "เลือกประเภทอุปกรณ์ที่ต้องการลงทะเบียน"
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Prefix รหัส *</Label>
                    <MediaPlayerCodePrefixSelect
                      value={selectedPrefix}
                      onChange={setSelectedPrefix}
                      onCodeGenerated={handleCodeGenerated}
                    />
                    {codePreview && (
                      <p className="text-sm text-muted-foreground">
                        รหัสถัดไป: <span className="font-mono font-bold text-primary">{codePreview}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อสินค้า *</Label>
                    <MediaPlayerNameSelect
                      value={formData.name}
                      onChange={(value) => setFormData({ ...formData, name: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>โมเดล</Label>
                    <ModelSelect
                      value={formData.model_id}
                      onChange={(value) => setFormData({ ...formData, model_id: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ยี่ห้อ</Label>
                    <BrandSelect
                      value={formData.brand}
                      onChange={(value) => setFormData({ ...formData, brand: value })}
                      brandType="media_player"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ประเภทของสินค้า */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ประเภทของสินค้า</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ระบุประเภทสินค้า</Label>
                    <CMSTypeSelect
                      value={formData.cms_type_id}
                      onChange={(value) => setFormData({ ...formData, cms_type_id: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specification</Label>
                    <SpecificationSelect
                      value={formData.specification}
                      onChange={(value) => setFormData({ ...formData, specification: value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload ภาพ Media Player * */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Upload ภาพ Media Player *
                </CardTitle>
                <CardDescription>
                  อัปโหลดรูปภาพเครื่อง Media Player (สูงสุด 10 รูป) — จำเป็นต้องมีอย่างน้อย 1 รูป
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFormImageSelect}
                  className="hidden"
                  id="form-mp-image-upload"
                  disabled={formImages.length >= 10}
                />
                <label htmlFor="form-mp-image-upload">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      คลิกเพื่อเลือกรูปภาพ (เพิ่มได้อีก {10 - formImages.length} รูป)
                    </p>
                  </div>
                </label>

                {formImagePreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-3">
                    {formImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-28 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFormImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {index + 1}/{formImages.length}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={resetForm}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Dashboard */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            <MediaPlayerDashboard
              statusCounts={dashboardStats.statusCounts}
              statusDistribution={dashboardStats.statusDistribution}
              modelDistribution={dashboardStats.modelDistribution}
              departmentDistribution={dashboardStats.departmentDistribution}
            />

            {/* Filters & Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>รายการ Media Player</CardTitle>
                    <CardDescription>แสดงข้อมูลเครื่องทั้งหมด ({filteredPlayers.length} จาก {mediaPlayers.length} รายการ)</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="ค้นหารหัส, ชื่อ, S/N, PO, PR, Invoice..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleExportExcel} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
                {/* Filter Row */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="ทุกฝ่าย" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกฝ่าย</SelectItem>
                      {departmentsForFilter.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterCompany} onValueChange={setFilterCompany}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="ทุกบริษัท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกบริษัท</SelectItem>
                      {companiesForFilter.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="ทุกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      {statusesForFilter.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterModel} onValueChange={setFilterModel}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="ทุก Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุก Model</SelectItem>
                      {modelsForFilter.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filterDepartment === "all" || filterDepartment === SEVEN_ELEVEN_DEPT_NAME) && (
                    <Select value={filterSubMediaType} onValueChange={setFilterSubMediaType}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="ทุก Sub Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทุก Sub Media Type</SelectItem>
                        {SUB_MEDIA_TYPES.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={filterAlert} onValueChange={setFilterAlert}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="การแจ้งเตือน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="warranty_expired">ประกันหมดแล้ว</SelectItem>
                      <SelectItem value="warranty_expiring">ใกล้หมดประกัน</SelectItem>
                      <SelectItem value="waiting_code">รอรหัสทรัพย์สิน</SelectItem>
                    </SelectContent>
                  </Select>
                  {filterAlert === "warranty_expiring" && (
                    <Select value={String(alertDays)} onValueChange={(v) => setAlertDays(Number(v))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 วัน</SelectItem>
                        <SelectItem value="60">60 วัน</SelectItem>
                        <SelectItem value="90">90 วัน</SelectItem>
                        <SelectItem value="120">120 วัน</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="whitespace-nowrap">รหัส</TableHead>
                          <TableHead className="whitespace-nowrap">ประเภท</TableHead>
                          <TableHead className="whitespace-nowrap">ชื่อสินค้า</TableHead>
                          <TableHead className="whitespace-nowrap">โมเดล</TableHead>
                          <TableHead className="whitespace-nowrap">ยี่ห้อ</TableHead>
                          <TableHead className="whitespace-nowrap">ประเภทสินค้า</TableHead>
                          <TableHead className="whitespace-nowrap">Specification</TableHead>
                          <TableHead className="whitespace-nowrap text-center">รูปภาพ</TableHead>
                          <TableHead className="whitespace-nowrap">ฝ่าย</TableHead>
                          <TableHead className="whitespace-nowrap">Sub Media Type</TableHead>
                          <TableHead className="whitespace-nowrap">บริษัท</TableHead>
                          <TableHead className="whitespace-nowrap">ชื่อ</TableHead>
                          <TableHead className="whitespace-nowrap">S/N 1</TableHead>
                          <TableHead className="whitespace-nowrap">S/N 2</TableHead>
                          <TableHead className="whitespace-nowrap">Activate Windows</TableHead>
                          <TableHead className="whitespace-nowrap">ป้ายโฆษณา</TableHead>
                          <TableHead className="whitespace-nowrap">วันที่ติดตั้ง</TableHead>
                          <TableHead className="whitespace-nowrap">สถานะ</TableHead>
                          <TableHead className="whitespace-nowrap">ราคา (บาท)</TableHead>
                          <TableHead className="whitespace-nowrap">ค่าเสื่อม (เดือน)</TableHead>
                          <TableHead className="whitespace-nowrap">อายุใช้งาน (เดือน)</TableHead>
                          <TableHead className="whitespace-nowrap">วันหมดประกัน</TableHead>
                          <TableHead className="whitespace-nowrap">รหัสทรัพย์สิน</TableHead>
                          <TableHead className="whitespace-nowrap">Equipment ID</TableHead>
                          <TableHead className="whitespace-nowrap">PO</TableHead>
                          <TableHead className="whitespace-nowrap text-center">ไฟล์ PO</TableHead>
                          <TableHead className="whitespace-nowrap">PR</TableHead>
                          <TableHead className="whitespace-nowrap text-center">ไฟล์ PR</TableHead>
                          <TableHead className="whitespace-nowrap">Invoice</TableHead>
                          <TableHead className="whitespace-nowrap text-center">ไฟล์ Invoice</TableHead>
                          <TableHead className="whitespace-nowrap">หมายเหตุ</TableHead>
                          <TableHead className="text-right whitespace-nowrap">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={30} className="text-center py-8 text-muted-foreground">
                              ยังไม่มีข้อมูล Media Player
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPlayers.map((player) => (
                            <TableRow key={player.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-sm whitespace-nowrap">{player.code}</TableCell>
                              <TableCell className="whitespace-nowrap"><DeviceTypeBadge value={player.device_type} /></TableCell>
                              <TableCell className="whitespace-nowrap">{player.name}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {modelsForFilter.find(m => m.id === player.model_id)?.name || "-"}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.brand || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{getCMSTypeName(player.cms_type_id)}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.specification || "-"}</TableCell>
                              <TableCell className="text-center">
                                {player.image_url ? (
                                  <a href={player.image_url} target="_blank" rel="noopener noreferrer" title="ดูรูปภาพ">
                                    <ImageIcon className="w-4 h-4 text-primary hover:text-primary/80 mx-auto" />
                                  </a>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.department || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {player.sub_media_type ? (
                                  <Badge variant="outline" className="font-mono text-xs">{player.sub_media_type}</Badge>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{getCompanyName(player.company_id)}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.remote_name || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.serial_number_1 || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.serial_number_2 || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.activate_windows || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {getBillboardDisplay(player) ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-primary" />
                                    <span className="truncate max-w-[150px]">{getBillboardDisplay(player)}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">ยังไม่ติดตั้ง</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.install_date || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant="secondary">
                                  {getStatusLabel(player.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap text-right">{player.unit_price?.toLocaleString() || "0"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap text-center">{player.depreciation_months || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap text-center">{player.usage_lifespan_months || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.warranty_expiry_date || "-"}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.asset_code || (player.waiting_asset_code ? "รอรหัส" : "-")}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.equipment_id_code || (player.waiting_equipment_id ? "รอรหัส" : "-")}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.po_number || "-"}</TableCell>
                              <TableCell className="text-center">
                                {player.po_document_url ? (
                                  <button type="button" onClick={() => setPreviewDocUrl(player.po_document_url!)} title="ดูไฟล์ PO" className="cursor-pointer">
                                    <FileText className="w-4 h-4 text-primary hover:text-primary/80 mx-auto" />
                                  </button>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.pr_number || "-"}</TableCell>
                              <TableCell className="text-center">
                                {player.pr_document_url ? (
                                  <button type="button" onClick={() => setPreviewDocUrl(player.pr_document_url!)} title="ดูไฟล์ PR" className="cursor-pointer">
                                    <FileText className="w-4 h-4 text-primary hover:text-primary/80 mx-auto" />
                                  </button>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{player.invoice_number || "-"}</TableCell>
                              <TableCell className="text-center">
                                {player.invoice_document_url ? (
                                  <button type="button" onClick={() => setPreviewDocUrl(player.invoice_document_url!)} title="ดูไฟล์ Invoice" className="cursor-pointer">
                                    <FileText className="w-4 h-4 text-primary hover:text-primary/80 mx-auto" />
                                  </button>
                                ) : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap max-w-[150px] truncate">{player.description || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/media-player/${player.id}`)}
                                    title="ดูรายละเอียด"
                                  >
                                    <Eye className="w-4 h-4 text-primary" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditDialog(player)}
                                    title="แก้ไขข้อมูล"
                                  >
                                    <Pencil className="w-4 h-4 text-primary" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setImageUploadPlayer(player)}
                                    title="Upload ภาพ"
                                  >
                                    <Camera className="w-4 h-4 text-primary" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  แสดง {filteredPlayers.length} จาก {mediaPlayers.length} รายการ
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Upload Dialog */}
      {imageUploadPlayer && (
        <MediaPlayerImageUpload
          mediaPlayerId={imageUploadPlayer.id}
          mediaPlayerCode={imageUploadPlayer.code}
          onClose={() => setImageUploadPlayer(null)}
        />
      )}

      {/* Edit Media Player Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => !open && setEditPlayer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูล Media Player</DialogTitle>
            <DialogDescription>
              รหัส: <span className="font-mono font-medium">{editPlayer?.code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>ชื่อสินค้า *</Label>
              <MediaPlayerNameSelect
                value={editForm.name}
                onChange={(v) => setEditForm({ ...editForm, name: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>ประเภท (CMS)</Label>
              <CMSTypeSelect
                value={editForm.cms_type_id}
                onChange={(v) => setEditForm({ ...editForm, cms_type_id: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>โมเดล</Label>
              <ModelSelect
                value={editForm.model_id}
                onChange={(v) => setEditForm({ ...editForm, model_id: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>ยี่ห้อ</Label>
              <BrandSelect
                value={editForm.brand}
                onChange={(v) => setEditForm({ ...editForm, brand: v })}
                brandType="media_player"
              />
            </div>
            <div className="space-y-2">
              <Label>Specification</Label>
              <SpecificationSelect
                value={editForm.specification}
                onChange={(v) => setEditForm({ ...editForm, specification: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlayer(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DocumentPreviewDialog
        open={!!previewDocUrl}
        onOpenChange={(open) => { if (!open) setPreviewDocUrl(null); }}
        publicUrl={previewDocUrl}
        title="ดูเอกสาร Media Player"
      />
    </div>
  );
};

export default MediaPlayerEntry;
