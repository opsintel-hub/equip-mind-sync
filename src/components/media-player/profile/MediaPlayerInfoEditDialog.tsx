import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  initial: {
    asset_caretaker?: string | null;
    planned_install_location?: string | null;
    asset_code?: string | null;
    equipment_id_code?: string | null;
  };
  onSaved: () => void;
}

export function MediaPlayerInfoEditDialog({ open, onOpenChange, playerId, initial, onSaved }: Props) {
  const [caretaker, setCaretaker] = useState("");
  const [plannedLocation, setPlannedLocation] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [equipmentIdCode, setEquipmentIdCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCaretaker(initial.asset_caretaker || "");
      setPlannedLocation(initial.planned_install_location || "");
      setAssetCode(initial.asset_code || "");
      setEquipmentIdCode(initial.equipment_id_code || "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("media_players")
        .update({
          asset_caretaker: caretaker.trim() || null,
          planned_install_location: plannedLocation.trim() || null,
          asset_code: assetCode.trim() || null,
          equipment_id_code: equipmentIdCode.trim() || null,
        } as any)
        .eq("id", playerId);
      if (error) throw error;
      toast.success("บันทึกข้อมูลเรียบร้อย");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลทรัพย์สิน</DialogTitle>
          <DialogDescription>เฉพาะเจ้าหน้าที่คลังเท่านั้นที่สามารถแก้ไขได้</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>ผู้ดูแลทรัพย์สิน</Label>
            <Input value={caretaker} onChange={(e) => setCaretaker(e.target.value)} placeholder="ชื่อผู้ดูแล..." />
          </div>
          <div className="space-y-2">
            <Label>Location ตามแผน PO</Label>
            <Input value={plannedLocation} onChange={(e) => setPlannedLocation(e.target.value)} placeholder="ตำแหน่งติดตั้งตามแผน..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>รหัสทรัพย์สิน</Label>
              <Input value={assetCode} onChange={(e) => setAssetCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Equipment ID</Label>
              <Input value={equipmentIdCode} onChange={(e) => setEquipmentIdCode(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
