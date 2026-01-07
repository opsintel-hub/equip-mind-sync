import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";
import { LocationSelect } from "@/components/location/LocationSelect";
import { logStockMovement } from "@/lib/stockMovement";

interface Equipment {
  id: string;
  name: string;
  code: string;
  quantity_in_stock: number;
  location_id: string | null;
  locations?: {
    name: string;
  };
}

interface EquipmentTransferFormProps {
  equipment: Equipment;
  onSuccess: () => void;
}

export function EquipmentTransferForm({ equipment, onSuccess }: EquipmentTransferFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to_location_id: "",
    quantity: 1,
    transfer_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setFormData({
        to_location_id: "",
        quantity: 1,
        transfer_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to_location_id) {
      toast.error("กรุณาเลือกตำแหน่งปลายทาง");
      return;
    }

    if (formData.quantity > equipment.quantity_in_stock) {
      toast.error("จำนวนที่ต้องการย้ายมากกว่าจำนวนคงคลัง");
      return;
    }

    if (formData.to_location_id === equipment.location_id) {
      toast.error("ตำแหน่งปลายทางต้องไม่เหมือนกับตำแหน่งเดิม");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      // Insert transfer record
      const { error: transferError } = await supabase
        .from("equipment_transfers")
        .insert({
          equipment_id: equipment.id,
          from_location_id: equipment.location_id,
          to_location_id: formData.to_location_id,
          quantity: formData.quantity,
          transfer_date: formData.transfer_date,
          notes: formData.notes || null,
          created_by: user.id,
        });

      if (transferError) throw transferError;

      // Update equipment location
      const { error: updateError } = await supabase
        .from("equipment")
        .update({
          location_id: formData.to_location_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", equipment.id);

      if (updateError) throw updateError;

      // Log stock movement for transfer (transfer_out from source, conceptually - stock doesn't change)
      await logStockMovement({
        equipment_id: equipment.id,
        equipment_code: equipment.code,
        equipment_name: equipment.name,
        movement_type: "transfer_out",
        quantity: formData.quantity,
        stock_before: equipment.quantity_in_stock,
        stock_after: equipment.quantity_in_stock, // Stock doesn't change on transfer
        reference_type: "equipment_transfer",
        reference_document: `Transfer ${formData.transfer_date}`,
        location_id: formData.to_location_id,
        notes: formData.notes || `ย้ายจาก ${equipment.locations?.name || "ไม่ระบุ"}`,
      });

      toast.success("ย้ายอุปกรณ์สำเร็จ");
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="ย้ายอุปกรณ์">
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ย้ายอุปกรณ์</DialogTitle>
          <DialogDescription>
            {equipment.name} ({equipment.code})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ตำแหน่งเดิม</Label>
            <Input
              value={equipment.locations?.name || "-"}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="to_location_id">
              ตำแหน่งปลายทาง <span className="text-destructive">*</span>
            </Label>
            <LocationSelect
              value={formData.to_location_id}
              onChange={(value) =>
                setFormData({ ...formData, to_location_id: value })
              }
            />
          </div>

          <div>
            <Label htmlFor="quantity">
              จำนวน <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={equipment.quantity_in_stock}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
              }
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              คงคลัง: {equipment.quantity_in_stock} {equipment.code}
            </p>
          </div>

          <div>
            <Label htmlFor="transfer_date">
              วันที่ย้าย <span className="text-destructive">*</span>
            </Label>
            <Input
              id="transfer_date"
              type="date"
              value={formData.transfer_date}
              onChange={(e) =>
                setFormData({ ...formData, transfer_date: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              placeholder="ระบุเหตุผลหรือหมายเหตุการย้าย"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "ย้ายอุปกรณ์"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
