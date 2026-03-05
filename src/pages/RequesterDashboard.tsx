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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, Package, Clock, CheckCircle, XCircle, Bell, FileText, AlertTriangle, Ban, ChevronDown, ChevronRight, ShoppingCart, CalendarIcon, X, BarChart3 } from "lucide-react";
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

interface ProductSummary {
  equipment_code: string;
  equipment_name: string;
  total_issued: number;
  issue_count: number;
  last_requester: string;
  last_approver: string;
  last_date: string;
  details: ProductDetail[];
}

interface ProductDetail {
  requester_name: string;
  requester_department: string;
  quantity: number;
  created_at: string;
  document_no: string;
  status: string;
  approved_by: string | null;
}

export default function RequesterDashboard() {
  const [searchName, setSearchName] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  // Product view state
  const [productDateFrom, setProductDateFrom] = useState<Date | undefined>(undefined);
  const [productDateTo, setProductDateTo] = useState<Date | undefined>(undefined);
  const [productDeptFilter, setProductDeptFilter] = useState<string>("all");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

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

  // Product view: fetch ALL issued data (not filtered by requester)
  const { data: productViewData = [], isLoading: productViewLoading } = useQuery({
    queryKey: ["product-view-data"],
    queryFn: async () => {
      // Fetch goods_issue_pending with items joined
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("id, requester_name, requester_department, document_no, status, created_at, approved_by, quantity, equipment_code, equipment_name, issued_quantity")
        .in("status", ["issued", "partially_issued", "approved", "pending"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: productViewItems = [] } = useQuery({
    queryKey: ["product-view-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending_items")
        .select("*, goods_issue_pending:pending_id(requester_name, requester_department, document_no, status, created_at, approved_by)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for approver name resolution
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-approvers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach(p => map.set(p.id, p.full_name || ""));
    return map;
  }, [profiles]);

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Build product summary
  const productSummaries = useMemo(() => {
    const summaryMap = new Map<string, ProductSummary>();

    // Process items from goods_issue_pending_items
    productViewItems.forEach((item: any) => {
      const parent = item.goods_issue_pending as any;
      if (!parent || !item.equipment_code) return;

      const createdAt = new Date(parent.created_at);
      
      // Date filter
      if (productDateFrom) {
        const from = new Date(productDateFrom);
        from.setHours(0, 0, 0, 0);
        if (createdAt < from) return;
      }
      if (productDateTo) {
        const to = new Date(productDateTo);
        to.setHours(23, 59, 59, 999);
        if (createdAt > to) return;
      }
      // Dept filter
      if (productDeptFilter !== "all" && parent.requester_department !== productDeptFilter) return;

      const key = item.equipment_code;
      const qty = item.issued_quantity || item.quantity || 0;
      const approverName = parent.approved_by ? (profileMap.get(parent.approved_by) || parent.approved_by) : "-";

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          equipment_code: item.equipment_code,
          equipment_name: item.equipment_name || "-",
          total_issued: 0,
          issue_count: 0,
          last_requester: "",
          last_approver: "",
          last_date: "",
          details: [],
        });
      }

      const summary = summaryMap.get(key)!;
      summary.total_issued += qty;
      summary.issue_count += 1;
      summary.details.push({
        requester_name: parent.requester_name,
        requester_department: parent.requester_department || "-",
        quantity: qty,
        created_at: parent.created_at,
        document_no: parent.document_no,
        status: parent.status,
        approved_by: approverName,
      });
    });

    // Also process header-level records (old format without items)
    productViewData.forEach((req: any) => {
      if (!req.equipment_code) return;
      
      const createdAt = new Date(req.created_at);
      if (productDateFrom) {
        const from = new Date(productDateFrom);
        from.setHours(0, 0, 0, 0);
        if (createdAt < from) return;
      }
      if (productDateTo) {
        const to = new Date(productDateTo);
        to.setHours(23, 59, 59, 999);
        if (createdAt > to) return;
      }
      if (productDeptFilter !== "all" && req.requester_department !== productDeptFilter) return;

      // Check if this request already has items (to avoid double-counting)
      const hasItems = productViewItems.some((item: any) => item.pending_id === req.id);
      if (hasItems) return;

      const key = req.equipment_code;
      const qty = req.issued_quantity || req.quantity || 0;
      const approverName = req.approved_by ? (profileMap.get(req.approved_by) || req.approved_by) : "-";

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          equipment_code: req.equipment_code,
          equipment_name: req.equipment_name || "-",
          total_issued: 0,
          issue_count: 0,
          last_requester: "",
          last_approver: "",
          last_date: "",
          details: [],
        });
      }

      const summary = summaryMap.get(key)!;
      summary.total_issued += qty;
      summary.issue_count += 1;
      summary.details.push({
        requester_name: req.requester_name,
        requester_department: req.requester_department || "-",
        quantity: qty,
        created_at: req.created_at,
        document_no: req.document_no,
        status: req.status,
        approved_by: approverName,
      });
    });

    // Set last requester/approver/date
    summaryMap.forEach((summary) => {
      summary.details.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (summary.details.length > 0) {
        summary.last_requester = summary.details[0].requester_name;
        summary.last_approver = summary.details[0].approved_by || "-";
        summary.last_date = summary.details[0].created_at;
      }
    });

    // Sort by total_issued desc
    return Array.from(summaryMap.values()).sort((a, b) => b.total_issued - a.total_issued);
  }, [productViewData, productViewItems, productDateFrom, productDateTo, productDeptFilter, profileMap]);

  const productPagination = useTablePagination(productSummaries, 20);

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

  const toggleProductExpand = (code: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
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

            {/* Tabs for Requests, Product View, and Notifications */}
            <Tabs defaultValue="requests" className="space-y-4">
              <TabsList>
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  คำขอเบิก ({requests.length})
                </TabsTrigger>
                <TabsTrigger value="product-view" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  มุมมองตามสินค้า
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

              {/* Product View Tab */}
              <TabsContent value="product-view">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      สรุปยอดเบิกตามสินค้า/อะไหล่
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      แสดงข้อมูลสินค้าที่ถูกเบิกทั้งหมด เรียงจากจำนวนมากไปน้อย กดที่แถวเพื่อดูรายละเอียดผู้เบิก
                    </p>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-muted-foreground">กรอง:</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !productDateFrom && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {productDateFrom ? format(productDateFrom, "d MMM yy", { locale: th }) : "จากวันที่"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={productDateFrom} onSelect={setProductDateFrom} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground">-</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !productDateTo && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {productDateTo ? format(productDateTo, "d MMM yy", { locale: th }) : "ถึงวันที่"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={productDateTo} onSelect={setProductDateTo} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <Select value={productDeptFilter} onValueChange={setProductDeptFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="ฝ่าย" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">ทุกฝ่าย</SelectItem>
                          {departments.map(d => (
                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(productDateFrom || productDateTo || productDeptFilter !== "all") && (
                        <Button variant="ghost" size="sm" onClick={() => { setProductDateFrom(undefined); setProductDateTo(undefined); setProductDeptFilter("all"); }}>
                          <X className="w-4 h-4 mr-1" />
                          ล้าง
                        </Button>
                      )}
                    </div>

                    {productViewLoading ? (
                      <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                    ) : productSummaries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลการเบิกสินค้า</div>
                    ) : (
                      <div>
                        <div className="space-y-2">
                          {productPagination.paginatedData.map((product) => {
                            const isExpanded = expandedProducts.has(product.equipment_code);
                            return (
                              <Collapsible key={product.equipment_code} open={isExpanded} onOpenChange={() => toggleProductExpand(product.equipment_code)}>
                                <div className="border rounded-lg">
                                  <CollapsibleTrigger asChild>
                                    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                        <div className="font-mono text-sm font-medium">{product.equipment_code}</div>
                                      </div>
                                      <div className="flex-1 min-w-0 truncate">{product.equipment_name}</div>
                                      <div className="flex items-center gap-6 text-sm">
                                        <div className="text-center">
                                          <div className="text-xs text-muted-foreground">จำนวนรวม</div>
                                          <div className="font-bold text-lg">{product.total_issued}</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-xs text-muted-foreground">ครั้งที่เบิก</div>
                                          <div className="font-semibold">{product.issue_count}</div>
                                        </div>
                                        <div className="text-center hidden md:block">
                                          <div className="text-xs text-muted-foreground">ผู้เบิกล่าสุด</div>
                                          <div className="truncate max-w-[120px]">{product.last_requester}</div>
                                        </div>
                                        <div className="text-center hidden lg:block">
                                          <div className="text-xs text-muted-foreground">ผู้อนุมัติ</div>
                                          <div className="truncate max-w-[120px]">{product.last_approver}</div>
                                        </div>
                                        <div className="text-center hidden md:block">
                                          <div className="text-xs text-muted-foreground">วันที่ล่าสุด</div>
                                          <div>{product.last_date ? format(new Date(product.last_date), "d MMM yy", { locale: th }) : "-"}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent>
                                    <div className="border-t bg-muted/30 p-4">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>ผู้เบิก</TableHead>
                                            <TableHead>ฝ่าย</TableHead>
                                            <TableHead className="text-right">จำนวน</TableHead>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>เลขที่เอกสาร</TableHead>
                                            <TableHead>สถานะ</TableHead>
                                            <TableHead>ผู้อนุมัติ</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {product.details.map((detail, idx) => (
                                            <TableRow key={idx}>
                                              <TableCell>{detail.requester_name}</TableCell>
                                              <TableCell>{detail.requester_department}</TableCell>
                                              <TableCell className="text-right font-medium">{detail.quantity}</TableCell>
                                              <TableCell>{format(new Date(detail.created_at), "d MMM yy HH:mm", { locale: th })}</TableCell>
                                              <TableCell className="font-mono text-sm">{detail.document_no}</TableCell>
                                              <TableCell>{getStatusBadge(detail.status)}</TableCell>
                                              <TableCell>{detail.approved_by || "-"}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                        </div>
                        <TablePagination
                          currentPage={productPagination.currentPage}
                          totalPages={productPagination.totalPages}
                          totalItems={productPagination.totalItems}
                          pageSize={productPagination.pageSize}
                          onPageChange={productPagination.handlePageChange}
                          onPageSizeChange={productPagination.handlePageSizeChange}
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
