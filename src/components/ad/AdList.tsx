import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, AlertTriangle, Copy, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdDetailDialog } from "./AdDetailDialog";
import { AdEditForm } from "./AdEditForm";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";

interface Advertisement {
  id: string;
  code: string;
  entry_type: string;
  name: string;
  status: string;
  total_quantity: number;
  target_installation_date: string | null;
  retention_days: number | null;
  retention_start_date: string | null;
  storage_location: string | null;
  created_at: string;
  contractor_access_token: string | null;
  contractor_access_pin: string | null;
  ad_versions: { id: string; version_name: string; quantity: number }[];
  installation_team: { name: string } | null;
  ad_size: { name: string } | null;
  ad_media_type: { name: string } | null;
}

interface AdListProps {
  refresh: number;
  filterType?: string;
  filterStatus?: string;
}

const entryTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "ใหม่", variant: "default" },
  temporary: { label: "ฝากชั่วคราว", variant: "secondary" },
  old: { label: "ภาพเก่า", variant: "outline" },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "รอรับเข้า", variant: "secondary" },
  received: { label: "รับเข้าแล้ว", variant: "default" },
  in_storage: { label: "อยู่ในคลัง", variant: "default" },
  issued: { label: "เบิกแล้ว", variant: "outline" },
  installed: { label: "ติดตั้งแล้ว", variant: "outline" },
  completed: { label: "เสร็จสิ้น", variant: "secondary" },
};

export function AdList({ refresh, filterType, filterStatus }: AdListProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState(filterType || "all");
  const [statusFilter, setStatusFilter] = useState(filterStatus || "all");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (filterType) setTypeFilter(filterType);
  }, [filterType]);

  useEffect(() => {
    if (filterStatus) setStatusFilter(filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    fetchAds();
  }, [refresh]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("advertisements")
        .select(`
          *,
          ad_versions (*),
          installation_team:contractors!advertisements_installation_team_id_fkey (name),
          ad_size:ad_sizes (name),
          ad_media_type:ad_media_types (name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds((data as unknown as Advertisement[]) || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAds = ads.filter((ad) => {
    const matchSearch =
      !searchTerm ||
      ad.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = typeFilter === "all" || ad.entry_type === typeFilter;
    const matchStatus = statusFilter === "all" || ad.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

  const {
    paginatedData: paginatedAds,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = useTablePagination(filteredAds, 20);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วยรหัส หรือชื่อภาพ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ทุกประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              <SelectItem value="new">ภาพใหม่</SelectItem>
              <SelectItem value="temporary">ฝากชั่วคราว</SelectItem>
              <SelectItem value="old">ภาพเก่า</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="pending">รอรับเข้า</SelectItem>
              <SelectItem value="received">รับเข้าแล้ว</SelectItem>
              <SelectItem value="in_storage">อยู่ในคลัง</SelectItem>
              <SelectItem value="issued">เบิกแล้ว</SelectItem>
              <SelectItem value="installed">ติดตั้งแล้ว</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm || typeFilter !== "all" || statusFilter !== "all"
            ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไข"
            : "ยังไม่มีข้อมูลภาพโฆษณา กดปุ่มด้านบนเพื่อเพิ่มรายการใหม่"}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>ชื่อภาพ</TableHead>
                <TableHead>เวอร์ชัน</TableHead>
                <TableHead className="text-center">จำนวนรวม</TableHead>
                <TableHead>ขนาด</TableHead>
                <TableHead>ทีมติดตั้ง</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ลิงก์ผู้รับเหมา</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAds.map((ad) => {
                const entryType = entryTypeLabels[ad.entry_type] || { label: ad.entry_type, variant: "secondary" as const };
                const status = statusLabels[ad.status] || { label: ad.status, variant: "secondary" as const };

                // Calculate retention warning for old ads
                let retentionWarning: "expired" | "warning" | null = null;
                if (ad.entry_type === "old" && ad.retention_start_date && ad.retention_days) {
                  const start = new Date(ad.retention_start_date);
                  const deadline = new Date(start.getTime() + ad.retention_days * 24 * 60 * 60 * 1000);
                  const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  if (daysLeft <= 0) retentionWarning = "expired";
                  else if (daysLeft <= 7) retentionWarning = "warning";
                }

                return (
                  <TableRow
                    key={ad.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedAdId(ad.id);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="font-mono text-sm">{ad.code}</TableCell>
                    <TableCell>
                      <Badge variant={entryType.variant}>{entryType.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{ad.name}</TableCell>
                    <TableCell>
                      {ad.ad_versions.length > 0 ? (
                        <span className="text-sm">
                          {ad.ad_versions.map((v) => v.version_name).join(", ")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {ad.total_quantity || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ad.ad_size?.name || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ad.installation_team?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {retentionWarning === "expired" && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        {retentionWarning === "warning" && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ad.contractor_access_token ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = `${window.location.origin}/ad-contractor/${ad.contractor_access_token}`;
                                  navigator.clipboard.writeText(link);
                                  toast.success("คัดลอกลิงก์แล้ว");
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                คัดลอก
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>คัดลอกลิงก์สำหรับผู้รับเหมา</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ad.contractor_access_pin ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{ad.contractor_access_pin}</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ad.created_at), "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <AdDetailDialog
        adId={selectedAdId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
