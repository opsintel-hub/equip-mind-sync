import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { agingBucket, followUpQuantities, issueAge, type FollowUpRow } from "@/lib/incompleteIssueReport";
import type { Tables } from "@/integrations/supabase/types";

type Header = Tables<"goods_issue_pending">;
export function useIssueFollowUpData() {
  const { deptKey, loading, isSuperAdmin, viewableDepts } = useDeptScope();
  useRealtimeInvalidate({ table: "goods_issue_pending", queryKeys: [["issue-follow-up"]] });
  useRealtimeInvalidate({ table: "goods_issue_pending_items", queryKeys: [["issue-follow-up"]] });
  useRealtimeInvalidate({ table: "special_requests", queryKeys: [["issue-follow-up"]] });
  return useQuery({
    queryKey: ["issue-follow-up", deptKey], enabled: !loading, placeholderData: prev => prev,
    queryFn: async () => {
      const [headers, purposes, closed] = await Promise.all([
        fetchAllRows<Header>(() => {
          let query = supabase.from("goods_issue_pending").select("*")
            .in("status", ["issued", "partial_return", "partially_issued", "returned"])
            .order("issued_at", { ascending: false, nullsFirst: false }).order("id");
          if (!isSuperAdmin) query = query.in("requester_department",viewableDepts?.length ? viewableDepts : ["__no_dept_permission__"]);
          return query;
        }),
        fetchAllRows<Tables<"issue_purposes">>(() => supabase.from("issue_purposes").select("*").order("id")),
        fetchAllRows<{ target_doc_number: string | null }>(() => supabase.from("special_requests").select("target_doc_number")
          .in("status", ["approved", "done"]).in("request_type", ["force_close_issue_item", "cancel_return_to_stock"]).order("id")),
      ]);
      const purposeMap = new Map(purposes.map(p => [p.id, p]));
      const closedDocs = new Set(closed.map(r => r.target_doc_number));
      const grouped = new Map<string, Tables<"goods_issue_pending_items">[]>();
      for (let start = 0; start < headers.length; start += 100) {
        const ids = headers.slice(start, start + 100).map(h => h.id);
        const lines = await fetchAllRows<Tables<"goods_issue_pending_items">>(() => supabase.from("goods_issue_pending_items").select("*").in("pending_id", ids).order("id"));
        for (const line of lines) grouped.set(line.pending_id, [...(grouped.get(line.pending_id) || []), line]);
      }
      const now = new Date();
      const rows: FollowUpRow[] = [];
      for (const h of headers) {
        const days = issueAge(h.issued_at, now);
        const items = grouped.get(h.id);
        const lines = items?.length ? items : [{ ...h, pending_id: h.id, serial_number: null,
          installed_qty: null, returned_good_qty: h.return_quantity, needs_return: true }];
        for (const line of lines) {
          if (Number(line.issued_quantity || 0) <= 0) continue;
          const quantities = followUpQuantities(line, purposeMap.get(h.purpose_id || ""));
          if (closedDocs.has(h.document_no)) { quantities.billboardQty = 0; quantities.returnQty = 0; }
          if (!quantities.billboardQty && !quantities.returnQty && !quantities.usageQty) continue;
          rows.push({ id: line.id, documentId: h.id, documentNo: h.document_no,
            department: h.requester_department || "ไม่ระบุฝ่าย", person: h.requester_name,
            purpose: h.purpose || "ไม่ระบุวัตถุประสงค์", issuedAt: h.issued_at, days, bucket: agingBucket(days),
            code: line.equipment_code || "—", name: line.equipment_name || "—", serial: line.serial_number || "",
            unit: line.unit || "ไม่ระบุหน่วย", isMediaPlayer: !!(line.is_media_player || line.media_player_id), ...quantities });
        }
      }
      // Receipt queues may need already-settled headers, so keep the scoped header map.
      return { rows, headers, refreshedAt: now.toISOString() };
    },
  });
}