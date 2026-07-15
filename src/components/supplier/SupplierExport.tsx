import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function SupplierExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_suppliers_admin");
      if (error) throw error;
      const rows = (data || []) as any[];
      if (rows.length === 0) {
        toast.info("ยังไม่มีข้อมูลให้ส่งออก");
        return;
      }
      const exportData = rows.map((s) => ({
        Company: s.company_code || "",
        "Vendor ID": s.vendor_code || s.code || "",
        "Tax ID": s.tax_id || "",
        "Vendor Name": s.name,
        Description: s.description || "",
        "Media Site Name": s.media_site_name || "",
        "Contact Person": s.contact_person || "",
        Phone: s.phone || "",
        Email: s.email || "",
        Address: s.address || "",
        "Is Active": s.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
        Notes: s.notes || "",
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 40 }, { wch: 35 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 40 },
        { wch: 12 }, { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vendor list-Store");
      XLSX.writeFile(wb, `suppliers_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`ส่งออก ${rows.length.toLocaleString()} รายการสำเร็จ`);
    } catch (error: any) {
      toast.error("ส่งออกไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" disabled={loading}>
      <Download className="h-4 w-4 mr-2" />
      {loading ? "กำลังส่งออก..." : "ส่งออก Excel"}
    </Button>
  );
}
