import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FunctionPermission {
  function_name: string;
  can_access: boolean;
}

export const SYSTEM_FUNCTIONS = [
  { name: "delivery_entry", label: "นำสินค้าเข้า", description: "สร้างรายการนำสินค้าเข้า (สำหรับผู้นำเข้า)" },
  { name: "goods_receipt", label: "รับเข้าคลัง", description: "รับเข้าคลัง, จัดการ Media, รายการรอรหัส (สำหรับเจ้าหน้าที่คลัง)" },
  { name: "issue_request", label: "ขอเบิกสินค้า", description: "ส่งคำขอเบิกสินค้า (สำหรับผู้เบิก)" },
  { name: "goods_issue", label: "จ่ายสินค้า", description: "จ่ายสินค้าตามคำขอ (สำหรับเจ้าหน้าที่คลัง)" },
  { name: "master_data", label: "ข้อมูลหลัก", description: "จัดการหมวดหมู่ สถานที่ ผู้จำหน่าย" },
  { name: "reports", label: "รายงาน", description: "ดูรายงานและสถิติ" },
  { name: "billboards", label: "ป้ายโฆษณา", description: "จัดการข้อมูลป้ายโฆษณา" },
  { name: "pm_schedule", label: "PM ป้ายโฆษณา", description: "จัดการตารางบำรุงรักษาป้ายโฆษณา" },
  { name: "equipment_pm", label: "PM เครื่องมือ", description: "จัดการตารางบำรุงรักษาเครื่องมือ" },
  { name: "transfer", label: "โอนย้ายสินค้า", description: "โอนย้ายสินค้าระหว่างสถานที่" },
  { name: "ad_entry", label: "นำเข้าภาพโฆษณา", description: "กรอกข้อมูลภาพโฆษณาเข้าระบบ (ภาพใหม่, ฝากชั่วคราว, ภาพเก่า)" },
  { name: "ad_issue_request", label: "เบิกภาพโฆษณา", description: "สร้างคำขอเบิกภาพโฆษณา (สำหรับผู้เบิก)" },
  { name: "ad_warehouse", label: "คลังภาพโฆษณา", description: "รับเข้าคลัง + จ่ายภาพโฆษณาออก (สำหรับเจ้าหน้าที่คลัง)" },
  { name: "admin", label: "จัดการระบบ", description: "จัดการผู้ใช้และสิทธิ์" },
  { name: "delivery_confirm", label: "ยืนยันรับสินค้า", description: "ยืนยันการรับสินค้าที่จัดส่งพร้อมแจ้งปัญหา" },
  { name: "manager_approval", label: "อนุมัติเบิกทรัพย์สิน", description: "อนุมัติคำขอเบิกสินค้าที่เป็นทรัพย์สิน (เฉพาะ Manager)" },
  { name: "direct_shipping_request", label: "ขอส่งตรง", description: "สร้างคำขอส่งสินค้าตรงจาก Supplier ไปปลายทาง (สำหรับผู้ขอ)" },
  { name: "direct_shipping_approval", label: "อนุมัติส่งตรง", description: "อนุมัติ/ปฏิเสธคำขอส่งตรง (สำหรับ Manager)" },
  { name: "direct_shipping_procurement", label: "จัดซื้อ-ส่งตรง", description: "ดำเนินการจัดซื้อและบันทึกการส่งตรง (สำหรับเจ้าหน้าที่จัดซื้อ)" },
];

export function useFunctionPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<FunctionPermission[]>([]);
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
        // Check if user is admin or super_admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin"]);

        const roles = (roleData || []).map(r => r.role);
        const hasSuperAdmin = roles.includes("super_admin");
        const hasAdmin = roles.includes("admin") || hasSuperAdmin;
        setIsAdmin(hasAdmin);
        setIsSuperAdmin(hasSuperAdmin);

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
    // Only Super Admin bypasses function permission checks
    if (isSuperAdmin) return true;
    // Admin still needs explicit function permissions (except admin function itself)
    if (isAdmin && functionName === "admin") return true;
    
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
    isSuperAdmin,
    loading,
    hasFunctionAccess,
    getAccessibleFunctions
  };
}
