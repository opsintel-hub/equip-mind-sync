import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, UserCog, Settings2, KeyRound } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

const DEPARTMENTS = ["Airport", "Digital", "Billboard", "Static", "Bus", "7 Eleven", "Construction", "HR", "Account", "ของขวัญปีใหม่"];

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "สิทธิ์เต็มทุกอย่าง" },
  { value: "manager", label: "Manager", description: "จัดการและอนุมัติรายการ ดูรายงาน" },
  { value: "warehouse_staff", label: "เจ้าหน้าที่คลัง", description: "รับเข้า-เบิกจ่ายสินค้า จัดการสต็อก" },
  { value: "receiver", label: "ผู้รับเข้าสินค้า", description: "รับสินค้าเข้าคลัง บันทึกการส่งมอบ" },
  { value: "requester", label: "ผู้เบิกสินค้า", description: "สร้างคำขอเบิกสินค้า ติดตามสถานะ" },
];

interface User {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string;
}

interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
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

const Admin = () => {
  const { isAdmin, loading: permLoading } = useDepartmentPermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [userFunctionPermissions, setUserFunctionPermissions] = useState<FunctionPermission[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({});
  const [selectedUserRoles, setSelectedUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [functionDialogOpen, setFunctionDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!permLoading && !isAdmin) {
      toast.error("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      return;
    }
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, permLoading]);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;
      
      // Fetch emails from auth.users via edge function or RPC
      // Since we can't directly query auth.users, we'll fetch from the raw_user_meta_data
      // stored during signup, or use a workaround by querying the users table
      const userIds = profilesData?.map(p => p.id) || [];
      
      // Try to get emails from the users view if available
      let emailMap: Record<string, string> = {};
      try {
        const { data: usersData } = await supabase.rpc('get_users_emails');
        if (usersData) {
          usersData.forEach((u: { id: string; email: string }) => {
            emailMap[u.id] = u.email;
          });
        }
      } catch (e) {
        console.log("Could not fetch emails via RPC, will use empty");
      }
      
      const usersWithEmail = (profilesData || []).map(p => ({
        ...p,
        email: emailMap[p.id] || ''
      }));
      
      setUsers(usersWithEmail);
      
      // Fetch all user roles
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
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) throw error;

      // Group roles by user_id
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

      // Create full permission set with defaults
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
      toast.error("เกิดข้อผิดพลาดในการโหลดสิทธิ์");
    }
  };

  const fetchUserFunctionPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_function_permissions")
        .select("function_name, can_access")
        .eq("user_id", userId);

      if (error) throw error;

      // Create full permission set with defaults
      const fullPermissions = SYSTEM_FUNCTIONS.map(func => {
        const existing = data?.find(p => p.function_name === func.name);
        return existing || {
          function_name: func.name,
          can_access: false
        };
      });

      setUserFunctionPermissions(fullPermissions);
    } catch (error: any) {
      console.error("Error fetching function permissions:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดสิทธิ์ฟังก์ชัน");
    }
  };

  const handleOpenDialog = async (user: User) => {
    setSelectedUser(user);
    await fetchUserPermissions(user.id);
    setDialogOpen(true);
  };

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedUserRoles(userRoles[user.id] || []);
    setRoleDialogOpen(true);
  };

  const handleOpenFunctionDialog = async (user: User) => {
    setSelectedUser(user);
    await fetchUserFunctionPermissions(user.id);
    setFunctionDialogOpen(true);
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
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("รีเซ็ตรหัสผ่านสำเร็จ");
      setResetPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error("เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน: " + error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const toggleRole = (role: UserRole) => {
    setSelectedUserRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    try {
      // Delete existing roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.id);

      // Insert new roles
      if (selectedUserRoles.length > 0) {
        const rolesToInsert = selectedUserRoles.map(role => ({
          user_id: selectedUser.id,
          role: role
        }));

        const { error } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);

        if (error) throw error;
      }

      toast.success("บันทึกบทบาทสำเร็จ");
      setRoleDialogOpen(false);
      await fetchAllUserRoles();
    } catch (error: any) {
      console.error("Error saving roles:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
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

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      // Delete existing permissions
      await supabase
        .from("user_departments")
        .delete()
        .eq("user_id", selectedUser.id);

      // Insert new permissions (only for departments with at least one permission)
      const permissionsToInsert = userPermissions.filter(p => 
        p.can_view || p.can_create || p.can_edit || p.can_delete
      );

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from("user_departments")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success("บันทึกสิทธิ์สำเร็จ");
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleSaveFunctionPermissions = async () => {
    if (!selectedUser) return;

    try {
      // Delete existing function permissions
      await supabase
        .from("user_function_permissions")
        .delete()
        .eq("user_id", selectedUser.id);

      // Insert new function permissions
      const permissionsToInsert = userFunctionPermissions
        .filter(p => p.can_access)
        .map(p => ({
          user_id: selectedUser.id,
          function_name: p.function_name,
          can_access: true
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from("user_function_permissions")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success("บันทึกสิทธิ์ฟังก์ชันสำเร็จ");
      setFunctionDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving function permissions:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  if (permLoading || loading) {
    return <div className="flex items-center justify-center h-screen">กำลังโหลด...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">จัดการผู้ใช้งาน</h1>
        <p className="text-muted-foreground">กำหนดสิทธิ์การเข้าถึงข้อมูลตามฝ่าย</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้งาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>เบอร์โทรศัพท์</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles[user.id]?.length > 0 ? (
                          userRoles[user.id].map((role) => (
                            <Badge key={role} variant="secondary">
                              {ROLES.find(r => r.value === role)?.label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">ไม่มีบทบาท</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResetPasswordDialog(user)}
                        >
                          <KeyRound className="w-4 h-4 mr-2" />
                          รีเซ็ตรหัสผ่าน
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoleDialog(user)}
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          บทบาท
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenFunctionDialog(user)}
                        >
                          <Settings2 className="w-4 h-4 mr-2" />
                          สิทธิ์ฟังก์ชัน
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          สิทธิ์ฝ่าย
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              จัดการบทบาท - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {ROLES.map((role) => {
              const isSelected = selectedUserRoles.includes(role.value);
              return (
                <label 
                  key={role.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleRole(role.value)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1">
                    <span className="font-medium block">{role.label}</span>
                    <span className="text-sm text-muted-foreground">{role.description}</span>
                  </div>
                </label>
              );
            })}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveRoles}>
                บันทึกบทบาท
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              กำหนดสิทธิ์ตามฝ่าย - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead className="text-center">ดู</TableHead>
                    <TableHead className="text-center">สร้าง</TableHead>
                    <TableHead className="text-center">แก้ไข</TableHead>
                    <TableHead className="text-center">ลบ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userPermissions.map((perm) => (
                    <TableRow key={perm.department}>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSavePermissions}>
                บันทึกสิทธิ์
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={functionDialogOpen} onOpenChange={setFunctionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              กำหนดสิทธิ์ตามฟังก์ชัน - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              เลือกฟังก์ชันที่ผู้ใช้สามารถเข้าถึงได้
            </p>
            <div className="space-y-3">
              {SYSTEM_FUNCTIONS.map((func) => {
                const perm = userFunctionPermissions.find(p => p.function_name === func.name);
                return (
                  <div 
                    key={func.name}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30"
                  >
                    <div className="flex-1">
                      <Label className="font-medium">{func.label}</Label>
                      <p className="text-sm text-muted-foreground">{func.description}</p>
                    </div>
                    <Switch
                      checked={perm?.can_access || false}
                      onCheckedChange={(checked) => handleFunctionPermissionChange(func.name, checked)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setFunctionDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveFunctionPermissions}>
                บันทึกสิทธิ์ฟังก์ชัน
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              รีเซ็ตรหัสผ่าน - {selectedUser?.full_name}
            </DialogTitle>
            <DialogDescription>
              กรอกรหัสผ่านใหม่สำหรับผู้ใช้นี้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
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
    </div>
  );
};

export default Admin;
