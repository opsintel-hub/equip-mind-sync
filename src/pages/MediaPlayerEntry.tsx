import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Monitor, Search, Plus, Loader2, Settings, Trash2, Edit, MapPin, Unplug, BarChart3 } from "lucide-react";
import MediaPlayerImport from "@/components/media-player/MediaPlayerImport";
import MediaPlayerDashboard from "@/components/media-player/MediaPlayerDashboard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CompanySelect } from "@/components/company/CompanySelect";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { LocationSelect } from "@/components/equipment/LocationSelect";

interface CMSType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Billboard {
  id: string;
  equipment_id: string;
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
  billboard?: Billboard;
}

const MediaPlayerEntry = () => {
  const [showDashboard, setShowDashboard] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaPlayers, setMediaPlayers] = useState<MediaPlayer[]>([]);
  const [cmsTypes, setCmsTypes] = useState<CMSType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCMSDialogOpen, setIsCMSDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<MediaPlayer | null>(null);
  const [installBillboardId, setInstallBillboardId] = useState("");
  const [installDate, setInstallDate] = useState("");
  
  // CMS Type form
  const [newCMSName, setNewCMSName] = useState("");
  const [newCMSDescription, setNewCMSDescription] = useState("");
  
  // Media Player form
  const [formData, setFormData] = useState({
    code: "",
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
    department: "",
    brand: "",
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
  });

  useEffect(() => {
    fetchCMSTypes();
    fetchMediaPlayers();
  }, []);

  const fetchCMSTypes = async () => {
    const { data, error } = await supabase
      .from("cms_types")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (!error && data) {
      setCmsTypes(data);
    }
  };

  const fetchMediaPlayers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("media_players")
      .select(`
        *,
        billboard:billboards(id, equipment_id, location_name)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setMediaPlayers(data as MediaPlayer[]);
    }
    setIsLoading(false);
  };

  const handleAddCMSType = async () => {
    if (!newCMSName.trim()) {
      toast.error("กรุณาระบุชื่อประเภท CMS");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("cms_types")
        .insert({
          name: newCMSName.trim(),
          description: newCMSDescription.trim() || null,
        });

      if (error) throw error;

      toast.success("เพิ่มประเภท CMS สำเร็จ");
      setNewCMSName("");
      setNewCMSDescription("");
      fetchCMSTypes();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการเพิ่มประเภท CMS");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCMSType = async (id: string) => {
    if (!confirm("ต้องการลบประเภท CMS นี้?")) return;

    try {
      const { error } = await supabase
        .from("cms_types")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("ลบประเภท CMS สำเร็จ");
      fetchCMSTypes();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการลบประเภท CMS");
    }
  };

  const generateCode = () => {
    const date = new Date();
    const dateStr = format(date, "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `MP-${dateStr}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.company_id || !formData.depreciation_months) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, บริษัท, ระยะเวลาค่าเสื่อม)");
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
      const code = formData.code || generateCode();
      
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
        });

      if (error) throw error;

      toast.success("บันทึกข้อมูล Media Player สำเร็จ");
      setIsFormDialogOpen(false);
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
      code: "",
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
      department: "",
      brand: "",
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
    });
  };

  const filteredPlayers = mediaPlayers.filter(player =>
    player.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.serial_number_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.asset_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCMSTypeName = (id: string | null) => {
    const cms = cmsTypes.find(c => c.id === id);
    return cms?.name || "-";
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
        .update({
          billboard_id: null,
          install_date: null,
        })
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
    return billboard.location_name || billboard.equipment_id;
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button
          variant={showDashboard ? "default" : "outline"}
          onClick={() => setShowDashboard(!showDashboard)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {showDashboard ? "ซ่อน Dashboard" : "แสดง Dashboard"}
        </Button>
        
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              เพิ่ม Media Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>เพิ่ม Media Player ใหม่</DialogTitle>
              <DialogDescription>กรอกข้อมูลเครื่อง Media Player</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>บริษัท *</Label>
                  <CompanySelect
                    value={formData.company_id}
                    onChange={(value) => setFormData({ ...formData, company_id: value })}
                    placeholder="เลือกบริษัท"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ตำแหน่งจัดเก็บ</Label>
                  <LocationSelect
                    value={formData.location_id}
                    onChange={(value) => setFormData({ ...formData, location_id: value })}
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>รหัส (อัตโนมัติถ้าไม่ระบุ)</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="MP-xxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อ *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ชื่อเครื่อง"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>ยี่ห้อ</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="ยี่ห้อ"
                  />
                </div>
              </div>

              {/* CMS & Specification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ประเภท CMS</Label>
                  <Select
                    value={formData.cms_type_id}
                    onValueChange={(value) => setFormData({ ...formData, cms_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท CMS" />
                    </SelectTrigger>
                    <SelectContent>
                      {cmsTypes.map((cms) => (
                        <SelectItem key={cms.id} value={cms.id}>{cms.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Media Player Specific Fields */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h3 className="font-medium text-sm">ข้อมูลเฉพาะ Media Player</h3>
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
              </div>

              {/* Billboard Assignment */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                <h3 className="font-medium text-sm text-primary">ผูกกับป้ายโฆษณา</h3>
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
              </div>

              {/* Price & Depreciation */}
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

              {/* Asset Toggle */}
              <div className="p-4 border rounded-lg space-y-4">
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
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึก
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCMSDialogOpen} onOpenChange={setIsCMSDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              จัดการประเภท CMS
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>จัดการประเภท CMS</DialogTitle>
              <DialogDescription>เพิ่มหรือลบประเภท CMS ที่ใช้กับ Media Player</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCMSName}
                  onChange={(e) => setNewCMSName(e.target.value)}
                  placeholder="ชื่อประเภท CMS"
                />
                <Button onClick={handleAddCMSType} disabled={isSaving}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cmsTypes.map((cms) => (
                  <div key={cms.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span>{cms.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCMSType(cms.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <MediaPlayerImport onImportSuccess={fetchMediaPlayers} />

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

      {/* Dashboard Section */}
      {showDashboard && <MediaPlayerDashboard />}

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>รายการ Media Player</CardTitle>
              <CardDescription>เครื่อง Media Player ทั้งหมดในระบบ</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                          <Badge variant={player.is_active ? "secondary" : "outline"}>
                            {player.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
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
  );
};

export default MediaPlayerEntry;
