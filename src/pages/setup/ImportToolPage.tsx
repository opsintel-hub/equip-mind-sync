import ImportPageShell from "./ImportPageShell";
import { downloadToolTemplate } from "@/lib/importTemplates/toolTemplate";
import { validateToolRows } from "@/lib/importTemplates/toolValidator";
import { supabase } from "@/integrations/supabase/client";

export default function ImportToolPage() {
  return (
    <ImportPageShell
      title="นำเข้าเครื่องมือ"
      description="สร้างเครื่องมือใหม่พร้อมรับเข้าคลัง — ใช้ Template Excel ที่มีชีตอ้างอิงในตัว"
      sheetName="Tools"
      templateDownloader={downloadToolTemplate}
      rpcName="import_tool_row"
      columnHints={["code", "name", "tool_category", "department", "quantity", "unit_price", "warranty_expiry_date"]}
      validator={async (rows, refs) => {
        const existing = new Set<string>();
        let from = 0;
        const size = 1000;
        while (true) {
          const { data, error } = await supabase.from("tools").select("code").range(from, from + size - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          data.forEach((d: any) => d.code && existing.add(d.code));
          if (data.length < size) break;
          from += size;
        }
        return validateToolRows(rows, refs, existing);
      }}
    />
  );
}
