import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileSpreadsheet, History, Package } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { DateRange } from "react-day-picker";

interface ExportFilters {
  dateRange: DateRange | undefined;
  exportType: "all" | "installed" | "uninstalled";
  department: string;
}

const BillboardEquipmentExport = () => {
  const [filters, setFilters] = useState<ExportFilters>({
    dateRange: undefined,
    exportType: "all",
    department: "all",
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Export installed equipment
      if (filters.exportType === "all" || filters.exportType === "installed") {
        let installedQuery = supabase
          .from("billboard_equipment")
          .select(`
            *,
            billboards!inner (
              equipment_id,
              location_name,
              department,
              media_type,
              region,
              district
            ),
            equipment:equipment_id (
              code,
              name,
              unit,
              category,
              expiry_date,
              warranty_expiry_date
            )
          `);
        
        if (filters.department && filters.department !== "all") {
          installedQuery = installedQuery.eq("billboards.department", filters.department);
        }
        
        if (filters.dateRange?.from) {
          installedQuery = installedQuery.gte("installation_date", format(filters.dateRange.from, "yyyy-MM-dd"));
        }
        if (filters.dateRange?.to) {
          installedQuery = installedQuery.lte("installation_date", format(filters.dateRange.to, "yyyy-MM-dd"));
        }

        const { data: installedData, error: installedError } = await installedQuery;
        if (installedError) throw installedError;

        const installedRows = installedData?.map((item: any) => ({
          "Billboard ID": item.billboards?.equipment_id || "-",
          "Location": item.billboards?.location_name || "-",
          "Department": item.billboards?.department || "-",
          "Media Type": item.billboards?.media_type || "-",
          "Region": item.billboards?.region || "-",
          "District": item.billboards?.district || "-",
          "Equipment Code": item.equipment?.code || "-",
          "Equipment Name": item.equipment?.name || "-",
          "Category": item.equipment?.category || "-",
          "Quantity": item.quantity,
          "Unit": item.equipment?.unit || "-",
          "Installation Date": item.installation_date || "-",
          "Expiry Date": item.equipment?.expiry_date || "-",
          "Warranty Expiry": item.equipment?.warranty_expiry_date || "-",
          "Notes": item.notes || "-",
        })) || [];

        const installedSheet = XLSX.utils.json_to_sheet(installedRows);
        XLSX.utils.book_append_sheet(workbook, installedSheet, "อุปกรณ์ติดตั้ง");
      }

      // Export uninstalled history
      if (filters.exportType === "all" || filters.exportType === "uninstalled") {
        let historyQuery = supabase
          .from("billboard_equipment_history")
          .select("*");

        if (filters.dateRange?.from) {
          historyQuery = historyQuery.gte("uninstall_date", format(filters.dateRange.from, "yyyy-MM-dd"));
        }
        if (filters.dateRange?.to) {
          historyQuery = historyQuery.lte("uninstall_date", format(filters.dateRange.to, "yyyy-MM-dd"));
        }

        const { data: historyData, error: historyError } = await historyQuery;
        if (historyError) throw historyError;

        // Get billboard and equipment details
        const billboardIds = [...new Set(historyData?.map(h => h.billboard_id) || [])];
        const equipmentIds = [...new Set(historyData?.map(h => h.equipment_id) || [])];

        const { data: billboards } = await supabase
          .from("billboards")
          .select("id, equipment_id, location_name, department, media_type, region, district")
          .in("id", billboardIds);

        const { data: equipment } = await supabase
          .from("equipment")
          .select("id, code, name, unit, category")
          .in("id", equipmentIds);

        const billboardMap = new Map(billboards?.map(b => [b.id, b]) || []);
        const equipmentMap = new Map(equipment?.map(e => [e.id, e]) || []);

        let historyRows = historyData?.map((item: any) => {
          const billboard = billboardMap.get(item.billboard_id);
          const eq = equipmentMap.get(item.equipment_id);
          return {
            "Billboard ID": billboard?.equipment_id || "-",
            "Location": billboard?.location_name || "-",
            "Department": billboard?.department || "-",
            "Media Type": billboard?.media_type || "-",
            "Region": billboard?.region || "-",
            "District": billboard?.district || "-",
            "Equipment Code": eq?.code || "-",
            "Equipment Name": eq?.name || "-",
            "Category": eq?.category || "-",
            "Quantity": item.quantity,
            "Unit": eq?.unit || "-",
            "Installation Date": item.installation_date || "-",
            "Uninstall Date": item.uninstall_date || "-",
            "Uninstall Reason": item.uninstall_reason || "-",
            "Return to Stock": item.return_to_stock ? "Yes" : "No",
            "Notes": item.installation_notes || "-",
          };
        }) || [];

        // Filter by department if needed
        if (filters.department && filters.department !== "all") {
          historyRows = historyRows.filter(r => r["Department"] === filters.department);
        }

        const historySheet = XLSX.utils.json_to_sheet(historyRows);
        XLSX.utils.book_append_sheet(workbook, historySheet, "ประวัติถอดอุปกรณ์");
      }

      // Generate file name
      const dateStr = format(new Date(), "yyyyMMdd_HHmmss");
      const fileName = `Billboard_Equipment_Report_${dateStr}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      toast.success("Export สำเร็จ");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("เกิดข้อผิดพลาดในการ Export: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export รายงานอุปกรณ์ป้ายโฆษณา
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>ประเภทรายงาน</Label>
            <Select 
              value={filters.exportType} 
              onValueChange={(v) => setFilters({ ...filters, exportType: v as ExportFilters["exportType"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    ทั้งหมด (ติดตั้ง + ประวัติถอด)
                  </div>
                </SelectItem>
                <SelectItem value="installed">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    เฉพาะอุปกรณ์ติดตั้ง
                  </div>
                </SelectItem>
                <SelectItem value="uninstalled">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    เฉพาะประวัติถอด
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ช่วงวันที่</Label>
            <DatePickerWithRange
              date={filters.dateRange}
              onDateChange={(range) => setFilters({ ...filters, dateRange: range })}
            />
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Select 
              value={filters.department} 
              onValueChange={(v) => setFilters({ ...filters, department: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="BKK">BKK</SelectItem>
                <SelectItem value="UPC">UPC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleExport} disabled={exporting} className="w-full md:w-auto">
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "กำลัง Export..." : "Export Excel"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BillboardEquipmentExport;
