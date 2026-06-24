import ImportPageShell from "./ImportPageShell";
import { downloadEquipmentTemplate } from "@/lib/importTemplates/equipmentTemplate";
import { validateEquipmentRows } from "@/lib/importTemplates/validators";
import { supabase } from "@/integrations/supabase/client";

export default function ImportEquipmentPage() {
  return (
    <ImportPageShell
      title="นำเข้าข้อมูลอุปกรณ์เริ่มต้น"
      description="สร้างอุปกรณ์ใหม่ พร้อมเพิ่มจำนวนคงคลัง และผูกกับป้ายโฆษณา (ถ้าระบุ) — ครบจบในไฟล์เดียว"
      sheetName="Equipment"
      templateDownloader={downloadEquipmentTemplate}
      rpcName="import_equipment_row"
      columnHints={["code", "name", "category", "quantity_in_stock", "unit_price", "warehouse_entry_date", "billboard_id", "install_quantity"]}
      validator={async (rows, refs) => {
        // fetch existing equipment codes
        const existing = new Set<string>();
        let from = 0;
        const size = 1000;
        while (true) {
          const { data, error } = await supabase.from("equipment").select("code").range(from, from + size - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          data.forEach((d: any) => d.code && existing.add(d.code));
          if (data.length < size) break;
          from += size;
        }
        return validateEquipmentRows(rows, refs, existing);
      }}
    />
  );
}
