import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, ChevronDown, Shield, Building2, Wrench } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserRole {
  role: string;
}

interface UserDepartment {
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

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  manager: "ผู้จัดการ",
  warehouse_staff: "เจ้าหน้าที่คลัง",
  receiver: "ผู้รับเข้า",
  requester: "ผู้ขอเบิก",
};

const FUNCTION_LABELS: Record<string, string> = {
  goods_receipt: "รับเข้าสินค้า",
  goods_issue: "เบิก-จ่ายสินค้า",
  master_data: "ข้อมูลหลัก",
  reports: "รายงาน",
  equipment_pm: "PM อุปกรณ์",
};

export function UserInfoDisplay() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
      } else {
        setUserId(null);
        setUserEmail(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user roles
  const { data: roles = [] } = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
  });

  // Fetch user department permissions
  const { data: departments = [] } = useQuery({
    queryKey: ["user-departments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_departments")
        .select("department, can_view, can_create, can_edit, can_delete")
        .eq("user_id", userId);
      if (error) throw error;
      return data as UserDepartment[];
    },
    enabled: !!userId,
  });

  // Fetch user function permissions
  const { data: functionPermissions = [] } = useQuery({
    queryKey: ["user-function-permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_function_permissions")
        .select("function_name, can_access")
        .eq("user_id", userId);
      if (error) throw error;
      return data as FunctionPermission[];
    },
    enabled: !!userId,
  });

  if (!userId) return null;

  const displayName = profile?.full_name || userEmail?.split("@")[0] || "ผู้ใช้";
  const isAdmin = roles.some((r) => r.role === "admin");
  const activeRoles = roles.map((r) => r.role);
  const activeFunctions = functionPermissions.filter((f) => f.can_access);
  const activeDepartments = departments.filter((d) => d.can_view);

  const getPermissionBadges = (dept: UserDepartment) => {
    const perms = [];
    if (dept.can_view) perms.push("ดู");
    if (dept.can_create) perms.push("สร้าง");
    if (dept.can_edit) perms.push("แก้ไข");
    if (dept.can_delete) perms.push("ลบ");
    return perms.join(", ");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium leading-none">{displayName}</span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {isAdmin ? "ผู้ดูแลระบบ" : activeRoles.map((r) => ROLE_LABELS[r] || r).join(", ") || "ไม่มีบทบาท"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Roles Section */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">บทบาท</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {isAdmin ? (
              <Badge variant="default" className="bg-primary">ผู้ดูแลระบบ (สิทธิ์ทั้งหมด)</Badge>
            ) : activeRoles.length > 0 ? (
              activeRoles.map((role) => (
                <Badge key={role} variant="secondary">
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">ไม่มีบทบาท</span>
            )}
          </div>
        </div>

        {/* Function Permissions Section */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">สิทธิ์ตามฟังก์ชัน</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {isAdmin ? (
              <Badge variant="outline" className="border-green-500 text-green-600">ทุกฟังก์ชัน</Badge>
            ) : activeFunctions.length > 0 ? (
              activeFunctions.map((func) => (
                <Badge key={func.function_name} variant="outline" className="border-blue-500 text-blue-600">
                  {FUNCTION_LABELS[func.function_name] || func.function_name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">ไม่มีสิทธิ์</span>
            )}
          </div>
        </div>

        {/* Department Permissions Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">สิทธิ์ตามฝ่าย</span>
          </div>
          {isAdmin ? (
            <Badge variant="outline" className="border-green-500 text-green-600">ทุกฝ่าย</Badge>
          ) : activeDepartments.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activeDepartments.map((dept) => (
                <div key={dept.department} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{dept.department}</span>
                  <span className="text-xs text-muted-foreground">{getPermissionBadges(dept)}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">ไม่มีสิทธิ์</span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
