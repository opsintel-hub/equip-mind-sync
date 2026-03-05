

## Plan: Add S/N Column to Inventory Report

### Problem
The Inventory Report table does not display a Serial Number (S/N) column, even though the data exists in the database (`serial_number` for equipment/tools, `serial_number_1`/`serial_number_2` for media players).

### Changes — `src/pages/InventoryReport.tsx`

1. **Add `serial_number` to `InventoryItem` interface** — new optional field `serial_number?: string | null`

2. **Include `serial_number` in all 3 Supabase queries:**
   - Equipment query: add `serial_number` to select
   - Tools query: add `serial_number` to select
   - Media Players query: add `serial_number_1, serial_number_2` to select, then map to `serial_number` (concatenate both if both exist, e.g. `"SN1 / SN2"`)

3. **Add table column header** — insert `<TableHead>S/N</TableHead>` after the "ชื่อ" (name) column

4. **Add table cell** — display `item.serial_number || "-"` in each row

5. **Update `colSpan`** — change from 17 to 18 for loading/empty states

6. **Add to Excel export** — include `"S/N": item.serial_number || "-"` in the export data

