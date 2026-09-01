import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { History } from "lucide-react";
import {
  auditActionIcon,
  auditActionLabel,
  auditRolesLabel,
  summarizeChanges,
  type ActivityAuditRow,
} from "@/lib/activityAudit";

interface Props {
  entityTable: string;
  entityId: string;
  title?: string;
}

export function AuditTimeline({ entityTable, entityId, title = "ประวัติการดำเนินการ" }: Props) {
  const [rows, setRows] = useState<ActivityAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (supabase as any)
      .from("activity_audit")
      .select("*")
      .eq("entity_table", entityTable)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        if (!active) return;
        setRows((data as ActivityAuditRow[]) || []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [entityTable, entityId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">กำลังโหลดประวัติ...</p>;
  }
  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium">
        <History className="h-4 w-4 text-primary" />
        {title}
      </div>
      <ol className="space-y-3">
        {rows.map((r) => {
          const changes = summarizeChanges(r.changed_fields);
          return (
            <li key={r.id} className="flex gap-3 text-xs">
              <span className="mt-0.5">{auditActionIcon(r.action)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{auditActionLabel(r.action)}</span>
                  {r.status_before && r.status_after && (
                    <span className="text-muted-foreground">
                      {r.status_before} → {r.status_after}
                    </span>
                  )}
                  {r.is_super_admin_action && (
                    <Badge variant="secondary" className="text-[10px]">Super Admin</Badge>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {r.actor_name || "ระบบ"} · สิทธิ์: {auditRolesLabel(r.actor_roles)} ·{" "}
                  {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: th })}
                </div>
                {changes && (
                  <div className="text-muted-foreground/80 truncate" title={changes}>
                    เปลี่ยน: {changes}
                  </div>
                )}
                {r.notes && <div className="text-muted-foreground/80">หมายเหตุ: {r.notes}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
