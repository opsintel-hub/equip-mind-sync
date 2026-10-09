import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SPECIAL_REQUEST_TYPES, getRequestType } from "./requestTypes";

interface Props {
  requestType?: string;
  targetTable?: string;
  targetId?: string;
  targetItemId?: string;
  targetDocNumber?: string;
  targetUrl?: string;
  maxQty?: number;
  itemLabel?: string;
  trigger?: React.ReactNode;
}

export const SpecialRequestDialog = ({
  requestType, targetTable, targetId, targetItemId, targetDocNumber, targetUrl, maxQty, itemLabel, trigger,
}: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(requestType || "other");
  const [doc, setDoc] = useState(targetDocNumber || "");
  const [qty, setQty] = useState<number>(maxQty || 1);
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const t = getRequestType(type);

  const submit = async () => {
    if (!user) return;
    if (reason.trim().length < 5) return toast.error("กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร");
    setSaving(true);
    const { error } = await supabase.from("special_requests").insert({
      request_type: type,
      priority,
      target_table: targetTable ?? null,
      target_id: targetId ?? null,
      target_item_id: targetItemId ?? null,
      target_doc_number: doc || null,
      target_url: targetUrl ?? t.actionUrl ?? null,
      quantity: maxQty ? qty : null,
      payload: itemLabel ? { item: itemLabel } : {},
      reason: reason.trim(),
      requested_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error("ส่งคำร้องไม่สำเร็จ: " + error.message);
    toast.success("ส่งคำร้องถึง Super Admin แล้ว ติดตามได้ที่เมนู “ศูนย์คำร้องพิเศษ”");
    qc.invalidateQueries({ queryKey: ["special-requests"] });
    setOpen(false);
    setReason("");
  };

  return (
    <>
      <span onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        {trigger ?? (
          <Button size="sm" variant="ghost" className="gap-1 text-xs ml-1">
            <Send className="w-3 h-3" /> ขอปิดพิเศษ
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>ส่งคำร้องถึง Super Admin</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!requestType && (
              <div>
                <Label>ประเภทคำร้อง</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPECIAL_REQUEST_TYPES.filter((x) => !x.auto).map((x) => (
                      <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {requestType && <p className="text-sm font-medium">{t.label}</p>}
            {itemLabel && <p className="text-sm text-muted-foreground">รายการ: {itemLabel}</p>}
            {(t.needsDoc || doc) && (
              <div>
                <Label>เลขที่เอกสาร</Label>
                <Input value={doc} onChange={(e) => setDoc(e.target.value)} disabled={!!targetDocNumber} placeholder="เช่น GI-REQ-000125" />
              </div>
            )}
            {maxQty !== undefined && (
              <div>
                <Label>จำนวนที่ขอปิด (ค้าง {maxQty})</Label>
                <Input type="number" min={1} max={maxQty} value={qty}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))} />
              </div>
            )}
            <div>
              <Label>ความเร่งด่วน</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="urgent">ด่วน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>เหตุผล / รายละเอียด *</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น อะไหล่ใช้หมดหน้างานแล้ว ไม่มีของคืน" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "กำลังส่ง..." : "ส่งคำร้อง"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
