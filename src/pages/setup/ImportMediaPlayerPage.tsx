import ImportPageShell from "./ImportPageShell";
import { downloadMediaPlayerTemplate } from "@/lib/importTemplates/mediaPlayerTemplate";
import { validateMediaPlayerRows } from "@/lib/importTemplates/validators";
import { supabase } from "@/integrations/supabase/client";
import { setActiveSubMediaTypes } from "@/lib/mediaPlayerSubTypes";
import { useSubMediaTypes } from "@/hooks/useSubMediaTypes";

/** Load active Sub Media Types from Master Data so validation/template use the live list. */
async function refreshSubMediaTypes() {
  const { data, error } = await supabase
    .from("mp_sub_media_types")
    .select("name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (!error) setActiveSubMediaTypes((data ?? []).map((r) => r.name));
}

export default function ImportMediaPlayerPage() {
  useSubMediaTypes();
  return (
    <ImportPageShell
      title="นำเข้าข้อมูล Media Player เริ่มต้น"
      description="สร้าง Media Player 1 บรรทัด = 1 เครื่อง พร้อมรับเข้าคลัง และผูกป้ายโฆษณา (ถ้าระบุ)"
      sheetName="MediaPlayer"
      templateKind="media_player"
      templateDownloader={(r) => { void refreshSubMediaTypes().then(() => downloadMediaPlayerTemplate(r)); }}
      rpcName="import_media_player_row"
      columnHints={["code", "name", "serial_number_1", "serial_number_2", "unit_price", "date_of_receipt", "billboard_id", "install_date"]}
      validator={async (rows, refs) => {
        await refreshSubMediaTypes();
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
