/**
 * Fetch every row of a query, paging past the API's 1000-row cap.
 * The same query builder is re-executed with a new .range() per page
 * (supabase-js overwrites range params and re-fetches on each await).
 */
export async function fetchAllRows<T = any>(build: () => any, pageSize = 1000): Promise<T[]> {
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

/** Drop-in for `await query`: returns `{ data, error }` with all rows. */
export async function allRows<T = any>(query: any): Promise<{ data: T[] | null; error: any }> {
  try {
    const data = await fetchAllRows<T>(() => query);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
