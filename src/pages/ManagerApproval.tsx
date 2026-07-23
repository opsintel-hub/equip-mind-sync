import { useState } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubMediaTypeBadge } from "@/components/media-player/SubMediaTypeBadge";
import { Search, CheckCircle, XCircle, Shield, Clock, ShoppingCart, ChevronDown, ChevronUp, Package, Store, CalendarClock, Truck } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { DepartmentMultiFilter } from "@/components/DepartmentMultiFilter";
import { ColumnChooser, useVisibleCols, type ColumnDef } from "@/components/ColumnChooser";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

type ApprovalColKey =
  | "expand" | "doc" | "date" | "company" | "requester" | "pickup" | "pickupDate"
  | "items" | "type" | "billboard" | "total" | "status" | "approver" | "actions";

const PENDING_COLS: ColumnDef<ApprovalColKey>[] = [
  { key: "expand", label: "ขยาย", locked: true },
  { key: "doc", label: "เลขที่เอกสาร", locked: true },
  { key: "date", label: "วันที่ขอ" },
  { key: "company", label: "บริษัท" },
  { key: "requester", label: "ผู้ขอเบิก" },
  { key: "pickup", label: "รูปแบบการรับ" },
  { key: "pickupDate", label: "วันนัดรับ" },
  { key: "items", label: "รายการ" },
  { key: "type", label: "ประเภท" },
  { key: "billboard", label: "ป้ายปลายทาง" },
  { key: "total", label: "รวม" },
  { key: "status", label: "สถานะ" },
  { key: "actions", label: "จัดการ", locked: true },
];
const HISTORY_COLS: ColumnDef<ApprovalColKey>[] = [
  { key: "expand", label: "ขยาย", locked: true },
  { key: "doc", label: "เลขที่เอกสาร", locked: true },
  { key: "date", label: "วันที่ขอ" },
  { key: "company", label: "บริษัท" },
  { key: "requester", label: "ผู้ขอเบิก" },
  { key: "pickup", label: "รูปแบบการรับ" },
  { key: "pickupDate", label: "วันนัดรับ" },
  { key: "items", label: "รายการ" },
  { key: "type", label: "ประเภท" },
  { key: "billboard", label: "ป้ายปลายทาง" },
  { key: "total", label: "รวม" },
  { key: "status", label: "สถานะ" },
  { key: "approver", label: "ผู้อนุมัติ" },
];

const ManagerApproval = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [snSearchTerm, setSnSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pendingVisible, setPendingVisible] = useVisibleCols<ApprovalColKey>("ma-pending-cols-v1", PENDING_COLS);
  const [historyVisible, setHistoryVisible] = useVisibleCols<ApprovalColKey>("ma-history-cols-v1", HISTORY_COLS);
  const pendingCol = (k: ApprovalColKey) => pendingVisible.includes(k);
  const historyCol = (k: ApprovalColKey) => historyVisible.includes(k);

  const { data: companies } = useQuery({
    queryKey: ["ma-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("is_active", true).order("name");
      // Dedupe by trimmed name — keep first id, collect all duplicate ids for filter matching
      const map = new Map<string, { ids: string[]; name: string }>();
      (data || []).forEach((c: any) => {
        const key = (c.name || "").trim();
        if (!key) return;
        const existing = map.get(key);
        if (existing) existing.ids.push(c.id);
        else map.set(key, { ids: [c.id], name: key });
      });
      return Array.from(map.values());
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-manager-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["manager", "admin", "super_admin"]);
      return data;
    },
    enabled: !!user,
  });

  const { data: userDepartments } = useQuery({
    queryKey: ["user-manager-departments", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_departments").select("department").eq("user_id", user.id);
      return data;
    },
    enabled: !!user,
  });

  // Profiles for approver names
  const { data: profiles } = useQuery({
    queryKey: ["ma-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.id] = p.full_name; });
      return map;
    },
  });

  const isSuperAdmin = userRole?.some((r: any) => r.role === "super_admin");
  const isAdmin = userRole?.some((r: any) => r.role === "admin") || isSuperAdmin;
  const isManager = userRole?.some((r: any) => r.role === "manager") || isAdmin;
  const managerDepartments = userDepartments?.map((d: any) => d.department) || [];

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      // Fetch all pending requests then filter to those needing approval OR containing asset/media-player items
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name), goods_issue_pending_items(id, equipment_id, media_player_id, is_media_player)")
        .in("status", ["pending", "pending_approval"])
        .or("approval_status.eq.pending,approval_status.eq.not_required")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Keep requests that either explicitly require approval, or contain a Media Player / asset item
      const needsApproval = (data || []).filter((req: any) => {
        if (req.requires_approval && req.approval_status === "pending") return true;
        const items = req.goods_issue_pending_items || [];
        return items.some((it: any) => it.is_media_player || it.media_player_id);
      });
      // Super Admin sees all. Admin/Manager scoped to their departments.
      if (!isSuperAdmin && managerDepartments.length > 0) {
        return needsApproval.filter((req: any) => managerDepartments.includes(req.requester_department));
      }
      return needsApproval;
    },
    enabled: isManager,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  // Realtime: อัปเดตรายการรออนุมัติทันทีเมื่อมีคำขอใหม่ / เปลี่ยนสถานะ
  useRealtimeInvalidate({
    table: "goods_issue_pending",
    queryKeys: [["pending-approvals"], ["approval-history"]],
    onInsert: () => toast.info("มีคำขอเบิกใหม่รออนุมัติ", { duration: 4000 }),
    enabled: !!isManager,
  });

  const { data: approvalHistory } = useQuery({
    queryKey: ["approval-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_issue_pending")
        .select("*, companies(name)")
        .eq("requires_approval", true)
        .neq("approval_status", "pending")
        .order("approved_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!isSuperAdmin && managerDepartments.length > 0) {
        return data?.filter((req: any) => managerDepartments.includes(req.requester_department)) || [];
      }
      return data;
    },
    enabled: isManager,
  });

  const { data: allItems } = useQuery({
    queryKey: ["approval-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goods_issue_pending_items").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Purpose name lookup
  const { data: purposesMap } = useQuery({
    queryKey: ["ma-issue-purposes"],
    queryFn: async () => {
      const { data } = await supabase.from("issue_purposes").select("id, name");
      const m: Record<string, string> = {};
      data?.forEach((p: any) => { m[p.id] = p.name; });
      return m;
    },
  });

  // Equipment stock + unit price
  const equipmentIds = Array.from(new Set((allItems || []).filter((i: any) => i.equipment_id && !i.is_media_player).map((i: any) => i.equipment_id)));
  const mpIds = Array.from(new Set((allItems || []).filter((i: any) => i.media_player_id || i.is_media_player).map((i: any) => i.media_player_id).filter(Boolean)));

  const { data: equipMap } = useQuery({
    queryKey: ["ma-equip-stock", equipmentIds],
    enabled: equipmentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("equipment").select("id, quantity, unit_price, unit").in("id", equipmentIds as string[]);
      const m: Record<string, any> = {};
      data?.forEach((e: any) => { m[e.id] = e; });
      return m;
    },
  });
  const { data: mpMap } = useQuery({
    queryKey: ["ma-mp-stock", mpIds],
    enabled: mpIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("media_players").select("id, quantity, unit_price, department, sub_media_type, device_type").in("id", mpIds as string[]);
      const m: Record<string, any> = {};
      data?.forEach((e: any) => { m[e.id] = e; });
      return m;
    },
  });

  const getStockInfo = (item: any) => {
    if (item.is_media_player || item.media_player_id) return mpMap?.[item.media_player_id];
    return equipMap?.[item.equipment_id];
  };

  const getItemsForRequest = (requestId: string) => allItems?.filter((item: any) => item.pending_id === requestId) || [];

  // Fetch billboard labels for items
  const billboardIds = Array.from(new Set((allItems || [])
    .flatMap((i: any) => [i.billboard_id, i.intended_billboard_id])
    .filter(Boolean))) as string[];
  const { data: billboardMap } = useQuery({
    queryKey: ["ma-billboards", billboardIds],
    enabled: billboardIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("billboards")
        .select("id, equipment_id, old_code, location_name")
        .in("id", billboardIds);
      const m: Record<string, string> = {};
      (data || []).forEach((b: any) => {
        m[b.id] = `${b.equipment_id || b.old_code || b.id}${b.location_name ? " - " + b.location_name : ""}`;
      });
      return m;
    },
  });

  const getRequestType = (req: any): { icon: string; label: string; color: string } => {
    const items = getItemsForRequest(req.id);
    if (items.length === 0) return { icon: "📦", label: "-", color: "bg-gray-100 text-gray-700" };
    const kinds = new Set<string>();
    for (const it of items) {
      const isMP = !!(it.is_media_player || it.media_player_id);
      if (isMP) {
        const mp = it.media_player_id ? mpMap?.[it.media_player_id] : null;
        const isMonitor = String(mp?.device_type || "").toUpperCase() === "MONITOR";
        kinds.add(isMonitor ? "monitor" : "mp");
      } else {
        kinds.add("spare");
      }
    }
    if (kinds.size > 1) return { icon: "📦", label: "ผสม", color: "bg-purple-100 text-purple-700" };
    const only = Array.from(kinds)[0];
    if (only === "mp") return { icon: "🎬", label: "Media Player", color: "bg-blue-100 text-blue-700" };
    if (only === "monitor") return { icon: "🖥️", label: "จอภาพ", color: "bg-indigo-100 text-indigo-700" };
    return { icon: "🔧", label: "อะไหล่", color: "bg-emerald-100 text-emerald-700" };
  };

  const getRequestBillboards = (req: any): string[] => {
    const items = getItemsForRequest(req.id);
    const ids = new Set<string>();
    for (const it of items) {
      const bid = it.billboard_id || it.intended_billboard_id;
      if (bid) ids.add(bid);
    }
    return Array.from(ids).map(id => billboardMap?.[id] || id);
  };

  const getRequestTotalQty = (req: any): number => {
    return getItemsForRequest(req.id).reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
  };


  const toggleExpand = (id: string) => {
    setExpandedRequests(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) throw new Error("Missing data");
      const { error } = await supabase.from("goods_issue_pending").update({
        approval_status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), approval_notes: approvalNotes || null,
        status: "pending",
      } as any).eq("id", selectedRequest.id).eq("status", "pending_approval");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("อนุมัติคำขอเบิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      queryClient.invalidateQueries({ queryKey: ["goods-issue-pending-staff"] });
      setApproveDialogOpen(false); setSelectedRequest(null); setApprovalNotes("");
    },
    onError: (error) => toast.error("เกิดข้อผิดพลาด: " + error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !user) throw new Error("Missing data");
      const { error } = await supabase.from("goods_issue_pending").update({
        approval_status: "rejected", approved_by: user.id, approved_at: new Date().toISOString(),
        approval_notes: approvalNotes || null, status: "rejected",
        reject_reason: "ผู้มีอำนาจไม่อนุมัติ: " + (approvalNotes || "ไม่ระบุเหตุผล"),
      } as any).eq("id", selectedRequest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ปฏิเสธคำขอเบิกสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approval-history"] });
      setRejectDialogOpen(false); setSelectedRequest(null); setApprovalNotes("");
    },
    onError: (error) => toast.error("เกิดข้อผิดพลาด: " + error.message),
  });

  const getPickupBadge = (type: string) => {
    switch (type) {
      case "wait_onsite": return <Badge variant="destructive" className="gap-1"><Store className="h-3 w-3" />รอรับที่คลัง</Badge>;
      case "scheduled": return <Badge className="bg-blue-100 text-blue-800 gap-1"><CalendarClock className="h-3 w-3" />นัดรับ</Badge>;
      case "delivery": return <Badge className="bg-purple-100 text-purple-800 gap-1"><Truck className="h-3 w-3" />จัดส่ง</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  const applyFilters = (data: any[] | undefined) => {
    if (!data) return [];
    return data.filter((req: any) => {
      // Dedicated S/N search
      if (snSearchTerm) {
        const snTerm = snSearchTerm.toLowerCase();
        const items = getItemsForRequest(req.id);
        const matchSN = items.some((item: any) => item.serial_number?.toLowerCase().includes(snTerm));
        if (!matchSN) return false;
      }
      // General search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDirect = req.document_no?.toLowerCase().includes(term) ||
            req.requester_name?.toLowerCase().includes(term) ||
            req.equipment_name?.toLowerCase().includes(term) ||
            req.equipment_code?.toLowerCase().includes(term);
        const items = getItemsForRequest(req.id);
        const matchItems = items.some((item: any) => 
          item.equipment_code?.toLowerCase().includes(term) ||
          item.equipment_name?.toLowerCase().includes(term)
        );
        if (!matchDirect && !matchItems) return false;
      }
      if (departmentFilter.length > 0 && !departmentFilter.includes(req.requester_department)) return false;
      if (companyFilter !== "all") {
        const group = companies?.find((c: any) => c.ids?.[0] === companyFilter);
        const ids = group?.ids || [companyFilter];
        if (!ids.includes(req.company_id)) return false;
      }
      if (dateRange?.from) {
        const d = new Date(req.created_at);
        if (d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
      return true;
    });
  };

  const filteredPending = applyFilters(pendingApprovals);
  const filteredHistory = applyFilters(
    statusFilter === "all" ? approvalHistory :
    statusFilter === "approved" ? approvalHistory?.filter((r: any) => r.approval_status === "approved") :
    statusFilter === "rejected" ? approvalHistory?.filter((r: any) => r.approval_status === "rejected") :
    approvalHistory
  );

  const pendingPagination = useTablePagination(filteredPending, 10);
  const historyPagination = useTablePagination(filteredHistory, 10);


  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground">หน้านี้สำหรับผู้มีสิทธิ์ Manager หรือ Admin เท่านั้น</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasShortage = (req: any): boolean => {
    const items = getItemsForRequest(req.id);
    return items.some((item: any) => {
      const info = getStockInfo(item);
      const stock = info?.quantity;
      return stock !== undefined && stock !== null && Number(stock) < Number(item.quantity || 0);
    });
  };

  const handleCreateShortagePR = async (req: any) => {
    const items = getItemsForRequest(req.id);
    let created = 0;
    for (const item of items) {
      const info = getStockInfo(item);
      const stock = Number(info?.quantity ?? 0);
      const qty = Number(item.quantity || 0);
      if (stock >= qty) continue;
      if (item.is_media_player || item.media_player_id) continue; // skip MP
      if (!item.equipment_id) continue;
      const { data, error } = await supabase.rpc("create_pr_from_shortage", {
        _equipment_id: item.equipment_id,
        _is_media_player: false,
        _equipment_code: item.equipment_code,
        _equipment_name: item.equipment_name,
        _requested_qty: qty,
        _available_qty: stock,
        _requester_name: req.requester_name || "-",
        _unit: item.unit || "ชิ้น",
      });
      if (!error && (data as any)?.success) created++;
    }
    if (created > 0) toast.success(`สร้าง/อัปเดตใบขอซื้อ ${created} รายการ — จัดซื้อจะดำเนินการต่อ`);
    else toast.info("ไม่มีรายการที่ต้องสร้าง PR (หรือเป็น Media Player)");
  };

  const renderRequestRow = (req: any, showActions: boolean) => {
    const items = getItemsForRequest(req.id);
    const isExpanded = expandedRequests.has(req.id);
    const col = showActions ? pendingCol : historyCol;
    const visibleCount = (showActions ? pendingVisible : historyVisible).length;
    return (
      <>
        <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => items.length > 0 && toggleExpand(req.id)}>
          {col("expand") && (
            <TableCell>
              {items.length > 0 && (
                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </TableCell>
          )}
          {col("doc") && <TableCell className="font-medium">{req.document_no}</TableCell>}
          {col("date") && <TableCell>{format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: th })}</TableCell>}
          {col("company") && <TableCell>{req.companies?.name || "-"}</TableCell>}
          {col("requester") && (
            <TableCell>
              <div>{req.requester_name}</div>
              {req.requester_department && <div className="text-xs text-muted-foreground">{req.requester_department}</div>}
            </TableCell>
          )}
          {col("pickup") && <TableCell>{getPickupBadge(req.pickup_type)}</TableCell>}
          {col("pickupDate") && (
            <TableCell>
              {req.pickup_date ? format(new Date(req.pickup_date), "dd/MM/yyyy", { locale: th }) : "-"}
              {req.pickup_time && <div className="text-xs text-muted-foreground">{req.pickup_time}</div>}
            </TableCell>
          )}
          {col("items") && (
            <TableCell>
              {items.length > 0 ? (
                <Badge variant="outline" className="gap-1"><ShoppingCart className="h-3 w-3" />{items.length} รายการ</Badge>
              ) : (
                <div className="text-sm">{req.equipment_name || "-"}</div>
              )}
            </TableCell>
          )}
          {col("type") && (
            <TableCell>
              {(() => {
                const t = getRequestType(req);
                return <Badge variant="outline" className={`${t.color} border-0 gap-1`}>{t.icon} {t.label}</Badge>;
              })()}
            </TableCell>
          )}
          {col("billboard") && (
            <TableCell>
              {(() => {
                const bbs = getRequestBillboards(req);
                if (bbs.length === 0) return <span className="text-xs text-muted-foreground">ยังไม่ระบุ</span>;
                if (bbs.length === 1) return <span className="text-xs truncate max-w-[180px] inline-block" title={bbs[0]}>{bbs[0]}</span>;
                return <Badge variant="secondary" title={bbs.join("\n")} className="text-xs">{bbs.length} ป้าย</Badge>;
              })()}
            </TableCell>
          )}
          {col("total") && <TableCell className="text-right text-sm font-medium">{getRequestTotalQty(req).toLocaleString()}</TableCell>}
          {col("status") && (
            <TableCell>
              {showActions ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 gap-1"><Clock className="h-3 w-3" />รออนุมัติ</Badge>
              ) : req.approval_status === "approved" ? (
                <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />อนุมัติแล้ว</Badge>
              ) : (
                <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />ไม่อนุมัติ</Badge>
              )}
            </TableCell>
          )}
          {!showActions && col("approver") && (
            <TableCell>
              {req.approved_by && profiles ? (
                <div>
                  <div className="text-sm">{profiles[req.approved_by] || "-"}</div>
                  {req.approved_at && <div className="text-xs text-muted-foreground">{format(new Date(req.approved_at), "dd/MM/yy HH:mm", { locale: th })}</div>}
                </div>
              ) : "-"}
            </TableCell>
          )}
          {showActions && col("actions") && (
            <TableCell className="text-center">
              {(() => {
                const shortage = hasShortage(req);
                return (
                  <div className="flex gap-1 justify-center">
                    <Button
                      size="sm"
                      disabled={shortage}
                      title={shortage ? "สต็อกไม่พอ — กด 'แจ้งขอซื้อ' ด้านล่างก่อน" : ""}
                      onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setApproveDialogOpen(true); }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />อนุมัติ
                    </Button>
                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setRejectDialogOpen(true); }}>
                      <XCircle className="h-4 w-4 mr-1" />ไม่อนุมัติ
                    </Button>
                  </div>
                );
              })()}
            </TableCell>
          )}
        </TableRow>
        {isExpanded && items.length > 0 && (
          <TableRow key={`${req.id}-items`}>
            <TableCell colSpan={visibleCount} className="bg-muted/20 p-4">

              {/* Header detail */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm bg-background rounded-lg p-3 border">
                <div><span className="text-muted-foreground">ฝ่าย/แผนกผู้ขอ:</span> <span className="font-medium">{req.requester_department || "-"}</span></div>
                <div><span className="text-muted-foreground">เบอร์โทร:</span> <span className="font-medium">{req.requester_phone || "-"}</span></div>
                <div className="md:col-span-2"><span className="text-muted-foreground">วัตถุประสงค์:</span> <span className="font-medium">{purposesMap?.[req.purpose_id] || req.purpose || "-"}</span></div>
                {req.destination && (
                  <div className="md:col-span-4"><span className="text-muted-foreground">จุดหมายจัดส่ง:</span> <span className="font-medium">{req.destination}</span></div>
                )}
                {req.notes && (
                  <div className="md:col-span-4"><span className="text-muted-foreground">หมายเหตุ:</span> <span className="font-medium whitespace-pre-line">{req.notes}</span></div>
                )}
              </div>

              {/* Shortage alert + Create PR */}
              {showActions && hasShortage(req) && (
                <div className="mb-4 p-3 rounded-lg border border-destructive/40 bg-destructive/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm text-destructive">
                    ⚠️ <strong>สต็อกไม่พอเบิก</strong> — ไม่สามารถอนุมัติได้ กรุณาให้ผู้ขอแก้ไขจำนวน หรือกดปุ่มด้านขวาเพื่อแจ้งขอซื้อให้จัดซื้อดำเนินการ
                  </div>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleCreateShortagePR(req); }}>
                    📋 แจ้งขอซื้อ (สร้าง PR)
                  </Button>
                </div>
              )}

              {/* Items table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead className="text-right">จำนวนเบิก</TableHead>
                      <TableHead className="text-right">สต็อกคงเหลือ</TableHead>
                      <TableHead className="text-right">ราคา/หน่วย</TableHead>
                      <TableHead className="text-right">มูลค่ารวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any) => {
                      const info = getStockInfo(item);
                      const stock = info?.quantity ?? null;
                      const price = Number(info?.unit_price ?? 0);
                      const qty = Number(item.quantity || 0);
                      const total = price * qty;
                      const lowStock = stock !== null && stock < qty;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.equipment_code}</TableCell>
                          <TableCell>
                            {item.equipment_name}
                            {item.notes && <div className="text-xs text-muted-foreground">📝 {item.notes}</div>}
                            {(() => {
                              const mpInfo = item.media_player_id ? mpMap?.[item.media_player_id] : null;
                              const dept = mpInfo?.department;
                              return (
                                <div className="mt-1">
                                  <SubMediaTypeBadge
                                    department={dept}
                                    subMediaType={item.sub_media_type}
                                    showPlaceholder
                                    onEdit={async (next) => {
                                      const { error } = await supabase
                                        .from("goods_issue_pending_items")
                                        .update({ sub_media_type: next } as any)
                                        .eq("id", item.id);
                                      if (error) { toast.error(error.message); return; }
                                      toast.success("อัปเดต Sub Media Type แล้ว");
                                      queryClient.invalidateQueries({ queryKey: ["approval-items"] });
                                    }}
                                  />
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-xs whitespace-pre-line">{item.serial_number || "-"}</TableCell>
                          <TableCell className="text-right">{qty.toLocaleString()} {item.unit}</TableCell>
                          <TableCell className={`text-right ${lowStock ? "text-destructive font-semibold" : ""}`}>
                            {stock !== null ? `${Number(stock).toLocaleString()} ${item.unit}` : "-"}
                            {lowStock && <div className="text-[10px]">⚠️ ไม่พอเบิก</div>}
                          </TableCell>
                          <TableCell className="text-right">{price > 0 ? price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</TableCell>
                          <TableCell className="text-right font-medium">{total > 0 ? total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Grand total */}
                    {(() => {
                      const grand = items.reduce((sum: number, it: any) => {
                        const info = getStockInfo(it);
                        return sum + (Number(info?.unit_price ?? 0) * Number(it.quantity || 0));
                      }, 0);
                      if (grand <= 0) return null;
                      return (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="text-right font-semibold">มูลค่ารวมทั้งหมด</TableCell>
                          <TableCell className="text-right font-bold text-primary">{grand.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield className="h-6 w-6" />อนุมัติเบิกทรัพย์สิน</h1>
          <p className="text-muted-foreground">อนุมัติคำขอเบิกสินค้าที่เป็นทรัพย์สิน (เฉพาะฝ่ายที่รับผิดชอบ)</p>
        </div>
        {pendingApprovals && pendingApprovals.length > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">รออนุมัติ: {pendingApprovals.length} รายการ</Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหา S/N..." value={snSearchTerm} onChange={(e) => setSnSearchTerm(e.target.value)} className="pl-10 w-full" />
            </div>
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหาเลขที่เอกสาร, รหัส, ชื่อสินค้า, ผู้เบิก..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full" />
            </div>
            <div className="w-full">
              <DepartmentMultiFilter value={departmentFilter} onChange={setDepartmentFilter} />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="ทุกบริษัท" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบริษัท</SelectItem>
                {companies?.map((c: any) => {
                  const id = c.ids?.[0] ?? c.id;
                  if (!id) return null;
                  return <SelectItem key={id} value={id}>{c.name}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ (ประวัติ)</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-full xl:col-span-6">
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />รายการรออนุมัติ</CardTitle>
          <ColumnChooser columns={PENDING_COLS} visible={pendingVisible} onChange={setPendingVisible} />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  {pendingCol("expand") && <TableHead className="w-10"></TableHead>}
                  {pendingCol("doc") && <TableHead>เลขที่เอกสาร</TableHead>}
                  {pendingCol("date") && <TableHead>วันที่ขอ</TableHead>}
                  {pendingCol("company") && <TableHead>บริษัท</TableHead>}
                  {pendingCol("requester") && <TableHead>ผู้ขอเบิก</TableHead>}
                  {pendingCol("pickup") && <TableHead>รูปแบบการรับ</TableHead>}
                  {pendingCol("pickupDate") && <TableHead>วันนัดรับ</TableHead>}
                  {pendingCol("items") && <TableHead>รายการ</TableHead>}
                  {pendingCol("type") && <TableHead>ประเภท</TableHead>}
                  {pendingCol("billboard") && <TableHead>ป้ายปลายทาง</TableHead>}
                  {pendingCol("total") && <TableHead className="text-right">รวม</TableHead>}
                  {pendingCol("status") && <TableHead>สถานะ</TableHead>}
                  {pendingCol("actions") && <TableHead className="text-center">จัดการ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={pendingVisible.length} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
                ) : filteredPending.length === 0 ? (
                  <TableRow><TableCell colSpan={pendingVisible.length} className="text-center py-8 text-muted-foreground">ไม่มีรายการรออนุมัติ</TableCell></TableRow>
                ) : (
                  pendingPagination.paginatedData.map((req: any) => renderRequestRow(req, true))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredPending.length > 0 && (
            <TablePagination
              currentPage={pendingPagination.currentPage}
              totalPages={pendingPagination.totalPages}
              pageSize={pendingPagination.pageSize}
              totalItems={pendingPagination.totalItems}
              onPageChange={pendingPagination.handlePageChange}
              onPageSizeChange={pendingPagination.handlePageSizeChange}
            />
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />ประวัติการอนุมัติ</CardTitle>
          <ColumnChooser columns={HISTORY_COLS} visible={historyVisible} onChange={setHistoryVisible} />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  {historyCol("expand") && <TableHead className="w-10"></TableHead>}
                  {historyCol("doc") && <TableHead>เลขที่เอกสาร</TableHead>}
                  {historyCol("date") && <TableHead>วันที่ขอ</TableHead>}
                  {historyCol("company") && <TableHead>บริษัท</TableHead>}
                  {historyCol("requester") && <TableHead>ผู้ขอเบิก</TableHead>}
                  {historyCol("pickup") && <TableHead>รูปแบบการรับ</TableHead>}
                  {historyCol("pickupDate") && <TableHead>วันนัดรับ</TableHead>}
                  {historyCol("items") && <TableHead>รายการ</TableHead>}
                  {historyCol("type") && <TableHead>ประเภท</TableHead>}
                  {historyCol("billboard") && <TableHead>ป้ายปลายทาง</TableHead>}
                  {historyCol("total") && <TableHead className="text-right">รวม</TableHead>}
                  {historyCol("status") && <TableHead>สถานะ</TableHead>}
                  {historyCol("approver") && <TableHead>ผู้อนุมัติ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={historyVisible.length} className="text-center py-8 text-muted-foreground">ไม่มีประวัติ</TableCell></TableRow>
                ) : (
                  historyPagination.paginatedData.map((req: any) => renderRequestRow(req, false))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredHistory.length > 0 && (
            <TablePagination
              currentPage={historyPagination.currentPage}
              totalPages={historyPagination.totalPages}
              pageSize={historyPagination.pageSize}
              totalItems={historyPagination.totalItems}
              onPageChange={historyPagination.handlePageChange}
              onPageSizeChange={historyPagination.handlePageSizeChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={(o) => { if (!o) { setApproveDialogOpen(false); setApprovalNotes(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>อนุมัติคำขอเบิก - {selectedRequest?.document_no}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p><span className="text-muted-foreground">ผู้ขอ:</span> {selectedRequest?.requester_name}</p>
              <p><span className="text-muted-foreground">สินค้า:</span> {selectedRequest?.equipment_name || "หลายรายการ"}</p>
              <p><span className="text-muted-foreground">วัตถุประสงค์:</span> {selectedRequest?.purpose || "-"}</p>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="หมายเหตุ..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "กำลังอนุมัติ..." : "ยืนยันอนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(o) => { if (!o) { setRejectDialogOpen(false); setApprovalNotes(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>ไม่อนุมัติคำขอเบิก - {selectedRequest?.document_no}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p><span className="text-muted-foreground">ผู้ขอ:</span> {selectedRequest?.requester_name}</p>
              <p><span className="text-muted-foreground">สินค้า:</span> {selectedRequest?.equipment_name || "หลายรายการ"}</p>
            </div>
            <div className="space-y-2">
              <Label>เหตุผลที่ไม่อนุมัติ *</Label>
              <Textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="ระบุเหตุผล..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => {
              if (!approvalNotes.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
              rejectMutation.mutate();
            }} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? "กำลังบันทึก..." : "ยืนยันไม่อนุมัติ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerApproval;