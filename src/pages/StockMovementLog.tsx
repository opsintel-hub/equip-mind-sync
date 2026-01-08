import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, TrendingUp, TrendingDown, ArrowRightLeft, RotateCcw, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const ITEMS_PER_PAGE = 20;

type MovementType = 'receive' | 'issue' | 'transfer_in' | 'transfer_out' | 'return_from_billboard' | 'install_to_billboard';

const movementTypeConfig: Record<MovementType, { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  receive: { label: "รับเข้า", icon: TrendingUp, variant: "default" },
  issue: { label: "เบิกออก", icon: TrendingDown, variant: "destructive" },
  transfer_in: { label: "รับโอน", icon: ArrowRightLeft, variant: "secondary" },
  transfer_out: { label: "โอนออก", icon: ArrowRightLeft, variant: "outline" },
  return_from_billboard: { label: "คืนจากป้าย", icon: RotateCcw, variant: "default" },
  install_to_billboard: { label: "ติดตั้งป้าย", icon: Package, variant: "outline" },
};

export default function StockMovementLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", searchTerm, typeFilter, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("stock_movements")
        .select(`
          *,
          equipment:equipment_id(code, name),
          location:location_id(name),
          companies:company_id(name)
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`equipment_code.ilike.%${searchTerm}%,equipment_name.ilike.%${searchTerm}%,reference_document.ilike.%${searchTerm}%`);
      }

      if (typeFilter !== "all") {
        query = query.eq("movement_type", typeFilter);
      }

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count };
    },
  });

  const totalPages = movements?.count ? Math.ceil(movements.count / ITEMS_PER_PAGE) : 1;

  const getMovementBadge = (type: string) => {
    const config = movementTypeConfig[type as MovementType];
    if (!config) return <Badge variant="outline">{type}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStockChange = (type: string, quantity: number) => {
    const isIncrease = ['receive', 'transfer_in', 'return_from_billboard'].includes(type);
    return (
      <span className={isIncrease ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
        {isIncrease ? "+" : "-"}{quantity}
      </span>
    );
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
            แสดงรายการเปลี่ยนแปลง stock พร้อม stock ก่อน-หลังทุกรายการ
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
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setCurrentPage(1);
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
          ) : movements?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบข้อมูลการเคลื่อนไหว stock
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่/เวลา</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>บริษัท</TableHead>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead className="text-right">เปลี่ยน</TableHead>
                      <TableHead className="text-right">ก่อน</TableHead>
                      <TableHead className="text-right">หลัง</TableHead>
                      <TableHead>เอกสารอ้างอิง</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements?.data?.map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(movement.created_at), "dd MMM yy HH:mm", { locale: th })}
                        </TableCell>
                        <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
                        <TableCell>{movement.companies?.name || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{movement.equipment_code}</TableCell>
                        <TableCell>{movement.equipment_name}</TableCell>
                        <TableCell className="text-right">
                          {getStockChange(movement.movement_type, movement.quantity)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{movement.stock_before}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{movement.stock_after}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {movement.reference_document || "-"}
                        </TableCell>
                        <TableCell>{movement.location?.name || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={movement.notes}>
                          {movement.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
