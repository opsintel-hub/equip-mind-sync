import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface UseAllowedDepartmentsResult {
  allowedDepartments: Department[];
  isAdmin: boolean;
  isSingleDepartment: boolean;
  loading: boolean;
}

export function useAllowedDepartments(permission: "view" | "create" | "edit" | "delete" = "view"): UseAllowedDepartmentsResult {
  const { user } = useAuth();
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allowedNames, setAllowedNames] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setAllDepartments([]);
      setAllowedNames([]);
      setIsAdmin(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all active departments + check admin role + fetch user department permissions in parallel
        const [deptRes, roleRes, permRes] = await Promise.all([
          supabase.from("departments").select("id, name, description").eq("is_active", true).order("name"),
          supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "super_admin"]).maybeSingle(),
          supabase.from("user_departments").select("department, can_view, can_create, can_edit, can_delete").eq("user_id", user.id),
        ]);

        const departments = deptRes.data || [];
        const isAdminUser = !!roleRes.data;

        setAllDepartments(departments);
        setIsAdmin(isAdminUser);

        if (isAdminUser) {
          setAllowedNames(departments.map(d => d.name));
        } else {
          const permKey = `can_${permission}` as keyof typeof permRes.data[0];
          const allowed = (permRes.data || [])
            .filter(p => p[permKey])
            .map(p => p.department);
          setAllowedNames(allowed);
        }
      } catch (error) {
        console.error("Error fetching allowed departments:", error);
        setAllDepartments([]);
        setAllowedNames([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, permission]);

  const allowedDepartments = isAdmin
    ? allDepartments
    : allDepartments.filter(d => allowedNames.includes(d.name));

  const isSingleDepartment = !isAdmin && allowedDepartments.length === 1;

  return {
    allowedDepartments,
    isAdmin,
    isSingleDepartment,
    loading,
  };
}
