import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Store, CalendarClock, Truck, Search, Loader2, Package, AlertCircle } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";

const WarehousePickupPlanning = () => {
  const [pickupTypeFilter, setPickupTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["warehouse-planning-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });


  // Items per request
  const { data: allItems } = useQuery({
    queryKey: ["planning-items"],
    queryFn: async () => {
      const { data } = await supabase.from("goods_issue_pending_items").select("pending_id, id");
      return data || [];
    },
  });

  const getItemCount = (requestId: string) => allItems?.filter((i: any) => i.pending_id === requestId).length || 0;

  // Summary counts
  const summary = useMemo(() => {
    if (!requests) return { waitOnsite: 0, scheduledSoon: 0, delivery: 0 };
    const waitOnsite = requests.filter((r: any) => r.pickup_type === "wait_onsite").length;
    const scheduledSoon = requests.filter((r: any) => {
      if (r.pickup_type !== "scheduled" || !r.pickup_date) return false;
      const d = parseISO(r.pickup_date);
      return isToday(d) || isTomorrow(d);
    }).length;
    const delivery = requests.filter((r: any) => r.pickup_type === "delivery").length;
    return { waitOnsite, scheduledSoon, delivery };
  }, [requests]);

  // Urgency sorting & filtering
  const filteredAndSorted = useMemo(() => {
    if (!requests) return [];
    let filtered = [...requests];

    if (pickupTypeFilter !== "all") filtered = filtered.filter((r: any) => r.pickup_type === pickupTypeFilter);
    if (departmentFilter.length > 0) filtered = filtered.filter((r: any) => departmentFilter.includes(r.requester_department));
    if (statusFilter !== "all") filtered = filtered.filter((r: any) => r.status === statusFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((r: any) =>
        r.document_no?.toLowerCase().includes(term) ||
        r.requester_name?.toLowerCase().includes(term) ||
        r.equipment_name?.toLowerCase().includes(term)
      );
    }
    if (dateRange?.from) {
      filtered = filtered.filter((r: any) => {
        const d = r.pickup_date ? parseISO(r.pickup_date) : new Date(r.created_at);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
        return true;
      });
    }

    // Sort by urgency
    filtered.sort((a: any, b: any) => {
      const urgencyOrder = (r: any) => {
        if (r.pickup_type === "wait_onsite") return 0;
        if (r.pickup_type === "scheduled") {
          if (r.pickup_date && isToday(parseISO(r.pickup_date))) return 1;
          if (r.pickup_date && isTomorrow(parseISO(r.pickup_date))) return 2;
          return 3;
        }
        if (r.pickup_type === "delivery") return 4;
        return 5;
      };
      return urgencyOrder(a) - urgencyOrder(b);
    });

    return filtered;
  }, [requests, pickupTypeFilter, departmentFilter, statusFilter, searchTerm, dateRange]);

  const { paginatedData: paginatedPlanning, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filteredAndSorted, 20);

  const getPickupBadge = (req: any) => {
    switch (req.pickup_type) {
      case "wait_onsite":
        return <Badge variant="destructive" className="gap-1"><Store className="h-3 w-3" />รอรับที่คลัง</Badge>;
      case "scheduled": {
        const d = req.pickup_date ? parseISO(req.pickup_date) : null;
        const isNow = d && isToday(d);
        const isTmr = d && isTomorrow(d);
        return (
          <Badge className={`gap-1 ${isNow ? "bg-orange-100 text-orange-800" : isTmr ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>
            <CalendarClock className="h-3 w-3" />
            นัดรับ{isNow ? " (วันนี้)" : isTmr ? " (พรุ่งนี้)" : ""}
          </Badge>
        );
      }
      case "delivery":
        return <Badge className="bg-purple-100 text-purple-800 gap-1"><Truck className="h-3 w-3" />จัดส่ง</Badge>;
      default:
        return <Badge variant="secondary">ไม่ระบุ</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Package className="h-6 w-6" />
          แผนจัดเตรียมสินค้า
        </h1>
        <p className="text-muted-foreground">ภาพรวมงานที่ต้องเตรียม — เรียงตามความเร่งด่วน</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><Store className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-red-700">{summary.waitOnsite}</p>
                <p className="text-xs text-red-600 font-medium">🏪 รอรับที่คลัง (ด่วน!)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><CalendarClock className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{summary.scheduledSoon}</p>
                <p className="text-xs text-orange-600 font-medium">📅 นัดรับวันนี้/พรุ่งนี้</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Truck className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{summary.delivery}</p>
                <p className="text-xs text-purple-600 font-medium">🚚 รอจัดส่ง</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">กรองรายการ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหาเลขที่เอกสาร, ชื่อสินค้า, ชื่อผู้เบิก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={pickupTypeFilter} onValueChange={setPickupTypeFilter}>
              <SelectTrigger><SelectValue placeholder="รูปแบบการรับ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกรูปแบบ</SelectItem>
                <SelectItem value="wait_onsite">รอรับที่คลัง</SelectItem>
                <SelectItem value="scheduled">นัดรับล่วงหน้า</SelectItem>
                <SelectItem value="delivery">จัดส่ง</SelectItem>
              </SelectContent>
            </Select>
            <DepartmentMultiFilter value={departmentFilter} onChange={setDepartmentFilter} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="สถานะ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardContent>
      </Card>

      {/* Timeline Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            รายการรอจัดเตรียม ({filteredAndSorted.length})
          </CardTitle>
          <CardDescription>เรียงจากเร่งด่วนที่สุด → น้อยที่สุด</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ไม่มีรายการรอจัดเตรียม 🎉</div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รูปแบบการรับ</TableHead>
                    <TableHead>วันเวลานัดรับ</TableHead>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>ผู้ขอเบิก / ฝ่าย</TableHead>
                    <TableHead className="text-center">รายการ</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPlanning.map((req: any) => (
                    <TableRow key={req.id} className={req.pickup_type === "wait_onsite" ? "bg-red-50/50" : ""}>
                      <TableCell>{getPickupBadge(req)}</TableCell>
                      <TableCell>
                        {req.pickup_date ? (
                          <div>
                            <div className="font-medium">{format(parseISO(req.pickup_date), "dd/MM/yyyy", { locale: th })}</div>
                            {req.pickup_time && <div className="text-xs text-muted-foreground">{req.pickup_time}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">ทันที</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{req.document_no}</TableCell>
                      <TableCell>
                        <div>{req.requester_name}</div>
                        {req.requester_department && <div className="text-xs text-muted-foreground">{req.requester_department}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{getItemCount(req.id) || 1}</Badge>
                      </TableCell>
                      <TableCell>{req.destination || "-"}</TableCell>
                      <TableCell>
                        {req.status === "approved" ? (
                          <Badge className="bg-green-100 text-green-800">อนุมัติแล้ว</Badge>
                        ) : req.approval_status === "pending" ? (
                          <Badge className="bg-amber-100 text-amber-800">รออนุมัติ</Badge>
                        ) : (
                          <Badge variant="secondary">รอดำเนินการ</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehousePickupPlanning;