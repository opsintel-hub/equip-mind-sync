import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";

interface BillboardExportProps {
  currentFilters: {
    region: string;
    district: string;
    department: string;
    mediaType: string;
    status: string;
  };
}

const BillboardExport = ({ currentFilters }: BillboardExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    region: currentFilters.region,
    department: currentFilters.department,
    status: currentFilters.status,
  });

  // Fetch distinct filter values
  const { data: filterOptions } = useQuery({
    queryKey: ["billboard-export-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("region, department, status");
      if (error) throw error;

      return {
        regions: [...new Set(data.map(b => b.region).filter(Boolean))].sort(),
        departments: [...new Set(data.map(b => b.department).filter(Boolean))].sort(),
        statuses: [...new Set(data.map(b => b.status).filter(Boolean))].sort(),
      };
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let query = supabase.from("billboards").select("*");

      if (exportFilters.region) {
        query = query.eq("region", exportFilters.region);
      }
      if (exportFilters.department) {
        query = query.eq("department", exportFilters.department);
      }
      if (exportFilters.status) {
        query = query.eq("status", exportFilters.status);
      }

      const { data, error } = await query.order("old_code");
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("ไม่พบข้อมูลที่ตรงกับเงื่อนไข");
        return;
      }

      // Map to Excel format - using column names that match import template
      const exportData = data.map((b) => ({
        OldCode: b.old_code || "",
        EquipmentID: b.equipment_id,
        Description: b.description || "",
        Department: b.department || "",
        MediaClass: b.media_class || "",
        MediaSegment: b.media_segment || "",
        Region: b.region || "",
        District: b.district || "",
        Territory: b.territory || "",
        MediaType: b.media_type || "",
        Location: b.location_name || "",
        Extra_1: b.extra_1 || "",
        Extra_2: b.extra_2 || "",
        Extra_3: b.extra_3 || "",
        TargetMonitoring: b.target_monitoring || "",
        BKKUPC: b.bkk_upc || "",
        RouteMonitoring: b.route_monitoring || "",
        RouteInstallAndDemolish: b.route_install_demolish || "",
        RouteReportPhoto: b.route_report_photo || "",
        RoutePM: b.route_pm || "",
        Status: b.status,
        Notes: b.notes || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Billboards");

      const filterDesc = [
        exportFilters.region ? `Region-${exportFilters.region}` : "",
        exportFilters.department ? `Dept-${exportFilters.department}` : "",
        exportFilters.status ? `Status-${exportFilters.status}` : "",
      ]
        .filter(Boolean)
        .join("_");

      const filename = `billboards_${filterDesc || "all"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Export สำเร็จ ${data.length} รายการ`);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการ Export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Export ข้อมูลป้ายโฆษณา
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            เลือกเงื่อนไขในการ Export (ไฟล์ที่ได้สามารถใช้เป็น Template สำหรับ Import กลับได้)
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm w-24">Region:</span>
              <Select value={exportFilters.region || "__all__"} onValueChange={(v) => setExportFilters(p => ({ ...p, region: v === "__all__" ? "" : v }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {filterOptions?.regions.map((r) => (
                    <SelectItem key={r} value={r!}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm w-24">Department:</span>
              <Select value={exportFilters.department || "__all__"} onValueChange={(v) => setExportFilters(p => ({ ...p, department: v === "__all__" ? "" : v }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {filterOptions?.departments.map((d) => (
                    <SelectItem key={d} value={d!}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm w-24">Status:</span>
              <Select value={exportFilters.status || "__all__"} onValueChange={(v) => setExportFilters(p => ({ ...p, status: v === "__all__" ? "" : v }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทั้งหมด</SelectItem>
                  {filterOptions?.statuses.map((s) => (
                    <SelectItem key={s} value={s!}>
                      {s === "active" ? "ใช้งาน" : s === "maintenance" ? "บำรุงรักษา" : s === "inactive" ? "ไม่ใช้งาน" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>ยกเลิก</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "กำลัง Export..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillboardExport;
