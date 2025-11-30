import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Location {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationSelect({ value, onChange, disabled }: LocationSelectProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("code");

    if (error) {
      console.error("Error fetching locations:", error);
      toast.error("ไม่สามารถโหลดข้อมูลคลังสินค้าได้");
    } else {
      setLocations(data || []);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAdd = async () => {
    if (!newCode.trim() || !newName.trim()) {
      toast.error("กรุณากรอกรหัสและชื่อคลังสินค้า");
      return;
    }

    const { error } = await supabase
      .from("locations")
      .insert({
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription.trim() || null,
      });

    if (error) {
      console.error("Error adding location:", error);
      toast.error("ไม่สามารถเพิ่มคลังสินค้าได้");
    } else {
      toast.success("เพิ่มคลังสินค้าสำเร็จ");
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setIsAdding(false);
      fetchLocations();
    }
  };

  const handleEdit = async () => {
    if (!editCode.trim() || !editName.trim()) {
      toast.error("กรุณากรอกรหัสและชื่อคลังสินค้า");
      return;
    }

    const { error } = await supabase
      .from("locations")
      .update({
        code: editCode.trim(),
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq("id", editingId);

    if (error) {
      console.error("Error updating location:", error);
      toast.error("ไม่สามารถแก้ไขคลังสินค้าได้");
    } else {
      toast.success("แก้ไขคลังสินค้าสำเร็จ");
      setEditingId(null);
      setEditCode("");
      setEditName("");
      setEditDescription("");
      fetchLocations();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting location:", error);
      toast.error("ไม่สามารถลบคลังสินค้าได้");
    } else {
      toast.success("ลบคลังสินค้าสำเร็จ");
      setDeleteId(null);
      fetchLocations();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="เลือกคลังสินค้า" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.code} - {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsManageOpen(true)}
          disabled={disabled}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการคลังสินค้า</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มคลังสินค้า
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <Input
                  placeholder="รหัสคลังสินค้า"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <Input
                  placeholder="ชื่อคลังสินค้า"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Textarea
                  placeholder="รายละเอียด (ไม่บังคับ)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAdd} className="flex-1">บันทึก</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewCode("");
                      setNewName("");
                      setNewDescription("");
                    }}
                    className="flex-1"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {locations.map((loc) => (
                <div key={loc.id} className="border rounded-lg p-3">
                  {editingId === loc.id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="รหัสคลังสินค้า"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                      />
                      <Input
                        placeholder="ชื่อคลังสินค้า"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Textarea
                        placeholder="รายละเอียด"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleEdit} size="sm" className="flex-1">
                          บันทึก
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditCode("");
                            setEditName("");
                            setEditDescription("");
                          }}
                          size="sm"
                          className="flex-1"
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {loc.code} - {loc.name}
                        </div>
                        {loc.description && (
                          <div className="text-sm text-muted-foreground">{loc.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(loc.id);
                            setEditCode(loc.code);
                            setEditName(loc.name);
                            setEditDescription(loc.description || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(loc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบคลังสินค้านี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
