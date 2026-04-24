import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 6: TOOLS, REPORTS & ADMIN
// ═══════════════════════════════════════════════════════════════
export const toolsReportsAdminUAT: UATModule = {
  id: "tools-reports-admin",
  title: "Module 6: เครื่องมือ + รายงาน + ผู้ดูแลระบบ",
  description: "ตรวจระบบ Tool PM, KPI, Stock Card, ค้นหาเอกสาร, Master Data และ User Management",
  cases: [
    // ─────────── TR-TC-01 ───────────
    {
      id: "TR-TC-01",
      title: "Tool PM — สร้างตารางบำรุงเครื่องมือ",
      scenario: "ตั้งตาราง PM ของเครื่องมือ T-001 ทุก 30 วัน",
      role: "Tool Manager",
      menu: "เครื่องมือ > Tool PM Schedule",
      priority: "High",
      preconditions: ["มี Tool T-001 + Technician + PM Type ใน Master Data"],
      steps: [
        { no: 1, action: "เปิด Tool PM Schedule → 'สร้างใหม่'" },
        { no: 2, action: "เลือก Tool + PM Type + Interval (30 วัน)" },
        { no: 3, action: "บันทึก" },
      ],
      acceptanceCriteria: [
        "ตารางแสดงในรายการ",
        "Tool PM Tasks สร้างงานครั้งถัดไปอัตโนมัติเมื่อถึงกำหนด",
      ],
      crossCheck: [
        { menu: "เครื่องมือ > Tool PM Tasks", verify: "เห็นงาน Pending" },
      ],
    },

    // ─────────── TR-TC-02 ───────────
    {
      id: "TR-TC-02",
      title: "Tool PM — ปิดงาน PM",
      scenario: "Technician ทำ PM เสร็จ → ลงผล",
      role: "Technician",
      menu: "เครื่องมือ > Tool PM Tasks",
      priority: "Medium",
      preconditions: ["มี Tool PM Task pending"],
      steps: [
        { no: 1, action: "เปิดงาน → กรอกผล + รูป → ปิดงาน" },
      ],
      acceptanceCriteria: [
        "งานเปลี่ยนเป็น Completed",
        "ปรากฏใน Tool PM History",
        "งานครั้งถัดไปคำนวณวันใหม่อัตโนมัติ",
      ],
    },

    // ─────────── TR-TC-03 ───────────
    {
      id: "TR-TC-03",
      title: "ค้นหาเอกสาร (Document Search) ครอบคลุม 7 ประเภท",
      scenario: "ทดสอบค้นหาเอกสารทุกประเภทที่ระบบรองรับ",
      role: "Any User",
      menu: "ค้นหาเอกสาร",
      priority: "Critical",
      preconditions: ["มีเอกสารแต่ละประเภทใน DB"],
      steps: [
        { no: 1, action: "เปิดเมนู → ค้นด้วยเลข PD → ตรวจผล" },
        { no: 2, action: "ค้นด้วย GI / DC / DS / AD / IS (ใบเบิกโฆษณา)" },
        { no: 3, action: "ใช้ Filter ประเภท / สถานะ / ฝ่าย" },
      ],
      acceptanceCriteria: [
        "ค้นเจอครบ 7 ประเภท: PD, GR (legacy), GI, DC, DS, AD, IS",
        "Badge สีถูกต้องตามประเภท",
        "คลิกเปิดรายละเอียดได้",
      ],
    },

    // ─────────── TR-TC-04 ───────────
    {
      id: "TR-TC-04",
      title: "Stock Card + Movement Log",
      scenario: "ดูประวัติการเคลื่อนไหวสินค้ารายตัว",
      role: "Manager",
      menu: "รายงาน > Stock Card",
      priority: "High",
      preconditions: ["มี Equipment ที่มี movements"],
      steps: [
        { no: 1, action: "เปิดเมนู → ค้นหา Equipment LED 200W" },
        { no: 2, action: "ตรวจแท็บ 'รายการ' ทั้งหมด" },
        { no: 3, action: "ตรวจแท็บ 'ภาพรวม' (Movement Log แบบ aggregate)" },
        { no: 4, action: "Export Excel" },
      ],
      acceptanceCriteria: [
        "Movement timeline ครบ + balance ถูกต้อง",
        "Export Excel ทำงาน",
        "Filter ฝ่าย/Location ทำงาน",
      ],
    },

    // ─────────── TR-TC-05 ───────────
    {
      id: "TR-TC-05",
      title: "KPI Report — เปิดแต่ละการ์ด",
      scenario: "Manager ดู KPI Dashboard ครบทุกตัว",
      role: "Manager",
      menu: "รายงาน > KPI Report",
      priority: "Medium",
      preconditions: ["มีข้อมูลธุรกรรมในระบบ"],
      steps: [
        { no: 1, action: "เปิด KPI Report → ใช้ KPIToggleBar เปิด/ปิดแต่ละ KPI" },
        { no: 2, action: "ตรวจ KPI: Inventory Value, Dead Stock, Min Stock, Stock Turnover, Issue Punctuality, Billboard PM Compliance, Media Player Status, Expiry/Warranty" },
      ],
      acceptanceCriteria: [
        "แต่ละ KPI โหลดข้อมูลจริงจาก DB (ไม่ใช่ mock)",
        "Toggle จำได้สถานะ",
      ],
    },

    // ─────────── TR-TC-06 ───────────
    {
      id: "TR-TC-06",
      title: "Master Data — Department + Company linking",
      scenario: "Admin บันทึก Department + Company ที่ผูกกัน",
      role: "Super Admin",
      menu: "ข้อมูลหลัก",
      priority: "High",
      preconditions: ["Login Super Admin"],
      steps: [
        { no: 1, action: "ไปข้อมูลหลัก > Departments → เพิ่มฝ่าย" },
        { no: 2, action: "ไปข้อมูลหลัก > Companies → เพิ่มบริษัทผูกฝ่ายนั้น" },
        { no: 3, action: "ทดสอบในเมนู 'นำสินค้าเข้า' → เลือกฝ่าย → บริษัทถูกกรอง" },
      ],
      acceptanceCriteria: [
        "Company filter ทำงานตามฝ่าย",
        "Permissions ใช้ฝ่ายในการกรองข้อมูล",
      ],
    },

    // ─────────── TR-TC-07 ───────────
    {
      id: "TR-TC-07",
      title: "User Management — สร้าง User + กำหนดสิทธิ์ + กำหนดฝ่าย",
      scenario: "Admin สร้าง User Manager ฝ่ายทดสอบ",
      role: "Super Admin",
      menu: "Admin",
      priority: "Critical",
      preconditions: ["Login Super Admin"],
      steps: [
        { no: 1, action: "เปิด Admin > Users → สร้างใหม่" },
        { no: 2, action: "กรอก Email + Password + Role = Manager" },
        { no: 3, action: "ใน UserPermissionManager → เลือกฝ่าย + Functions ที่อนุญาต" },
        { no: 4, action: "บันทึก → ทดสอบ Login" },
      ],
      acceptanceCriteria: [
        "User Login ได้",
        "เห็นเฉพาะเมนูที่ได้สิทธิ์",
        "เห็นเฉพาะข้อมูลของฝ่ายที่ได้รับ",
      ],
    },

    // ─────────── TR-TC-08 ───────────
    {
      id: "TR-TC-08",
      title: "Reset Password (Admin)",
      scenario: "Admin รีเซ็ตรหัสผ่านให้ User",
      role: "Super Admin",
      menu: "Admin > Users",
      priority: "Medium",
      preconditions: ["มี User"],
      steps: [
        { no: 1, action: "เปิด User → กดปุ่ม Reset Password" },
        { no: 2, action: "ระบุรหัสใหม่ (≥ 8 ตัว) → ยืนยัน" },
      ],
      acceptanceCriteria: [
        "Edge function reset-user-password ทำงาน",
        "User Login ด้วยรหัสใหม่ได้",
        "บังคับ Min length 8 ตัว",
      ],
    },

    // ─────────── TR-TC-09 ───────────
    {
      id: "TR-TC-09",
      title: "Notification Center + Settings",
      scenario: "ตรวจการแจ้งเตือนแสดงครบ + ตั้งค่าได้",
      role: "Any User",
      menu: "Notification (Header) + Settings",
      priority: "Medium",
      preconditions: ["มีเหตุการณ์ที่ทำให้เกิด notifications (low stock, expiring, PM)"],
      steps: [
        { no: 1, action: "เปิดกระดิ่งบน Header → เห็นรายการ 4 หมวด" },
        { no: 2, action: "Dismiss notification → ตรวจว่าหายเฉพาะตัวเอง" },
        { no: 3, action: "เปิด Notification Settings → ปิด/เปิดประเภท" },
      ],
      acceptanceCriteria: [
        "Dismissal เป็น user-specific",
        "Settings บันทึกถาวร",
      ],
    },

    // ─────────── TR-TC-10 ───────────
    {
      id: "TR-TC-10",
      title: "Dashboard ผู้เบิก + Manager + Admin",
      scenario: "ตรวจ Dashboard แต่ละ Role แสดงข้อมูลถูก",
      role: "Multiple",
      menu: "Dashboard / Requester Dashboard",
      priority: "Medium",
      preconditions: ["มีข้อมูล ≥ 1 สำหรับแต่ละหมวด"],
      steps: [
        { no: 1, action: "Login Requester → เห็น Requester Dashboard" },
        { no: 2, action: "Login Manager → เห็น Dashboard หลัก พร้อม Charts" },
        { no: 3, action: "Login Admin → เห็น KPI ครบ" },
      ],
      acceptanceCriteria: [
        "Charts โหลดข้อมูลจริง",
        "Filter ฝ่าย/บริษัท ทำงาน",
      ],
    },
  ],
};
