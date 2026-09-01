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
  { name: "swap_request_create", label: "แจ้ง Swap (ช่าง)", description: "สร้างคำขอ Swap จากหน้างาน (สำหรับช่าง)" },
  { name: "swap_request_manage", label: "จัดการ Swap (คลัง)", description: "ดูและดำเนินการคำขอ Swap (สำหรับเจ้าหน้าที่คลัง)" },
  { name: "assessment_create", label: "บันทึกประเมิน (คลัง)", description: "บันทึกผลการประเมินทรัพย์สินที่ถูกถอน (สำหรับเจ้าหน้าที่คลัง)" },
  { name: "assessment_view", label: "ดูรายการประเมิน (ช่าง)", description: "ดูรายการประเมินทรัพย์สิน (สำหรับช่าง/ผู้เกี่ยวข้อง)" },
  { name: "claim_create", label: "สร้างเคลม (คลัง)", description: "สร้างคำขอเคลมไปยังผู้จำหน่าย (สำหรับเจ้าหน้าที่คลัง)" },
  { name: "claim_view", label: "ดูรายการเคลม (ช่าง)", description: "ติดตามสถานะการเคลม (สำหรับช่าง/ผู้เกี่ยวข้อง)" },
  // ─── Disposal / Defective (2-tier approval) ───
  { name: "disposal_request", label: "เปิดใบของเสีย", description: "เปิดใบของเสีย/ตัดจำหน่าย และเสนอวิธีจัดการ (คลัง/ช่าง/เจ้าของของ)" },
  { name: "disposal_approve_l1", label: "อนุมัติของเสีย ชั้น 1", description: "ยืนยันว่าเสียจริง/เห็นชอบวิธีจัดการ (หัวหน้าฝ่ายเจ้าของของ)" },
  { name: "disposal_approve_l2", label: "อนุมัติของเสีย ชั้น 2", description: "อนุมัติขั้นสุดท้าย (ผู้จัดการทรัพย์สิน/ผู้บริหารคลัง)" },
  { name: "disposal_finance", label: "บัญชีรับทราบของเสีย", description: "ฝ่ายบัญชี เห็นทุกใบ + มูลค่า + ยืนยันรับทราบ (ข้ามฝ่าย)" },
  { name: "disposal_report", label: "รายงานของเสีย/จำหน่าย", description: "ดูรายงานสรุปการจำหน่าย/ทำลายของเสีย (ผู้บริหาร/ตรวจสอบ)" },
  // ─── Master Data Tabs (per-tab control) ───
  { name: "md_equipment", label: "MD: อุปกรณ์/อะไหล่", description: "Tab อุปกรณ์ในหน้าข้อมูลหลัก" },
  { name: "md_tools", label: "MD: เครื่องมือ", description: "Tab เครื่องมือในหน้าข้อมูลหลัก" },
  { name: "md_categories", label: "MD: หมวดหมู่", description: "Tab หมวดหมู่/หมวดหมู่ย่อย" },
  { name: "md_warehouses", label: "MD: คลังสินค้า", description: "Tab คลังสินค้า" },
  { name: "md_locations", label: "MD: ตำแหน่งจัดเก็บ", description: "Tab ตำแหน่งจัดเก็บ" },
  { name: "md_suppliers", label: "MD: ผู้จัดจำหน่าย", description: "Tab ผู้จัดจำหน่าย (Suppliers)" },
  { name: "md_contractors", label: "MD: ผู้รับเหมา", description: "Tab ผู้รับเหมา" },
  { name: "md_departments", label: "MD: ฝ่าย", description: "Tab ฝ่าย (Departments)" },
  { name: "md_sections", label: "MD: แผนก", description: "Tab แผนก (Sections)" },
  { name: "md_companies", label: "MD: บริษัท", description: "Tab บริษัท" },
  { name: "md_issue_purposes", label: "MD: วัตถุประสงค์เบิก", description: "Tab วัตถุประสงค์การเบิก" },
  { name: "md_receipt_purposes", label: "MD: วัตถุประสงค์รับ", description: "Tab วัตถุประสงค์การรับสินค้า" },
  { name: "md_technicians", label: "MD: ทะเบียนช่าง", description: "Tab ช่างและเครื่องมือประจำตัว" },
  { name: "md_pm_action_types", label: "MD: PM Action Types", description: "Tab ประเภท PM Action" },
  { name: "md_media_player", label: "MD: จัดการ Media Player", description: "Tab จัดการ Media Player + workflow lists" },
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
    if (isSuperAdmin) return SYSTEM_FUNCTIONS.map(f => f.name);
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
