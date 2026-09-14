import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FunctionPermission {
  function_name: string;
  can_access: boolean;
}

/**
 * SYSTEM_FUNCTIONS — เรียงตามลำดับเมนูจริงในแถบข้าง (AppSidebar)
 * `group` = ชื่อกลุ่มเมนูในแถบข้าง, `menu` = เมนูที่สิทธิ์นี้ควบคุม (ใช้ตรวจสอบความครบ)
 */
export interface SystemFunction {
  name: string;
  label: string;
  description: string;
  group: string;
  menu: string;
}

export const SYSTEM_FUNCTIONS: SystemFunction[] = [
  // ─── รับเข้า ───
  { name: "delivery_entry", label: "นำสินค้าเข้า", description: "สร้างรายการนำสินค้าเข้า (สำหรับผู้นำเข้า)", group: "รับเข้า", menu: "นำสินค้าใหม่เข้าระบบ" },
  { name: "goods_receipt", label: "รับเข้าคลัง", description: "รับเข้าคลัง, จัดการ Media, รายการรอรหัส (สำหรับเจ้าหน้าที่คลัง)", group: "รับเข้า", menu: "รับสินค้าเข้า (GR), รายการรอรหัส" },

  // ─── ส่งคืนของเสีย ───
  { name: "disposal_request", label: "เปิดใบของเสีย", description: "เปิดใบของเสีย/ตัดจำหน่าย และเสนอวิธีจัดการ (คลัง/ช่าง/เจ้าของของ)", group: "ส่งคืนของเสีย", menu: "นำของเสียเข้าระบบ, ตัดจำหน่ายของหมดอายุ" },
  { name: "disposal_approve_l1", label: "อนุมัติของเสีย ชั้น 1", description: "ยืนยันว่าเสียจริง/เห็นชอบวิธีจัดการ (หัวหน้าฝ่ายเจ้าของของ)", group: "ส่งคืนของเสีย", menu: "อนุมัติจัดการของเสีย" },
  { name: "disposal_approve_l2", label: "อนุมัติของเสีย ชั้น 2", description: "อนุมัติขั้นสุดท้าย (ผู้จัดการทรัพย์สิน/ผู้บริหารคลัง)", group: "ส่งคืนของเสีย", menu: "อนุมัติจัดการของเสีย" },
  { name: "disposal_finance", label: "บัญชีรับทราบของเสีย", description: "ฝ่ายบัญชี เห็นทุกใบ + มูลค่า + ยืนยันรับทราบ (ข้ามฝ่าย)", group: "ส่งคืนของเสีย", menu: "อนุมัติจัดการของเสีย" },
  { name: "disposal_report", label: "รายงานของเสีย/จำหน่าย", description: "ดูรายงานสรุปการจำหน่าย/ทำลายของเสีย (ผู้บริหาร/ตรวจสอบ)", group: "ส่งคืนของเสีย", menu: "รายงานของเสีย/จำหน่าย" },
  { name: "disposal_audit_view", label: "ดู Audit Log ของเสีย", description: "ดูประวัติการดำเนินการทุกขั้นของใบของเสีย (บัญชี/ผู้ตรวจสอบ)", group: "ส่งคืนของเสีย", menu: "แท็บ Audit ในอนุมัติจัดการของเสีย" },

  // ─── เบิก-จ่าย ───
  { name: "issue_request", label: "ขอเบิกสินค้า", description: "ส่งคำขอเบิกสินค้า (สำหรับผู้เบิก)", group: "เบิก-จ่าย", menu: "ขอเบิกสินค้า, Dashboard ผู้เบิก" },
  { name: "manager_approval", label: "อนุมัติเบิกทรัพย์สิน", description: "อนุมัติคำขอเบิกสินค้าที่เป็นทรัพย์สิน (เฉพาะ Manager)", group: "เบิก-จ่าย", menu: "อนุมัติเบิกทรัพย์สิน" },
  { name: "goods_issue", label: "จ่ายสินค้า", description: "จ่ายสินค้าตามคำขอ (สำหรับเจ้าหน้าที่คลัง)", group: "เบิก-จ่าย", menu: "จ่ายสินค้า, แผนจัดเตรียม, คำขอรอสินค้า, รอระบุป้าย/รอคืน, ยืมข้ามบริษัท" },
  { name: "delivery_confirm", label: "ยืนยันรับสินค้า", description: "ยืนยันการรับสินค้าที่จัดส่งพร้อมแจ้งปัญหา", group: "เบิก-จ่าย", menu: "ยืนยันรับสินค้า" },

  // ─── ส่งตรง ───
  { name: "direct_shipping_request", label: "ขอส่งตรง", description: "สร้างคำขอส่งสินค้าตรงจาก Supplier ไปปลายทาง (สำหรับผู้ขอ)", group: "ส่งตรง", menu: "ขอส่งตรง" },
  { name: "direct_shipping_approval", label: "อนุมัติส่งตรง", description: "อนุมัติ/ปฏิเสธคำขอส่งตรง (สำหรับ Manager)", group: "ส่งตรง", menu: "อนุมัติส่งตรง" },
  { name: "direct_shipping_procurement", label: "จัดซื้อ-ส่งตรง", description: "ดำเนินการจัดซื้อและบันทึกการส่งตรง (สำหรับเจ้าหน้าที่จัดซื้อ)", group: "ส่งตรง", menu: "จัดซื้อ-ดำเนินการ" },

  // ─── โอนย้ายและยืม ───
  { name: "transfer", label: "โอนย้ายสินค้า", description: "โอนย้ายสินค้าระหว่างสถานที่", group: "โอนย้ายและยืม", menu: "ประวัติการย้าย" },

  // ─── ป้ายโฆษณา ───
  { name: "billboards", label: "ป้ายโฆษณา", description: "จัดการข้อมูลป้ายโฆษณา", group: "ป้ายโฆษณา", menu: "รายการป้ายโฆษณา, จัดการ Package ป้าย" },
  { name: "pm_schedule", label: "PM ป้ายโฆษณา", description: "จัดการตารางบำรุงรักษาป้ายโฆษณา", group: "ป้ายโฆษณา", menu: "แจ้ง PM ป้ายโฆษณา, ประวัติแจ้ง PM" },

  // ─── ภาพโฆษณา ───
  { name: "ad_entry", label: "นำเข้าภาพโฆษณา", description: "กรอกข้อมูลภาพโฆษณาเข้าระบบ (ภาพใหม่, ฝากชั่วคราว, ภาพเก่า)", group: "ภาพโฆษณา", menu: "นำเข้าภาพโฆษณา" },
  { name: "ad_issue_request", label: "เบิกภาพโฆษณา", description: "สร้างคำขอเบิกภาพโฆษณา (สำหรับผู้เบิก)", group: "ภาพโฆษณา", menu: "เบิกภาพโฆษณา" },
  { name: "ad_warehouse", label: "คลังภาพโฆษณา", description: "รับเข้าคลัง + จ่ายภาพโฆษณาออก (สำหรับเจ้าหน้าที่คลัง)", group: "ภาพโฆษณา", menu: "รับเข้าคลังภาพ, จ่ายภาพโฆษณา" },

  // ─── เครื่องมือ ───
  { name: "equipment_pm", label: "เครื่องมือ & PM เครื่องมือ", description: "ข้อมูลเครื่องมือ, เบิก-คืนเครื่องมือ, ตาราง/งาน/ประวัติ/รายงาน PM", group: "เครื่องมือ", menu: "ข้อมูลเครื่องมือ, เบิก-คืนเครื่องมือ, PM เครื่องมือ" },

  // ─── Swap & ซ่อมบำรุง ───
  { name: "swap_request_create", label: "แจ้ง Swap (ช่าง)", description: "สร้างคำขอ Swap จากหน้างาน (สำหรับช่าง)", group: "Swap & ซ่อมบำรุง", menu: "Swap อุปกรณ์/MP — แท็บแจ้งใหม่" },
  { name: "swap_request_manage", label: "จัดการ Swap (คลัง)", description: "ดูและดำเนินการคำขอ Swap (สำหรับเจ้าหน้าที่คลัง)", group: "Swap & ซ่อมบำรุง", menu: "Swap อุปกรณ์/MP — แท็บรายการคำขอ" },
  { name: "assessment_view", label: "ดูรายการประเมิน (ช่าง)", description: "ดูรายการประเมินทรัพย์สิน (สำหรับช่าง/ผู้เกี่ยวข้อง)", group: "Swap & ซ่อมบำรุง", menu: "บันทึกการประเมิน — แท็บรายการ" },
  { name: "assessment_create", label: "บันทึกประเมิน (คลัง)", description: "บันทึกผลการประเมินทรัพย์สินที่ถูกถอน (สำหรับเจ้าหน้าที่คลัง)", group: "Swap & ซ่อมบำรุง", menu: "บันทึกการประเมิน — แท็บบันทึกใหม่" },
  { name: "claim_view", label: "ดูรายการเคลม (ช่าง)", description: "ติดตามสถานะการเคลม (สำหรับช่าง/ผู้เกี่ยวข้อง)", group: "Swap & ซ่อมบำรุง", menu: "ติดตามการเคลม — แท็บรายการ" },
  { name: "claim_create", label: "สร้างเคลม (คลัง)", description: "สร้างคำขอเคลมไปยังผู้จำหน่าย (สำหรับเจ้าหน้าที่คลัง)", group: "Swap & ซ่อมบำรุง", menu: "ติดตามการเคลม — แท็บสร้างใหม่" },

  // ─── รายงาน & ตรวจสอบ ───
  { name: "reports", label: "รายงานทั้งหมด", description: "ค้นหาเอกสาร, สินค้าคงคลัง, Stock Card, Dead Stock, KPI, รายงาน MP, รายงานซ่อมเอง, ร่าง PR", group: "รายงาน", menu: "กลุ่มรายงานทั้งหมด + ค้นหาเอกสาร + รายงาน MP" },
  { name: "activity_audit_view", label: "ดูประวัติการใช้งานระบบ", description: "ดู Audit Trail กลางทุกโมดูล — ใครทำ ถือสิทธิ์อะไร เปลี่ยนอะไร (บัญชี/ผู้ตรวจสอบ)", group: "รายงาน", menu: "ประวัติการใช้งานระบบ" },

  // ─── ตั้งค่าระบบ ───
  { name: "master_data", label: "ข้อมูลหลัก", description: "เข้าหน้าข้อมูลหลัก + MP/จอภาพ Profile (คุมราย Tab ด้านล่าง)", group: "ตั้งค่าระบบ", menu: "ข้อมูลหลัก, MP / จอภาพ Profile" },
  { name: "admin", label: "จัดการระบบ", description: "จัดการผู้ใช้และสิทธิ์, ตรวจสอบยอด Stock, นำเข้าข้อมูลเริ่มต้น, ทดสอบระบบ", group: "ตั้งค่าระบบ", menu: "จัดการผู้ใช้, ตรวจสอบยอด Stock, Import ข้อมูลเริ่มต้น, ทดสอบระบบ" },

  // ─── ข้อมูลหลัก: ราย Tab ───
  { name: "md_equipment", label: "MD: อุปกรณ์/อะไหล่", description: "Tab อุปกรณ์ในหน้าข้อมูลหลัก", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > อุปกรณ์" },
  { name: "md_media_player", label: "MD: จัดการ Media Player", description: "Tab จัดการ Media Player + workflow lists", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > Media Player" },
  { name: "md_tools", label: "MD: เครื่องมือ", description: "Tab เครื่องมือในหน้าข้อมูลหลัก", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > เครื่องมือ" },
  { name: "md_categories", label: "MD: หมวดหมู่", description: "Tab หมวดหมู่/หมวดหมู่ย่อย", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > หมวดหมู่" },
  { name: "md_warehouses", label: "MD: คลังสินค้า", description: "Tab คลังสินค้า", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > คลังสินค้า" },
  { name: "md_locations", label: "MD: ตำแหน่งจัดเก็บ", description: "Tab ตำแหน่งจัดเก็บ", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > ตำแหน่งจัดเก็บ" },
  { name: "md_suppliers", label: "MD: ผู้จัดจำหน่าย", description: "Tab ผู้จัดจำหน่าย (Suppliers)", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > ผู้จัดจำหน่าย" },
  { name: "md_contractors", label: "MD: ผู้รับเหมา", description: "Tab ผู้รับเหมา", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > ผู้รับเหมา" },
  { name: "md_companies", label: "MD: บริษัท", description: "Tab บริษัท", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > บริษัท" },
  { name: "md_departments", label: "MD: ฝ่าย", description: "Tab ฝ่าย (Departments)", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > ฝ่าย" },
  { name: "md_sections", label: "MD: แผนก", description: "Tab แผนก (Sections)", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > แผนก" },
  { name: "md_issue_purposes", label: "MD: วัตถุประสงค์เบิก", description: "Tab วัตถุประสงค์การเบิก", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > วัตถุประสงค์เบิก" },
  { name: "md_receipt_purposes", label: "MD: วัตถุประสงค์รับ", description: "Tab วัตถุประสงค์การรับสินค้า", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > วัตถุประสงค์รับ" },
  { name: "md_technicians", label: "MD: ทะเบียนช่าง", description: "Tab ช่างและเครื่องมือประจำตัว", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > ทะเบียนช่าง" },
  { name: "md_pm_action_types", label: "MD: PM Action Types", description: "Tab ประเภท PM Action", group: "ข้อมูลหลัก (ราย Tab)", menu: "ข้อมูลหลัก > PM Action Types" },
];

/** ลำดับกลุ่มตามแถบเมนูจริง */
export const FUNCTION_GROUP_ORDER: string[] = [
  "รับเข้า",
  "ส่งคืนของเสีย",
  "เบิก-จ่าย",
  "ส่งตรง",
  "โอนย้ายและยืม",
  "ป้ายโฆษณา",
  "ภาพโฆษณา",
  "เครื่องมือ",
  "Swap & ซ่อมบำรุง",
  "รายงาน",
  "ตั้งค่าระบบ",
  "ข้อมูลหลัก (ราย Tab)",
];

/** จัดกลุ่มสิทธิ์ตามลำดับเมนูจริง */
export const GROUPED_FUNCTIONS = FUNCTION_GROUP_ORDER.map((group) => ({
  group,
  functions: SYSTEM_FUNCTIONS.filter((f) => f.group === group),
})).filter((g) => g.functions.length > 0);



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
