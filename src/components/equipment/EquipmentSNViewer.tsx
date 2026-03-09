import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Search, Package, Truck, MapPin, AlertTriangle } from "lucide-react";

interface EquipmentSNViewerProps {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "รอรับเข้า", color: "bg-warning/10 text-warning border-warning/20", icon: Package },
  in_stock: { label: "ในคลัง", color: "bg-success/10 text-success border-success/20", icon: Package },
  issued: { label: "เบิกแล้ว", color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Truck },
  installed: { label: "ติดตั้งแล้ว", color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: MapPin },
  defective: { label: "เสีย", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  returned: { label: "คืนแล้ว", color: "bg-muted text-muted-foreground border-muted", icon: Package },
};

export function EquipmentSNViewer({ equipmentId, equipmentCode, equipmentName }: EquipmentSNViewerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: serialNumbers, isLoading } = useQuery({
    queryKey: ["equipment-sn-list", equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_serial_numbers")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const snCount = serialNumbers?.length || 0;
  const inStockCount = serialNumbers?.filter(sn => sn.status === "in_stock").length || 0;

  const filteredSNs = (serialNumbers || []).filter(sn => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return sn.serial_number.toLowerCase().includes(term) ||
      sn.status.toLowerCase().includes(term) ||
      sn.receipt_document_no?.toLowerCase().includes(term) ||
      sn.issue_document_no?.toLowerCase().includes(term);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-7 px-2 text-xs">
          <Hash className="h-3 w-3" />
          S/N
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Hash className="h-5 w-5" />
            Serial Numbers — {equipmentCode}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{equipmentName}</p>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">ทั้งหมด {snCount}</Badge>
          <Badge className="bg-success/10 text-success border-success/20">ในคลัง {inStockCount}</Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา S/N, สถานะ, เลขเอกสาร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredSNs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {snCount === 0 ? "ยังไม่มี Serial Number ในระบบ" : "ไม่พบ S/N ที่ค้นหา"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="hidden sm:table-cell">เอกสารรับเข้า</TableHead>
                  <TableHead className="hidden sm:table-cell">เอกสารเบิก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSNs.map((sn) => {
                  const config = statusConfig[sn.status] || statusConfig.pending;
                  return (
                    <TableRow key={sn.id}>
                      <TableCell className="font-mono text-sm font-medium">{sn.serial_number}</TableCell>
                      <TableCell>
                        <Badge className={`${config.color} text-[11px] px-1.5`}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {sn.receipt_document_no || "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {sn.issue_document_no || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
