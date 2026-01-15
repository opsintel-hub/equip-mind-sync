import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, AlertTriangle, CheckCircle2, Loader2, FileKey } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PendingAssetRecord {
  id: string;
  document_no: string;
  equipment_code: string | null;
  equipment_name: string | null;
  quantity: number;
  unit: string;
  is_asset: boolean;
  asset_code: string | null;
  equipment_id_code: string | null;
  waiting_asset_code: boolean;
  waiting_equipment_id: boolean;
  created_at: string;
  status: string;
  is_media_player: boolean;
}

const PendingAssetCodes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRecords, setPendingRecords] = useState<PendingAssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PendingAssetRecord | null>(null);
  const [assetCode, setAssetCode] = useState("");
  const [equipmentIdCode, setEquipmentIdCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  const fetchPendingRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("goods_receipt_pending")
      .select("*")
      .eq("is_asset", true)
      .or("waiting_asset_code.eq.true,waiting_equipment_id.eq.true")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setPendingRecords(data as PendingAssetRecord[]);
    }
    setIsLoading(false);
  };

  const openEditDialog = (record: PendingAssetRecord) => {
    setSelectedRecord(record);
    setAssetCode(record.asset_code || "");
    setEquipmentIdCode(record.equipment_id_code || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    // Validate required fields
    if (selectedRecord.waiting_asset_code && !assetCode) {
      toast.error("กรุณาระบุรหัสทรัพย์สิน");
      return;
    }
    if (selectedRecord.waiting_equipment_id && !equipmentIdCode) {
      toast.error("กรุณาระบุรหัส Equipment ID");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("goods_receipt_pending")
        .update({
          asset_code: assetCode || null,
          equipment_id_code: equipmentIdCode || null,
          waiting_asset_code: assetCode ? false : selectedRecord.waiting_asset_code,
          waiting_equipment_id: equipmentIdCode ? false : selectedRecord.waiting_equipment_id,
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      toast.success("บันทึกรหัสทรัพย์สินสำเร็จ");
      setIsDialogOpen(false);
      fetchPendingRecords();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = pendingRecords.filter(record =>
    record.document_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.equipment_id_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWaitingBadge = (record: PendingAssetRecord) => {
    const badges = [];
    if (record.waiting_asset_code) {
      badges.push(
        <Badge key="asset" variant="destructive" className="text-xs">
          รอรหัสทรัพย์สิน
        </Badge>
      );
    }
    if (record.waiting_equipment_id) {
      badges.push(
        <Badge key="equipment" variant="secondary" className="bg-warning/10 text-warning text-xs">
          รอ Equipment ID
        </Badge>
      );
    }
    if (badges.length === 0) {
      return (
        <Badge variant="secondary" className="bg-success/10 text-success text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          ครบถ้วน
        </Badge>
      );
    }
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <FileKey className="w-8 h-8" />
          รายการรอรหัสทรัพย์สิน
        </h1>
        <p className="text-muted-foreground">รายการสินค้าที่รอบันทึกรหัสทรัพย์สิน หรือ Equipment ID</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{pendingRecords.filter(r => r.waiting_asset_code || r.waiting_equipment_id).length}</p>
                <p className="text-sm text-muted-foreground">รอบันทึกรหัส</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileKey className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{pendingRecords.filter(r => r.waiting_asset_code).length}</p>
                <p className="text-sm text-muted-foreground">รอรหัสทรัพย์สิน</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileKey className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{pendingRecords.filter(r => r.waiting_equipment_id).length}</p>
                <p className="text-sm text-muted-foreground">รอ Equipment ID</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>รายการรอบันทึกรหัส</CardTitle>
              <CardDescription>คลิกที่รายการเพื่อบันทึกรหัสทรัพย์สิน</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>รหัสทรัพย์สิน</TableHead>
                    <TableHead>Equipment ID</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        ไม่มีรายการรอบันทึกรหัส
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{record.document_no}</TableCell>
                        <TableCell>{format(new Date(record.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <div>
                            {record.equipment_name || "-"}
                            {record.is_media_player && (
                              <Badge variant="outline" className="ml-2 text-xs">Media Player</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{record.quantity} {record.unit}</TableCell>
                        <TableCell>{record.asset_code || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{record.equipment_id_code || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>{getWaitingBadge(record)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(record)}
                            disabled={!record.waiting_asset_code && !record.waiting_equipment_id}
                          >
                            บันทึกรหัส
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกรหัสทรัพย์สิน</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">เลขที่เอกสาร</p>
                <p className="font-medium">{selectedRecord.document_no}</p>
                <p className="text-sm text-muted-foreground mt-2">สินค้า</p>
                <p className="font-medium">{selectedRecord.equipment_name || "-"}</p>
              </div>
              
              {selectedRecord.waiting_asset_code && (
                <div className="space-y-2">
                  <Label htmlFor="assetCode">รหัสทรัพย์สิน *</Label>
                  <Input
                    id="assetCode"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="ระบุรหัสทรัพย์สิน"
                  />
                </div>
              )}
              
              {selectedRecord.waiting_equipment_id && (
                <div className="space-y-2">
                  <Label htmlFor="equipmentIdCode">Equipment ID *</Label>
                  <Input
                    id="equipmentIdCode"
                    value={equipmentIdCode}
                    onChange={(e) => setEquipmentIdCode(e.target.value)}
                    placeholder="ระบุรหัส Equipment ID"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingAssetCodes;
