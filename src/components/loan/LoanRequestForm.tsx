import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

interface Company {
  id: string;
  code: string;
  name: string;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number;
  unit: string;
}

interface LoanRequestFormProps {
  onSuccess: () => void;
}

export function LoanRequestForm({ onSuccess }: LoanRequestFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [fromCompanyId, setFromCompanyId] = useState("");
  const [toCompanyId, setToCompanyId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (fromCompanyId) {
      fetchEquipment();
    }
  }, [fromCompanyId]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    setCompanies(data || []);
  };

  const fetchEquipment = async () => {
    const { data } = await supabase
      .from("equipment")
      .select("id, code, name, quantity_in_stock, unit")
      .eq("company_id", fromCompanyId)
      .eq("is_active", true)
      .gt("quantity_in_stock", 0)
      .order("code");
    setEquipment(data || []);
  };

  const selectedEquipment = equipment.find(e => e.id === equipmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromCompanyId || !toCompanyId || !equipmentId || !quantity || !dueDate || !requesterName) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (fromCompanyId === toCompanyId) {
      toast.error("บริษัทผู้ให้ยืมและผู้ยืมต้องไม่ใช่บริษัทเดียวกัน");
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }

    if (selectedEquipment && qty > selectedEquipment.quantity_in_stock) {
      toast.error(`จำนวนที่ขอยืมเกินจำนวนคงเหลือ (มี ${selectedEquipment.quantity_in_stock} ${selectedEquipment.unit})`);
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("equipment_loans").insert({
      equipment_id: equipmentId,
      from_company_id: fromCompanyId,
      to_company_id: toCompanyId,
      quantity: qty,
      due_date: dueDate,
      requester_name: requesterName,
      requester_phone: requesterPhone || null,
      notes: notes || null,
      created_by: user?.id
    });

    setIsLoading(false);

    if (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกได้");
    } else {
      toast.success("ส่งคำขอยืมสำเร็จ รอการอนุมัติ");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ยืมจากบริษัท *</Label>
          <Select value={fromCompanyId} onValueChange={(v) => {
            setFromCompanyId(v);
            setEquipmentId("");
          }}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกบริษัทผู้ให้ยืม" />
            </SelectTrigger>
            <SelectContent>
              {companies.filter(c => c.id !== toCompanyId).map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.code} - {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>ยืมไปบริษัท *</Label>
          <Select value={toCompanyId} onValueChange={setToCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกบริษัทผู้ยืม" />
            </SelectTrigger>
            <SelectContent>
              {companies.filter(c => c.id !== fromCompanyId).map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.code} - {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>อะไหล่ที่ต้องการยืม *</Label>
        <Select value={equipmentId} onValueChange={setEquipmentId} disabled={!fromCompanyId}>
          <SelectTrigger>
            <SelectValue placeholder={fromCompanyId ? "เลือกอะไหล่" : "เลือกบริษัทผู้ให้ยืมก่อน"} />
          </SelectTrigger>
          <SelectContent>
            {equipment.map(eq => (
              <SelectItem key={eq.id} value={eq.id}>
                {eq.code} - {eq.name} (คงเหลือ: {eq.quantity_in_stock} {eq.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>จำนวนที่ต้องการยืม *</Label>
          <Input
            type="number"
            min="1"
            max={selectedEquipment?.quantity_in_stock}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="ระบุจำนวน"
          />
          {selectedEquipment && (
            <p className="text-sm text-muted-foreground">
              คงเหลือ: {selectedEquipment.quantity_in_stock} {selectedEquipment.unit}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>กำหนดคืน *</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ชื่อผู้ขอยืม *</Label>
          <Input
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            placeholder="ระบุชื่อผู้ขอยืม"
          />
        </div>

        <div className="space-y-2">
          <Label>เบอร์โทรศัพท์</Label>
          <Input
            value={requesterPhone}
            onChange={(e) => setRequesterPhone(e.target.value)}
            placeholder="ระบุเบอร์โทรศัพท์"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>หมายเหตุ</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "กำลังบันทึก..." : "ส่งคำขอยืม"}
        </Button>
      </div>
    </form>
  );
}
