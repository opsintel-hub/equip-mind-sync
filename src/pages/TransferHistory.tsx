import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";

interface Transfer {
  id: string;
  equipment_id: string;
  quantity: number;
  transfer_date: string;
  notes: string | null;
  created_at: string;
  equipment: {
    code: string;
    name: string;
  };
  from_location: {
    code: string;
    name: string;
  } | null;
  to_location: {
    code: string;
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function TransferHistory() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment_transfers")
        .select(`
          id,
          equipment_id,
          quantity,
          transfer_date,
          notes,
          created_at,
          created_by,
          from_location_id,
          to_location_id,
          equipment:equipment!equipment_transfers_equipment_id_fkey(code, name),
          from_location:locations!equipment_transfers_from_location_id_fkey(code, name),
          to_location:locations!equipment_transfers_to_location_id_fkey(code, name)
        `)
        .order("transfer_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.created_by))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const transfersWithProfiles = data.map(transfer => ({
          ...transfer,
          profiles: profilesMap.get(transfer.created_by) || { full_name: "ไม่ทราบชื่อ" }
        }));
        
        setTransfers(transfersWithProfiles as any);
      } else {
        setTransfers([]);
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const {
    paginatedData: paginatedTransfers,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(transfers, 20);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">ประวัติการย้ายอุปกรณ์</h1>
        <p className="text-muted-foreground mt-2">
          บันทึกการย้ายอุปกรณ์ระหว่างตำแหน่งจัดเก็บ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการการย้ายอุปกรณ์</CardTitle>
          <CardDescription>
            แสดงประวัติการย้ายอุปกรณ์ทั้งหมด เรียงตามวันที่ล่าสุด
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              ยังไม่มีประวัติการย้ายอุปกรณ์
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>อุปกรณ์</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>ตำแหน่งเดิม</TableHead>
                    <TableHead></TableHead>
                    <TableHead>ตำแหน่งใหม่</TableHead>
                    <TableHead>ผู้ทำรายการ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        {format(new Date(transfer.transfer_date), "d MMM yyyy", {
                          locale: th,
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transfer.equipment.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.equipment.code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transfer.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        {transfer.from_location ? (
                          <div>
                            <div className="font-medium">
                              {transfer.from_location.code}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {transfer.from_location.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {transfer.to_location.code}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.to_location.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{transfer.profiles.full_name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transfer.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
    </div>
  );
}
