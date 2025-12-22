import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FunctionPermission {
  function_name: string;
  can_access: boolean;
}

export const SYSTEM_FUNCTIONS = [
  { name: "goods_receipt", label: "รับเข้าสินค้า", description: "บันทึกการรับสินค้าเข้าคลัง" },
  { name: "goods_issue", label: "เบิก-จ่ายสินค้า", description: "บันทึกการเบิกจ่ายสินค้า" },
  { name: "master_data", label: "ข้อมูลหลัก", description: "จัดการหมวดหมู่ สถานที่ ผู้จำหน่าย" },
  { name: "reports", label: "รายงาน", description: "ดูรายงานและสถิติ" },
  { name: "billboards", label: "ป้ายโฆษณา", description: "จัดการข้อมูลป้ายโฆษณา" },
  { name: "pm_schedule", label: "PM ป้ายโฆษณา", description: "จัดการตารางบำรุงรักษาป้ายโฆษณา" },
  { name: "equipment_pm", label: "PM เครื่องมือ", description: "จัดการตารางบำรุงรักษาเครื่องมือ" },
  { name: "transfer", label: "โอนย้ายสินค้า", description: "โอนย้ายสินค้าระหว่างสถานที่" },
  { name: "admin", label: "จัดการระบบ", description: "จัดการผู้ใช้และสิทธิ์" },
];

export function useFunctionPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<FunctionPermission[]>([]);
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

        // Fetch function permissions
        const { data: perms, error } = await supabase
          .from("user_function_permissions")
          .select("function_name, can_access")
          .eq("user_id", user.id);

        if (error) throw error;

        setPermissions(perms || []);
      } catch (error) {
        console.error("Error fetching function permissions:", error);
        setPermissions([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasFunctionAccess = (functionName: string): boolean => {
    if (isAdmin) return true;
    
    const perm = permissions.find(p => p.function_name === functionName);
    return perm?.can_access || false;
  };

  const getAccessibleFunctions = (): string[] => {
    if (isAdmin) return SYSTEM_FUNCTIONS.map(f => f.name);
    return permissions.filter(p => p.can_access).map(p => p.function_name);
  };

  return {
    permissions,
    isAdmin,
    loading,
    hasFunctionAccess,
    getAccessibleFunctions
  };
}
