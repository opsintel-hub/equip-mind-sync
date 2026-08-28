import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  ChevronRight,
  Trash2,
  Building2,
  Layers,
  ChevronsUpDown,
  ChevronsDownUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DepartmentForm } from "./DepartmentForm";
import { SectionForm } from "@/components/section/SectionForm";
import { SectionScopeDialog } from "@/components/section/SectionScopeDialog";


interface DepartmentData {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

interface SectionData {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  is_active: boolean | null;
}

interface Props {
  canManageDepartment: boolean;
  canManageSection: boolean;
}

const STORAGE_KEY = "md:departments:expanded";

export function DepartmentSectionAccordion({ canManageDepartment, canManageSection }: Props) {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [deleteDept, setDeleteDept] = useState<DepartmentData | null>(null);
  const [deleteSec, setDeleteSec] = useState<SectionData | null>(null);

  const persistExpanded = (next: Set<string>) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // ignore
    }
  };

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    persistExpanded(next);
  };

  const load = async () => {
    setLoading(true);
    const [dRes, sRes] = await Promise.all([
      supabase
        .from("departments")
        .select("id, name, description, is_active")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("sections")
        .select("id, name, description, department_id, is_active")
        .eq("is_active", true)
        .order("name"),
    ]);
    if (dRes.error) toast.error(dRes.error.message);
    if (sRes.error) toast.error(sRes.error.message);
    setDepartments((dRes.data || []) as DepartmentData[]);
    setSections((sRes.data || []) as SectionData[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const secByDept = useMemo(() => {
    const map: Record<string, SectionData[]> = {};
    for (const s of sections) {
      const k = s.department_id || "__orphan__";
      (map[k] ||= []).push(s);
    }
    return map;
  }, [sections]);

  const filtered = useMemo(() => {
    if (!search.trim()) return { departments, autoExpand: new Set<string>() };
    const q = search.trim().toLowerCase();
    const autoExpand = new Set<string>();
    const matched = departments.filter((d) => {
      const dMatch =
        d.name.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q);
      const kids = secByDept[d.id] || [];
      const kidMatch = kids.some(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q),
      );
      if (kidMatch) autoExpand.add(d.id);
      return dMatch || kidMatch;
    });
    return { departments: matched, autoExpand };
  }, [departments, secByDept, search]);

  const filteredSecs = (deptId: string) => {
    const kids = secByDept[deptId] || [];
    if (!search.trim()) return kids;
    const q = search.trim().toLowerCase();
    const d = departments.find((x) => x.id === deptId);
    const dMatches =
      d &&
      (d.name.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q));
    if (dMatches) return kids;
    return kids.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  };

  const isOpen = (id: string) => expanded.has(id) || filtered.autoExpand.has(id);

  const expandAll = () =>
    persistExpanded(new Set(filtered.departments.map((d) => d.id)));
  const collapseAll = () => persistExpanded(new Set());

  const confirmDeleteDept = async () => {
    if (!deleteDept) return;
    const kidCount = (secByDept[deleteDept.id] || []).length;
    if (kidCount > 0) {
      toast.error(
        `ไม่สามารถลบได้ — ฝ่ายนี้ยังมี ${kidCount} แผนก กรุณาย้าย/ลบแผนกก่อน`,
      );
      setDeleteDept(null);
      return;
    }
    const { error } = await supabase
      .from("departments")
      .update({ is_active: false })
      .eq("id", deleteDept.id);
    if (error) return toast.error(error.message);
    toast.success("ลบฝ่ายสำเร็จ");
    setDeleteDept(null);
    load();
  };

  const confirmDeleteSec = async () => {
    if (!deleteSec) return;
    const { error } = await supabase
      .from("sections")
      .update({ is_active: false })
      .eq("id", deleteSec.id);
    if (error) return toast.error(error.message);
    toast.success("ลบแผนกสำเร็จ");
    setDeleteSec(null);
    load();
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา ชื่อฝ่าย / ชื่อแผนก / รายละเอียด"
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-1.5" />
            ขยายทั้งหมด
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4 mr-1.5" />
            ยุบทั้งหมด
          </Button>
          {canManageDepartment && <DepartmentForm onSuccess={load} />}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">กำลังโหลด...</div>
      ) : filtered.departments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          {search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีข้อมูลฝ่าย"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.departments.map((d) => {
            const open = isOpen(d.id);
            const kids = filteredSecs(d.id);

            return (
              <div key={d.id} className="border rounded-lg bg-card overflow-hidden">
                {/* Department header */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer",
                    open && "bg-muted/30 border-b",
                  )}
                  onClick={() => toggle(d.id)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-90",
                    )}
                  />
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium shrink-0">{d.name}</span>
                  {d.description && (
                    <>
                      <span className="text-muted-foreground shrink-0">·</span>
                      <span className="truncate flex-1 text-sm text-muted-foreground">
                        {d.description}
                      </span>
                    </>
                  )}
                  {!d.description && <span className="flex-1" />}
                  <Badge variant="secondary" className="shrink-0">
                    {kids.length} แผนก
                  </Badge>
                  <div
                    className="flex gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canManageDepartment && (
                      <>
                        <DepartmentForm editData={d as any} onSuccess={load} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteDept(d)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Sections */}
                {open && (
                  <div className="pl-6 pr-2 py-2 space-y-1">
                    {kids.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic px-3 py-2">
                        ยังไม่มีแผนกในฝ่ายนี้
                      </div>
                    ) : (
                      kids.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border"
                        >
                          <span className="text-muted-foreground text-xs">└─</span>
                          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium shrink-0 text-sm">{s.name}</span>
                          {s.description && (
                            <>
                              <span className="text-muted-foreground shrink-0">·</span>
                              <span className="truncate flex-1 text-xs text-muted-foreground">
                                {s.description}
                              </span>
                            </>
                          )}
                          {!s.description && <span className="flex-1" />}
                          {canManageSection && (
                            <div className="flex gap-0.5 shrink-0">
                              <SectionScopeDialog sectionId={s.id} sectionName={s.name} />

                              <SectionForm
                                editData={{
                                  id: s.id,
                                  department_id: s.department_id,
                                  name: s.name,
                                  description: s.description,
                                }}
                                onSuccess={load}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setDeleteSec(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {canManageSection && (
                      <div className="pl-6 pt-1">
                        <SectionForm
                          defaultDepartmentId={d.id}
                          onSuccess={load}
                          triggerLabel="เพิ่มแผนกในฝ่ายนี้"
                          triggerVariant="ghost"
                          triggerClassName="text-primary hover:text-primary h-8 px-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteDept} onOpenChange={(o) => !o && setDeleteDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบฝ่าย</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบฝ่าย "{deleteDept?.name}" ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDept}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSec} onOpenChange={(o) => !o && setDeleteSec(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบแผนก</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบแผนก "{deleteSec?.name}" ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSec}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
