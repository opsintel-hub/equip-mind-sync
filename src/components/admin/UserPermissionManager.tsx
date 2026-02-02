import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";
import type { Database } from "@/integrations/supabase/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UserRole = Database["public"]["Enums"]["app_role"];

const DEPARTMENTS = ["Airport", "Digital", "Billboard", "Static", "Bus", "7 Eleven", "Construction", "HR", "Account", "ของขวัญปีใหม่"];

const ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: "admin", label: "Admin", description: "สิทธิ์เต็มทุกอย่าง", color: "bg-red-500" },
  { value: "manager", label: "Manager", description: "ดูแลภาพรวม ดูรายงาน", color: "bg-purple-500" },
  { value: "warehouse_staff", label: "เจ้าหน้าที่คลัง", description: "รับเข้า-จ่ายสินค้า", color: "bg-blue-500" },
  { value: "receiver", label: "ผู้รับเข้า", description: "รับสินค้าเข้าคลัง", color: "bg-green-500" },
  { value: "requester", label: "ผู้เบิก", description: "ขอเบิกสินค้า", color: "bg-orange-500" },
];

interface User {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string;
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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({});
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [userFunctionPermissions, setUserFunctionPermissions] = useState<FunctionPermission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("roles");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      ));
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;
      
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
      
      const usersWithEmail = (profilesData || []).map(p => ({
        ...p,
        email: emailMap[p.id] || ''
      }));
      
      setUsers(usersWithEmail);
      setFilteredUsers(usersWithEmail);
      await fetchAllUserRoles();
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
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
      const { data, error } = await supabase
        .from("user_departments")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const fullPermissions = DEPARTMENTS.map(dept => {
        const existing = data?.find(p => p.department === dept);
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
      // Save roles
      await supabase.from("user_roles").delete().eq("user_id", selectedUser.id);
      if (selectedUserRoles.length > 0) {
        const rolesToInsert = selectedUserRoles.map(role => ({
          user_id: selectedUser.id,
          role: role
        }));
        const { error: roleError } = await supabase.from("user_roles").insert(rolesToInsert);
        if (roleError) throw roleError;
      }

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

      // Save department permissions
      await supabase.from("user_departments").delete().eq("user_id", selectedUser.id);
      const deptPermsToInsert = userPermissions.filter(p => 
        p.can_view || p.can_create || p.can_edit || p.can_delete
      );
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

    if (newPassword.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
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

  const isAdmin = (userId: string) => userRoles[userId]?.includes('admin');

  const getRoleSummary = (userId: string) => {
    const roles = userRoles[userId] || [];
    if (roles.length === 0) return null;
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
              </CardTitle>
              <CardDescription>
                คลิกที่ผู้ใช้เพื่อจัดการบทบาทและสิทธิ์ทั้งหมดในที่เดียว
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
                  <TableHead>อีเมล</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>บทบาท</TableHead>
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
                    <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleSummary(user.id) || (
                          <span className="text-muted-foreground text-sm">ไม่มีบทบาท</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
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
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          จัดการสิทธิ์
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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

            <ScrollArea className="flex-1 mt-4">
              {/* Roles Tab */}
              <TabsContent value="roles" className="m-0 space-y-3">
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
              <TabsContent value="functions" className="m-0 space-y-3">
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
              <TabsContent value="departments" className="m-0">
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
                        <div className="text-sm text-purple-800 dark:text-purple-200">
                          <strong>สิทธิ์ตามฝ่าย</strong> กำหนดว่าผู้ใช้สามารถดู/สร้าง/แก้ไข/ลบ ข้อมูลของฝ่ายใดได้บ้าง
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-40">ฝ่าย</TableHead>
                            <TableHead className="text-center w-20">ดู</TableHead>
                            <TableHead className="text-center w-20">สร้าง</TableHead>
                            <TableHead className="text-center w-20">แก้ไข</TableHead>
                            <TableHead className="text-center w-20">ลบ</TableHead>
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
                                <Checkbox
                                  checked={perm.can_delete}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(perm.department, 'can_delete', checked as boolean)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>
            </ScrollArea>

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
    </>
  );
}
