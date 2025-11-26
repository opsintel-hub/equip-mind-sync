import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DepartmentPermission {
  department: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ALL_DEPARTMENTS = ["Airport", "Digital", "Billboard", "Static", "Bus", "7 Eleven", "Construction", "HR", "Account", "ของขวัญปีใหม่"];

export function useDepartmentPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DepartmentPermission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setPermissions([]);
      setIsAdmin(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        const isAdminUser = !!roleData;
        setIsAdmin(isAdminUser);

        // Fetch department permissions
        const { data: perms, error } = await supabase
          .from("user_departments")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;

        setPermissions(perms || []);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (department: string, permission: "view" | "create" | "edit" | "delete"): boolean => {
    if (isAdmin) return true;
    
    const deptPerm = permissions.find(p => p.department === department);
    if (!deptPerm) return false;

    switch (permission) {
      case "view": return deptPerm.can_view;
      case "create": return deptPerm.can_create;
      case "edit": return deptPerm.can_edit;
      case "delete": return deptPerm.can_delete;
      default: return false;
    }
  };

  const getViewableDepartments = (): string[] => {
    if (isAdmin) return ALL_DEPARTMENTS;
    return permissions.filter(p => p.can_view).map(p => p.department);
  };

  return {
    permissions,
    isAdmin,
    loading,
    hasPermission,
    getViewableDepartments
  };
}
