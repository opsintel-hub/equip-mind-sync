import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

interface TechnicianToolsDialogProps {
  technicianId: string;
  technicianName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AssignedTool {
  id: string;
  assigned_date: string;
  tool: {
    id: string;
    code: string;
    name: string;
    brand: string | null;
    serial_number: string | null;
    unit: string;
  };
}

interface AvailableTool {
  id: string;
  code: string;
  name: string;
  brand: string | null;
}

export function TechnicianToolsDialog({ technicianId, technicianName, open, onOpenChange }: TechnicianToolsDialogProps) {
  const [assignedTools, setAssignedTools] = useState<AssignedTool[]>([]);
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchAssignedTools();
      fetchAvailableTools();
    }
  }, [open, technicianId]);

  const fetchAssignedTools = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("technician_tools")
        .select(`
          id, assigned_date,
          tool:tools(id, code, name, brand, serial_number, unit)
        `)
        .eq("technician_id", technicianId);

      if (error) throw error;
      setAssignedTools(data || []);
    } catch (error) {
      console.error("Error fetching assigned tools:", error);
      toast.error("ไม่สามารถโหลดข้อมูลเครื่องมือได้");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableTools = async () => {
    try {
      // Get all active personal tools
      const { data: allTools } = await supabase
        .from("tools")
        .select("id, code, name, brand")
        .eq("is_active", true)
        .eq("is_personal_tool", true)
        .order("code");

      // Get already assigned tool ids for this technician
      const { data: assigned } = await supabase
        .from("technician_tools")
        .select("tool_id")
        .eq("technician_id", technicianId);

      const assignedIds = new Set((assigned || []).map((a: any) => a.tool_id));
      setAvailableTools((allTools || []).filter(t => !assignedIds.has(t.id)));
    } catch (error) {
      console.error("Error fetching available tools:", error);
    }
  };

  const handleAddTool = async () => {
    if (!selectedToolId) return;
    try {
      const { error } = await supabase.from("technician_tools").insert({
        technician_id: technicianId,
        tool_id: selectedToolId,
      });
      if (error) throw error;
      toast.success("เพิ่มเครื่องมือให้ช่างสำเร็จ");
      setSelectedToolId("");
      fetchAssignedTools();
      fetchAvailableTools();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("เครื่องมือนี้ถูกกำหนดให้ช่างคนนี้แล้ว");
      } else {
        toast.error("ไม่สามารถเพิ่มเครื่องมือได้");
      }
    }
  };

  const handleRemoveTool = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from("technician_tools").delete().eq("id", assignmentId);
      if (error) throw error;
      toast.success("ถอดเครื่องมือออกจากช่างสำเร็จ");
      fetchAssignedTools();
      fetchAvailableTools();
    } catch (error) {
      toast.error("ไม่สามารถถอดเครื่องมือได้");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            เครื่องมือประจำตัว: {technicianName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add tool */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเครื่องมือที่จะเพิ่ม" />
                </SelectTrigger>
                <SelectContent>
                  {availableTools.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      ไม่มีเครื่องมือประจำตัวช่างที่พร้อมเพิ่ม (ต้องติ๊ก "เครื่องมือประจำตัวช่าง" ในหน้าจัดการเครื่องมือก่อน)
                    </div>
                  ) : (
                    availableTools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.code} - {tool.name} {tool.brand ? `(${tool.brand})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTool} disabled={!selectedToolId}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่ม
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 เฉพาะเครื่องมือที่ถูกตั้งค่าเป็น "เครื่องมือประจำตัวช่าง" เท่านั้นจึงจะปรากฏในรายการ
          </p>

          {/* Assigned tools table */}
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">กำลังโหลด...</div>
          ) : assignedTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ยังไม่มีเครื่องมือประจำตัวช่างคนนี้</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อเครื่องมือ</TableHead>
                  <TableHead>ยี่ห้อ</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedTools.map((at) => (
                  <TableRow key={at.id}>
                    <TableCell className="font-medium">{at.tool.code}</TableCell>
                    <TableCell>{at.tool.name}</TableCell>
                    <TableCell>{at.tool.brand || "-"}</TableCell>
                    <TableCell>{at.tool.serial_number || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveTool(at.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
