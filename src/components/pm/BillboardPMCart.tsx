import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PMActionType {
  id: string;
  name: string;
  code: string;
  is_snooze: boolean;
  snooze_days: number | null;
}

interface BillboardPMItem {
  billboardId: string;
  oldCode: string;
  equipmentItems: any[];
  pmReason: string;
  billboardSnapshot: any;
}

interface BillboardPMCartProps {
  selectedItems: BillboardPMItem[];
  actionTypes: PMActionType[];
  onActionComplete: () => void;
  onClearSelection: () => void;
}

export function BillboardPMCart({ selectedItems, actionTypes, onActionComplete, onClearSelection }: BillboardPMCartProps) {
  const { user } = useAuth();
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (selectedItems.length === 0) return null;

  const selectedAction = actionTypes.find(a => a.id === selectedActionId);

  const handleConfirm = async () => {
    if (!selectedAction) return;
    setLoading(true);

    try {
      for (const item of selectedItems) {
        if (selectedAction.is_snooze && selectedAction.snooze_days) {
          const snoozeUntil = new Date();
          snoozeUntil.setDate(snoozeUntil.getDate() + selectedAction.snooze_days);

          await supabase.from("billboard_pm_actions").insert({
            billboard_id: item.billboardId,
            action_type_id: selectedAction.id,
            action_type: "snoozed",
            pm_reason: item.pmReason,
            snooze_until: snoozeUntil.toISOString().split("T")[0],
            equipment_snapshot: item.equipmentItems,
            notes: notes || null,
            created_by: user?.id,
          });
        } else {
          // create_ticket - insert into permanent history
          await supabase.from("billboard_pm_history").insert({
            billboard_id: item.billboardId,
            action_type_id: selectedAction.id,
            action_label: selectedAction.name,
            pm_reason: item.pmReason,
            equipment_snapshot: item.equipmentItems,
            billboard_snapshot: item.billboardSnapshot,
            notes: notes || null,
            actioned_by: user?.id,
            actioned_at: new Date().toISOString(),
          });

          // Also record as ticket_created in actions to exclude from main list
          await supabase.from("billboard_pm_actions").insert({
            billboard_id: item.billboardId,
            action_type_id: selectedAction.id,
            action_type: "ticket_created",
            pm_reason: item.pmReason,
            equipment_snapshot: item.equipmentItems,
            notes: notes || null,
            created_by: user?.id,
          });
        }
      }

      toast.success(`ดำเนินการสำเร็จ: ${selectedItems.length} ป้าย`);
      setConfirmOpen(false);
      setNotes("");
      setSelectedActionId("");
      onClearSelection();
      onActionComplete();
    } catch (error) {
      console.error("Error processing PM action:", error);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <Badge variant="default" className="bg-primary">
            เลือกแล้ว {selectedItems.length} ป้าย
          </Badge>
        </div>

        <Select value={selectedActionId} onValueChange={setSelectedActionId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="เลือกการดำเนินการ..." />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map(action => (
              <SelectItem key={action.id} value={action.id}>
                {action.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!selectedActionId}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          ยืนยัน
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          ยกเลิกการเลือก
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการดำเนินการ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">การดำเนินการ:</p>
              <p className="text-sm text-primary font-semibold mt-1">{selectedAction?.name}</p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">ป้ายที่เลือก ({selectedItems.length} ป้าย):</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedItems.map(item => (
                  <div key={item.billboardId} className="text-sm text-muted-foreground">
                    • {item.oldCode || item.billboardId.slice(0, 8)}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>หมายเหตุ (ไม่จำเป็น)</Label>
              <Textarea
                placeholder="ระบุหมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
