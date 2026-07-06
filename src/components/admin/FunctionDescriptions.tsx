import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings2, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { GuideEntryDialog, GuideEntry } from "./GuideEntryDialog";
import { GuideIcon } from "./guideEntryIcons";

export function FunctionDescriptions() {
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
      .eq("kind", "function")
      .order("display_order");
    if (error) { toast.error("โหลดข้อมูลไม่สำเร็จ"); return; }
    setEntries((data || []) as GuideEntry[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (k: string) =>
    setOpenKeys((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const { error } = await (supabase as any)
      .from("admin_guide_entries").delete().eq("id", deleteTarget.id);
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
                <Settings2 className="h-5 w-5 text-primary" />
                แนวทางสิทธิ์ตามฟังก์ชัน
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                คลิกดูรายละเอียดของแต่ละฟังก์ชัน
              </p>
            </div>
            {isSuperAdmin && (
              <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> เพิ่มฟังก์ชัน
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {entries.map((func) => (
            <Collapsible key={func.id} open={openKeys.includes(func.entry_key)} onOpenChange={() => toggle(func.entry_key)}>
              <div className={`flex items-center gap-1 rounded-lg border ${func.color || ""}`}>
                <CollapsibleTrigger className="flex-1">
                  <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <GuideIcon name={func.icon} className="h-5 w-5" />
                      <span className="font-medium text-sm">{func.label}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openKeys.includes(func.entry_key) ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                {isSuperAdmin && (
                  <div className="flex items-center gap-0.5 pr-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(func); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteTarget(func)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-3 text-sm">
                  <p className="text-muted-foreground">{func.description}</p>
                  <div>
                    <h4 className="font-medium mb-1">สิ่งที่ทำได้:</h4>
                    <ul className="space-y-1">
                      {func.bullets.map((detail, idx) => (
                        <li key={idx} className="text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>{detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {func.related.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">หน้าที่เข้าถึงได้:</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {func.related.map((p, i) => (
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
            <p className="text-sm text-center text-muted-foreground py-8 col-span-full">ยังไม่มีข้อมูลฟังก์ชัน</p>
          )}
        </CardContent>
      </Card>

      <GuideEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind="function"
        entry={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบฟังก์ชัน "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบนี้จะลบเฉพาะรายการในคู่มือ ไม่กระทบสิทธิ์การทำงานจริง
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
