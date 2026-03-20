import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageOpen, Search, ChevronDown, ChevronUp, ShoppingCart, FileText, MapPin, Warehouse, Hash, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import BillboardDisplay from "@/components/billboard/BillboardDisplay";
import { ProcessTracker, getGoodsIssueSteps } from "@/components/ProcessTracker";

interface IssuedItem {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  quantity: number;
  unit: string;
  serial_number: string | null;
  billboard_id: string | null;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  status: string;
  notes: string | null;
  is_media_player: boolean | null;
  media_player_id: string | null;
  created_at: string;
}

const GoodsIssue = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Fetch all goods_issue_pending (completed/rejected/all)
  const { data: issueRequests, isLoading } = useQuery({
    queryKey: ["goods-issue-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all items
  const { data: issueItems } = useQuery({
    queryKey: ["goods-issue-history-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as IssuedItem[];
    },
  });

  // Fetch goods_issue records (actual issue records)
  const { data: goodsIssueRecords } = useQuery({
    queryKey: ["goods-issue-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue")
        .select("*, equipment:equipment_id(code, name), location:location_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getItemsForRequest = (requestId: string) => {
    return issueItems?.filter(item => item.pending_id === requestId) || [];
  };

  const toggleExpand = (id: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filter
  const filtered = useMemo(() => {
    if (!issueRequests) return [];
    let result = issueRequests;

    if (statusFilter !== "all") {
      result = result.filter((r: any) => r.status === statusFilter);
    }

    if (snSearchTerm) {
      const snTerm = snSearchTerm.toLowerCase();
      result = result.filter((r: any) => {
        const items = getItemsForRequest(r.id);
        return items.some(item => item.serial_number?.toLowerCase().includes(snTerm));
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r: any) => {
        if (r.document_no?.toLowerCase().includes(term)) return true;
        if (r.equipment_code?.toLowerCase().includes(term)) return true;
        if (r.equipment_name?.toLowerCase().includes(term)) return true;
        if (r.requester_name?.toLowerCase().includes(term)) return true;
        return false;
      });
    }

    if (dateRange?.from) {
      result = result.filter((r: any) => {
        const d = new Date(r.created_at);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > new Date(dateRange.to.getTime() + 86400000)) return false;
        return true;
      });
    }

    return result;
  }, [issueRequests, searchTerm, snSearchTerm, statusFilter, dateRange, issueItems]);

  const { paginatedData, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(filtered, 20);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">รอดำเนินการ</Badge>;
      case "pending_approval":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">รออนุมัติ</Badge>;
      case "issued":
        return <Badge className="bg-green-100 text-green-800">จ่ายครบแล้ว</Badge>;
      case "waiting_stock":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">รอสินค้า</Badge>;
      case "rejected":
        return <Badge variant="destructive">ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = useMemo(() => {
    if (!issueRequests) return { total: 0, issued: 0, pending: 0, rejected: 0, waiting: 0 };
    return {
      total: issueRequests.length,
      issued: issueRequests.filter((r: any) => r.status === "issued").length,
      pending: issueRequests.filter((r: any) => r.status === "pending" || r.status === "pending_approval").length,
      rejected: issueRequests.filter((r: any) => r.status === "rejected").length,
      waiting: issueRequests.filter((r: any) => r.status === "waiting_stock").length,
    };
  }, [issueRequests]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">ประวัติเบิกจ่ายสินค้า (GI)</h1>
        <p className="text-muted-foreground">ดูประวัติการเบิกจ่ายสินค้าทั้งหมด</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">ทั้งหมด</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("issued")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
            <p className="text-xs text-muted-foreground">จ่ายครบแล้ว</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">รอดำเนินการ</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("waiting_stock")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">รอสินค้า</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("rejected")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">ปฏิเสธ</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5" />
            รายการเบิกจ่าย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่เอกสาร, รหัส, ชื่อ, S/N..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            {statusFilter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่ขอ</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>ผู้ขอเบิก</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>วัตถุประสงค์</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead className="text-right">จำนวนรวม</TableHead>
                  <TableHead className="text-right">จ่ายแล้ว</TableHead>
                  <TableHead className="min-w-[220px]">ความคืบหน้า</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">ไม่พบข้อมูล</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((req: any) => {
                    const items = getItemsForRequest(req.id);
                    const isExpanded = expandedRequests.has(req.id);
                    return (
                      <>
                        <TableRow
                          key={req.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => items.length > 0 && toggleExpand(req.id)}
                        >
                          <TableCell>
                            {items.length > 0 && (
                              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium font-mono text-sm">{req.document_no}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}
                          </TableCell>
                          <TableCell className="text-sm">{req.companies?.name || "-"}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{req.requester_name}</div>
                            {req.requester_phone && <div className="text-xs text-muted-foreground">{req.requester_phone}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{req.requester_department || "-"}</TableCell>
                          <TableCell className="text-sm">{req.purpose || "-"}</TableCell>
                          <TableCell>
                            {items.length > 0 ? (
                              <Badge variant="outline" className="gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                {items.length} รายการ
                              </Badge>
                            ) : (
                              <div className="text-sm">
                                <div className="font-medium">{req.equipment_code || "-"}</div>
                                <div className="text-muted-foreground">{req.equipment_name || "-"}</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{req.quantity} {req.unit}</TableCell>
                          <TableCell className="text-right">
                            <span className={req.issued_quantity > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                              {req.issued_quantity || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ProcessTracker steps={getGoodsIssueSteps(req)} size="sm" />
                          </TableCell>
                        </TableRow>

                        {/* Expanded Items */}
                        {isExpanded && items.length > 0 && (
                          <TableRow key={`${req.id}-items`}>
                            <TableCell colSpan={11} className="bg-muted/20 p-0">
                              <div className="p-4">
                                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                                  <ShoppingCart className="h-4 w-4" />
                                  รายการสินค้า ({items.length} รายการ)
                                </h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>รหัส/ชื่อ</TableHead>
                                      <TableHead>S/N</TableHead>
                                      <TableHead>ป้ายโฆษณา</TableHead>
                                      <TableHead className="text-right">ขอ</TableHead>
                                      <TableHead className="text-right">จ่ายแล้ว</TableHead>
                                      <TableHead className="text-right">ค้าง</TableHead>
                                      <TableHead>สถานะ</TableHead>
                                      <TableHead>หมายเหตุ</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          <div className="font-medium text-sm">{item.equipment_code || "-"}</div>
                                          <div className="text-xs text-muted-foreground">{item.equipment_name || "-"}</div>
                                          {item.is_media_player && (
                                            <Badge variant="outline" className="text-xs mt-1">Media Player</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {item.serial_number ? (
                                            <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                                              {item.serial_number}
                                            </Badge>
                                          ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                          {item.billboard_id ? <BillboardDisplay billboardId={item.billboard_id} /> : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">{item.issued_quantity || 0}</TableCell>
                                        <TableCell className="text-right">
                                          {(item.remaining_quantity || 0) > 0 ? (
                                            <span className="text-orange-600">{item.remaining_quantity}</span>
                                          ) : "-"}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                          {item.notes || "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default GoodsIssue;
