import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ChevronDown, ChevronRight, QrCode } from "lucide-react";
import { LocationForm } from "./LocationForm";
import { useNavigate } from "react-router-dom";

interface StorageSlot {
  id: string;
  name: string;
  description: string | null;
  sub_storage_slots: SubStorageSlot[];
}

interface SubStorageSlot {
  id: string;
  name: string;
  description: string | null;
}

interface Location {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storage_area: string | null;
  is_active: boolean;
  created_at: string;
  storage_slots?: StorageSlot[];
}

interface LocationListProps {
  refresh: number;
}

export function LocationList({ refresh }: LocationListProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetchLocations();
  }, [refresh]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("locations")
        .select(`
          *,
          storage_slots:storage_slots(
            id,
            name,
            description,
            sub_storage_slots:sub_storage_slots(
              id,
              name,
              description
            )
          )
        `)
        .order("code");

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    setOpenLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("ลบตำแหน่งจัดเก็บสำเร็จ");
      fetchLocations();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        ยังไม่มีข้อมูลตำแหน่งจัดเก็บ
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อตำแหน่ง</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => {
            const hasSlots = location.storage_slots && location.storage_slots.length > 0;
            const isOpen = openLocations.has(location.id);
            
            return (
              <>
                <TableRow key={location.id}>
                  <TableCell>
                    {hasSlots && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleLocation(location.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{location.code}</TableCell>
                  <TableCell>{location.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {location.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.is_active ? "default" : "secondary"}>
                      {location.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/qr-code?type=location&id=${location.id}`)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <LocationForm
                        onSuccess={fetchLocations}
                        location={location}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(location.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                
                {isOpen && hasSlots && location.storage_slots!.map((slot) => (
                  <>
                    <TableRow key={`slot-${slot.id}`} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell className="pl-8" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">└─</span>
                          <span className="font-medium">{slot.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {slot.description || "-"}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/qr-code?type=slot&id=${slot.id}`)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {slot.sub_storage_slots && slot.sub_storage_slots.map((subSlot) => (
                      <TableRow key={`subslot-${subSlot.id}`} className="bg-muted/50">
                        <TableCell></TableCell>
                        <TableCell className="pl-12" colSpan={2}>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">└─└─</span>
                            <span className="text-sm">{subSlot.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {subSlot.description || "-"}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/qr-code?type=subslot&id=${subSlot.id}`)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่งจัดเก็บนี้?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
