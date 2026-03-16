import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { AdVersionInput, type AdVersion } from "./AdVersionInput";
import { AdPhotoUpload, AdDocUpload } from "./AdPhotoUpload";
import { AdSizeSelect } from "./AdSizeSelect";
import { AdMediaTypeSelect } from "./AdMediaTypeSelect";
import { ContractorSelect } from "./ContractorSelect";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { BillboardPackageSelect } from "@/components/billboard/BillboardPackageSelect";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import { useQuery } from "@tanstack/react-query";
import { formatBillboardLabel } from "@/lib/billboardUtils";

interface AdNewFormProps {
  onSuccess: () => void;
}

export function AdNewForm({ onSuccess }: AdNewFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [versions, setVersions] = useState<AdVersion[]>([
    { version_name: "", quantity: 1 },
  ]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [adSizeId, setAdSizeId] = useState("");
  const [adMediaTypeId, setAdMediaTypeId] = useState("");
  const [targetBillboardIds, setTargetBillboardIds] = useState<string[]>([]);
  const [targetInstallDate, setTargetInstallDate] = useState("");
  const [installationTeamId, setInstallationTeamId] = useState("");
  const [supportingDocUrl, setSupportingDocUrl] = useState<string | null>(null);
  const [installationDetails, setInstallationDetails] = useState("");
  const [notes, setNotes] = useState("");

  const { data: billboards } = useQuery({
    queryKey: ["billboards-multi-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, equipment_id, old_code, location_name, department")
        .eq("status", "active")
        .order("old_code")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const billboardOptions = (billboards || []).map((b) => ({
    value: b.id,
    label: formatBillboardLabel(b.old_code, b.location_name, b.equipment_id),
    description: b.department || undefined,
  }));

  const resetForm = () => {
    setName("");
    setVersions([{ version_name: "", quantity: 1 }]);
    setPhotos([]);
    setAdSizeId("");
    setAdMediaTypeId("");
    setTargetBillboardIds([]);
    setTargetInstallDate("");
    setInstallationTeamId("");
    setSupportingDocUrl(null);
    setInstallationDetails("");
    setNotes("");
  };

  const generateCode = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `AD-${dateStr}-${rand}`;
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อภาพโฆษณา");
      return;
    }
    if (versions.some((v) => !v.version_name.trim())) {
      toast.error("กรุณาระบุชื่อเวอร์ชันให้ครบทุกรายการ");
      return;
    }
    if (versions.some((v) => v.quantity < 1)) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }
    if (photos.length === 0) {
      toast.error("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป");
      return;
    }
    if (!adSizeId) {
      toast.error("กรุณาเลือกขนาดภาพ");
      return;
    }
    if (!adMediaTypeId) {
      toast.error("กรุณาเลือกประเภทสื่อ");
      return;
    }
    if (!targetInstallDate) {
      toast.error("กรุณาระบุวันที่ต้องเบิกไปติดตั้ง");
      return;
    }
    if (!installationTeamId) {
      toast.error("กรุณาเลือกทีมติดตั้ง");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      const totalQuantity = versions.reduce((sum, v) => sum + v.quantity, 0);
      const code = generateCode();

      // Insert advertisement
      const { data: ad, error: adError } = await supabase
        .from("advertisements")
        .insert({
          code,
          entry_type: "new",
          name: name.trim(),
          ad_size_id: adSizeId,
          ad_media_type_id: adMediaTypeId,
          photo_urls: photos,
          supporting_doc_url: supportingDocUrl,
          target_installation_date: targetInstallDate,
          installation_team_id: installationTeamId,
          installation_details: installationDetails.trim() || null,
          total_quantity: totalQuantity,
          status: "pending",
          notes: notes.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (adError) throw adError;

      // Insert versions
      const versionInserts = versions.map((v) => ({
        advertisement_id: ad.id,
        version_name: v.version_name.trim(),
        quantity: v.quantity,
      }));

      const { error: versionError } = await supabase
        .from("ad_versions")
        .insert(versionInserts);
      if (versionError) throw versionError;

      // Insert target billboards
      if (targetBillboardIds.length > 0) {
        const billboardInserts = targetBillboardIds.map((bid) => ({
          advertisement_id: ad.id,
          billboard_id: bid,
        }));
        const { error: bbError } = await supabase
          .from("ad_target_billboards")
          .insert(billboardInserts);
        if (bbError) throw bbError;
      }

      toast.success(`เพิ่มภาพโฆษณาใหม่ ${code} สำเร็จ`);
      resetForm();
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          ภาพใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มภาพโฆษณาใหม่</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>ชื่อภาพโฆษณา *</Label>
            <Input
              placeholder="เช่น Samsung Galaxy S24"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Versions */}
          <AdVersionInput
            versions={versions}
            onChange={setVersions}
            disabled={saving}
          />

          {/* Photos */}
          <AdPhotoUpload
            photos={photos}
            onChange={setPhotos}
            disabled={saving}
            required
          />

          {/* Size & Media Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ขนาดภาพ *</Label>
              <AdSizeSelect
                value={adSizeId}
                onChange={setAdSizeId}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทสื่อ *</Label>
              <AdMediaTypeSelect
                value={adMediaTypeId}
                onChange={setAdMediaTypeId}
                disabled={saving}
              />
            </div>
          </div>

          {/* Target Billboards */}
          <div className="space-y-1.5">
            <Label>ตำแหน่งป้ายโฆษณา (เลือกได้หลายป้าย)</Label>
            <SearchableMultiSelect
              options={billboardOptions}
              values={targetBillboardIds}
              onValuesChange={setTargetBillboardIds}
              placeholder="ค้นหาป้ายโฆษณา..."
              searchPlaceholder="ค้นหาป้ายโฆษณา..."
              emptyMessage="ไม่พบป้ายโฆษณา"
              disabled={saving}
            />
          </div>

          {/* Install Date & Team */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>วันที่ต้องเบิกไปติดตั้ง *</Label>
              <Input
                type="date"
                value={targetInstallDate}
                onChange={(e) => setTargetInstallDate(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ทีมที่จะเบิกนำไปติดตั้ง *</Label>
              <ContractorSelect
                value={installationTeamId}
                onChange={setInstallationTeamId}
                disabled={saving}
              />
            </div>
          </div>

          {/* Supporting Doc */}
          <AdDocUpload
            docUrl={supportingDocUrl}
            onChange={setSupportingDocUrl}
            disabled={saving}
          />

          {/* Installation Details */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>รายละเอียดการติดตั้ง (สูงสุด 300 ตัวอักษร)</Label>
              <span className="text-xs text-muted-foreground">
                {installationDetails.length}/300
              </span>
            </div>
            <Textarea
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการติดตั้ง..."
              value={installationDetails}
              onChange={(e) => {
                if (e.target.value.length <= 300)
                  setInstallationDetails(e.target.value);
              }}
              disabled={saving}
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Textarea
              placeholder="หมายเหตุเพิ่มเติม..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
