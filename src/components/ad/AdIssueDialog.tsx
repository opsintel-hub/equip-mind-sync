import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileOutput } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { SearchableSelect } from "@/components/ui/searchable-select";
import BillboardSelect from "@/components/billboard/BillboardSelect";
import { BillboardPackageSelect } from "@/components/billboard/BillboardPackageSelect";

interface AdIssueDialogProps {
  onSuccess: () => void;
}

const purposeOptions = [
  { value: "install", label: "เบิกนำไปติดตั้งที่ป้ายโฆษณา" },
  { value: "inspect", label: "เบิกเพื่อตรวจสภาพ" },
  { value: "csr", label: "เบิกเพื่อนำไปทำ CSR" },
];

const oldAdActionOptions = [
  { value: "return_to_warehouse", label: "ปลดภาพโฆษณาเก่ากลับเข้าคลัง" },
  { value: "no_return", label: "ไม่ต้องนำภาพโฆษณากลับ" },
  { value: "return_for_inspect", label: "ปลดภาพโฆษณาเก่ากลับเพื่อตรวจสอบ" },
];

export function AdIssueDialog({ onSuccess }: AdIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [advertisementId, setAdvertisementId] = useState("");
  const [issuePurpose, setIssuePurpose] = useState("install");
  const [oldAdAction, setOldAdAction] = useState("");
  const [issuedQuantity, setIssuedQuantity] = useState<number>(1);
  const [targetBillboardId, setTargetBillboardId] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch ads that are in storage
  const { data: availableAds } = useQuery({
    queryKey: ["ads-in-storage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("id, code, name, total_quantity, entry_type")
        .eq("is_active", true)
        .in("status", ["in_storage", "received"])
        .order("code");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const adOptions = (availableAds || []).map((a) => ({
    value: a.id,
    label: `${a.code} — ${a.name}`,
    description: `จำนวน: ${a.total_quantity || 0}`,
  }));

  const selectedAd = availableAds?.find((a) => a.id === advertisementId);

  const resetForm = () => {
    setAdvertisementId("");
    setIssuePurpose("install");
    setOldAdAction("");
    setIssuedQuantity(1);
    setTargetBillboardId("");
    setNotes("");
  };

  const generateDocNo = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `ADI-${dateStr}-${rand}`;
  };

  const handleSave = async () => {
    if (!advertisementId) {
      toast.error("กรุณาเลือกภาพโฆษณา");
      return;
    }
    if (!issuePurpose) {
      toast.error("กรุณาเลือกวัตถุประสงค์การเบิก");
      return;
    }
    if (issuedQuantity < 1) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }
    if (issuePurpose === "install" && !targetBillboardId) {
      toast.error("กรุณาเลือกป้ายเป้าหมาย");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); return; }

      const docNo = generateDocNo();

      const { error: insertError } = await supabase
        .from("ad_issue_requests")
        .insert({
          document_no: docNo,
          advertisement_id: advertisementId,
          issue_purpose: issuePurpose,
          old_ad_action: issuePurpose === "install" ? (oldAdAction || null) : null,
          issued_quantity: issuedQuantity,
          target_billboard_id: targetBillboardId || null,
          status: "pending",
          created_by: user.id,
          notes: notes.trim() || null,
        });

      if (insertError) throw insertError;

      // Update advertisement status to issued
      const { error: updateError } = await supabase
        .from("advertisements")
        .update({ status: "issued", updated_at: new Date().toISOString() })
        .eq("id", advertisementId);

      if (updateError) throw updateError;

      toast.success(`สร้างเอกสารเบิก ${docNo} สำเร็จ`);
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
          <FileOutput className="h-4 w-4" />
          เบิกภาพโฆษณา
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เบิกภาพโฆษณา</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Select Ad */}
          <div className="space-y-1.5">
            <Label>เลือกภาพโฆษณาที่ต้องการเบิก *</Label>
            <SearchableSelect
              options={adOptions}
              value={advertisementId}
              onValueChange={setAdvertisementId}
              placeholder="ค้นหาภาพโฆษณา..."
              searchPlaceholder="ค้นหารหัสหรือชื่อ..."
              emptyMessage="ไม่พบภาพโฆษณาในคลัง"
              disabled={saving}
            />
            {selectedAd && (
              <p className="text-xs text-muted-foreground">
                จำนวนในคลัง: {selectedAd.total_quantity || 0} ชิ้น
              </p>
            )}
          </div>

          {/* Issue Purpose */}
          <div className="space-y-2">
            <Label>วัตถุประสงค์การเบิก *</Label>
            <RadioGroup value={issuePurpose} onValueChange={setIssuePurpose}>
              {purposeOptions.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`purpose-${opt.value}`} />
                  <Label htmlFor={`purpose-${opt.value}`} className="font-normal cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Old Ad Action (only for install) */}
          {issuePurpose === "install" && (
            <div className="space-y-2">
              <Label>จัดการภาพโฆษณาเก่า</Label>
              <RadioGroup value={oldAdAction} onValueChange={setOldAdAction}>
                {oldAdActionOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`old-${opt.value}`} />
                    <Label htmlFor={`old-${opt.value}`} className="font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Quantity + Billboard */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>จำนวนที่เบิก *</Label>
              <Input
                type="number"
                min={1}
                max={selectedAd?.total_quantity || 9999}
                value={issuedQuantity}
                onChange={(e) => setIssuedQuantity(Number(e.target.value))}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ป้ายเป้าหมาย {issuePurpose === "install" ? "*" : ""}</Label>
              <BillboardSelect
                value={targetBillboardId}
                onChange={setTargetBillboardId}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                หรือใช้เมนู "เลือกจาก Package" ในหน้า "นำเข้าภาพโฆษณา" เพื่อเลือกหลายป้ายพร้อมกัน
              </p>
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
              {saving ? "กำลังบันทึก..." : "ยืนยันเบิก"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
