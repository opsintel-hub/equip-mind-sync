import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { History, ShieldAlert } from "lucide-react";
import { AUDIT_ACTION_ICON, AUDIT_ACTION_LABEL, AUDIT_METHOD_LABEL, type DisposalAuditRow } from "./disposalAudit";

interface Props {
  defectiveReturnId: string;
}

export function DisposalAuditTimeline({ defectiveReturnId }: Props) {
  const [rows, setRows] = useState<DisposalAuditRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("defective_disposal_audit")
        .select("*")
        .eq("defective_return_id", defectiveReturnId)
        .order("created_at", { ascending: true });
      const list = ((data as DisposalAuditRow[]) || []);
      const { data: users } = await supabase.rpc("get_users_emails" as any);
      if (cancelled) return;
      setNames(new Map(((users as any[]) || []).map((u: any) => [u.id, u.email])));
      setRows(list);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [defectiveReturnId]);

  const hasSelfApproval = rows.some((r) => r.is_self_approval);

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-xs text-muted-foreground flex items-center gap-1">
          <History className="h-3.5 w-3.5" /> ประวัติการดำเนินการ (Audit Log)
        </div>
        {hasSelfApproval && (
          <Badge variant="outline" className="text-[11px] border-warning text-warning gap-1">
            <ShieldAlert className="h-3 w-3" /> อนุมัติโดยผู้ใช้คนเดียวกันหลายชั้น
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground italic">กำลังโหลด...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">ยังไม่มีประวัติที่บันทึกไว้</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex gap-2 text-xs">
              <span className="shrink-0">{AUDIT_ACTION_ICON[r.action] || "•"}</span>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{AUDIT_ACTION_LABEL[r.action] || r.action}</span>
                  {r.disposal_method && (
                    <span className="text-muted-foreground">· {AUDIT_METHOD_LABEL[r.disposal_method] || r.disposal_method}</span>
                  )}
                  {r.is_super_admin_action && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Super Admin</Badge>
                  )}
                  {r.is_self_approval && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-warning text-warning">ข้ามชั้น</Badge>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {(r.actor_id ? names.get(r.actor_id) : null) || "ระบบ"}
                  {" · "}
                  {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: th })}
                </div>
                {r.notes && <div className="whitespace-pre-line bg-muted/30 rounded px-2 py-1">{r.notes}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
