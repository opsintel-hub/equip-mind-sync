import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, UserPlus } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";

const DEPARTMENTS = ["Airport", "Digital", "Billboard", "Static", "Bus", "7 Eleven", "Construction", "HR", "Account", "ของขวัญปีใหม่"];

interface User {
  id: string;
  full_name: string;
  phone: string | null;
}

interface UserPermission {
  user_id: string;
  department: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const Admin = () => {
  const { isAdmin, loading: permLoading } = useDepartmentPermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
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

  const handleOpenDialog = async (user: User) => {
    setSelectedUser(user);
    await fetchUserPermissions(user.id);
    setDialogOpen(true);
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
                  <TableHead>เบอร์โทรศัพท์</TableHead>
                  <TableHead>จัดการสิทธิ์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        กำหนดสิทธิ์
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              กำหนดสิทธิ์ - {selectedUser?.full_name}
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
    </div>
  );
};

export default Admin;
