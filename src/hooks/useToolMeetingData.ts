import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useSectionScope } from "@/hooks/useSectionScope";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { emptyToolData, type ToolMeetingData, type MeetingTool, type ToolLoan, type ToolPM, type ToolHistory, type ToolAssignment } from "@/lib/toolMeetingReport";

export function useToolMeetingData() {
  const { user } = useAuth();
  const dept = useDeptScope(); const section = useSectionScope();
  const enabled = !!user && !dept.loading && !section.loading;
  const query = useQuery({
    queryKey: ["tool-meeting", user?.id, dept.deptKey, section.scopeKey], enabled, staleTime: 60_000,
    refetchInterval: 60_000, refetchOnWindowFocus: false,
    queryFn: async (): Promise<ToolMeetingData> => {
      const tools = await fetchAllRows<MeetingTool>(() => section.applyToolScope(dept.applyDeptFilter(supabase.from("tools").select("*, tool_category:tool_categories(name), tool_subcategory:tool_subcategories(name), company:companies(name), location:locations(name,code,warehouse:warehouses(name,code))").eq("is_active", true).order("created_at", { ascending: false }).order("id")));
      if (!tools.length) return emptyToolData;
      // Child reads are restricted to the visible tool IDs and paginated independently.
      const data: ToolMeetingData = { tools, loans: [], tasks: [], history: [], assignments: [] };
      for (let start = 0; start < tools.length; start += 100) {
        const ids = tools.slice(start, start + 100).map(t => t.id);
        const [loans, tasks, history, assignments] = await Promise.all([
          fetchAllRows<ToolLoan>(() => supabase.from("equipment_loans").select("*").eq("item_kind", "tool").in("tool_id", ids).order("created_at", { ascending: false }).order("id")),
          fetchAllRows<ToolPM>(() => supabase.from("tool_pm_tasks").select("*").in("tool_id", ids).order("due_date").order("id")),
          fetchAllRows<ToolHistory>(() => supabase.from("tool_pm_history").select("*, result:pm_results(name)").in("tool_id", ids).order("completed_date", { ascending: false }).order("id")),
          fetchAllRows<ToolAssignment>(() => supabase.from("technician_tools").select("*, technician:technicians(name,department)").in("tool_id", ids).order("id")),
        ]);
        data.loans.push(...loans); data.tasks.push(...tasks); data.history.push(...history); data.assignments.push(...assignments);
      }
      return data;
    },
  });
  useRealtimeInvalidate({ table: "tools", queryKeys: [["tool-meeting"]], enabled });
  useRealtimeInvalidate({ table: "equipment_loans", queryKeys: [["tool-meeting"]], enabled });
  useRealtimeInvalidate({ table: "tool_pm_tasks", queryKeys: [["tool-meeting"]], enabled });
  useRealtimeInvalidate({ table: "tool_pm_history", queryKeys: [["tool-meeting"]], enabled });
  useRealtimeInvalidate({ table: "technician_tools", queryKeys: [["tool-meeting"]], enabled });
  return { ...query, loading: dept.loading || section.loading || query.isPending };
}