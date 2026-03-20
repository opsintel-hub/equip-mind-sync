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

// ALL_DEPARTMENTS removed - now fetched dynamically from DB

export function useDepartmentPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<DepartmentPermission[]>([]);
  const [allDepartmentNames, setAllDepartmentNames] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setPermissions([]);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Check if user is admin/super_admin + fetch permissions + fetch all departments in parallel
        const [roleRes, permsRes, deptRes] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "super_admin"]),
          supabase.from("user_departments").select("*").eq("user_id", user.id),
          supabase.from("departments").select("name").eq("is_active", true).order("name"),
        ]);

        const roles = (roleRes.data || []).map(r => r.role);
        const hasSuperAdmin = roles.includes("super_admin");
        const hasAdmin = roles.includes("admin") || hasSuperAdmin;
        setIsAdmin(hasAdmin);
        setIsSuperAdmin(hasSuperAdmin);
        setPermissions(permsRes.data || []);
        setAllDepartmentNames((deptRes.data || []).map(d => d.name));
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
    // Only Super Admin bypasses all department checks
    if (isSuperAdmin) return true;
    
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
    // Only Super Admin sees all departments automatically
    if (isSuperAdmin) return allDepartmentNames;
    return permissions.filter(p => p.can_view).map(p => p.department);
  };

  return {
    permissions,
    isAdmin,
    isSuperAdmin,
    loading,
    hasPermission,
    getViewableDepartments
  };
}
