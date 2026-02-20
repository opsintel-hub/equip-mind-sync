import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";
import { BillboardPMFilters, BillboardPMFilterState } from "@/components/pm/BillboardPMFilters";
import { BillboardPMCart } from "@/components/pm/BillboardPMCart";
import { BillboardPMHiddenView } from "@/components/pm/BillboardPMHiddenView";
import { useAuth } from "@/hooks/useAuth";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import * as XLSX from "xlsx";

interface BillboardPMRecord {
  billboardId: string;
  oldCode: string;
  equipmentId: string;
  department: string;
  mediaType: string;
  locationName: string;
  region: string;
  district: string;
  territory: string;
  routePM: string;
  routeMonitoring: string;
  equipmentItems: {
    id: string;
    code: string;
    name: string;
    category: string;
    company: string;
    department: string;
    expiryDate: string | null;
    warrantyDate: string | null;
    quantity: number;
  }[];
  pmReason: string;
  criticalDate: string;
  daysLeft: number;
  billboardSnapshot: any;
}

const defaultFilters: BillboardPMFilterState = {
  pmReason: "all",
  timeRange: "all",
  department: "all",
  mediaType: "all",
  region: "all",
  district: "all",
  territory: "all",
  routePM: "all",
  routeMonitoring: "all",
};

export default function BillboardPMPage() {
  const { isAdmin } = useFunctionPermissions();
  const [records, setRecords] = useState<BillboardPMRecord[]>([]);
  const [hiddenRecords, setHiddenRecords] = useState<any[]>([]);
  const [actionTypes, setActionTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BillboardPMFilterState>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Fetch billboards with equipment that has expiry/warranty dates
      const { data: beData, error: beError } = await supabase
        .from("billboard_equipment")
        .select(`
          billboard_id,
          quantity,
          equipment:equipment_id (
            id, code, name, category, department, company_id,
            expiry_date, warranty_expiry_date,
            companies:company_id ( name )
          ),
          billboards:billboard_id (
            id, old_code, equipment_id, department, media_type, location_name,
            region, district, territory, route_pm, route_monitoring
          )
        `);

      if (beError) throw beError;

      // Fetch all active PM actions (snoozed + ticket_created) for billboards
      const { data: actionsData } = await supabase
        .from("billboard_pm_actions")
        .select("billboard_id, action_type, snooze_until");

      // Build a map of billboards to exclude (still snoozed or ticket created)
      const excludedBillboards = new Set<string>();
      const snoozedBillboards = new Map<string, any[]>();

      (actionsData || []).forEach((action: any) => {
        if (action.action_type === "ticket_created") {
          excludedBillboards.add(action.billboard_id);
        } else if (action.action_type === "snoozed" && action.snooze_until >= today) {
          excludedBillboards.add(action.billboard_id);
        }
      });

      // Fetch hidden (snoozed) records for admin view
      const { data: hiddenData } = await supabase
        .from("billboard_pm_actions")
        .select(`
          *,
          billboards:billboard_id (old_code, equipment_id, department, media_type, location_name),
          pm_action_types:action_type_id (name)
        `)
        .eq("action_type", "snoozed")
        .gte("snooze_until", today);

      setHiddenRecords(hiddenData || []);

      // Fetch action types
      const { data: actionTypesData } = await supabase
        .from("pm_action_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      setActionTypes(actionTypesData || []);

      // Group by billboard and build records
      const billboardMap = new Map<string, BillboardPMRecord>();

      (beData || []).forEach((be: any) => {
        const eq = be.equipment;
        const bb = be.billboards;
        if (!eq || !bb) return;

        const hasExpiry = eq.expiry_date;
        const hasWarranty = eq.warranty_expiry_date;
        if (!hasExpiry && !hasWarranty) return;

        const billboardId = be.billboard_id;
        if (excludedBillboards.has(billboardId)) return;

        // Determine critical date and reason
        let criticalDate = "";
        let pmReason = "";
        if (hasExpiry && hasWarranty) {
          criticalDate = eq.expiry_date < eq.warranty_expiry_date ? eq.expiry_date : eq.warranty_expiry_date;
          pmReason = "both";
        } else if (hasExpiry) {
          criticalDate = eq.expiry_date;
          pmReason = "expiry";
        } else {
          criticalDate = eq.warranty_expiry_date;
          pmReason = "warranty_expiry";
        }

        const daysLeft = differenceInDays(new Date(criticalDate), new Date());

        const equipItem = {
          id: eq.id,
          code: eq.code,
          name: eq.name,
          category: eq.category,
          company: eq.companies?.name || "-",
          department: eq.department || "-",
          expiryDate: eq.expiry_date,
          warrantyDate: eq.warranty_expiry_date,
          quantity: be.quantity,
        };

        if (billboardMap.has(billboardId)) {
          const existing = billboardMap.get(billboardId)!;
          existing.equipmentItems.push(equipItem);
          // Update critical date if earlier
          if (daysLeft < existing.daysLeft) {
            existing.daysLeft = daysLeft;
            existing.criticalDate = criticalDate;
            existing.pmReason = pmReason;
          }
        } else {
          billboardMap.set(billboardId, {
            billboardId,
            oldCode: bb.old_code || "",
            equipmentId: bb.equipment_id,
            department: bb.department || "",
            mediaType: bb.media_type || "",
            locationName: bb.location_name || "",
            region: bb.region || "",
            district: bb.district || "",
            territory: bb.territory || "",
            routePM: bb.route_pm || "",
            routeMonitoring: bb.route_monitoring || "",
            equipmentItems: [equipItem],
            pmReason,
            criticalDate,
            daysLeft,
            billboardSnapshot: bb,
          });
        }
      });

      setRecords(Array.from(billboardMap.values()).sort((a, b) => a.daysLeft - b.daysLeft));
    } catch (error) {
      console.error("Error fetching PM data:", error);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Build distinct values for filters
  const distinctValues = useMemo(() => ({
    departments: [...new Set(records.map(r => r.department).filter(Boolean))].sort(),
    mediaTypes: [...new Set(records.map(r => r.mediaType).filter(Boolean))].sort(),
    regions: [...new Set(records.map(r => r.region).filter(Boolean))].sort(),
    districts: [...new Set(records.map(r => r.district).filter(Boolean))].sort(),
    territories: [...new Set(records.map(r => r.territory).filter(Boolean))].sort(),
    routePMs: [...new Set(records.map(r => r.routePM).filter(Boolean))].sort(),
    routeMonitorings: [...new Set(records.map(r => r.routeMonitoring).filter(Boolean))].sort(),
  }), [records]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filters.pmReason !== "all" && r.pmReason !== filters.pmReason && !(filters.pmReason === "expiry" && r.pmReason === "both") && !(filters.pmReason === "warranty_expiry" && r.pmReason === "both")) {
        // Check if the specific reason is relevant
        if (filters.pmReason === "expiry" && !r.equipmentItems.some(e => e.expiryDate)) return false;
        if (filters.pmReason === "warranty_expiry" && !r.equipmentItems.some(e => e.warrantyDate)) return false;
      }
      if (filters.timeRange !== "all") {
        if (filters.timeRange === "overdue" && r.daysLeft >= 0) return false;
        if (filters.timeRange !== "overdue") {
          const days = parseInt(filters.timeRange);
          if (r.daysLeft < 0 || r.daysLeft > days) return false;
        }
      }
      if (filters.department !== "all" && r.department !== filters.department) return false;
      if (filters.mediaType !== "all" && r.mediaType !== filters.mediaType) return false;
      if (filters.region !== "all" && r.region !== filters.region) return false;
      if (filters.district !== "all" && r.district !== filters.district) return false;
      if (filters.territory !== "all" && r.territory !== filters.territory) return false;
      if (filters.routePM !== "all" && r.routePM !== filters.routePM) return false;
      if (filters.routeMonitoring !== "all" && r.routeMonitoring !== filters.routeMonitoring) return false;
      return true;
    });
  }, [records, filters]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredRecords.map(r => r.billboardId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (billboardId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(billboardId); else next.delete(billboardId);
    setSelectedIds(next);
  };

  const selectedItems = filteredRecords.filter(r => selectedIds.has(r.billboardId));

  const getDaysLeftBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">หมดแล้ว {Math.abs(days)} วัน</Badge>;
    if (days <= 30) return <Badge variant="destructive">เหลือ {days} วัน</Badge>;
    if (days <= 60) return <Badge className="bg-warning text-warning-foreground">เหลือ {days} วัน</Badge>;
    return <Badge variant="secondary">เหลือ {days} วัน</Badge>;
  };

  const handleExport = () => {
    const rows = filteredRecords.map(r => ({
      "Old Code": r.oldCode,
      "Equipment ID": r.equipmentId,
      "ฝ่าย": r.department,
      "Media Type": r.mediaType,
      "Location": r.locationName,
      "Region": r.region,
      "District": r.district,
      "Territory": r.territory,
      "Route PM": r.routePM,
      "Route Monitoring": r.routeMonitoring,
      "เหตุผล PM": r.pmReason === "expiry" ? "หมดอายุ" : r.pmReason === "warranty_expiry" ? "หมดประกัน" : "หมดอายุ+ประกัน",
      "วันที่วิกฤต": r.criticalDate,
      "วันเหลือ": r.daysLeft,
      "อะไหล่": r.equipmentItems.map(e => `${e.code} ${e.name}`).join(", "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM Billboard");
    XLSX.writeFile(wb, `pm_billboard_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const overdueCount = records.filter(r => r.daysLeft < 0).length;
  const within30Count = records.filter(r => r.daysLeft >= 0 && r.daysLeft <= 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">แจ้ง PM ป้ายโฆษณา</h1>
          <p className="text-muted-foreground">ป้ายที่ต้องดำเนินการ PM (อิงจากวันหมดอายุ/ประกันของอะไหล่ที่ติดตั้ง)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">หมดอายุ/ประกันแล้ว</p>
              <p className="text-2xl font-bold text-destructive">{overdueCount} ป้าย</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-warning" />
            <div>
              <p className="text-sm text-muted-foreground">หมดภายใน 30 วัน</p>
              <p className="text-2xl font-bold text-warning">{within30Count} ป้าย</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">พบทั้งหมด (หลังกรอง)</p>
              <p className="text-2xl font-bold">{filteredRecords.length} ป้าย</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent>
          <BillboardPMFilters
            filters={filters}
            onChange={setFilters}
            distinctValues={distinctValues}
          />
        </CardContent>
      </Card>

      {/* Admin: Show hidden */}
      {isAdmin && (
        <BillboardPMHiddenView hiddenRecords={hiddenRecords} onRefresh={fetchData} />
      )}

      {/* Cart */}
      <BillboardPMCart
        selectedItems={selectedItems}
        actionTypes={actionTypes}
        onActionComplete={fetchData}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">กำลังโหลดข้อมูล...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่พบป้ายที่ต้องทำ PM ตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Old Code</TableHead>
                    <TableHead>Equipment ID</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead>Media Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Route PM</TableHead>
                    <TableHead>อะไหล่ที่ติดตั้ง</TableHead>
                    <TableHead>เหตุผล PM</TableHead>
                    <TableHead>วันที่วิกฤต</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(record => (
                    <TableRow key={record.billboardId} className={selectedIds.has(record.billboardId) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(record.billboardId)}
                          onCheckedChange={(c) => handleSelectOne(record.billboardId, c as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">{record.oldCode || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{record.equipmentId}</TableCell>
                      <TableCell>{record.department || "-"}</TableCell>
                      <TableCell>{record.mediaType || "-"}</TableCell>
                      <TableCell>{record.locationName || "-"}</TableCell>
                      <TableCell>{record.region || "-"}</TableCell>
                      <TableCell>{record.district || "-"}</TableCell>
                      <TableCell>{record.routePM || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {record.equipmentItems.map(item => (
                            <div key={item.id} className="text-xs">
                              <span className="font-medium">{item.code}</span> {item.name}
                              <span className="text-muted-foreground"> ({item.quantity})</span>
                              {item.expiryDate && (
                                <div className="text-muted-foreground">หมดอายุ: {format(new Date(item.expiryDate), "dd/MM/yyyy", { locale: th })}</div>
                              )}
                              {item.warrantyDate && (
                                <div className="text-muted-foreground">ประกันหมด: {format(new Date(item.warrantyDate), "dd/MM/yyyy", { locale: th })}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.pmReason === "both" ? "default" : record.pmReason === "expiry" ? "destructive" : "secondary"} className="text-xs">
                          {record.pmReason === "expiry" ? "หมดอายุ" : record.pmReason === "warranty_expiry" ? "หมดประกัน" : "หมดทั้งคู่"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(record.criticalDate), "dd/MM/yyyy", { locale: th })}
                      </TableCell>
                      <TableCell>{getDaysLeftBadge(record.daysLeft)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
