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
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ChevronDown, ChevronRight, QrCode, Download, Search } from "lucide-react";
import { LocationForm } from "./LocationForm";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface StorageSlot {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sub_storage_slots: SubStorageSlot[];
}

interface SubStorageSlot {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
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
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

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
            is_active,
            sub_storage_slots:sub_storage_slots(
              id,
              name,
              description,
              is_active
            )
          )
        `)
        .order("code");

      if (error) throw error;
      setLocations(data || []);
      setFilteredLocations(data || []);
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

  useEffect(() => {
    if (searchTerm) {
      const filtered = locations.filter(
        (location) =>
          location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (location.storage_area && location.storage_area.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(locations);
    }
  }, [searchTerm, locations]);

  const handleExport = () => {
    const exportData: any[] = [];
    
    filteredLocations.forEach((location) => {
      if (location.storage_slots && location.storage_slots.length > 0) {
        location.storage_slots.forEach((slot) => {
          if (slot.sub_storage_slots && slot.sub_storage_slots.length > 0) {
            slot.sub_storage_slots.forEach((subSlot) => {
              exportData.push({
                "รหัสคลัง": location.code,
                "ชื่อคลัง": location.name,
                "พื้นที่จัดเก็บ": location.storage_area || "-",
                "ช่องจัดเก็บ": slot.name,
                "ช่องย่อย": subSlot.name,
                "สถานะคลัง": location.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
                "สถานะช่อง": slot.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
                "สถานะช่องย่อย": subSlot.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
              });
            });
          } else {
            exportData.push({
              "รหัสคลัง": location.code,
              "ชื่อคลัง": location.name,
              "พื้นที่จัดเก็บ": location.storage_area || "-",
              "ช่องจัดเก็บ": slot.name,
              "ช่องย่อย": "-",
              "สถานะคลัง": location.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
              "สถานะช่อง": slot.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
              "สถานะช่องย่อย": "-",
            });
          }
        });
      } else {
        exportData.push({
          "รหัสคลัง": location.code,
          "ชื่อคลัง": location.name,
          "พื้นที่จัดเก็บ": location.storage_area || "-",
          "ช่องจัดเก็บ": "-",
          "ช่องย่อย": "-",
          "สถานะคลัง": location.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
          "สถานะช่อง": "-",
          "สถานะช่องย่อย": "-",
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locations");
    XLSX.writeFile(wb, `locations_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("ส่งออกข้อมูลสำเร็จ");
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
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วยรหัส, ชื่อ, หรือพื้นที่จัดเก็บ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          ส่งออก Excel
        </Button>
      </div>
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
          {filteredLocations.map((location) => {
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
