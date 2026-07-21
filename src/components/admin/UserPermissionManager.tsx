import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { Separator } from "@/components/ui/separator";
import {
  Search,
  UserCog,
  Shield,
  Settings2,
  KeyRound,
  Building2,
  Check,
  X,
  Info,
  Lock,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";
import { PermissionWizard } from "./PermissionWizard";
import { QuickPresetSelector } from "./QuickPresetSelector";
import {
  fetchPermissionPresets,
  detectCurrentPresetKey,
  type PermissionPreset,
} from "@/lib/permissions";
import type { Database } from "@/integrations/supabase/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UserRole = Database["public"]["Enums"]["app_role"];

// DEPARTMENTS removed - now fetched dynamically from DB

const ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: "super_admin", label: "Super Admin", description: "สิทธิ์สูงสุด จัดการข้อมูลหลักทั้งหมดรวมถึงอุปกรณ์ คลัง ตำแหน่ง", color: "bg-amber-600" },
  { value: "admin", label: "Admin", description: "จัดการระบบ ยกเว้นข้อมูลหลักบางส่วน (อุปกรณ์/คลัง/ตำแหน่ง)", color: "bg-red-500" },
  { value: "manager", label: "Manager", description: "อนุมัติเบิกทรัพย์สิน (เฉพาะฝ่ายที่รับผิดชอบ)", color: "bg-purple-500" },
  { value: "warehouse_staff", label: "เจ้าหน้าที่คลัง", description: "รับเข้า-จ่ายสินค้า", color: "bg-blue-500" },
  { value: "receiver", label: "ผู้รับเข้า", description: "รับสินค้าเข้าคลัง", color: "bg-green-500" },
  { value: "requester", label: "ผู้เบิก", description: "ขอเบิกสินค้า", color: "bg-orange-500" },
];

interface User {
  id: string;
  full_name: string;
  display_name?: string | null;
  phone: string | null;
  email?: string;
  department?: string | null;
  requested_job_role?: string | null;
  requested_department?: string | null;
  is_hidden?: boolean | null;
}

interface UserPermission {
  user_id: string;
  department: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface FunctionPermission {
  function_name: string;
  can_access: boolean;
}

export function UserPermissionManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [templateLabels, setTemplateLabels] = useState<Record<string, string>>({});
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({});
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [userFunctionPermissions, setUserFunctionPermissions] = useState<FunctionPermission[]>([]);
  // For quick preset auto-detect & default departments
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [userFunctionsByUser, setUserFunctionsByUser] = useState<Record<string, string[]>>({});
  const [userDeptsByUser, setUserDeptsByUser] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("roles");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardUser, setWizardUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);
  const [editSelectedPresets, setEditSelectedPresets] = useState<string[]>([]);
  const [editDeptAccess, setEditDeptAccess] = useState<string[]>([]);
  const [allPresets, setAllPresets] = useState<PermissionPreset[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    fetchUsers();
    // Load ALL presets (not just quick) for the edit-user multi-select
    fetchPermissionPresets(false).then(setAllPresets).catch(() => setAllPresets([]));
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.display_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      ));
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      const [profilesRes, deptRes, templateRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("is_hidden", false).order("full_name"),
        supabase.from("departments").select("name").eq("is_active", true).order("name"),
        (supabase as any).from("permission_templates").select("template_key, label").eq("is_active", true),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const departments = (deptRes.data || []).map(d => d.name);
      setAllDepartments(departments);
      setTemplateLabels(
        ((templateRes.data || []) as { template_key: string; label: string }[]).reduce((acc, template) => {
          acc[template.template_key] = template.label;
          return acc;
        }, {} as Record<string, string>)
      );
      
      let emailMap: Record<string, string> = {};
      try {
        const { data: usersData } = await supabase.rpc('get_users_emails' as any);
        if (usersData && Array.isArray(usersData)) {
          (usersData as { id: string; email: string }[]).forEach((u) => {
            emailMap[u.id] = u.email;
          });
        }
      } catch (e) {
        console.log("Could not fetch emails via RPC");
      }
      
      const usersWithEmail = (profilesRes.data || []).map(p => ({
        ...p,
        email: emailMap[p.id] || ''
      }));
      
      setUsers(usersWithEmail);
      setFilteredUsers(usersWithEmail);
      await Promise.all([
        fetchAllUserRoles(),
        fetchAllPresetsAndUserScopes(usersWithEmail.map((u) => u.id)),
      ]);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPresetsAndUserScopes = async (userIds: string[]) => {
    try {
      const [presetRows, fnRes, deptRes] = await Promise.all([
        fetchPermissionPresets(true),
        supabase
          .from("user_function_permissions")
          .select("user_id, function_name, can_access")
          .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase
          .from("user_departments")
          .select("user_id, department, can_view")
          .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      setPresets(presetRows);
      const fnMap: Record<string, string[]> = {};
      (fnRes.data || []).forEach((r: any) => {
        if (!r.can_access) return;
        (fnMap[r.user_id] ||= []).push(r.function_name);
      });
      setUserFunctionsByUser(fnMap);
      const deptMap: Record<string, string[]> = {};
      (deptRes.data || []).forEach((r: any) => {
        if (!r.can_view) return;
        (deptMap[r.user_id] ||= []).push(r.department);
      });
      setUserDeptsByUser(deptMap);
    } catch (e) {
      console.error("Error loading presets/scopes:", e);
    }
  };

  const fetchAllUserRoles = async () => {
    try {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;

      const rolesByUser: Record<string, UserRole[]> = {};
      data?.forEach((roleData) => {
        if (!rolesByUser[roleData.user_id]) {
          rolesByUser[roleData.user_id] = [];
        }
        rolesByUser[roleData.user_id].push(roleData.role);
      });

      setUserRoles(rolesByUser);
    } catch (error: any) {
      console.error("Error fetching user roles:", error);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const [permRes, deptRes] = await Promise.all([
        supabase.from("user_departments").select("*").eq("user_id", userId),
        supabase.from("departments").select("name").eq("is_active", true).order("name"),
      ]);

      if (permRes.error) throw permRes.error;

      const departments = (deptRes.data || []).map(d => d.name);
      setAllDepartments(departments);

      const fullPermissions = departments.map(dept => {
        const existing = permRes.data?.find(p => p.department === dept);
        return existing || {
          user_id: userId,
          department: dept,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false
        };
      });

      setUserPermissions(fullPermissions);
    } catch (error: any) {
      console.error("Error fetching permissions:", error);
    }
  };

  const fetchUserFunctionPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_function_permissions")
        .select("function_name, can_access")
        .eq("user_id", userId);

      if (error) throw error;

      const fullPermissions = SYSTEM_FUNCTIONS.map(func => {
        const existing = data?.find(p => p.function_name === func.name);
        return existing || { function_name: func.name, can_access: false };
      });

      setUserFunctionPermissions(fullPermissions);
    } catch (error: any) {
      console.error("Error fetching function permissions:", error);
    }
  };

  const handleOpenDialog = async (user: User) => {
    setSelectedUser(user);
    setSelectedUserRoles(userRoles[user.id] || []);
    await Promise.all([
      fetchUserPermissions(user.id),
      fetchUserFunctionPermissions(user.id)
    ]);
    setActiveTab("roles");
    setDialogOpen(true);
  };

  const toggleRole = (role: UserRole) => {
    setSelectedUserRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handlePermissionChange = (department: string, permission: keyof Omit<UserPermission, 'user_id' | 'department'>, value: boolean) => {
    setUserPermissions(prev => 
      prev.map(p => 
        p.department === department 
          ? { ...p, [permission]: value }
          : p
      )
    );
  };

  const handleFunctionPermissionChange = (functionName: string, value: boolean) => {
    setUserFunctionPermissions(prev => 
      prev.map(p => 
        p.function_name === functionName 
          ? { ...p, can_access: value }
          : p
      )
    );
  };

  const handleSaveAll = async () => {
    if (!selectedUser) return;

    try {
      // Save roles using atomic RPC to prevent self-locking
      const { error: roleError } = await supabase.rpc('save_user_roles' as any, {
        _target_user_id: selectedUser.id,
        _roles: selectedUserRoles
      });
      if (roleError) throw roleError;

      // Save function permissions
      await supabase.from("user_function_permissions").delete().eq("user_id", selectedUser.id);
      const funcPermsToInsert = userFunctionPermissions
        .filter(p => p.can_access)
        .map(p => ({
          user_id: selectedUser.id,
          function_name: p.function_name,
          can_access: true
        }));
      if (funcPermsToInsert.length > 0) {
        const { error: funcError } = await supabase.from("user_function_permissions").insert(funcPermsToInsert);
        if (funcError) throw funcError;
      }

      // Save department permissions - force can_delete = false for non-admin
      await supabase.from("user_departments").delete().eq("user_id", selectedUser.id);
      const isUserAdmin = selectedUserRoles.includes('admin') || selectedUserRoles.includes('super_admin');
      const deptPermsToInsert = userPermissions
        .map(p => ({
          ...p,
          can_delete: isUserAdmin ? p.can_delete : false,
        }))
        .filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete);
      if (deptPermsToInsert.length > 0) {
        const { error: deptError } = await supabase.from("user_departments").insert(deptPermsToInsert);
        if (deptError) throw deptError;
      }

      toast.success("บันทึกสิทธิ์ทั้งหมดสำเร็จ");
      setDialogOpen(false);
      await fetchAllUserRoles();
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleOpenResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error("กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { userId: selectedUser.id, newPassword: newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("รีเซ็ตรหัสผ่านสำเร็จ");
      setResetPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const isAdmin = (userId: string) => userRoles[userId]?.includes('admin') || userRoles[userId]?.includes('super_admin');

  const hasNoRoles = (userId: string) => !userRoles[userId] || userRoles[userId].length === 0;

  const pendingUsers = useMemo(() => users.filter((user) => hasNoRoles(user.id)), [users, userRoles]);

  const getRequestedJobRoleLabel = (templateKey?: string | null) => {
    if (!templateKey) return "-";
    return templateLabels[templateKey] || templateKey;
  };

  const handleOpenWizard = (user: User) => {
    setWizardUser(user);
    setWizardOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || "");
    setEditDisplayName(user.display_name || "");
    setEditPhone(user.phone || "");
    setEditDepartment(user.department || user.requested_department || "");
    // Pre-select preset: detected from current roles/functions, else requested_job_role
    const uRoles = userRoles[user.id] || [];
    const uFns = userFunctionsByUser[user.id] || [];
    const detected = detectCurrentPresetKey(allPresets, uRoles, uFns);
    if (detected) {
      setEditSelectedPresets([detected]);
    } else if (user.requested_job_role) {
      setEditSelectedPresets([user.requested_job_role]);
    } else {
      setEditSelectedPresets([]);
    }
    // Prefill data-access departments from user_departments (multi-select)
    setEditDeptAccess(userDeptsByUser[user.id] || []);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    if (!editFullName.trim()) {
      toast.error("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          display_name: editDisplayName.trim() || null,
          phone: editPhone.trim() || null,
          department: editDepartment || null,
        } as any)
        .eq("id", selectedUser.id);
      if (error) throw error;

      // Apply selected presets (roles + function permissions) as a merged union
      if (editSelectedPresets.length > 0) {
        const chosen = allPresets.filter((p) => editSelectedPresets.includes(p.template_key));
        const roleUnion = Array.from(new Set(chosen.flatMap((p) => p.suggested_roles)));
        const fnUnion = Array.from(new Set(chosen.flatMap((p) => p.suggested_functions)));

        const { error: roleErr } = await supabase.rpc("save_user_roles" as any, {
          _target_user_id: selectedUser.id,
          _roles: roleUnion,
        });
        if (roleErr) throw roleErr;

        const { error: delFnErr } = await supabase
          .from("user_function_permissions")
          .delete()
          .eq("user_id", selectedUser.id);
        if (delFnErr) throw delFnErr;

        if (fnUnion.length > 0) {
          const { error: insFnErr } = await supabase
            .from("user_function_permissions")
            .insert(fnUnion.map((fn) => ({
              user_id: selectedUser.id,
              function_name: fn,
              can_access: true,
            })));
          if (insFnErr) throw insFnErr;
        }

        // Department scope: ensure the chosen department exists with OR of preset defaults
        if (editDepartment) {
          const canView = chosen.some((p) => p.default_dept_can_view);
          const canCreate = chosen.some((p) => p.default_dept_can_create);
          const canEdit = chosen.some((p) => p.default_dept_can_edit);
          const canDelete = chosen.some((p) => p.default_dept_can_delete);
          await supabase
            .from("user_departments")
            .delete()
            .eq("user_id", selectedUser.id)
            .eq("department", editDepartment);
          await supabase.from("user_departments").insert({
            user_id: selectedUser.id,
            department: editDepartment,
            can_view: canView,
            can_create: canCreate,
            can_edit: canEdit,
            can_delete: canDelete,
          });
        }
      }

      // Sync "สิทธิ์เห็นฝ่าย" (data-access departments) — preserve existing create/edit/delete flags
      const { data: existingDeptRows } = await supabase
        .from("user_departments")
        .select("*")
        .eq("user_id", selectedUser.id);
      const existingByDept = new Map(
        (existingDeptRows || []).map((r: any) => [r.department as string, r])
      );
      const toRemove = (existingDeptRows || [])
        .filter((r: any) => !editDeptAccess.includes(r.department))
        .map((r: any) => r.department as string);
      if (toRemove.length > 0) {
        await supabase
          .from("user_departments")
          .delete()
          .eq("user_id", selectedUser.id)
          .in("department", toRemove);
      }
      const toAdd = editDeptAccess.filter((d) => !existingByDept.has(d));
      if (toAdd.length > 0) {
        await supabase.from("user_departments").insert(
          toAdd.map((d) => ({
            user_id: selectedUser.id,
            department: d,
            can_view: true,
            can_create: false,
            can_edit: false,
            can_delete: false,
          }))
        );
      }
      // Ensure rows kept have can_view = true (so they actually see data)
      const toEnable = (existingDeptRows || [])
        .filter((r: any) => editDeptAccess.includes(r.department) && !r.can_view)
        .map((r: any) => r.department as string);
      if (toEnable.length > 0) {
        await supabase
          .from("user_departments")
          .update({ can_view: true })
          .eq("user_id", selectedUser.id)
          .in("department", toEnable);
      }

      toast.success("บันทึกข้อมูลผู้ใช้สำเร็จ");
      setEditDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setDeleteBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: selectedUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("ลบผู้ใช้แล้ว — เข้าระบบไม่ได้อีก (ประวัติการทำรายการยังอยู่)");
      setDeleteDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถลบผู้ใช้ได้"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const getRoleSummary = (userId: string) => {
    const roles = userRoles[userId] || [];
    if (roles.length === 0) return null;
    if (roles.includes('super_admin')) return <Badge className="bg-amber-600 hover:bg-amber-700">Super Admin</Badge>;
    if (roles.includes('admin')) return <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>;
    return roles.map(role => {
      const roleInfo = ROLES.find(r => r.value === role);
      return (
        <Badge key={role} variant="secondary" className="text-xs">
          {roleInfo?.label || role}
        </Badge>
      );
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">กำลังโหลด...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                รายชื่อผู้ใช้งาน
                {pendingUsers.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    รออนุมัติ {pendingUsers.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                กด <strong>ตั้งค่าขั้นสูง (Wizard)</strong> เพื่อกำหนด Role, เมนู และสิทธิ์ในฝ่ายรายคน — หากต้องการตั้งสิทธิ์หลายคนพร้อมกันหรือใช้ <strong>Preset</strong> ให้สลับไปที่มุมมอง <strong>Matrix สิทธิ์</strong> ด้านบน
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                  <TableRow className="bg-muted/50">
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>ชื่อที่แสดงในระบบ</TableHead>
                  <TableHead>ฝ่ายสังกัด</TableHead>
                  <TableHead>สิทธิ์เห็นฝ่าย</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                    <TableHead>คำขอสมัคร</TableHead>
                  <TableHead>บทบาท / ตั้งสิทธิ์เร็ว</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleOpenDialog(user)}
                  >
                    <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                    <TableCell>
                      {user.display_name
                        ? <span className="font-medium text-primary">{user.display_name}</span>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {user.department ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {user.department}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const depts = userDeptsByUser[user.id] || [];
                        if (isAdmin(user.id)) {
                          return (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                              ทุกฝ่าย (Admin)
                            </Badge>
                          );
                        }
                        if (depts.length === 0) {
                          return <span className="text-xs text-muted-foreground">-</span>;
                        }
                        const shown = depts.slice(0, 2);
                        const rest = depts.length - shown.length;
                        return (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {shown.map((d) => (
                              <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                            ))}
                            {rest > 0 && (
                              <Badge variant="secondary" className="text-[10px]" title={depts.join(", ")}>
                                +{rest}
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        {user.requested_job_role || user.requested_department ? (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-foreground">{getRequestedJobRoleLabel(user.requested_job_role)}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {user.requested_department || "-"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-2 min-w-[240px]">
                        <div className="flex gap-1 flex-wrap items-center">
                          {getRoleSummary(user.id) || (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 w-fit">
                              ยังไม่ตั้งสิทธิ์
                            </Badge>
                          )}
                        </div>
                        {/* Preset ถูกย้ายไปที่มุมมอง Matrix สิทธิ์ — ที่นี่เก็บเฉพาะ Wizard ตั้งค่ารายคน */}

                        <button
                          type="button"
                          onClick={() => handleOpenEditDialog(user)}
                          className="text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2 text-left w-fit"
                        >
                          แก้ไขข้อมูลโปรไฟล์
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenResetPasswordDialog(user)}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>รีเซ็ตรหัสผ่าน</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenWizard(user)}
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ตั้งค่าสิทธิ์ (Wizard) — บทบาท เมนู และฝ่าย</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(user)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ลบออกจากรายการ (เก็บประวัติในระบบ)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      ไม่พบผู้ใช้งาน
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Main Permission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              จัดการสิทธิ์ - {selectedUser?.full_name}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                บทบาท
              </TabsTrigger>
              <TabsTrigger value="functions" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                ฟังก์ชัน
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                ฝ่าย
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 min-h-0 overflow-y-auto pr-1">
              {/* Roles Tab */}
              <TabsContent value="roles" className="m-0 space-y-3 pb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>บทบาท (Role)</strong> กำหนดความสามารถพื้นฐานของผู้ใช้<br/>
                      • Admin = สิทธิ์เต็มทุกอย่าง ไม่ต้องกำหนดสิทธิ์ฟังก์ชัน/ฝ่ายเพิ่ม<br/>
                      • บทบาทอื่น = ต้องกำหนดสิทธิ์ฟังก์ชันและฝ่ายเพิ่มเติม
                    </div>
                  </div>
                </div>
                {ROLES.map((role) => {
                  const isSelected = selectedUserRoles.includes(role.value);
                  return (
                    <label 
                      key={role.value}
                      className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <div className={`w-2 h-10 rounded ${role.color}`} />
                      <div className="flex-1">
                        <span className="font-medium">{role.label}</span>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </label>
                  );
                })}
              </TabsContent>

              {/* Functions Tab */}
              <TabsContent value="functions" className="m-0 space-y-3 pb-4">
                {selectedUserRoles.includes('admin') ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">ผู้ใช้มีบทบาท Admin - เข้าถึงได้ทุกฟังก์ชัน</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>สิทธิ์ตามฟังก์ชัน</strong> ควบคุมการเข้าถึงเมนูและความสามารถหลักของระบบ
                        </div>
                      </div>
                    </div>
                    {SYSTEM_FUNCTIONS.map((func) => {
                      const perm = userFunctionPermissions.find(p => p.function_name === func.name);
                      return (
                        <div 
                          key={func.name}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                            perm?.can_access ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex-1">
                            <Label className="font-medium cursor-pointer">{func.label}</Label>
                            <p className="text-sm text-muted-foreground">{func.description}</p>
                          </div>
                          <Switch
                            checked={perm?.can_access || false}
                            onCheckedChange={(checked) => handleFunctionPermissionChange(func.name, checked)}
                          />
                        </div>
                      );
                    })}
                  </>
                )}
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="m-0 pb-4">
                {selectedUserRoles.includes('admin') ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">ผู้ใช้มีบทบาท Admin - เข้าถึงได้ทุกฝ่าย</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 mb-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-purple-600 mt-0.5" />
                        <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                          <strong>สิทธิ์ตามฝ่าย</strong> กำหนดว่าผู้ใช้ทำอะไรกับข้อมูลของแต่ละฝ่ายได้บ้าง
                          <ul className="list-disc list-inside ml-2 space-y-0.5">
                            <li><strong>ดูข้อมูล</strong> — เห็นรายการสินค้า, รายงาน, ประวัติของฝ่ายนั้น</li>
                            <li><strong>สร้างรายการ</strong> — รับเข้า/ขอเบิก/สร้างคำขอสินค้าของฝ่ายนั้น</li>
                            <li><strong>แก้ไขข้อมูล</strong> — อัปเดตข้อมูลสินค้า, สถานะรายการของฝ่ายนั้น</li>
                            <li><strong>ลบรายการ</strong> — ลบข้อมูลออกจากระบบ (สงวนสำหรับ Admin เท่านั้น)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <TooltipProvider>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-40">ฝ่าย</TableHead>
                              <TableHead className="text-center w-24">
                                <Tooltip>
                                  <TooltipTrigger className="cursor-help border-b border-dashed border-muted-foreground">
                                    ดูข้อมูล
                                  </TooltipTrigger>
                                  <TooltipContent>เห็นรายการสินค้า, รายงาน, ประวัติของฝ่ายนั้น</TooltipContent>
                                </Tooltip>
                              </TableHead>
                              <TableHead className="text-center w-24">
                                <Tooltip>
                                  <TooltipTrigger className="cursor-help border-b border-dashed border-muted-foreground">
                                    สร้างรายการ
                                  </TooltipTrigger>
                                  <TooltipContent>รับเข้า/ขอเบิก/สร้างคำขอสินค้าของฝ่ายนั้น</TooltipContent>
                                </Tooltip>
                              </TableHead>
                              <TableHead className="text-center w-24">
                                <Tooltip>
                                  <TooltipTrigger className="cursor-help border-b border-dashed border-muted-foreground">
                                    แก้ไขข้อมูล
                                  </TooltipTrigger>
                                  <TooltipContent>อัปเดตข้อมูลสินค้า, สถานะรายการของฝ่ายนั้น</TooltipContent>
                                </Tooltip>
                              </TableHead>
                              <TableHead className="text-center w-24">
                                <Tooltip>
                                  <TooltipTrigger className="cursor-help border-b border-dashed border-muted-foreground">
                                    <span className="flex items-center justify-center gap-1">
                                      ลบรายการ
                                      <Lock className="h-3 w-3 text-destructive" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>สงวนสำหรับ Admin เท่านั้น — ลบข้อมูลออกจากระบบ</TooltipContent>
                                </Tooltip>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userPermissions.map((perm) => (
                              <TableRow key={perm.department} className="hover:bg-muted/30">
                                <TableCell className="font-medium">{perm.department}</TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_view}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(perm.department, 'can_view', checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_create}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(perm.department, 'can_create', checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_edit}
                                    onCheckedChange={(checked) => 
                                      handlePermissionChange(perm.department, 'can_edit', checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center justify-center">
                                        <Checkbox
                                          checked={perm.can_delete}
                                          disabled
                                          className="opacity-40"
                                        />
                                        <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>สิทธิ์ลบรายการสงวนสำหรับ Admin เท่านั้น</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      สิทธิ์ลบรายการสงวนสำหรับ Admin เท่านั้น
                    </p>
                  </>
                )}
              </TabsContent>
            </div>

            <Separator className="my-4" />
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveAll}>
                <Check className="h-4 w-4 mr-2" />
                บันทึกทั้งหมด
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              รีเซ็ตรหัสผ่าน
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? "กำลังรีเซ็ต..." : "รีเซ็ตรหัสผ่าน"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              แก้ไขข้อมูลผู้ใช้
            </DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">ชื่อ-นามสกุล</Label>
              <Input
                id="edit-full-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                disabled={editSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">ชื่อที่ต้องการให้แสดงในระบบ</Label>
              <Input
                id="edit-display-name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="เช่น Boy, Aey"
                disabled={editSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">เบอร์โทรศัพท์</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="08-XXXX-XXXX"
                disabled={editSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department" className="flex items-center gap-2">
                ฝ่ายสังกัดหลัก
                <span className="text-xs text-muted-foreground font-normal">(แสดงในโปรไฟล์เท่านั้น)</span>
              </Label>
              <Select
                value={editDepartment || "__none__"}
                onValueChange={(v) => setEditDepartment(v === "__none__" ? "" : v)}
                disabled={editSaving}
              >
                <SelectTrigger id="edit-department">
                  <SelectValue placeholder="เลือกฝ่าย..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— ไม่ระบุ —</SelectItem>
                  {allDepartments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                ⚠️ ค่านี้ไม่ใช่สิทธิ์เข้าถึงข้อมูล — สิทธิ์เห็นข้อมูลของแต่ละฝ่ายกำหนดในหัวข้อ <strong>สิทธิ์เห็นฝ่าย</strong> ด้านล่าง
              </p>
              {selectedUser?.requested_department && selectedUser.requested_department !== editDepartment && (
                <p className="text-xs text-muted-foreground">
                  ผู้ใช้ขอสมัครฝ่าย: <strong>{selectedUser.requested_department}</strong>
                </p>
              )}
            </div>

            {/* Multi-department data access */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                สิทธิ์เห็นฝ่าย (Data access)
                <span className="text-xs text-muted-foreground font-normal">(เลือกได้หลายฝ่าย)</span>
              </Label>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className="px-2 py-1 rounded border hover:bg-muted"
                  onClick={() => setEditDeptAccess([...allDepartments])}
                  disabled={editSaving}
                >
                  เลือกทุกฝ่าย
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded border hover:bg-muted"
                  onClick={() => setEditDeptAccess([])}
                  disabled={editSaving}
                >
                  ล้าง
                </button>
                {editDepartment && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded border hover:bg-muted"
                    onClick={() =>
                      setEditDeptAccess((prev) =>
                        prev.includes(editDepartment) ? prev : [...prev, editDepartment]
                      )
                    }
                    disabled={editSaving}
                  >
                    + ตามฝ่ายสังกัด ({editDepartment})
                  </button>
                )}
              </div>
              <div className="rounded-md border max-h-48 overflow-y-auto divide-y">
                {allDepartments.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">ไม่พบข้อมูลฝ่าย</div>
                )}
                {allDepartments.map((d) => {
                  const checked = editDeptAccess.includes(d);
                  return (
                    <label
                      key={d}
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setEditDeptAccess((prev) =>
                            v ? Array.from(new Set([...prev, d])) : prev.filter((x) => x !== d)
                          )
                        }
                        disabled={editSaving}
                      />
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1">{d}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                ผู้ใช้จะเห็นข้อมูล (สินค้า, รายงาน, ประวัติ) ของฝ่ายที่เลือกเท่านั้น · ต้องการปรับสิทธิ์สร้าง/แก้ไข/ลบรายฝ่าย ให้ใช้ <strong>ตั้งค่าขั้นสูง (Wizard)</strong> หรือมุมมอง <strong>Matrix สิทธิ์</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                บทบาทงาน / Preset สิทธิ์
                <span className="text-xs text-muted-foreground font-normal">(เลือกได้หลายอัน)</span>
              </Label>
              <div className="rounded-md border max-h-48 overflow-y-auto divide-y">
                {allPresets.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">กำลังโหลด Preset...</div>
                )}
                {allPresets.map((p) => {
                  const checked = editSelectedPresets.includes(p.template_key);
                  return (
                    <label
                      key={p.template_key}
                      className="flex items-start gap-2 p-2 hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setEditSelectedPresets((prev) =>
                            v
                              ? Array.from(new Set([...prev, p.template_key]))
                              : prev.filter((k) => k !== p.template_key)
                          );
                        }}
                        disabled={editSaving}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.label}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {selectedUser?.requested_job_role && (
                <p className="text-xs text-muted-foreground">
                  ผู้ใช้ขอสมัครเป็น: <strong>{templateLabels[selectedUser.requested_job_role] || selectedUser.requested_job_role}</strong>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                บันทึก = เขียนทับ Role + สิทธิ์ฟังก์ชันด้วย Preset ที่เลือก · ต้องการปรับรายเมนู? สลับไปมุมมอง <strong>Matrix สิทธิ์</strong>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editSaving}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete (hide) user dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ลบผู้ใช้ออกจากรายการ
            </DialogTitle>
            <DialogDescription>
              ต้องการลบ <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) ออกจากระบบใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive-foreground/90">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-destructive" />
            <div className="space-y-1">
              <div><strong className="text-destructive">ผู้ใช้จะเข้าระบบไม่ได้อีก</strong> (ถูกบล็อกการเข้าสู่ระบบ + รีเซ็ตรหัสผ่าน + ยกเลิกสิทธิ์ทั้งหมด)</div>
              <div className="text-muted-foreground"><strong>ประวัติการทำรายการทั้งหมดยังคงอยู่ในระบบ</strong> — ยังตรวจสอบย้อนหลังได้ว่าผู้ใช้เคยรับเข้า/เบิก/PM อะไรบ้าง</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteBusy}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteBusy}>
              {deleteBusy ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permission Wizard */}
      <PermissionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        user={wizardUser}
        onSaved={() => {
          fetchAllUserRoles();
        }}
      />
    </>
  );
}
