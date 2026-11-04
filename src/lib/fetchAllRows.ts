/**
 * Fetch every row of a query, paging past the API's 1000-row cap.
 * `build` must return a fresh query (with a stable .order()) each call.
 */
export async function fetchAllRows<T = any>(
  build: () => any,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
