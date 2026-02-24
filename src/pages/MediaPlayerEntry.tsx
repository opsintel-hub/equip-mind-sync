import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Search, Loader2, MapPin, Unplug, Plus } from "lucide-react";
import MediaPlayerImport from "@/components/media-player/MediaPlayerImport";
import MediaPlayerDashboard from "@/components/media-player/MediaPlayerDashboard";
import { MediaPlayerCodePrefixSelect } from "@/components/media-player/MediaPlayerCodePrefixSelect";
import { CMSTypeSelect } from "@/components/media-player/CMSTypeSelect";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatBillboardLabel } from "@/lib/billboardUtils";
import { CompanySelect } from "@/components/company/CompanySelect";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { WarehouseLocationSelect } from "@/components/location/WarehouseLocationSelect";
import { SupplierSelect } from "@/components/supplier/SupplierSelect";
import { SimpleDepartmentSelect } from "@/components/equipment/SimpleDepartmentSelect";
import { BrandSelect } from "@/components/equipment/BrandSelect";

const MEDIA_PLAYER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "spare_office_bamed", label: "Spare Office Bamed" },
  { value: "spare_office_planto_tw", label: "Spare Office Planto Tw" },
  { value: "fix_or_break", label: "Fix or Break" },
  { value: "claim", label: "Claim" },
  { value: "spare_ow", label: "Spare Ow" },
  { value: "spare_online", label: "Spare Online พร้อมใช้งาน" },
];

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
  id_display: string | null;
  group_led: string | null;
  serial_number_1: string | null;
  serial_number_2: string | null;
  led_control: string | null;
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
  warranty_expiry_date: string | null;
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
  billboard?: Billboard;
}

const MediaPlayerEntry = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaPlayers, setMediaPlayers] = useState<MediaPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<MediaPlayer | null>(null);
  const [installBillboardId, setInstallBillboardId] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [codePreview, setCodePreview] = useState("");
  
  // Filters for dashboard tab
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCmsType, setFilterCmsType] = useState("all");

  // CMS types for filter dropdown
  const [cmsTypesForFilter, setCmsTypesForFilter] = useState<{id: string; name: string}[]>([]);
  const [companiesForFilter, setCompaniesForFilter] = useState<{id: string; name: string}[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cms_type_id: "",
    specification: "",
    id_display: "",
    group_led: "",
    serial_number_1: "",
    serial_number_2: "",
    led_control: "",
    billboard_id: "",
    install_date: "",
    company_id: "",
    location_id: "",
    warehouse_id: "",
    department: "",
    brand: "",
    supplier_id: "",
    quantity: 1,
    unit: "เครื่อง",
    unit_price: 0,
    depreciation_months: 60,
    warranty_expiry_date: "",
    is_asset: true,
    asset_code: "",
    equipment_id_code: "",
    waiting_asset_code: false,
    waiting_equipment_id: false,
    notes: "",
    status: "active",
    remote_name: "",
    activate_windows: "",
    po_number: "",
    pr_number: "",
    invoice_number: "",
    date_of_receipt: "",
    order_for_project: "",
  });

  useEffect(() => {
    fetchMediaPlayers();
    fetchFiltersData();
  }, []);

  const fetchFiltersData = async () => {
    const [cmsRes, compRes] = await Promise.all([
      supabase.from("cms_types").select("id, name").eq("is_active", true).order("name"),
      supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
    ]);
    if (cmsRes.data) setCmsTypesForFilter(cmsRes.data);
    if (compRes.data) setCompaniesForFilter(compRes.data);
  };

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
    
    if (!formData.name || !formData.company_id || !formData.depreciation_months) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, บริษัท, ระยะเวลาค่าเสื่อม)");
      return;
    }

    if (!selectedPrefix) {
      toast.error("กรุณาเลือก Prefix รหัส");
      return;
    }

    // Validate asset codes if is_asset
    if (formData.is_asset) {
      if (!formData.asset_code && !formData.waiting_asset_code) {
        toast.error("กรุณาระบุรหัสทรัพย์สิน หรือเลือก 'รอรหัสทรัพย์สิน'");
        return;
      }
      if (!formData.equipment_id_code && !formData.waiting_equipment_id) {
        toast.error("กรุณาระบุ Equipment ID หรือเลือก 'รอ Equipment ID'");
        return;
      }
    }

    setIsSaving(true);
    try {
      // Generate code using prefix function
      const { data: codeData, error: codeError } = await supabase.rpc("get_next_media_player_code", {
        p_prefix: selectedPrefix,
      });
      
      if (codeError) throw codeError;
      const code = codeData as string;
      
      const { error } = await supabase
        .from("media_players")
        .insert({
          code,
          name: formData.name,
          description: formData.description || null,
          cms_type_id: formData.cms_type_id || null,
          specification: formData.specification || null,
          id_display: formData.id_display || null,
          group_led: formData.group_led || null,
          serial_number_1: formData.serial_number_1 || null,
          serial_number_2: formData.serial_number_2 || null,
          led_control: formData.led_control || null,
          billboard_id: formData.billboard_id || null,
          install_date: formData.install_date || null,
          company_id: formData.company_id || null,
          location_id: formData.location_id || null,
          department: formData.department || null,
          brand: formData.brand || null,
          supplier_id: formData.supplier_id || null,
          quantity: formData.quantity,
          unit: formData.unit,
          unit_price: formData.unit_price,
          depreciation_months: formData.depreciation_months,
          warranty_expiry_date: formData.warranty_expiry_date || null,
          is_asset: formData.is_asset,
          asset_code: formData.asset_code || null,
          equipment_id_code: formData.equipment_id_code || null,
          waiting_asset_code: formData.waiting_asset_code,
          waiting_equipment_id: formData.waiting_equipment_id,
          notes: formData.notes || null,
          status: formData.status || "active",
          remote_name: formData.remote_name || null,
          activate_windows: formData.activate_windows || null,
          po_number: formData.po_number || null,
          pr_number: formData.pr_number || null,
          invoice_number: formData.invoice_number || null,
          date_of_receipt: formData.date_of_receipt || null,
          order_for_project: formData.order_for_project || null,
        } as any);

      if (error) throw error;

      toast.success(`บันทึกข้อมูล Media Player สำเร็จ (${code})`);
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
      description: "",
      cms_type_id: "",
      specification: "",
      id_display: "",
      group_led: "",
      serial_number_1: "",
      serial_number_2: "",
      led_control: "",
      billboard_id: "",
      install_date: "",
      company_id: "",
      location_id: "",
      warehouse_id: "",
      department: "",
      brand: "",
      supplier_id: "",
      quantity: 1,
      unit: "เครื่อง",
      unit_price: 0,
      depreciation_months: 60,
      warranty_expiry_date: "",
      is_asset: true,
      asset_code: "",
      equipment_id_code: "",
      waiting_asset_code: false,
      waiting_equipment_id: false,
      notes: "",
      status: "active",
      remote_name: "",
      activate_windows: "",
      po_number: "",
      pr_number: "",
      invoice_number: "",
      date_of_receipt: "",
      order_for_project: "",
    });
    setSelectedPrefix("");
    setCodePreview("");
  };

  const filteredPlayers = mediaPlayers.filter(player => {
    const matchSearch = !searchTerm || 
      player.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.serial_number_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.asset_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCompany = filterCompany === "all" || player.company_id === filterCompany;
    const matchStatus = filterStatus === "all" || (player.status || "active") === filterStatus;
    const matchCmsType = filterCmsType === "all" || player.cms_type_id === filterCmsType;
    
    return matchSearch && matchCompany && matchStatus && matchCmsType;
  });

  const getCMSTypeName = (id: string | null) => {
    const cms = cmsTypesForFilter.find(c => c.id === id);
    return cms?.name || "-";
  };

  const getStatusLabel = (status: string | null) => {
    const s = MEDIA_PLAYER_STATUSES.find(st => st.value === (status || "active"));
    return s?.label || status || "Active";
  };

  const handleOpenInstallDialog = (player: MediaPlayer) => {
    setSelectedPlayer(player);
    setInstallBillboardId(player.billboard_id || "");
    setInstallDate(player.install_date || format(new Date(), "yyyy-MM-dd"));
    setIsInstallDialogOpen(true);
  };

  const handleInstallToBillboard = async () => {
    if (!selectedPlayer) return;
    if (!installBillboardId) {
      toast.error("กรุณาเลือกป้ายโฆษณา");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("media_players")
        .update({
          billboard_id: installBillboardId,
          install_date: installDate || null,
        })
        .eq("id", selectedPlayer.id);

      if (error) throw error;

      toast.success("บันทึกการติดตั้งสำเร็จ");
      setIsInstallDialogOpen(false);
      setSelectedPlayer(null);
      fetchMediaPlayers();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUninstallFromBillboard = async (player: MediaPlayer) => {
    if (!confirm(`ต้องการยกเลิกการติดตั้ง ${player.name} จากป้ายโฆษณา?`)) return;

    try {
      const { error } = await supabase
        .from("media_players")
        .update({ billboard_id: null, install_date: null })
        .eq("id", player.id);

      if (error) throw error;
      toast.success("ยกเลิกการติดตั้งสำเร็จ");
      fetchMediaPlayers();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด");
    }
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
          จัดการ Media Player
        </h1>
        <p className="text-muted-foreground">บันทึกและจัดการเครื่อง Media Player สำหรับป้ายโฆษณา</p>
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            เพิ่ม Media Player ใหม่
          </TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* Tab 1: Add Form */}
        <TabsContent value="add">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ข้อมูลทั่วไป */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ฝ่าย</Label>
                    <SimpleDepartmentSelect
                      value={formData.department}
                      onChange={(value) => setFormData({ ...formData, department: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>บริษัทที่สั่งซื้อ *</Label>
                    <CompanySelect
                      value={formData.company_id}
                      onChange={(value) => setFormData({ ...formData, company_id: value })}
                      placeholder="เลือกบริษัท"
                    />
                  </div>
                </div>
                <WarehouseLocationSelect
                  department={formData.department}
                  warehouseId={formData.warehouse_id || ""}
                  onWarehouseChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                  locationId={formData.location_id}
                  onLocationChange={(value) => setFormData({ ...formData, location_id: value })}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ชื่อเครื่อง"
                      required
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
                  <div className="space-y-2">
                    <Label>ผู้จัดจำหน่าย</Label>
                    <SupplierSelect
                      value={formData.supplier_id}
                      onChange={(value) => setFormData({ ...formData, supplier_id: value })}
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
                    <Label>ประเภท CMS</Label>
                    <CMSTypeSelect
                      value={formData.cms_type_id}
                      onChange={(value) => setFormData({ ...formData, cms_type_id: value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specification</Label>
                    <Input
                      value={formData.specification}
                      onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                      placeholder="รายละเอียด Spec"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ข้อมูลเฉพาะ Media Player */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg text-primary">ข้อมูลเฉพาะ Media Player</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>S/N 1</Label>
                    <Input
                      value={formData.serial_number_1}
                      onChange={(e) => setFormData({ ...formData, serial_number_1: e.target.value })}
                      placeholder="Serial Number 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>S/N 2</Label>
                    <Input
                      value={formData.serial_number_2}
                      onChange={(e) => setFormData({ ...formData, serial_number_2: e.target.value })}
                      placeholder="Serial Number 2"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Activate Windows</Label>
                  <Input
                    value={formData.activate_windows}
                    onChange={(e) => setFormData({ ...formData, activate_windows: e.target.value })}
                    placeholder="Product Key / Status"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="หมายเหตุเฉพาะ"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ข้อมูลเพิ่มเติม */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลเพิ่มเติม</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIA_PLAYER_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.remote_name}
                      onChange={(e) => setFormData({ ...formData, remote_name: e.target.value })}
                      placeholder="Name / Remote"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ID Display</Label>
                    <Input
                      value={formData.id_display}
                      onChange={(e) => setFormData({ ...formData, id_display: e.target.value })}
                      placeholder="ID Display"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Group Led</Label>
                    <Input
                      value={formData.group_led}
                      onChange={(e) => setFormData({ ...formData, group_led: e.target.value })}
                      placeholder="Group Led"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Led Control</Label>
                    <Input
                      value={formData.led_control}
                      onChange={(e) => setFormData({ ...formData, led_control: e.target.value })}
                      placeholder="รุ่น Led Control"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ผูกกับป้ายโฆษณา */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg text-primary">ผูกกับป้ายโฆษณา</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ป้ายโฆษณา</Label>
                    <BillboardSelect
                      value={formData.billboard_id}
                      onChange={(value) => setFormData({ ...formData, billboard_id: value })}
                      placeholder="เลือกป้ายโฆษณา"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่ติดตั้ง</Label>
                    <Input
                      type="date"
                      value={formData.install_date}
                      onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ราคาและค่าเสื่อม */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ราคาและค่าเสื่อม</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ราคาต่อหน่วย (บาท)</Label>
                    <Input
                      type="number"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ระยะเวลาค่าเสื่อม (เดือน) *</Label>
                    <Input
                      type="number"
                      value={formData.depreciation_months}
                      onChange={(e) => setFormData({ ...formData, depreciation_months: parseInt(e.target.value) || 0 })}
                      placeholder="60"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันสิ้นสุดการรับประกัน</Label>
                    <Input
                      type="date"
                      value={formData.warranty_expiry_date}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ทรัพย์สิน */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ทรัพย์สิน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">เป็นทรัพย์สิน</Label>
                    <p className="text-sm text-muted-foreground">ถ้าเป็นทรัพย์สิน ต้องระบุรหัสทรัพย์สินและ Equipment ID</p>
                  </div>
                  <Switch
                    checked={formData.is_asset}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_asset: checked })}
                  />
                </div>

                {formData.is_asset && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>รหัสทรัพย์สิน</Label>
                        <Input
                          value={formData.asset_code}
                          onChange={(e) => setFormData({ ...formData, asset_code: e.target.value, waiting_asset_code: false })}
                          placeholder="ระบุรหัสทรัพย์สิน"
                          disabled={formData.waiting_asset_code}
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="waitingAsset"
                            checked={formData.waiting_asset_code}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              waiting_asset_code: checked as boolean,
                              asset_code: checked ? "" : formData.asset_code
                            })}
                          />
                          <Label htmlFor="waitingAsset" className="text-sm text-muted-foreground">รอรหัสทรัพย์สิน</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Equipment ID</Label>
                        <Input
                          value={formData.equipment_id_code}
                          onChange={(e) => setFormData({ ...formData, equipment_id_code: e.target.value, waiting_equipment_id: false })}
                          placeholder="ระบุ Equipment ID"
                          disabled={formData.waiting_equipment_id}
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="waitingEquipment"
                            checked={formData.waiting_equipment_id}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              waiting_equipment_id: checked as boolean,
                              equipment_id_code: checked ? "" : formData.equipment_id_code
                            })}
                          />
                          <Label htmlFor="waitingEquipment" className="text-sm text-muted-foreground">รอ Equipment ID</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PO/PR */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PO / PR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>เลข PO</Label>
                    <Input
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      placeholder="PO Number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>เลข PR</Label>
                    <Input
                      value={formData.pr_number}
                      onChange={(e) => setFormData({ ...formData, pr_number: e.target.value })}
                      placeholder="PR Number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice No.</Label>
                    <Input
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="Invoice Number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>วันที่รับสินค้า</Label>
                    <Input
                      type="date"
                      value={formData.date_of_receipt}
                      onChange={(e) => setFormData({ ...formData, date_of_receipt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order For Project</Label>
                    <Input
                      value={formData.order_for_project}
                      onChange={(e) => setFormData({ ...formData, order_for_project: e.target.value })}
                      placeholder="ชื่อโปรเจค"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* หมายเหตุ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">หมายเหตุ</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  rows={3}
                />
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
            <MediaPlayerDashboard />

            {/* Filters & Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>รายการ Media Player</CardTitle>
                    <CardDescription>เครื่อง Media Player ทั้งหมดในระบบ</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="ค้นหา..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <MediaPlayerImport onImportSuccess={fetchMediaPlayers} />
                  </div>
                </div>
                {/* Filter Row */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Select value={filterCompany} onValueChange={setFilterCompany}>
                    <SelectTrigger className="w-[180px]">
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
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="ทุกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      {MEDIA_PLAYER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterCmsType} onValueChange={setFilterCmsType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="ทุกประเภท CMS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกประเภท CMS</SelectItem>
                      {cmsTypesForFilter.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          <TableHead>รหัส</TableHead>
                          <TableHead>ชื่อ</TableHead>
                          <TableHead>CMS</TableHead>
                          <TableHead>S/N</TableHead>
                          <TableHead>รหัสทรัพย์สิน</TableHead>
                          <TableHead>ป้ายโฆษณา</TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              ยังไม่มีข้อมูล Media Player
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPlayers.map((player) => (
                            <TableRow key={player.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-sm">{player.code}</TableCell>
                              <TableCell>{player.name}</TableCell>
                              <TableCell>{getCMSTypeName(player.cms_type_id)}</TableCell>
                              <TableCell className="text-sm">{player.serial_number_1 || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {player.waiting_asset_code ? (
                                  <Badge variant="secondary" className="bg-warning/10 text-warning">รอรหัส</Badge>
                                ) : player.asset_code || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getBillboardDisplay(player) ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-primary" />
                                    <span className="truncate max-w-[120px]">{getBillboardDisplay(player)}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">ยังไม่ติดตั้ง</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {getStatusLabel(player.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {player.billboard_id ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUninstallFromBillboard(player)}
                                      title="ถอดออกจากป้าย"
                                    >
                                      <Unplug className="w-4 h-4 text-destructive" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenInstallDialog(player)}
                                    title="ติดตั้งที่ป้าย"
                                  >
                                    <MapPin className="w-4 h-4 text-primary" />
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Install to Billboard Dialog */}
      <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ติดตั้งที่ป้ายโฆษณา</DialogTitle>
            <DialogDescription>
              เลือกป้ายโฆษณาที่ต้องการติดตั้ง {selectedPlayer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ป้ายโฆษณา *</Label>
              <BillboardSelect
                value={installBillboardId}
                onChange={setInstallBillboardId}
                placeholder="เลือกป้ายโฆษณา"
              />
            </div>
            <div className="space-y-2">
              <Label>วันที่ติดตั้ง</Label>
              <Input
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInstallDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleInstallToBillboard} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaPlayerEntry;
