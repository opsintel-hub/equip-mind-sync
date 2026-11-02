import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BillboardExportProps {
  /** Fetches every row matching the filters currently shown on screen */
  fetchRows: () => Promise<any[]>;
  totalCount?: number;
}

const BillboardExport = ({ fetchRows, totalCount }: BillboardExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchRows();
      if (!data || data.length === 0) {
        toast.error("ไม่พบข้อมูลที่ตรงกับเงื่อนไข");
        return;
      }

      const statusMap: Record<string, string> = {
        active: "ใช้งาน",
        maintenance: "บำรุงรักษา",
        inactive: "ไม่ใช้งาน",
      };

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
        "สถานะ": statusMap[b.status] || b.status,
        Notes: b.notes || "",
        Size: (b as any).size || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Billboards");

      const filename = `billboards_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Export สำเร็จ ${data.length} รายการ`);
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการ Export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting || totalCount === 0}>
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? "กำลัง Export..." : `Export Excel${totalCount ? ` (${totalCount.toLocaleString()})` : ""}`}
    </Button>
  );
};

export default BillboardExport;
