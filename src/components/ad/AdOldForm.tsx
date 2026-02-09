import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { format } from "date-fns";
import { AdVersionInput, type AdVersion } from "./AdVersionInput";
import { AdPhotoUpload } from "./AdPhotoUpload";
import { AdSizeSelect } from "./AdSizeSelect";
import { AdMediaTypeSelect } from "./AdMediaTypeSelect";
import { ContractorSelect } from "./ContractorSelect";

interface AdOldFormProps {
  onSuccess: () => void;
}

export function AdOldForm({ onSuccess }: AdOldFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [versions, setVersions] = useState<AdVersion[]>([
    { version_name: "", quantity: 1 },
  ]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [adSizeId, setAdSizeId] = useState("");
  const [adMediaTypeId, setAdMediaTypeId] = useState("");
  const [retentionDays, setRetentionDays] = useState<string>("30");
  const [installationTeamId, setInstallationTeamId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setName("");
    setVersions([{ version_name: "", quantity: 1 }]);
    setPhotos([]);
    setAdSizeId("");
    setAdMediaTypeId("");
    setRetentionDays("30");
    setInstallationTeamId("");
    setContactName("");
    setContactPhone("");
    setNotes("");
  };

  const generateCode = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `ADO-${dateStr}-${rand}`;
  };

  const handleSave = async () => {
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
    if (!installationTeamId) {
      toast.error("กรุณาเลือกทีมที่นำเข้า");
      return;
    }
    if (!contactName.trim()) {
      toast.error("กรุณาระบุชื่อผู้รับผิดชอบ");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("กรุณาระบุเบอร์ติดต่อ");
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
      const today = format(new Date(), "yyyy-MM-dd");

      // Insert advertisement
      const { data: ad, error: adError } = await supabase
        .from("advertisements")
        .insert({
          code,
          entry_type: "old",
          name: name.trim(),
          ad_size_id: adSizeId || null,
          ad_media_type_id: adMediaTypeId || null,
          photo_urls: photos,
          installation_team_id: installationTeamId,
          total_quantity: totalQuantity,
          retention_days: parseInt(retentionDays),
          retention_start_date: today,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
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

      toast.success(`นำเข้าภาพโฆษณาเก่า ${code} สำเร็จ`);
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
        <Button variant="outline" className="gap-2">
          <Archive className="h-4 w-4" />
          ภาพเก่า
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>นำเข้าภาพโฆษณาเก่า (ปลดจากป้าย)</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>ชื่อภาพโฆษณา *</Label>
            <Input
              placeholder="เช่น Toyota Camry 2025"
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
              <Label>ขนาดภาพ</Label>
              <AdSizeSelect
                value={adSizeId}
                onChange={setAdSizeId}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทสื่อ</Label>
              <AdMediaTypeSelect
                value={adMediaTypeId}
                onChange={setAdMediaTypeId}
                disabled={saving}
              />
            </div>
          </div>

          {/* Retention Days */}
          <div className="space-y-2">
            <Label>ระยะเวลาจัดเก็บ *</Label>
            <RadioGroup
              value={retentionDays}
              onValueChange={setRetentionDays}
              className="flex gap-4"
              disabled={saving}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="ret-30" />
                <Label htmlFor="ret-30" className="font-normal">
                  30 วัน
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="60" id="ret-60" />
                <Label htmlFor="ret-60" className="font-normal">
                  60 วัน
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="90" id="ret-90" />
                <Label htmlFor="ret-90" className="font-normal">
                  90 วัน
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Installation Team */}
          <div className="space-y-1.5">
            <Label>ทีมที่นำเข้าเพื่อจัดเก็บ *</Label>
            <ContractorSelect
              value={installationTeamId}
              onChange={setInstallationTeamId}
              placeholder="เลือกทีมนำเข้า"
              disabled={saving}
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ชื่อผู้รับผิดชอบการเก็บรักษา *</Label>
              <Input
                placeholder="ชื่อ-นามสกุล"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>เบอร์ติดต่อ *</Label>
              <Input
                placeholder="08x-xxx-xxxx"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={saving}
              />
            </div>
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
