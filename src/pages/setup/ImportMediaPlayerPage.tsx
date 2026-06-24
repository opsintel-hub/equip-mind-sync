import ImportPageShell from "./ImportPageShell";
import { downloadMediaPlayerTemplate } from "@/lib/importTemplates/mediaPlayerTemplate";
import { validateMediaPlayerRows } from "@/lib/importTemplates/validators";
import { supabase } from "@/integrations/supabase/client";

export default function ImportMediaPlayerPage() {
  return (
    <ImportPageShell
      title="นำเข้าข้อมูล Media Player เริ่มต้น"
      description="สร้าง Media Player 1 บรรทัด = 1 เครื่อง พร้อมรับเข้าคลัง และผูกป้ายโฆษณา (ถ้าระบุ)"
      sheetName="MediaPlayer"
      templateDownloader={downloadMediaPlayerTemplate}
      rpcName="import_media_player_row"
      columnHints={["code", "name", "serial_number_1", "serial_number_2", "unit_price", "date_of_receipt", "billboard_id", "install_date"]}
      validator={async (rows, refs) => {
        const existing = new Set<string>();
        let from = 0;
        const size = 1000;
        while (true) {
          const { data, error } = await supabase.from("media_players").select("serial_number_1,serial_number_2").range(from, from + size - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          data.forEach((d: any) => {
            if (d.serial_number_1) existing.add(d.serial_number_1);
            if (d.serial_number_2) existing.add(d.serial_number_2);
          });
          if (data.length < size) break;
          from += size;
        }
        return validateMediaPlayerRows(rows, refs, existing);
      }}
    />
  );
}
