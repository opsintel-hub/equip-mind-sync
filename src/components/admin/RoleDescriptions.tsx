import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronDown, Eye, Settings, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { GuideEntryDialog, GuideEntry } from "./GuideEntryDialog";
import { GuideIcon } from "./guideEntryIcons";

export function RoleDescriptions() {
  const { isSuperAdmin } = useIsSuperAdmin();
  const [entries, setEntries] = useState<GuideEntry[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GuideEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuideEntry | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("admin_guide_entries")
      .select("*")
      .eq("kind", "role")
      .order("display_order");
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
      return;
    }
    setEntries((data || []) as GuideEntry[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (key: string) =>
    setOpenKeys((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const { error } = await (supabase as any)
      .from("admin_guide_entries")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) { toast.error("ลบไม่สำเร็จ: " + error.message); return; }
    toast.success("ลบสำเร็จ");
    setDeleteTarget(null);
    load();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                แนวทางสิทธิ์ตามบทบาท (Roles)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                คลิกเพื่อดูรายละเอียดของแต่ละบทบาท
              </p>
            </div>
            {isSuperAdmin && (
              <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> เพิ่มบทบาท
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((role) => (
            <Collapsible key={role.id} open={openKeys.includes(role.entry_key)} onOpenChange={() => toggle(role.entry_key)}>
              <div className={`flex items-center gap-2 rounded-lg border ${role.color || ""}`}>
                <CollapsibleTrigger className="flex-1">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <GuideIcon name={role.icon} className="h-5 w-5" />
                      <div className="text-left">
                        <span className="font-medium">{role.label}</span>
                        <p className="text-sm opacity-80">{role.description}</p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openKeys.includes(role.entry_key) ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                {isSuperAdmin && (
                  <div className="flex items-center gap-1 pr-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(role); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(role)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
              <CollapsibleContent>
                <div className="mt-2 ml-4 p-4 bg-muted/30 rounded-lg space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" /> สิทธิ์ที่ทำได้:
                    </h4>
                    <ul className="space-y-1">
                      {role.bullets.map((cap, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>{cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {role.related.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" /> หน้าที่เข้าถึงได้:
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {role.related.map((p, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded bg-background border">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-8">ยังไม่มีข้อมูลบทบาท</p>
          )}
        </CardContent>
      </Card>

      <GuideEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind="role"
        entry={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบบทบาท "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบนี้จะลบเฉพาะรายการในคู่มือ ไม่กระทบสิทธิ์จริงของผู้ใช้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
