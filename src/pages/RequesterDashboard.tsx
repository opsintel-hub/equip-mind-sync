import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, Package, Clock, CheckCircle, XCircle, Bell, FileText, AlertTriangle, Ban, ChevronDown, ChevronRight, ShoppingCart, CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { cn } from "@/lib/utils";

interface PendingItem {
  id: string;
  pending_id: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  serial_number: string | null;
  quantity: number;
  issued_quantity: number | null;
  remaining_quantity: number | null;
  unit: string;
  status: string | null;
  billboard_id: string | null;
  notes: string | null;
}

export default function RequesterDashboard() {
  const [searchName, setSearchName] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["requester-requests", searchedName],
    queryFn: async () => {
      if (!searchedName.trim()) return [];
      
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*")
        .ilike("requester_name", `%${searchedName}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!searchedName.trim(),
  });

  // Fetch items for all requests
  const requestIds = useMemo(() => requests.map(r => r.id), [requests]);
  
  const { data: allItems = [] } = useQuery({
    queryKey: ["requester-request-items", requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*")
        .in("pending_id", requestIds)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PendingItem[];
    },
    enabled: requestIds.length > 0,
  });

  // Group items by pending_id
  const itemsByRequest = useMemo(() => {
    const map = new Map<string, PendingItem[]>();
    allItems.forEach(item => {
      if (!map.has(item.pending_id)) {
        map.set(item.pending_id, []);
      }
      map.get(item.pending_id)!.push(item);
    });
    return map;
  }, [allItems]);

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["requester-notifications", searchedName],
    queryFn: async () => {
      if (!searchedName.trim()) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .ilike("message", `%${searchedName}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!searchedName.trim(),
  });

  const handleSearch = () => {
    setSearchedName(searchName);
  };

  const toggleExpand = (requestId: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  // Cancel request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("goods_issue_pending")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ยกเลิกคำขอสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["requester-requests", searchedName] });
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติแล้ว</Badge>;
      case "issued":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />จ่ายแล้ว</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
      case "waiting_stock":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20"><AlertTriangle className="w-3 h-3 mr-1" />รอสินค้า</Badge>;
      case "partially_issued":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Package className="w-3 h-3 mr-1" />จ่ายบางส่วน</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20"><Ban className="w-3 h-3 mr-1" />ยกเลิก</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">รอจ่าย</Badge>;
      case "issued":
        return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">จ่ายแล้ว</Badge>;
      case "partially_issued":
        return <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">จ่ายบางส่วน</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">-</Badge>;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  // Filter by date range
  const dateFilteredRequests = useMemo(() => {
    return requests.filter(r => {
      const created = new Date(r.created_at);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }
      return true;
    });
  }, [requests, dateFrom, dateTo]);

  // Filter by status
  const filteredRequests = useMemo(() => {
    return dateFilteredRequests.filter(r => statusFilter === "all" || r.status === statusFilter);
  }, [dateFilteredRequests, statusFilter]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(filteredRequests, 20);

  // Recalculate counts based on date-filtered data
  const datePendingCount = dateFilteredRequests.filter(r => r.status === "pending").length;
  const dateApprovedCount = dateFilteredRequests.filter(r => r.status === "approved").length;
  const dateIssuedCount = dateFilteredRequests.filter(r => r.status === "issued").length;
  const dateWaitingStockCount = dateFilteredRequests.filter(r => r.status === "waiting_stock").length;
  const dateRejectedCount = dateFilteredRequests.filter(r => r.status === "rejected").length;

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard ผู้เบิก</h1>
          <p className="text-muted-foreground mt-1">ตรวจสอบสถานะคำขอเบิกและการแจ้งเตือนของคุณ</p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              ค้นหาด้วยชื่อผู้เบิก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="กรอกชื่อผู้เบิก..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-md"
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </CardContent>
        </Card>

        {searchedName && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">รออนุมัติ</p>
                      <p className="text-2xl font-bold text-yellow-600">{datePendingCount}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">อนุมัติแล้ว</p>
                      <p className="text-2xl font-bold text-blue-600">{dateApprovedCount}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">จ่ายแล้ว</p>
                      <p className="text-2xl font-bold text-green-600">{dateIssuedCount}</p>
                    </div>
                    <Package className="w-8 h-8 text-green-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">รอสินค้า</p>
                      <p className="text-2xl font-bold text-orange-600">{dateWaitingStockCount}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-500/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ปฏิเสธ</p>
                      <p className="text-2xl font-bold text-red-600">{dateRejectedCount}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">กรองช่วงเวลา:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "d MMM yyyy", { locale: th }) : "จากวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "d MMM yyyy", { locale: th }) : "ถึงวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  <X className="w-4 h-4 mr-1" />
                  ล้าง
                </Button>
              )}
            </div>

            {/* Tabs for Requests and Notifications */}
            <Tabs defaultValue="requests" className="space-y-4">
              <TabsList>
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  คำขอเบิก ({requests.length})
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  การแจ้งเตือน ({notifications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="requests">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle>รายการคำขอเบิกทั้งหมด</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={statusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("all")}
                        >
                          ทั้งหมด ({dateFilteredRequests.length})
                        </Button>
                        <Button
                          variant={statusFilter === "pending" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("pending")}
                          className={statusFilter === "pending" ? "" : "text-yellow-600 border-yellow-300 hover:bg-yellow-50"}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          รออนุมัติ ({datePendingCount})
                        </Button>
                        <Button
                          variant={statusFilter === "approved" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("approved")}
                          className={statusFilter === "approved" ? "" : "text-blue-600 border-blue-300 hover:bg-blue-50"}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          อนุมัติแล้ว ({dateApprovedCount})
                        </Button>
                        <Button
                          variant={statusFilter === "issued" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("issued")}
                          className={statusFilter === "issued" ? "" : "text-green-600 border-green-300 hover:bg-green-50"}
                        >
                          <Package className="w-3 h-3 mr-1" />
                          จ่ายแล้ว ({dateIssuedCount})
                        </Button>
                        <Button
                          variant={statusFilter === "waiting_stock" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("waiting_stock")}
                          className={statusFilter === "waiting_stock" ? "" : "text-orange-600 border-orange-300 hover:bg-orange-50"}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          รอสินค้า ({dateWaitingStockCount})
                        </Button>
                        <Button
                          variant={statusFilter === "rejected" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("rejected")}
                          className={statusFilter === "rejected" ? "" : "text-red-600 border-red-300 hover:bg-red-50"}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          ปฏิเสธ ({dateRejectedCount})
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {requestsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : requests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">ไม่พบคำขอเบิก</div>
                    ) : (
                      <div>
                        <div className="space-y-2">
                          {paginatedData.map((request) => {
                              const items = itemsByRequest.get(request.id) || [];
                              const hasItems = items.length > 0;
                              const isExpanded = expandedRequests.has(request.id);

                              return (
                                <Collapsible key={request.id} open={isExpanded} onOpenChange={() => toggleExpand(request.id)}>
                                  <div className="border rounded-lg">
                                    {/* Header Row */}
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          {hasItems ? (
                                            isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          ) : (
                                            <div className="w-4" />
                                          )}
                                          <div className="font-medium">{request.document_no}</div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                          <ShoppingCart className="w-3 h-3" />
                                          {hasItems ? `${items.length} รายการ` : "1 รายการ"}
                                        </div>
                                        
                                        <div className="text-sm text-muted-foreground">
                                          {request.purpose || "-"}
                                        </div>
                                        
                                        <div className="ml-auto flex items-center gap-4">
                                          {getStatusBadge(request.status)}
                                          <div className="text-xs text-muted-foreground">
                                            {format(new Date(request.created_at), "d MMM yyyy HH:mm", { locale: th })}
                                          </div>
                                          {request.status === "pending" && (
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <Ban className="w-4 h-4 mr-1" />
                                                  ยกเลิก
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>ยืนยันการยกเลิกคำขอ</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    คุณต้องการยกเลิกคำขอเบิก "{request.document_no}" หรือไม่?
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>ไม่ใช่</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => cancelRequestMutation.mutate(request.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  >
                                                    ยืนยันยกเลิก
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>

                                    {/* Expandable Items */}
                                    <CollapsibleContent>
                                      <div className="border-t bg-muted/30 p-4">
                                        {hasItems ? (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>รหัสสินค้า</TableHead>
                                                <TableHead>ชื่อสินค้า</TableHead>
                                                <TableHead>Serial Number</TableHead>
                                                <TableHead className="text-right">จำนวน</TableHead>
                                                <TableHead>หน่วย</TableHead>
                                                <TableHead>สถานะ</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {items.map((item) => (
                                                <TableRow key={item.id}>
                                                  <TableCell className="font-mono text-sm">{item.equipment_code || "-"}</TableCell>
                                                  <TableCell>{item.equipment_name || "-"}</TableCell>
                                                  <TableCell className="text-muted-foreground">{item.serial_number || "-"}</TableCell>
                                                  <TableCell className="text-right">
                                                    {item.issued_quantity && item.issued_quantity > 0 ? (
                                                      <span>
                                                        <span className="text-green-600">{item.issued_quantity}</span>/{item.quantity}
                                                      </span>
                                                    ) : (
                                                      item.quantity
                                                    )}
                                                  </TableCell>
                                                  <TableCell>{item.unit}</TableCell>
                                                  <TableCell>{getItemStatusBadge(item.status)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>รหัสสินค้า</TableHead>
                                                <TableHead>ชื่อสินค้า</TableHead>
                                                <TableHead className="text-right">จำนวน</TableHead>
                                                <TableHead>หน่วย</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              <TableRow>
                                                <TableCell className="font-mono text-sm">{request.equipment_code || "-"}</TableCell>
                                                <TableCell>{request.equipment_name || "-"}</TableCell>
                                                <TableCell className="text-right">
                                                  {request.issued_quantity && request.issued_quantity > 0 ? (
                                                    <span>
                                                      <span className="text-green-600">{request.issued_quantity}</span>/{request.quantity}
                                                    </span>
                                                  ) : (
                                                    request.quantity
                                                  )}
                                                </TableCell>
                                                <TableCell>{request.unit}</TableCell>
                                              </TableRow>
                                            </TableBody>
                                          </Table>
                                        )}
                                        {request.notes && (
                                          <p className="mt-3 text-sm text-muted-foreground">
                                            <span className="font-medium">หมายเหตุ:</span> {request.notes}
                                          </p>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              );
                            })}
                        </div>
                        <TablePagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={totalItems}
                          pageSize={pageSize}
                          onPageChange={handlePageChange}
                          onPageSizeChange={handlePageSizeChange}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>การแจ้งเตือนล่าสุด</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">ไม่พบการแจ้งเตือน</div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 rounded-lg border ${
                                notification.is_read ? "bg-muted/30" : "bg-background border-primary/20"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(notification.created_at), "d MMM yyyy HH:mm น.", { locale: th })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!searchedName && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">กรุณากรอกชื่อผู้เบิกเพื่อค้นหาคำขอและการแจ้งเตือน</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

export { RequesterDashboard };
