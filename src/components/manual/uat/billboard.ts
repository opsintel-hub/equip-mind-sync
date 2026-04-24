import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 3: BILLBOARD & PM (ป้ายโฆษณา + ซ่อมบำรุง)
// ═══════════════════════════════════════════════════════════════
export const billboardUAT: UATModule = {
  id: "billboard",
  title: "Module 3: ป้ายโฆษณา + PM",
  description: "ตรวจการจัดการป้าย ติดตั้ง/ถอดอุปกรณ์ Package Management และ PM Notification System",
  cases: [
    // ─────────── BB-TC-01 ───────────
    {
      id: "BB-TC-01",
      title: "เพิ่มป้ายใหม่ (Manual / Import / Sync)",
      scenario: "บันทึกป้ายใหม่ BB-TEST-001 พร้อมข้อมูลพื้นฐาน",
      role: "Admin",
      menu: "ป้ายโฆษณา > จัดการป้ายโฆษณา",
      priority: "Critical",
      preconditions: ["มี Department + Media Type ใน Master Data"],
      testData: ["Old Code: BB-TEST-001", "Location: Test Location", "Department: ฝ่ายทดสอบ"],
      steps: [
        { no: 1, action: "ไปเมนู 'จัดการป้ายโฆษณา' → กด 'เพิ่มป้าย'" },
        { no: 2, action: "กรอก Old Code, Equipment ID, Location Name, Department" },
        { no: 3, action: "เลือก Media Type, Size, Region, District" },
        { no: 4, action: "บันทึก" },
      ],
      acceptanceCriteria: [
        "ป้ายแสดงในรายการพร้อม QR Code",
        "Public View URL ใช้งานได้ (ไม่ต้อง Login)",
        "ค้นหา Old Code-Location ใน Dropdown ทุกที่ในระบบเจอ",
      ],
      crossCheck: [
        { menu: "ขอเบิกสินค้า > เลือกป้าย", verify: "เห็นป้ายใหม่ในตัวเลือก" },
      ],
    },

    // ─────────── BB-TC-02 ───────────
    {
      id: "BB-TC-02",
      title: "สร้าง Package + Assign ป้าย",
      scenario: "จัดกลุ่มป้ายตามแพ็กเกจสื่อ เพื่อใช้เลือกแบบกลุ่มในการเบิก/PM",
      role: "Admin",
      menu: "ป้ายโฆษณา > Billboard Packages",
      priority: "Medium",
      preconditions: ["มีป้าย ≥ 3 ป้ายที่จะ Assign"],
      steps: [
        { no: 1, action: "ไปเมนู Billboard Packages → 'สร้าง Package ใหม่'" },
        { no: 2, action: "กรอกชื่อ Package + Media Type + เลือกป้ายที่จะรวม" },
        { no: 3, action: "บันทึก" },
      ],
      acceptanceCriteria: [
        "Package ปรากฏในรายการ",
        "ในหน้าขอเบิก/ภาพโฆษณา 'BillboardPackageSelect' เลือก Package แล้วป้ายถูก Auto-fill",
      ],
    },

    // ─────────── BB-TC-03 ───────────
    {
      id: "BB-TC-03",
      title: "ดูรายละเอียดป้าย — Equipment, Media Player, Ad",
      scenario: "ตรวจว่าหน้า Detail แสดงข้อมูลครบ realtime",
      role: "Any User",
      menu: "ป้ายโฆษณา > เลือกป้าย",
      priority: "High",
      preconditions: ["ป้ายมี Equipment + Media Player + Ad ติดตั้งอยู่"],
      steps: [
        { no: 1, action: "เปิดป้ายจากรายการ" },
        { no: 2, action: "ตรวจแท็บ 'อุปกรณ์' → เห็น S/N + วันติดตั้ง + เงื่อนไข" },
        { no: 3, action: "ตรวจแท็บ 'Media Player' → เห็นเครื่องที่ติดตั้ง + Profile Link" },
        { no: 4, action: "ตรวจแท็บ 'ภาพโฆษณา' → เห็นภาพที่ติดบนป้ายปัจจุบัน" },
        { no: 5, action: "ตรวจ 'ประวัติอุปกรณ์' → เห็นรายการ uninstall ก่อนหน้า" },
      ],
      acceptanceCriteria: [
        "ทุกแท็บโหลดข้อมูล realtime",
        "QR Code Download ได้",
        "Public View URL ใช้งานได้จากปุ่มแชร์",
      ],
    },

    // ─────────── BB-TC-04 ───────────
    {
      id: "BB-TC-04",
      title: "PM Notification — สร้าง PM Action จากป้ายที่ถึงรอบ",
      scenario: "ระบบแจ้งป้ายที่ถึงรอบ PM → ผู้ใช้เลือกป้าย → ลง Action",
      role: "PM Officer",
      menu: "ป้ายโฆษณา > แจ้ง PM ป้ายโฆษณา",
      priority: "Critical",
      preconditions: ["มี PM Schedule ที่ถึงกำหนด หรือมี PM Action Type ใน Master Data"],
      steps: [
        { no: 1, action: "ไปเมนู 'แจ้ง PM ป้ายโฆษณา'" },
        { no: 2, action: "ใช้ Filter เลือกฝ่าย/ภูมิภาค/Route", expected: "เห็นเฉพาะป้ายที่ถึงรอบ" },
        { no: 3, action: "เลือกป้าย ≥ 1 → กด 'เพิ่มลงตะกร้า PM'" },
        { no: 4, action: "เปิดตะกร้า → เลือก PM Action Type + กรอกเหตุผล + Notes" },
        { no: 5, action: "กด 'บันทึก PM'" },
      ],
      acceptanceCriteria: [
        "แต่ละป้ายในตะกร้ามีบันทึก PM History",
        "Equipment Snapshot ถูกเก็บใน history (เห็นภายหลังได้)",
        "ป้ายที่ทำ PM แล้วหายจากรายการ Pending",
      ],
      crossCheck: [
        { menu: "ป้ายโฆษณา > ประวัติ PM", verify: "เห็นบันทึก PM ที่เพิ่งสร้าง" },
        { menu: "รายงาน KPI > Billboard PM Compliance", verify: "ตัวเลขอัปเดต" },
      ],
    },

    // ─────────── BB-TC-05 ───────────
    {
      id: "BB-TC-05",
      title: "Snooze (เลื่อน) PM ป้าย",
      scenario: "เลื่อนรอบ PM ของบางป้ายไปอีก 7 วัน",
      role: "PM Officer",
      menu: "ป้ายโฆษณา > แจ้ง PM ป้ายโฆษณา",
      priority: "Medium",
      preconditions: ["มีป้ายในตะกร้า PM"],
      steps: [
        { no: 1, action: "เลือกป้าย → กด Snooze → เลือกวันที่" },
        { no: 2, action: "ยืนยัน" },
      ],
      acceptanceCriteria: [
        "ป้ายไม่แสดงใน Pending จนกว่าถึงวัน Snooze",
      ],
    },

    // ─────────── BB-TC-06 ───────────
    {
      id: "BB-TC-06",
      title: "รายงานปัญหาป้าย (Billboard Issue Report)",
      scenario: "ทีมตรวจไซต์พบป้ายเสีย → รายงานเข้าระบบ",
      role: "Field Inspector",
      menu: "ป้ายโฆษณา > รายงานปัญหาป้าย",
      priority: "High",
      preconditions: ["มีป้ายในระบบ"],
      steps: [
        { no: 1, action: "เปิดเมนู → เลือกป้าย" },
        { no: 2, action: "กรอกปัญหา + อัปโหลดรูป" },
        { no: 3, action: "บันทึก" },
      ],
      acceptanceCriteria: [
        "รายการแสดงในประวัติ",
        "เชื่อมไปสร้าง PM ได้",
      ],
    },
  ],
};
