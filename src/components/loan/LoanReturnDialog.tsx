import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Loan {
  id: string;
  quantity: number;
  returned_quantity: number;
  equipment?: { code: string; name: string } | null;
  from_company?: { code: string; name: string } | null;
  to_company?: { code: string; name: string } | null;
}

interface LoanReturnDialogProps {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LoanReturnDialog({ loan, open, onOpenChange, onSuccess }: LoanReturnDialogProps) {
  const remaining = loan.quantity - loan.returned_quantity;
  const [returnQuantity, setReturnQuantity] = useState(remaining.toString());
  const [returnNotes, setReturnNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReturn = async () => {
    const qty = parseInt(returnQuantity);
    if (qty <= 0 || qty > remaining) {
      toast.error(`จำนวนคืนต้องอยู่ระหว่าง 1 - ${remaining}`);
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const newReturnedQuantity = loan.returned_quantity + qty;
    const isComplete = newReturnedQuantity >= loan.quantity;

    const { error } = await supabase
      .from("equipment_loans")
      .update({
        returned_quantity: newReturnedQuantity,
        return_date: isComplete ? new Date().toISOString().split('T')[0] : null,
        status: isComplete ? "returned" : "approved",
        returned_by: user?.id,
        return_notes: returnNotes || null
      })
      .eq("id", loan.id);

    setIsLoading(false);

    if (error) {
      toast.error("ไม่สามารถบันทึกการคืนได้");
      console.error(error);
    } else {
      toast.success(`บันทึกคืน ${qty} รายการสำเร็จ`);
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการคืนอะไหล่</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">อะไหล่:</span>
              <span className="font-medium">{loan.equipment?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">รหัส:</span>
              <span>{loan.equipment?.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ยืมจาก:</span>
              <span>{loan.from_company?.code} - {loan.from_company?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ยืมไป:</span>
              <span>{loan.to_company?.code} - {loan.to_company?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">จำนวนยืม:</span>
              <span>{loan.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">คืนแล้ว:</span>
              <span>{loan.returned_quantity}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">คงเหลือ:</span>
              <span className="text-primary">{remaining}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>จำนวนที่คืน *</Label>
            <Input
              type="number"
              min="1"
              max={remaining}
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>หมายเหตุการคืน</Label>
            <Textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="ระบุหมายเหตุ เช่น สภาพอะไหล่"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleReturn} disabled={isLoading}>
              {isLoading ? "กำลังบันทึก..." : "บันทึกการคืน"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
