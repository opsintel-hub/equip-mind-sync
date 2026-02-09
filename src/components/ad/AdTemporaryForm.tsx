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
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { ContractorSelect } from "./ContractorSelect";

interface AdTemporaryFormProps {
  onSuccess: () => void;
}

export function AdTemporaryForm({ onSuccess }: AdTemporaryFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [storageInDatetime, setStorageInDatetime] = useState("");
  const [storageOutDatetime, setStorageOutDatetime] = useState("");
  const [pickupContractorId, setPickupContractorId] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setName("");
    setStorageLocation("");
    setStorageInDatetime("");
    setStorageOutDatetime("");
    setPickupContractorId("");
    setNotes("");
  };

  const generateCode = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `ADT-${dateStr}-${rand}`;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อรายการ");
      return;
    }
    if (!storageLocation.trim()) {
      toast.error("กรุณาระบุพื้นที่รับฝาก");
      return;
    }
    if (!storageInDatetime) {
      toast.error("กรุณาระบุวัน-เวลาเข้าใช้พื้นที่");
      return;
    }
    if (!storageOutDatetime) {
      toast.error("กรุณาระบุวัน-เวลายกเลิกใช้พื้นที่");
      return;
    }
    if (!pickupContractorId) {
      toast.error("กรุณาเลือกผู้มาหยิบ");
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

      const code = generateCode();

      const { error } = await supabase.from("advertisements").insert({
        code,
        entry_type: "temporary",
        name: name.trim(),
        status: "in_storage",
        storage_location: storageLocation.trim(),
        storage_in_datetime: new Date(storageInDatetime).toISOString(),
        storage_out_datetime: new Date(storageOutDatetime).toISOString(),
        pickup_contractor_id: pickupContractorId,
        notes: notes.trim() || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success(`บันทึกการขอใช้พื้นที่ ${code} สำเร็จ`);
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
          <Clock className="h-4 w-4" />
          ขอใช้พื้นที่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ขอใช้พื้นที่รับฝากชั่วคราว</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>ชื่อรายการ *</Label>
            <Input
              placeholder="เช่น วัสดุโฆษณา Samsung"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Storage Location */}
          <div className="space-y-1.5">
            <Label>พื้นที่รับฝาก *</Label>
            <Input
              placeholder="เช่น โซน A ชั้น 2"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* In / Out datetime */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>วัน-เวลาเข้าใช้พื้นที่ *</Label>
              <Input
                type="datetime-local"
                value={storageInDatetime}
                onChange={(e) => setStorageInDatetime(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>วัน-เวลายกเลิกใช้พื้นที่ *</Label>
              <Input
                type="datetime-local"
                value={storageOutDatetime}
                onChange={(e) => setStorageOutDatetime(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Pickup Contractor */}
          <div className="space-y-1.5">
            <Label>ผู้มาหยิบ *</Label>
            <ContractorSelect
              value={pickupContractorId}
              onChange={setPickupContractorId}
              placeholder="เลือกผู้รับเหมา/ผู้มาหยิบ"
              disabled={saving}
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
