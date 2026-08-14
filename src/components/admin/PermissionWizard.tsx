import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Package,
  ShoppingCart,
  ShieldCheck,
  Wrench,
  Building2,
  Eye,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { RoleDescriptions } from "@/components/admin/RoleDescriptions";
import { FunctionDescriptions } from "@/components/admin/FunctionDescriptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type UserRole = Database["public"]["Enums"]["app_role"];

interface PermissionTemplate {
  id: string;
  template_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  suggested_roles: UserRole[];
  suggested_functions: string[];
  default_dept_can_view: boolean;
  default_dept_can_create: boolean;
  default_dept_can_edit: boolean;
  default_dept_can_delete: boolean;
  display_order: number;
}

interface UserLite {
  id: string;
  full_name: string;
  email?: string;
  display_name?: string | null;
  phone?: string | null;
  department?: string | null;
  requested_job_role?: string | null;
  requested_department?: string | null;
}

interface PermissionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserLite | null;
  onSaved: () => void;
}

const ICON_MAP: Record<string, any> = {
  Package,
  ShoppingCart,
  ShieldCheck,
  Wrench,
};

export function PermissionWizard({ open, onOpenChange, user, onSaved }: PermissionWizardProps) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Profile fields (unified edit — no more separate profile dialog)
  const [pfFullName, setPfFullName] = useState("");
  const [pfDisplayName, setPfDisplayName] = useState("");
  const [pfPhone, setPfPhone] = useState("");
  const [pfDepartment, setPfDepartment] = useState<string>("");

  // Selections
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  // Computed (editable) preview
  const [previewRoles, setPreviewRoles] = useState<UserRole[]>([]);
  const [previewFunctions, setPreviewFunctions] = useState<string[]>([]);
  const [deptPerm, setDeptPerm] = useState<{ view: boolean; create: boolean; edit: boolean; delete: boolean }>({
    view: true,
    create: false,
    edit: false,
    delete: false,
  });

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      // Profile prefill
      setPfFullName(user?.full_name || "");
      setPfDisplayName(user?.display_name || "");
      setPfPhone(user?.phone || "");
      setPfDepartment(user?.department || user?.requested_department || "");
      // Pre-select user's requested job role and department (if any)
      setSelectedTemplateKeys(user?.requested_job_role ? [user.requested_job_role] : []);
      setSelectedDepartments(user?.requested_department ? [user.requested_department] : []);
      setPreviewRoles([]);
      setPreviewFunctions([]);
      setDeptPerm({ view: true, create: false, edit: false, delete: false });
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplRes, deptRes, userDeptRes] = await Promise.all([
        (supabase as any)
          .from("permission_templates")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase.from("departments").select("name").eq("is_active", true).order("name"),
        user?.id
          ? supabase.from("user_departments").select("*").eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (tplRes.error) throw tplRes.error;
      setTemplates((tplRes.data || []) as PermissionTemplate[]);
      setDepartments((deptRes.data || []).map((d: any) => d.name));

      // Prefill existing department access (supports users assigned to multiple departments)
      const existing = (userDeptRes as any)?.data || [];
      if (existing.length > 0) {
        setSelectedDepartments(existing.map((r: any) => r.department));
        setDeptPerm({
          view: existing.some((r: any) => r.can_view),
          create: existing.some((r: any) => r.can_create),
          edit: existing.some((r: any) => r.can_edit),
          delete: existing.some((r: any) => r.can_delete),
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("โหลดข้อมูลเทมเพลตไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // Recompute preview when templates selected
  const computePreview = () => {
    const chosen = templates.filter((t) => selectedTemplateKeys.includes(t.template_key));
    if (chosen.length === 0) return;

    const roleSet = new Set<UserRole>();
    const funcSet = new Set<string>();
    let view = false, create = false, edit = false, del = false;
    chosen.forEach((t) => {
      t.suggested_roles.forEach((r) => roleSet.add(r));
      t.suggested_functions.forEach((f) => funcSet.add(f));
      view = view || t.default_dept_can_view;
      create = create || t.default_dept_can_create;
      edit = edit || t.default_dept_can_edit;
      del = del || t.default_dept_can_delete;
    });
    setPreviewRoles(Array.from(roleSet));
    setPreviewFunctions(Array.from(funcSet));
    setDeptPerm({ view, create, edit, delete: del });
  };

  const toggleTemplate = (key: string) => {
    setSelectedTemplateKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleDept = (name: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  };

  const togglePreviewFunction = (fn: string) => {
    setPreviewFunctions((prev) =>
      prev.includes(fn) ? prev.filter((f) => f !== fn) : [...prev, fn]
    );
  };

  const togglePreviewRole = (r: UserRole) => {
    const isRemoving = previewRoles.includes(r);
    const newRoles = isRemoving ? previewRoles.filter((x) => x !== r) : [...previewRoles, r];

    // All functions declared by any template (auto-managed set)
    const allTemplateFns = new Set<string>();
    templates.forEach((t) => t.suggested_functions.forEach((f) => allTemplateFns.add(f)));

    // Functions that should be granted based on new roles set
    const grantedByRoles = new Set<string>();
    templates.forEach((t) => {
      if (t.suggested_roles.some((sr) => newRoles.includes(sr))) {
        t.suggested_functions.forEach((f) => grantedByRoles.add(f));
      }
    });

    // Preserve any manually-added function that is NOT in the auto-managed set
    const nextFns = new Set<string>(grantedByRoles);
    previewFunctions.forEach((f) => {
      if (!allTemplateFns.has(f)) nextFns.add(f);
    });

    setPreviewRoles(newRoles);
    setPreviewFunctions(Array.from(nextFns));
  };

  const goNext = () => {
    if (step === 1) {
      if (selectedTemplateKeys.length === 0) {
        toast.error("กรุณาเลือกตำแหน่งงานอย่างน้อย 1 ตำแหน่ง");
        return;
      }
    }
    if (step === 2) {
      if (selectedDepartments.length === 0) {
        toast.error("กรุณาเลือกฝ่ายอย่างน้อย 1 ฝ่าย");
        return;
      }
      computePreview();
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSave = async () => {
    if (!user) return;
    if (!pfFullName.trim()) {
      toast.error("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    setSaving(true);
    try {
      // 0. Profile
      const { error: pfErr } = await supabase
        .from("profiles")
        .update({
          full_name: pfFullName.trim(),
          display_name: pfDisplayName.trim() || null,
          phone: pfPhone.trim() || null,
          department: pfDepartment || null,
        } as any)
        .eq("id", user.id);
      if (pfErr) throw pfErr;

      // 1. Roles via RPC
      const { error: roleErr } = await supabase.rpc("save_user_roles" as any, {
        _target_user_id: user.id,
        _roles: previewRoles,
      });
      if (roleErr) throw roleErr;

      // 2. Function permissions: replace
      await supabase.from("user_function_permissions").delete().eq("user_id", user.id);
      if (previewFunctions.length > 0) {
        const { error: fErr } = await supabase.from("user_function_permissions").insert(
          previewFunctions.map((fn) => ({
            user_id: user.id,
            function_name: fn,
            can_access: true,
          }))
        );
        if (fErr) throw fErr;
      }

      // 3. Department permissions: replace
      await supabase.from("user_departments").delete().eq("user_id", user.id);
      const isAdminLike = previewRoles.includes("admin") || previewRoles.includes("super_admin");
      const deptRows = selectedDepartments.map((d) => ({
        user_id: user.id,
        department: d,
        can_view: deptPerm.view,
        can_create: deptPerm.create,
        can_edit: deptPerm.edit,
        can_delete: isAdminLike ? deptPerm.delete : false,
      }));
      if (deptRows.length > 0) {
        const { error: dErr } = await supabase.from("user_departments").insert(deptRows);
        if (dErr) throw dErr;
      }

      toast.success("ตั้งค่าสิทธิ์อัตโนมัติสำเร็จ");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const stepTitle = useMemo(() => {
    if (step === 1) return "ขั้นที่ 1: เลือกตำแหน่งงาน/หน้าที่";
    if (step === 2) return "ขั้นที่ 2: เลือกฝ่ายที่รับผิดชอบ";
    return "ขั้นที่ 3: ตรวจสอบและบันทึก";
  }, [step]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  แก้ไขผู้ใช้ + ตั้งสิทธิ์ (Wizard)
                </DialogTitle>
                <DialogDescription>
                  {user ? <>สำหรับ <strong>{user.full_name}</strong> {user.email && <span className="text-muted-foreground">({user.email})</span>}</> : null}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHelpOpen(true)}
                className="flex-shrink-0 gap-1"
              >
                <HelpCircle className="h-4 w-4" />
                ดูคำอธิบาย
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 flex-1 min-h-0 overflow-y-auto space-y-3">

        {/* Profile section — unified with Wizard, no separate profile dialog */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Pencil className="h-4 w-4 text-primary" />
            ข้อมูลโปรไฟล์
            <span className="text-xs text-muted-foreground font-normal">(แก้ไขได้ในหน้าเดียวกัน)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pf-full-name" className="text-xs">ชื่อ-นามสกุล *</Label>
              <Input id="pf-full-name" value={pfFullName} onChange={(e) => setPfFullName(e.target.value)} disabled={saving} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-display" className="text-xs">ชื่อที่แสดงในระบบ</Label>
              <Input id="pf-display" value={pfDisplayName} onChange={(e) => setPfDisplayName(e.target.value)} placeholder="เช่น Boy, Aey" disabled={saving} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-phone" className="text-xs">เบอร์โทรศัพท์</Label>
              <Input id="pf-phone" value={pfPhone} onChange={(e) => setPfPhone(e.target.value)} placeholder="08-XXXX-XXXX" disabled={saving} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-dept" className="text-xs flex items-center gap-1">
                ฝ่ายสังกัดหลัก
                <span className="text-[10px] text-muted-foreground font-normal">(แสดงในโปรไฟล์)</span>
              </Label>
              <Select
                value={pfDepartment || "__none__"}
                onValueChange={(v) => setPfDepartment(v === "__none__" ? "" : v)}
                disabled={saving}
              >
                <SelectTrigger id="pf-dept" className="h-9">
                  <SelectValue placeholder="เลือกฝ่าย..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— ไม่ระบุ —</SelectItem>
                  {(pfDepartment && !departments.includes(pfDepartment)) && (
                    <SelectItem value={pfDepartment}>{pfDepartment} (ปัจจุบัน)</SelectItem>
                  )}
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ⚠️ <strong>ฝ่ายสังกัดหลัก</strong> คือฝ่ายที่ผู้ใช้อยู่ (แสดงในโปรไฟล์เท่านั้น) — ไม่ใช่สิทธิ์เห็นข้อมูล · สิทธิ์เห็นข้อมูลฝ่ายจะกำหนดในขั้นที่ 2 ด้านล่าง
          </p>
        </div>


        {/* Stepper */}
        <div className="flex items-center justify-between px-1 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                  step === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : step > s
                    ? "bg-primary/10 text-primary border-primary"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2",
                    step > s ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm font-medium text-foreground px-1">{stepTitle}</div>

        <Separator />

        <div className="py-2">
          {loading && <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>}

          {/* Step 1: Templates */}
          {!loading && step === 1 && (
            <div className="space-y-3 py-2">
              {user?.requested_job_role && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-blue-800 dark:text-blue-200">
                    ผู้ใช้ขอตำแหน่ง <strong>{templates.find(t => t.template_key === user.requested_job_role)?.label || user.requested_job_role}</strong> ตอนสมัคร — ระบบเลือกให้แล้ว คุณสามารถปรับเปลี่ยนได้
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                เลือกตำแหน่ง/หน้าที่ของผู้ใช้ (เลือกได้หลายข้อ) ระบบจะคำนวณบทบาทและสิทธิ์ที่เหมาะสมให้อัตโนมัติ
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((t) => {
                  const Icon = ICON_MAP[t.icon || "Package"] || Package;
                  const checked = selectedTemplateKeys.includes(t.template_key);
                  return (
                    <Card
                      key={t.id}
                      onClick={() => toggleTemplate(t.template_key)}
                      className={cn(
                        "cursor-pointer transition-all border-2 hover:shadow-md",
                        checked ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <CardContent className="p-4 flex gap-3 items-start">
                        <div className={cn(
                          "p-2 rounded-lg",
                          checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm">{t.label}</h4>
                            <Checkbox checked={checked} className="pointer-events-none" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {t.suggested_functions.length} ฟังก์ชัน
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Departments */}
          {!loading && step === 2 && (
            <div className="space-y-3 py-2">
              {user?.requested_department && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-blue-800 dark:text-blue-200">
                    ผู้ใช้ขอสังกัดฝ่าย <strong>{user.requested_department}</strong> — ระบบเลือกให้แล้ว
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                เลือกฝ่ายที่ผู้ใช้นี้ดูแล/เข้าถึงข้อมูลได้
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {departments.map((d) => {
                  const checked = selectedDepartments.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all",
                        checked
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Building2 className={cn("h-4 w-4", checked ? "text-primary" : "text-muted-foreground")} />
                      <span className="truncate flex-1">{d}</span>
                      {checked && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              {departments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีข้อมูลฝ่าย</p>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {!loading && step === 3 && (
            <div className="space-y-4 py-2">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-blue-800 dark:text-blue-200">
                  ระบบคำนวณสิทธิ์ตามตำแหน่งที่เลือกแล้ว Super Admin สามารถแก้ไขข้อมูลก่อนกดบันทึกได้
                </div>
              </div>

              {/* Roles */}
              <div>
                <Label className="text-sm font-semibold">บทบาท (Roles)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(["super_admin", "admin", "manager", "warehouse_staff", "receiver", "requester"] as UserRole[]).map((r) => {
                    const active = previewRoles.includes(r);
                    return (
                      <Badge
                        key={r}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePreviewRole(r)}
                      >
                        {active && <Check className="h-3 w-3 mr-1" />}
                        {r}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Functions */}
              <div>
                <Label className="text-sm font-semibold">
                  สิทธิ์ฟังก์ชัน ({previewFunctions.length}/{SYSTEM_FUNCTIONS.length})
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {SYSTEM_FUNCTIONS.map((fn) => {
                    const active = previewFunctions.includes(fn.name);
                    return (
                      <label
                        key={fn.name}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors",
                          active ? "bg-primary/5 border-primary/40" : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={active}
                          onCheckedChange={() => togglePreviewFunction(fn.name)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{fn.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{fn.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Department perms */}
              <div>
                <Label className="text-sm font-semibold">
                  สิทธิ์ในฝ่ายที่เลือก ({selectedDepartments.length} ฝ่าย)
                </Label>
                <div className="flex flex-wrap gap-1 my-2">
                  {selectedDepartments.map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[
                    { key: "view", label: "ดู", icon: Eye },
                    { key: "create", label: "สร้าง", icon: Plus },
                    { key: "edit", label: "แก้ไข", icon: Pencil },
                    { key: "delete", label: "ลบ", icon: Trash2 },
                  ].map((p) => {
                    const Icon = p.icon;
                    const active = (deptPerm as any)[p.key];
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setDeptPerm((prev) => ({ ...prev, [p.key]: !(prev as any)[p.key] }))}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md border-2 text-sm",
                          active ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * สิทธิ์ "ลบ" จะถูกบันทึกเฉพาะกรณีผู้ใช้มีบทบาท Admin/Super Admin
                </p>
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t flex-shrink-0 flex items-center justify-between gap-2 bg-background">
          <Button variant="outline" onClick={goBack} disabled={step === 1 || saving}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            ย้อนกลับ
          </Button>
          {step < 3 ? (
            <Button onClick={goNext} disabled={loading}>
              ถัดไป
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              {saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
            </Button>
          )}
        </div>

        {/* Nested Help dialog — Role & Function descriptions */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                คู่มือและแนวทางสิทธิ์
              </DialogTitle>
              <DialogDescription>
                อ้างอิงบทบาท (Roles) และฟังก์ชันของระบบ — ปิดหน้านี้เพื่อกลับไปตั้งค่า Wizard
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 lg:grid-cols-2">
              <RoleDescriptions />
              <FunctionDescriptions />
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
