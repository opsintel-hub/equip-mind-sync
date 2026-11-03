import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSubMediaTypes, setActiveSubMediaTypes } from "@/lib/mediaPlayerSubTypes";

export function useSubMediaTypes(): string[] {
  const { data } = useQuery({
    queryKey: ["mp_sub_media_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_sub_media_types")
        .select("name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const list = (data ?? []).map((r) => r.name);
      setActiveSubMediaTypes(list);
      return list;
    },
    staleTime: 60_000,
  });
  return data && data.length ? data : getSubMediaTypes();
}
