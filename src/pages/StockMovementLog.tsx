import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { StockMovementGroupRow, GroupedMovement, StockMovementItem } from "@/components/stock-movement/StockMovementGroupRow";
import { StockMovementDocumentDialog } from "@/components/stock-movement/StockMovementDocumentDialog";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";

export default function StockMovementLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<GroupedMovement | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", searchTerm, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("stock_movements")
        .select(`
          *,
          equipment:equipment_id(code, name),
          location:location_id(name),
          companies:company_id(name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`equipment_code.ilike.%${searchTerm}%,equipment_name.ilike.%${searchTerm}%,reference_document.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== "all") {
        query = query.eq("movement_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Group movements by reference_document
  const groupedMovements = useMemo(() => {
    if (!movements) return [];

    const groups = new Map<string, GroupedMovement>();

    movements.forEach((movement: any) => {
      const key = movement.reference_document || movement.id; // Use id if no document
      
      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.items.push(movement);
        group.total_items = group.items.length;
      } else {
        groups.set(key, {
          reference_document: movement.reference_document || `No-Doc-${movement.id.slice(0, 8)}`,
          created_at: movement.created_at,
          movement_type: movement.movement_type,
          company_name: movement.companies?.name || null,
          items: [movement],
          total_items: 1,
        });
      }
    });

    return Array.from(groups.values());
  }, [movements]);

  // Paginate grouped data
  const {
    paginatedData: paginatedGroups,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(groupedMovements, 20);

  const handleViewDocument = (group: GroupedMovement) => {
    setSelectedGroup(group);
    setIsDocumentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Stock Movement Log</h1>
        <p className="text-muted-foreground">ประวัติการเคลื่อนไหว stock ทั้งหมด (รับเข้า/เบิกออก/โอน/คืนจากป้าย)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการเคลื่อนไหว</CardTitle>
          <CardDescription>
            แสดงรายการเปลี่ยนแปลง stock พร้อม stock ก่อน-หลังทุกรายการ (จัดกลุ่มตามเอกสาร)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา รหัส/ชื่ออุปกรณ์ หรือเลขเอกสาร..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handlePageChange(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              handlePageChange(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="receive">รับเข้า</SelectItem>
                <SelectItem value="issue">เบิกออก</SelectItem>
                <SelectItem value="transfer_in">รับโอน</SelectItem>
                <SelectItem value="transfer_out">โอนออก</SelectItem>
                <SelectItem value="return_from_billboard">คืนจากป้าย</SelectItem>
                <SelectItem value="install_to_billboard">ติดตั้งป้าย</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบข้อมูลการเคลื่อนไหว stock
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>วันที่/เวลา</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>บริษัท</TableHead>
                      <TableHead>เลขเอกสาร / รหัสสินค้า</TableHead>
                      <TableHead>รายการ / ชื่อสินค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ก่อน</TableHead>
                      <TableHead className="text-right">หลัง</TableHead>
                      <TableHead>ตำแหน่ง / การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGroups.map((group) => (
                      <StockMovementGroupRow
                        key={group.reference_document}
                        group={group}
                        onViewDocument={handleViewDocument}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <StockMovementDocumentDialog
        open={isDocumentDialogOpen}
        onOpenChange={setIsDocumentDialogOpen}
        group={selectedGroup}
      />
    </div>
  );
}
