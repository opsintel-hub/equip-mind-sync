import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, Lock, Sparkles, ChevronDown, X, Loader2,
  Package, Truck, ShoppingCart, Send, MapPin, ImageIcon,
  ArrowLeftRight, Database, BarChart3, Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";
import { fetchPermissionPresets, applyPresetToUser, type PermissionPreset } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Database as DB } from "@/integrations/supabase/types";

type UserRole = DB["public"]["Enums"]["app_role"];

// ─── Function grouping ────────────────────────────────────────────────
const FUNCTION_GROUPS: { key: string; label: string; icon: any; fns: string[] }[] = [
  { key: "receive", label: "นำเข้า/รับ", icon: Truck, fns: ["delivery_entry", "goods_receipt", "delivery_confirm"] },
  { key: "issue", label: "เบิก-จ่าย", icon: ShoppingCart, fns: ["issue_request", "goods_issue", "manager_approval"] },
  { key: "direct", label: "ส่งตรง", icon: Send, fns: ["direct_shipping_request", "direct_shipping_approval", "direct_shipping_procurement"] },
  { key: "billboard", label: "ป้าย & PM", icon: MapPin, fns: ["billboards", "pm_schedule", "equipment_pm", "transfer"] },
  { key: "ad", label: "โฆษณา", icon: ImageIcon, fns: ["ad_entry", "ad_issue_request", "ad_warehouse"] },
  { key: "swap", label: "Swap/ประเมิน/เคลม", icon: ArrowLeftRight, fns: ["swap_request_create", "swap_request_manage", "assessment_create", "assessment_view", "claim_create", "claim_view"] },
  { key: "master", label: "Master Data", icon: Database, fns: ["master_data", "md_equipment", "md_tools", "md_categories", "md_warehouses", "md_locations", "md_suppliers", "md_contractors", "md_departments", "md_sections", "md_companies", "md_issue_purposes", "md_receipt_purposes", "md_technicians", "md_pm_action_types", "md_media_player"] },
  { key: "system", label: "รายงาน & ระบบ", icon: Shield, fns: ["reports", "admin"] },
];

interface UserRow {
  id: string;
  name: string;
  email?: string;
  roles: UserRole[];
  departments: string[];
  is_hidden?: boolean;
}

const FN_LABEL = new Map(SYSTEM_FUNCTIONS.map((f) => [f.name, f.label] as const));

export function PermissionMatrix() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  // Map<userId, Set<functionName>>
  const [grants, setGrants] = useState<Map<string, Set<string>>>(new Map());
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, rolesRes, fnRes, deptRes, allDeptRes, presetRows] = await Promise.all([
        supabase.from("profiles").select("id, full_name, display_name, is_hidden").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_function_permissions").select("user_id, function_name, can_access"),
        supabase.from("user_departments").select("user_id, department, can_view"),
        supabase.from("departments").select("name").eq("is_active", true).order("name"),
        fetchPermissionPresets(false),
      ]);

      const rolesByUser = new Map<string, UserRole[]>();
      (rolesRes.data || []).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) || [];
        arr.push(r.role as UserRole);
        rolesByUser.set(r.user_id, arr);
      });

      const deptsByUser = new Map<string, string[]>();
      (deptRes.data || []).forEach((r: any) => {
        if (!r.can_view) return;
        const arr = deptsByUser.get(r.user_id) || [];
        arr.push(r.department);
        deptsByUser.set(r.user_id, arr);
      });

      const grantMap = new Map<string, Set<string>>();
      (fnRes.data || []).forEach((r: any) => {
        if (!r.can_access) return;
        const s = grantMap.get(r.user_id) || new Set();
        s.add(r.function_name);
        grantMap.set(r.user_id, s);
      });

      const rows: UserRow[] = (profRes.data || [])
        .filter((p: any) => !p.is_hidden)
        .map((p: any) => ({
          id: p.id,
          name: p.display_name || p.full_name || "(ไม่มีชื่อ)",
          roles: rolesByUser.get(p.id) || [],
          departments: deptsByUser.get(p.id) || [],
          is_hidden: p.is_hidden,
        }));

      setUsers(rows);
      setGrants(grantMap);
      setAllDepartments((allDeptRes.data || []).map((d: any) => d.name));
      setPresets(presetRows);
    } catch (e: any) {
      console.error(e);
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Derived: filtered users ───
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && !u.roles.includes(roleFilter as UserRole)) return false;
      if (deptFilter !== "all" && !u.departments.includes(deptFilter)) return false;
      return true;
    });
  }, [users, search, roleFilter, deptFilter]);

  const visibleGroups = useMemo(
    () => FUNCTION_GROUPS.map((g) => ({ ...g, collapsed: collapsedGroups.has(g.key) })),
    [collapsedGroups]
  );

  const isSuperAdmin = (u: UserRow) => u.roles.includes("super_admin");

  // ─── Cell toggle (optimistic) ───
  const toggleCell = useCallback(async (userId: string, fn: string, next: boolean) => {
    setGrants((prev) => {
      const m = new Map(prev);
      const s = new Set(m.get(userId) || []);
      if (next) s.add(fn); else s.delete(fn);
      m.set(userId, s);
      return m;
    });
    try {
      if (next) {
        const { error } = await supabase
          .from("user_function_permissions")
          .upsert({ user_id: userId, function_name: fn, can_access: true }, { onConflict: "user_id,function_name" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_function_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("function_name", fn);
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + e.message);
      // rollback
      setGrants((prev) => {
        const m = new Map(prev);
        const s = new Set(m.get(userId) || []);
        if (next) s.delete(fn); else s.add(fn);
        m.set(userId, s);
        return m;
      });
    }
  }, []);

  // ─── Bulk operations on selected rows ───
  const bulkApply = useCallback(async (fnNames: string[], grant: boolean) => {
    const targets = filteredUsers.filter((u) => selectedRows.has(u.id) && !isSuperAdmin(u));
    if (targets.length === 0) return toast.error("ยังไม่ได้เลือกผู้ใช้");
    setSaving(true);
    try {
      if (grant) {
        const rows = targets.flatMap((u) =>
          fnNames.map((fn) => ({ user_id: u.id, function_name: fn, can_access: true }))
        );
        const { error } = await supabase
          .from("user_function_permissions")
          .upsert(rows, { onConflict: "user_id,function_name" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_function_permissions")
          .delete()
          .in("user_id", targets.map((t) => t.id))
          .in("function_name", fnNames);
        if (error) throw error;
      }
      // update local state
      setGrants((prev) => {
        const m = new Map(prev);
        targets.forEach((u) => {
          const s = new Set(m.get(u.id) || []);
          fnNames.forEach((fn) => { grant ? s.add(fn) : s.delete(fn); });
          m.set(u.id, s);
        });
        return m;
      });
      toast.success(`${grant ? "ให้" : "ถอน"}สิทธิ์ ${fnNames.length} เมนู × ${targets.length} คน`);
    } catch (e: any) {
      toast.error("ไม่สำเร็จ: " + e.message);
    } finally {
      setSaving(false);
    }
  }, [filteredUsers, selectedRows]);

  // ─── Column-header click: apply to ALL filtered users ───
  const columnAllState = useCallback((fn: string): boolean | "indeterminate" => {
    const eligible = filteredUsers.filter((u) => !isSuperAdmin(u));
    if (eligible.length === 0) return false;
    const on = eligible.filter((u) => grants.get(u.id)?.has(fn)).length;
    if (on === 0) return false;
    if (on === eligible.length) return true;
    return "indeterminate";
  }, [filteredUsers, grants]);

  const toggleColumn = useCallback(async (fn: string) => {
    const eligible = filteredUsers.filter((u) => !isSuperAdmin(u));
    if (eligible.length === 0) return;
    const anyOff = eligible.some((u) => !grants.get(u.id)?.has(fn));
    const grant = anyOff; // if anyone is off → grant to all; else revoke all
    setSaving(true);
    try {
      if (grant) {
        const rows = eligible.map((u) => ({ user_id: u.id, function_name: fn, can_access: true }));
        const { error } = await supabase
          .from("user_function_permissions")
          .upsert(rows, { onConflict: "user_id,function_name" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_function_permissions")
          .delete()
          .in("user_id", eligible.map((u) => u.id))
          .eq("function_name", fn);
        if (error) throw error;
      }
      setGrants((prev) => {
        const m = new Map(prev);
        eligible.forEach((u) => {
          const s = new Set(m.get(u.id) || []);
          grant ? s.add(fn) : s.delete(fn);
          m.set(u.id, s);
        });
        return m;
      });
      toast.success(`${grant ? "ให้" : "ถอน"}สิทธิ์ "${FN_LABEL.get(fn) || fn}" ${eligible.length} คน`);
    } catch (e: any) {
      toast.error("ไม่สำเร็จ: " + e.message);
    } finally {
      setSaving(false);
    }
  }, [filteredUsers, grants]);

  // ─── Group-header click: toggle all functions in group for selected rows ───
  const applyGroup = useCallback(async (groupKey: string, grant: boolean) => {
    const grp = FUNCTION_GROUPS.find((g) => g.key === groupKey);
    if (!grp) return;
    await bulkApply(grp.fns, grant);
  }, [bulkApply]);

  // ─── Preset apply ───
  const [presetPickerOpen, setPresetPickerOpen] = useState<{ userId?: string; bulk?: boolean } | null>(null);
  const [pickedPreset, setPickedPreset] = useState<string>("");
  const [pickedDepts, setPickedDepts] = useState<string[]>([]);

  const runPreset = async () => {
    const preset = presets.find((p) => p.template_key === pickedPreset);
    if (!preset) return toast.error("ยังไม่ได้เลือก Preset");
    const targets = presetPickerOpen?.bulk
      ? filteredUsers.filter((u) => selectedRows.has(u.id))
      : users.filter((u) => u.id === presetPickerOpen?.userId);
    if (targets.length === 0) return;
    setSaving(true);
    try {
      for (const u of targets) {
        await applyPresetToUser(u.id, preset, pickedDepts);
      }
      toast.success(`Apply "${preset.label}" → ${targets.length} คน`);
      setPresetPickerOpen(null);
      setPickedPreset("");
      setPickedDepts([]);
      await loadAll();
    } catch (e: any) {
      toast.error("Apply ไม่สำเร็จ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Selection helpers ───
  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const selectAllFiltered = () => {
    setSelectedRows(new Set(filteredUsers.filter((u) => !isSuperAdmin(u)).map((u) => u.id)));
  };
  const clearSelection = () => setSelectedRows(new Set());

  const uniqueRoles = useMemo(() => {
    const s = new Set<string>();
    users.forEach((u) => u.roles.forEach((r) => s.add(r)));
    return Array.from(s);
  }, [users]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center justify-center py-12 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลด Matrix สิทธิ์...
      </CardContent></Card>
    );
  }

  const selectedCount = selectedRows.size;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Matrix สิทธิ์ผู้ใช้
              </CardTitle>
              <CardDescription>
                ตารางรวม — ติ๊กช่องเพื่อเปิด/ปิดเมนู, คลิกหัวคอลัมน์ให้/ถอนสิทธิ์ทั้งคอลัมน์, เลือกหลายแถวเพื่อ Bulk edit
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="บทบาท" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">บทบาททั้งหมด</SelectItem>
                {uniqueRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="ฝ่าย" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ฝ่ายทั้งหมด</SelectItem>
                {allDepartments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto text-xs text-muted-foreground">
              {filteredUsers.length} คน · {selectedCount > 0 && <span className="text-primary font-medium">เลือก {selectedCount}</span>}
            </div>
          </div>

          {/* Group collapse chips */}
          <div className="flex flex-wrap gap-1 pt-2">
            {FUNCTION_GROUPS.map((g) => {
              const Icon = g.icon;
              const collapsed = collapsedGroups.has(g.key);
              return (
                <button
                  key={g.key}
                  onClick={() => setCollapsedGroups((prev) => {
                    const s = new Set(prev);
                    s.has(g.key) ? s.delete(g.key) : s.add(g.key);
                    return s;
                  })}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors",
                    collapsed ? "bg-muted text-muted-foreground border-border" : "bg-primary/5 border-primary/30 text-foreground"
                  )}
                  title={collapsed ? "แสดงกลุ่มนี้" : "ซ่อนกลุ่มนี้"}
                >
                  <Icon className="h-3 w-3" />
                  {g.label}
                  <span className="opacity-60">({g.fns.length})</span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        {/* Bulk toolbar */}
        {selectedCount > 0 && (
          <div className="mx-6 mb-2 p-2 rounded-lg bg-primary/5 border border-primary/30 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedCount} คน</Badge>
            <span className="text-xs text-muted-foreground">Bulk:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" disabled={saving}>
                  ให้/ถอนตามกลุ่ม <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="text-xs font-semibold text-muted-foreground mb-1 px-1">เลือกกลุ่มเมนู</div>
                {FUNCTION_GROUPS.map((g) => (
                  <div key={g.key} className="flex items-center justify-between gap-1 py-1 px-1 hover:bg-muted rounded">
                    <span className="text-sm truncate">{g.label}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-green-600" onClick={() => applyGroup(g.key, true)}>ให้</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => applyGroup(g.key, false)}>ถอน</Button>
                    </div>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => { setPresetPickerOpen({ bulk: true }); setPickedPreset(""); setPickedDepts([]); }}
            >
              <Sparkles className="h-3 w-3 mr-1" /> Apply Preset...
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}><X className="h-3 w-3 mr-1" />ล้างการเลือก</Button>
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh] border-t">
            <table className="text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-card">
                {/* Group header row */}
                <tr>
                  <th className="sticky left-0 z-30 bg-card border-b border-r p-1 min-w-[220px]">
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={selectedCount > 0 && selectedCount === filteredUsers.filter((u) => !isSuperAdmin(u)).length}
                        onCheckedChange={(v) => v ? selectAllFiltered() : clearSelection()}
                      />
                      <span className="text-xs font-medium">ผู้ใช้ / ฝ่าย</span>
                    </div>
                  </th>
                  {visibleGroups.map((g) => {
                    const Icon = g.icon;
                    if (g.collapsed) {
                      return (
                        <th key={g.key} className="border-b border-r p-1 bg-muted/40 min-w-[40px]">
                          <button
                            className="text-xs text-muted-foreground rotate-180 [writing-mode:vertical-rl] py-2 hover:text-foreground"
                            onClick={() => setCollapsedGroups((s) => { const n = new Set(s); n.delete(g.key); return n; })}
                          >
                            {g.label}
                          </button>
                        </th>
                      );
                    }
                    return (
                      <th key={g.key} colSpan={g.fns.length} className="border-b border-r p-1 bg-muted/40 text-center">
                        <div className="flex items-center justify-center gap-1 font-medium">
                          <Icon className="h-3 w-3" /> {g.label}
                        </div>
                      </th>
                    );
                  })}
                </tr>
                {/* Function name row */}
                <tr>
                  <th className="sticky left-0 z-30 bg-card border-b border-r p-1"></th>
                  {visibleGroups.map((g) => {
                    if (g.collapsed) return <th key={g.key} className="border-b border-r bg-muted/20"></th>;
                    return g.fns.map((fn) => {
                      const state = columnAllState(fn);
                      return (
                        <th key={fn} className="border-b p-1 align-bottom min-w-[36px] max-w-[36px]">
                          <div className="flex flex-col items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => toggleColumn(fn)}
                                  className="[writing-mode:vertical-rl] rotate-180 py-1 text-[10px] leading-tight max-h-[110px] truncate hover:text-primary"
                                >
                                  {FN_LABEL.get(fn) || fn}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="font-medium">{FN_LABEL.get(fn)}</div>
                                <div className="text-xs opacity-80">คลิกเพื่อ toggle ทั้งคอลัมน์</div>
                              </TooltipContent>
                            </Tooltip>
                            <Checkbox
                              checked={state === "indeterminate" ? "indeterminate" : state === true}
                              onCheckedChange={() => toggleColumn(fn)}
                              className="h-3.5 w-3.5"
                            />

                          </div>
                        </th>
                      );
                    });
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const locked = isSuperAdmin(u);
                  const userGrants = grants.get(u.id) || new Set<string>();
                  const isSelected = selectedRows.has(u.id);
                  return (
                    <tr key={u.id} className={cn("border-b hover:bg-muted/30", isSelected && "bg-primary/5")}>
                      <td className="sticky left-0 z-10 bg-card border-r p-2 min-w-[220px] max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            disabled={locked}
                            onCheckedChange={() => toggleRow(u.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 truncate">
                              <span className="font-medium text-xs truncate">{u.name}</span>
                              {locked && <Lock className="h-3 w-3 text-amber-600 shrink-0" />}
                            </div>
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {u.roles.map((r) => (
                                <Badge key={r} variant="outline" className="text-[9px] px-1 py-0 h-4">{r}</Badge>
                              ))}
                              {u.departments.slice(0, 2).map((d) => (
                                <Badge key={d} variant="secondary" className="text-[9px] px-1 py-0 h-4">{d}</Badge>
                              ))}
                              {u.departments.length > 2 && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">+{u.departments.length - 2}</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title="Apply Preset"
                            disabled={locked}
                            onClick={() => { setPresetPickerOpen({ userId: u.id }); setPickedPreset(""); setPickedDepts([]); }}
                          >
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      {visibleGroups.map((g) => {
                        if (g.collapsed) return <td key={g.key} className="border-r bg-muted/10"></td>;
                        return g.fns.map((fn) => (
                          <MatrixCell
                            key={fn}
                            checked={locked || userGrants.has(fn)}
                            locked={locked}
                            onToggle={(v) => toggleCell(u.id, fn, v)}
                          />
                        ));
                      })}
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={99} className="text-center text-muted-foreground py-8">ไม่พบผู้ใช้ตามตัวกรอง</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Preset picker */}
      {presetPickerOpen && (
        <Popover open onOpenChange={(o) => !o && setPresetPickerOpen(null)}>
          <PopoverTrigger asChild><span className="hidden" /></PopoverTrigger>
          <PopoverContent className="fixed inset-0 m-auto w-[90vw] max-w-md h-fit bg-card border rounded-lg p-4 shadow-xl z-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Apply Preset {presetPickerOpen.bulk ? `× ${selectedCount} คน` : ""}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setPresetPickerOpen(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div>
                <div className="text-xs mb-1 text-muted-foreground">เลือก Preset</div>
                <Select value={pickedPreset} onValueChange={setPickedPreset}>
                  <SelectTrigger><SelectValue placeholder="— เลือก —" /></SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.template_key} value={p.template_key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs mb-1 text-muted-foreground">ฝ่ายที่จะให้สิทธิ์ (เลือกได้หลายฝ่าย)</div>
                <div className="flex flex-wrap gap-1 max-h-40 overflow-auto p-2 border rounded">
                  {allDepartments.map((d) => {
                    const active = pickedDepts.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setPickedDepts((prev) => active ? prev.filter((x) => x !== d) : [...prev, d])}
                        className={cn(
                          "px-2 py-1 rounded text-xs border transition-colors",
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setPresetPickerOpen(null)}>ยกเลิก</Button>
                <Button onClick={runPreset} disabled={!pickedPreset || saving}>
                  {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  ใช้ Preset
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </TooltipProvider>
  );
}

interface CellProps {
  checked: boolean;
  locked: boolean;
  onToggle: (v: boolean) => void;
}
const MatrixCell = memo(function MatrixCell({ checked, locked, onToggle }: CellProps) {
  return (
    <td className="border-r p-0 text-center align-middle">
      <button
        disabled={locked}
        onClick={() => onToggle(!checked)}
        className={cn(
          "w-9 h-8 flex items-center justify-center transition-colors",
          locked ? "cursor-not-allowed" : "hover:bg-primary/10",
          checked && !locked && "bg-primary/15",
          locked && checked && "bg-muted/40"
        )}
      >
        {checked ? (
          <span className={cn("inline-block w-3.5 h-3.5 rounded-sm", locked ? "bg-muted-foreground" : "bg-primary")} />
        ) : (
          <span className="inline-block w-3.5 h-3.5 rounded-sm border border-border" />
        )}
      </button>
    </td>
  );
});
