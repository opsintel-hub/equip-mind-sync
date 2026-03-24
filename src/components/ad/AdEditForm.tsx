import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdVersionInput, type AdVersion } from "./AdVersionInput";
import { AdPhotoUpload, AdDocUpload } from "./AdPhotoUpload";
import { AdSizeSelect } from "./AdSizeSelect";
import { AdMediaTypeSelect } from "./AdMediaTypeSelect";
import { ContractorSelect } from "./ContractorSelect";
import { BillboardPackageSelect } from "@/components/billboard/BillboardPackageSelect";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import { useQuery } from "@tanstack/react-query";
import { formatBillboardLabel } from "@/lib/billboardUtils";

interface AdEditFormProps {
  adId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdEditForm({ adId, open, onOpenChange, onSuccess }: AdEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [versions, setVersions] = useState<AdVersion[]>([]);
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

  // Load existing ad data
  useEffect(() => {
    if (open && adId) {
      loadAdData();
    }
  }, [open, adId]);

  const loadAdData = async () => {
    setLoading(true);
    try {
      const { data: ad, error } = await supabase
        .from("advertisements")
        .select(`
          *,
          ad_versions (id, version_name, quantity),
          ad_target_billboards (billboard_id)
        `)
        .eq("id", adId)
        .single();

      if (error) throw error;

      setName(ad.name);
      setVersions(
        (ad.ad_versions || []).map((v: any) => ({
          version_name: v.version_name,
          quantity: v.quantity,
        }))
      );
      setPhotos(ad.photo_urls || []);
      setAdSizeId(ad.ad_size_id || "");
      setAdMediaTypeId(ad.ad_media_type_id || "");
      setTargetBillboardIds((ad.ad_target_billboards || []).map((tb: any) => tb.billboard_id));
      setTargetInstallDate(ad.target_installation_date || "");
      setInstallationTeamId(ad.installation_team_id || "");
      setSupportingDocUrl(ad.supporting_doc_url || null);
      setInstallationDetails(ad.installation_details || "");
      setNotes(ad.notes || "");
    } catch (error: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("กรุณาระบุชื่อภาพโฆษณา"); return; }
    if (versions.some((v) => !v.version_name.trim())) { toast.error("กรุณาระบุชื่อเวอร์ชันให้ครบ"); return; }
    if (versions.some((v) => v.quantity < 1)) { toast.error("จำนวนต้องมากกว่า 0"); return; }
    if (photos.length === 0) { toast.error("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป"); return; }
    if (!adSizeId) { toast.error("กรุณาเลือกขนาดภาพ"); return; }
    if (!adMediaTypeId) { toast.error("กรุณาเลือกประเภทสื่อ"); return; }
    if (!targetInstallDate) { toast.error("กรุณาระบุวันที่ต้องเบิกไปติดตั้ง"); return; }
    if (!installationTeamId) { toast.error("กรุณาเลือกทีมติดตั้ง"); return; }

    setSaving(true);
    try {
      const totalQuantity = versions.reduce((sum, v) => sum + v.quantity, 0);

      // Update advertisement
      const { error: adError } = await supabase
        .from("advertisements")
        .update({
          name: name.trim(),
          ad_size_id: adSizeId,
          ad_media_type_id: adMediaTypeId,
          photo_urls: photos,
          supporting_doc_url: supportingDocUrl,
          target_installation_date: targetInstallDate,
          installation_team_id: installationTeamId,
          installation_details: installationDetails.trim() || null,
          total_quantity: totalQuantity,
          notes: notes.trim() || null,
        })
        .eq("id", adId)
        .eq("status", "pending"); // Safety: only update pending ads

      if (adError) throw adError;

      // Replace versions: delete old, insert new
      await supabase.from("ad_versions").delete().eq("advertisement_id", adId);
      const versionInserts = versions.map((v) => ({
        advertisement_id: adId,
        version_name: v.version_name.trim(),
        quantity: v.quantity,
      }));
      const { error: vError } = await supabase.from("ad_versions").insert(versionInserts);
      if (vError) throw vError;

      // Replace target billboards
      await supabase.from("ad_target_billboards").delete().eq("advertisement_id", adId);
      if (targetBillboardIds.length > 0) {
        const bbInserts = targetBillboardIds.map((bid) => ({
          advertisement_id: adId,
          billboard_id: bid,
        }));
        const { error: bbError } = await supabase.from("ad_target_billboards").insert(bbInserts);
        if (bbError) throw bbError;
      }

      toast.success("แก้ไขภาพโฆษณาสำเร็จ");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12 text-muted-foreground">กำลังโหลด...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขภาพโฆษณา</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>ชื่อภาพโฆษณา *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>

          {/* Versions */}
          <AdVersionInput versions={versions} onChange={setVersions} disabled={saving} />

          {/* Photos */}
          <AdPhotoUpload photos={photos} onChange={setPhotos} disabled={saving} required />

          {/* Size & Media Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ขนาดภาพ *</Label>
              <AdSizeSelect value={adSizeId} onChange={setAdSizeId} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทสื่อ *</Label>
              <AdMediaTypeSelect value={adMediaTypeId} onChange={setAdMediaTypeId} disabled={saving} />
            </div>
          </div>

          {/* Target Billboards */}
          <div className="space-y-1.5">
            <Label>ตำแหน่งป้ายโฆษณา (เลือกได้หลายป้าย / เลือกจาก Package)</Label>
            <BillboardPackageSelect
              selectedBillboardIds={targetBillboardIds}
              onChange={setTargetBillboardIds}
              disabled={saving}
            />
            {targetBillboardIds.length > 0 && (
              <SearchableMultiSelect
                options={billboardOptions}
                values={targetBillboardIds}
                onValuesChange={setTargetBillboardIds}
                placeholder="ค้นหาป้ายโฆษณาเพิ่มเติม..."
                searchPlaceholder="ค้นหาป้ายโฆษณา..."
                emptyMessage="ไม่พบป้ายโฆษณา"
                disabled={saving}
              />
            )}
          </div>

          {/* Install Date & Team */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>วันที่ต้องเบิกไปติดตั้ง *</Label>
              <Input type="date" value={targetInstallDate} onChange={(e) => setTargetInstallDate(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label>ทีมที่จะเบิกนำไปติดตั้ง *</Label>
              <ContractorSelect value={installationTeamId} onChange={setInstallationTeamId} disabled={saving} />
            </div>
          </div>

          {/* Supporting Doc */}
          <AdDocUpload docUrl={supportingDocUrl} onChange={setSupportingDocUrl} disabled={saving} />

          {/* Installation Details */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>รายละเอียดการติดตั้ง (สูงสุด 300 ตัวอักษร)</Label>
              <span className="text-xs text-muted-foreground">{installationDetails.length}/300</span>
            </div>
            <Textarea
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการติดตั้ง..."
              value={installationDetails}
              onChange={(e) => { if (e.target.value.length <= 300) setInstallationDetails(e.target.value); }}
              disabled={saving}
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Textarea placeholder="หมายเหตุเพิ่มเติม..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} rows={2} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
