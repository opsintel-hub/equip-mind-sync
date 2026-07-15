import { useEffect, useState } from "react";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface MediaSite {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
}

interface MediaSiteSelectProps {
  /** Stored value is the site name (string), matching suppliers.media_site_name */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MediaSiteSelect({
  value,
  onChange,
  disabled,
  placeholder = "เลือก Media Site",
}: MediaSiteSelectProps) {
  const [sites, setSites] = useState<MediaSite[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<MediaSite | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaSite | null>(null);
  const [formName, setFormName] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSites = async () => {
    const { data, error } = await (supabase as any)
      .from("media_sites")
      .select("id, name, notes, is_active")
      .eq("is_active", true)
      .order("name");
    if (error) {
      console.error(error);
      toast.error("โหลด Media Site ไม่สำเร็จ");
      return;
    }
    setSites((data || []) as MediaSite[]);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setFormName("");
    setFormNotes("");
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) {
      toast.error("กรุณากรอกชื่อ Media Site");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const oldName = editing.name;
        const { error } = await (supabase as any)
          .from("media_sites")
          .update({ name, notes: formNotes.trim() || null })
          .eq("id", editing.id);
        if (error) throw error;
        // Cascade rename to suppliers using the old name
        if (oldName !== name) {
          await supabase
            .from("suppliers")
            .update({ media_site_name: name })
            .eq("media_site_name", oldName);
          if (value === oldName) onChange(name);
        }
        toast.success("บันทึก Media Site สำเร็จ");
      } else {
        const { error } = await (supabase as any)
          .from("media_sites")
          .insert({ name, notes: formNotes.trim() || null });
        if (error) throw error;
        toast.success("เพิ่ม Media Site สำเร็จ");
        onChange(name);
      }
      resetForm();
      await fetchSites();
    } catch (error: any) {
      toast.error(error.message || "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (site: MediaSite) => {
    setEditing(site);
    setFormName(site.name);
    setFormNotes(site.notes || "");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("media_sites")
        .update({ is_active: false })
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("ลบ Media Site สำเร็จ");
      if (value === deleteTarget.name) onChange("");
      setDeleteTarget(null);
      await fetchSites();
    } catch (error: any) {
      toast.error(error.message || "ลบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const options = sites.map((s) => ({
    value: s.name,
    label: s.name,
    description: s.notes || undefined,
  }));

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={onChange}
          placeholder={placeholder}
          searchPlaceholder="ค้นหา Media Site..."
          emptyMessage="ไม่พบ Media Site — กดปุ่มจัดการเพื่อเพิ่ม"
          disabled={disabled}
        />
      </div>

      <Dialog open={manageOpen} onOpenChange={(o) => { setManageOpen(o); if (!o) resetForm(); }}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled} title="จัดการ Media Site">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการ Media Site Name</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">
                {editing ? "แก้ไข Media Site" : "เพิ่ม Media Site ใหม่"}
              </h3>
              <div className="space-y-2">
                <Label>ชื่อ Media Site *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น Metro Poster"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)"
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end gap-2">
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                    ยกเลิก
                  </Button>
                )}
                <Button type="button" onClick={handleSave} disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {editing ? "บันทึก" : "เพิ่ม"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">รายการ Media Site ({sites.length})</h3>
              <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                {sites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    ยังไม่มีข้อมูล
                  </div>
                ) : (
                  sites.map((site) => (
                    <div
                      key={site.id}
                      className="p-3 flex items-center justify-between hover:bg-accent gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{site.name}</div>
                        {site.notes && (
                          <div className="text-xs text-muted-foreground truncate">
                            {site.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(site)}
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(site)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Media Site</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ "{deleteTarget?.name}" ใช่หรือไม่?
              <br />
              ข้อมูลผู้จัดจำหน่ายที่อ้างชื่อนี้จะยังคงอยู่ แต่จะไม่มีตัวเลือกนี้ในรายการอีกต่อไป
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
