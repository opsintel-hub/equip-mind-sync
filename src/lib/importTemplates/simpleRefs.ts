import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

/** Fetch every row of a master-data table (paged) for use in template reference sheets. */
export async function fetchRefRows(table: string, columns: string, orderBy = "name"): Promise<any[]> {
  const out: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: true })
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return out;
}

/** Append a `_ref_*` sheet listing current master data so users always pick valid values. */
export function appendRefSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  rows: Record<string, any>[],
  widths: number[] = [],
) {
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "(ยังไม่มีข้อมูลในระบบ)": "" }]);
  if (widths.length > 0) ws["!cols"] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}
