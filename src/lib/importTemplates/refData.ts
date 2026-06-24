import { supabase } from "@/integrations/supabase/client";

export interface RefLookups {
  categories: Array<{ name: string }>;
  subcategories: Array<{ id: string; name: string; department_id: string | null }>;
  units: Array<{ name: string }>;
  brands: Array<{ name: string; brand_type: string | null }>;
  suppliers: Array<{ id: string; code: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
  departments: Array<{ name: string }>;
  locations: Array<{ id: string; code: string; name: string; department: string | null }>;
  billboards: Array<{ id: string; old_code: string | null; location_name: string | null; equipment_id: string }>;
  mp_models: Array<{ id: string; name: string }>;
  cms_types: Array<{ id: string; name: string }>;
}

export async function fetchAllRefs(): Promise<RefLookups> {
  const fetchPaged = async <T>(table: string, columns: string): Promise<T[]> => {
    const out: T[] = [];
    let from = 0;
    const size = 1000;
    while (true) {
      const { data, error } = await (supabase as any).from(table).select(columns).range(from, from + size - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      out.push(...data);
      if (data.length < size) break;
      from += size;
    }
    return out;
  };

  const [
    categories, subcategories, units, brands, suppliers,
    companies, departments, locations, billboards, mp_models, cms_types,
  ] = await Promise.all([
    fetchPaged<any>("categories", "name"),
    fetchPaged<any>("subcategories", "id,name,department_id"),
    fetchPaged<any>("units", "name"),
    fetchPaged<any>("brands", "name,brand_type"),
    fetchPaged<any>("suppliers", "id,code,name"),
    fetchPaged<any>("companies", "id,name"),
    fetchPaged<any>("departments", "name"),
    fetchPaged<any>("locations", "id,code,name,department"),
    fetchPaged<any>("billboards", "id,old_code,location_name,equipment_id"),
    fetchPaged<any>("media_player_models", "id,name"),
    fetchPaged<any>("cms_types", "id,name"),
  ]);

  return {
    categories, subcategories, units, brands, suppliers,
    companies, departments, locations, billboards, mp_models, cms_types,
  };
}
