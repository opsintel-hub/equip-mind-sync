import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Scan } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Location {
  id: string;
  code: string;
  name: string;
  storage_area: string | null;
}

interface StorageSlot {
  id: string;
  name: string;
  location_id: string;
}

interface SubStorageSlot {
  id: string;
  name: string;
  storage_slot_id: string;
}

interface HierarchicalStorageSelectProps {
  value: {
    locationId: string;
    storageSlotId?: string;
    subStorageSlotId?: string;
  };
  onChange: (value: {
    locationId: string;
    storageSlotId?: string;
    subStorageSlotId?: string;
  }) => void;
  disabled?: boolean;
}

export function HierarchicalStorageSelect({ value, onChange, disabled }: HierarchicalStorageSelectProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [storageSlots, setStorageSlots] = useState<StorageSlot[]>([]);
  const [subStorageSlots, setSubStorageSlots] = useState<SubStorageSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrInput, setQrInput] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (value.locationId) {
      fetchStorageSlots(value.locationId);
    } else {
      setStorageSlots([]);
      setSubStorageSlots([]);
    }
  }, [value.locationId]);

  useEffect(() => {
    if (value.storageSlotId) {
      fetchSubStorageSlots(value.storageSlotId);
    } else {
      setSubStorageSlots([]);
    }
  }, [value.storageSlotId]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name, storage_area")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageSlots = async (locationId: string) => {
    try {
      const { data, error } = await supabase
        .from("storage_slots")
        .select("id, name, location_id")
        .eq("location_id", locationId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setStorageSlots(data || []);
    } catch (error) {
      console.error("Error fetching storage slots:", error);
    }
  };

  const fetchSubStorageSlots = async (storageSlotId: string) => {
    try {
      const { data, error } = await supabase
        .from("sub_storage_slots")
        .select("id, name, storage_slot_id")
        .eq("storage_slot_id", storageSlotId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setSubStorageSlots(data || []);
    } catch (error) {
      console.error("Error fetching sub storage slots:", error);
    }
  };

  const handleLocationChange = (locationId: string) => {
    onChange({
      locationId,
      storageSlotId: undefined,
      subStorageSlotId: undefined,
    });
  };

  const handleStorageSlotChange = (storageSlotId: string) => {
    onChange({
      ...value,
      storageSlotId,
      subStorageSlotId: undefined,
    });
  };

  const handleSubStorageSlotChange = (subStorageSlotId: string) => {
    onChange({
      ...value,
      subStorageSlotId,
    });
  };

  const handleQrScan = async () => {
    if (!qrInput.trim()) {
      toast.error("กรุณากรอกข้อมูล QR Code");
      return;
    }

    try {
      // Parse QR data format: type:id (e.g., "location:uuid" or "slot:uuid" or "subslot:uuid")
      const [type, id] = qrInput.split(":");
      
      if (!type || !id) {
        toast.error("รูปแบบ QR Code ไม่ถูกต้อง");
        return;
      }

      if (type === "location") {
        const { data: location, error } = await supabase
          .from("locations")
          .select("id")
          .eq("id", id)
          .eq("is_active", true)
          .maybeSingle();

        if (error || !location) {
          toast.error("ไม่พบตำแหน่งจัดเก็บ");
          return;
        }

        onChange({ locationId: id, storageSlotId: undefined, subStorageSlotId: undefined });
        toast.success("เลือกตำแหน่งจัดเก็บสำเร็จ");
      } else if (type === "slot") {
        const { data: slot, error } = await supabase
          .from("storage_slots")
          .select("id, location_id")
          .eq("id", id)
          .eq("is_active", true)
          .maybeSingle();

        if (error || !slot) {
          toast.error("ไม่พบช่องจัดเก็บ");
          return;
        }

        onChange({ locationId: slot.location_id, storageSlotId: id, subStorageSlotId: undefined });
        toast.success("เลือกช่องจัดเก็บสำเร็จ");
      } else if (type === "subslot") {
        const { data: subSlot, error } = await supabase
          .from("sub_storage_slots")
          .select("id, storage_slot_id, storage_slots!inner(location_id)")
          .eq("id", id)
          .eq("is_active", true)
          .maybeSingle();

        if (error || !subSlot) {
          toast.error("ไม่พบช่องย่อยจัดเก็บ");
          return;
        }

        const locationId = (subSlot.storage_slots as any).location_id;
        onChange({ 
          locationId, 
          storageSlotId: subSlot.storage_slot_id, 
          subStorageSlotId: id 
        });
        toast.success("เลือกช่องย่อยจัดเก็บสำเร็จ");
      } else {
        toast.error("ประเภท QR Code ไม่ถูกต้อง");
        return;
      }

      setQrDialogOpen(false);
      setQrInput("");
    } catch (error) {
      console.error("Error processing QR:", error);
      toast.error("เกิดข้อผิดพลาดในการประมวลผล QR Code");
    }
  };

  const selectedLocation = locations.find(l => l.id === value.locationId);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label>ตำแหน่งจัดเก็บ (คลัง)</Label>
          <Select 
            value={value.locationId || ""} 
            onValueChange={handleLocationChange}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "กำลังโหลด..." : "เลือกตำแหน่ง"} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.code} - {location.name}
                  {location.storage_area && ` (${location.storage_area})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" disabled={disabled}>
              <Scan className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                สแกน QR Code ตำแหน่งจัดเก็บ
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>กรอกข้อมูล QR Code</Label>
                <Input
                  placeholder="เช่น location:uuid หรือ slot:uuid"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQrScan()}
                />
                <p className="text-xs text-muted-foreground">
                  สแกน QR Code จากหน้าตำแหน่งจัดเก็บ หรือกรอกรหัสด้วยตนเอง
                </p>
              </div>
              <Button onClick={handleQrScan} className="w-full">
                ยืนยัน
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {storageSlots.length > 0 && (
        <div className="space-y-2">
          <Label>ช่องจัดเก็บ</Label>
          <Select 
            value={value.storageSlotId || ""} 
            onValueChange={handleStorageSlotChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกช่องจัดเก็บ (ไม่บังคับ)" />
            </SelectTrigger>
            <SelectContent>
              {storageSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  {slot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {subStorageSlots.length > 0 && (
        <div className="space-y-2">
          <Label>ช่องย่อยจัดเก็บ</Label>
          <Select 
            value={value.subStorageSlotId || ""} 
            onValueChange={handleSubStorageSlotChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกช่องย่อยจัดเก็บ (ไม่บังคับ)" />
            </SelectTrigger>
            <SelectContent>
              {subStorageSlots.map((subSlot) => (
                <SelectItem key={subSlot.id} value={subSlot.id}>
                  {subSlot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedLocation && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          เลือก: {selectedLocation.code} - {selectedLocation.name}
          {value.storageSlotId && storageSlots.find(s => s.id === value.storageSlotId) && (
            <> → {storageSlots.find(s => s.id === value.storageSlotId)?.name}</>
          )}
          {value.subStorageSlotId && subStorageSlots.find(s => s.id === value.subStorageSlotId) && (
            <> → {subStorageSlots.find(s => s.id === value.subStorageSlotId)?.name}</>
          )}
        </div>
      )}
    </div>
  );
}
