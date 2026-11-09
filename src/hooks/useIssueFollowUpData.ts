import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeptScope } from "@/hooks/useDeptScope";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { agingBucket, followUpQuantities, followUpDepartment, issueAge, type FollowUpRow, type FollowUpDepartments } from "@/lib/incompleteIssueReport";
import type { Tables } from "@/integrations/supabase/types";
import { buildReceivedSerialAliasMap } from "@/lib/serialSearch";

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
      const aliases = new Map<string, string[]>();
      const owners: FollowUpDepartments = { equipment: {}, mediaPlayers: {} };
      const loadOwners = async (key: "equipment_id" | "media_player_id", ids: string[]) => {
        const target = key === "equipment_id" ? owners.equipment : owners.mediaPlayers;
        const missing = [...new Set(ids)].filter(id => !(id in target));
        for (let i = 0; i < missing.length; i += 100) {
          const batch = missing.slice(i, i + 100);
          const records = await fetchAllRows<{ id: string; department: string | null }>(() => supabase
            .from(key === "equipment_id" ? "equipment" : "media_players")
            .select("id, department").in("id", batch).order("id"));
          for (const id of batch) target[id] = null;
          for (const record of records) target[record.id] = record.department;
        }
      };
      await loadOwners("equipment_id", headers.map(h => h.equipment_id).filter((id): id is string => !!id));
      for (let start = 0; start < headers.length; start += 100) {
        const ids = headers.slice(start, start + 100).map(h => h.id);
        const lines = await fetchAllRows<Tables<"goods_issue_pending_items">>(() => supabase.from("goods_issue_pending_items").select("*").in("pending_id", ids).order("id"));
        for (const line of lines) grouped.set(line.pending_id, [...(grouped.get(line.pending_id) || []), line]);
        await Promise.all((["equipment_id", "media_player_id"] as const).map(key =>
          loadOwners(key, lines.map(line => line[key]).filter((id): id is string => !!id))));
        for (const key of ["equipment_id", "media_player_id"] as const) {
          const itemIds = [...new Set(lines.map(line => line[key]).filter((id): id is string => !!id))];
          for (let i=0; i<itemIds.length; i+=100) {
            const receiptRows = await fetchAllRows(() => supabase.from("goods_receipt_pending")
              .select("equipment_id, media_player_id, serial_number, received_at, created_at")
              .eq("status","received").in(key,itemIds.slice(i,i+100)).order("id"));
            const map = buildReceivedSerialAliasMap(receiptRows,key);
            for (const line of lines) { const id = line[key]; if (id && map[id]) aliases.set(line.id,map[id]); }
          }
        }
      }
      const now = new Date();
      const rows: FollowUpRow[] = [];
      for (const h of headers) {
        const days = issueAge(h.issued_at, now);
        const items = grouped.get(h.id);
        const lines = items?.length ? items : [{ ...h, pending_id: h.id, serial_number: null,
          installed_qty: null, returned_good_qty: h.return_quantity, needs_return: true }];
        for (const line of lines) {
          const department = followUpDepartment(line, h.requester_department, owners);
          if (!isSuperAdmin && !viewableDepts?.includes(department)) continue;
          if (Number(line.issued_quantity || 0) <= 0) continue;
          const quantities = followUpQuantities(line, purposeMap.get(h.purpose_id || ""));
          if (items?.length && line.status !== "issued") { quantities.billboardQty = 0; quantities.returnQty = 0; }
          if (closedDocs.has(h.document_no)) { quantities.billboardQty = 0; quantities.returnQty = 0; }
          if (!quantities.billboardQty && !quantities.returnQty && !quantities.usageQty) continue;
          rows.push({ id: line.id, documentId: h.id, documentNo: h.document_no,
            department, person: h.requester_name,
            purpose: h.purpose || "ไม่ระบุวัตถุประสงค์", issuedAt: h.issued_at, days, bucket: agingBucket(days),
            code: line.equipment_code || "—", name: line.equipment_name || "—", serial: line.serial_number || "", aliases: aliases.get(line.id),
            unit: line.unit || "ไม่ระบุหน่วย", isMediaPlayer: !!(line.is_media_player || line.media_player_id), ...quantities });
        }
      }
      // Receipt queues may need already-settled headers, so keep the scoped header map.
      return { rows, headers, owners, refreshedAt: now.toISOString() };
    },
  });
}