import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 4: MEDIA PLAYER (เครื่องเล่นสื่อ)
// ═══════════════════════════════════════════════════════════════
export const mediaPlayerUAT: UATModule = {
  id: "media-player",
  title: "Module 4: Media Player",
  description: "ตรวจ Loop ครบ: Setup → Profile → Assessment → Claim → Swap → Report",
  cases: [
    // ─────────── MP-TC-01 ───────────
    {
      id: "MP-TC-01",
      title: "Setup Media Player ใหม่ (Master Data)",
      scenario: "Admin บันทึกข้อมูลเครื่อง MP เพื่อใช้ในการ Track ต่อไป",
      role: "Admin",
      menu: "ข้อมูลหลัก > จัดการ Media Player",
      priority: "Critical",
      preconditions: [
        "มี Brand, Category (Media Player), Spec, CMS Type ใน Master Data",
        "Login ด้วย Super Admin / Admin",
      ],
      testData: [
        "ชื่อเครื่อง: MP-TEST-001",
        "Brand: Brightsign",
        "CMS: BSN.cloud",
        "Spec: 4K HDR",
      ],
      steps: [
        { no: 1, action: "เปิดเมนู 'จัดการ Media Player' → 'เพิ่มเครื่องใหม่'" },
        { no: 2, action: "กรอกชื่อ + เลือก Brand + CMS + Model + Spec" },
        { no: 3, action: "อัปโหลดรูปเครื่อง (บังคับ)" },
        { no: 4, action: "บันทึก" },
      ],
      acceptanceCriteria: [
        "เครื่องแสดงในรายการ",
        "เห็นในเมนู 'นำสินค้าใหม่เข้าระบบ' (ในส่วน Media Player)",
      ],
    },

    // ─────────── MP-TC-02 ───────────
    {
      id: "MP-TC-02",
      title: "นำเข้า Media Player (พร้อม Serial)",
      scenario: "นำเข้าเครื่อง MP จริง 2 เครื่อง พร้อม S/N",
      role: "Warehouse Staff",
      menu: "รับเข้า > นำสินค้าใหม่เข้าระบบ (Media Player)",
      priority: "Critical",
      preconditions: ["มี MP-TEST-001 ใน Master Data"],
      steps: [
        { no: 1, action: "เปิดเมนู → เลือกแท็บ/ตัวเลือก 'Media Player'" },
        { no: 2, action: "เลือกเครื่อง MP-TEST-001 + กรอก S/N 2 ตัว + ราคา" },
        { no: 3, action: "เพิ่มลงตะกร้า → ส่ง" },
        { no: 4, action: "ไปรับเข้าคลัง → ยืนยัน" },
      ],
      acceptanceCriteria: [
        "ระบบสร้าง 2 records ใน media_players (1 รหัส : 2 เครื่อง)",
        "ทั้ง 2 เครื่องมี Profile แยกกัน เข้าถึงได้แยกได้",
      ],
      crossCheck: [
        { menu: "Media Player Profile", verify: "ค้นหา S/N เจอทั้ง 2 เครื่อง" },
      ],
    },

    // ─────────── MP-TC-03 ───────────
    {
      id: "MP-TC-03",
      title: "ดู Media Player Profile (รายเครื่อง)",
      scenario: "ตรวจหน้า Profile แสดงข้อมูลครบ: Spec, Lifespan, Movement, Journey",
      role: "Any User",
      menu: "Media Player > Profile",
      priority: "High",
      preconditions: ["มี MP record ที่มี movement"],
      steps: [
        { no: 1, action: "เปิดเมนู Profile → ค้นหาด้วย S/N" },
        { no: 2, action: "ตรวจแท็บ 'ข้อมูลทั่วไป' (Spec, Brand, Image)" },
        { no: 3, action: "ตรวจแท็บ 'Journey' (วงจรการใช้งาน)" },
        { no: 4, action: "ตรวจแท็บ 'Movement' (ประวัติการเคลื่อนย้าย)" },
        { no: 5, action: "กดปุ่ม Export PDF" },
      ],
      acceptanceCriteria: [
        "แสดง Usage Lifespan ที่คำนวณจาก installation_date",
        "Movement timeline เรียงตามเวลา",
        "PDF Export ทำงาน",
      ],
    },

    // ─────────── MP-TC-04 ───────────
    {
      id: "MP-TC-04",
      title: "Assessment Log — บันทึกการประเมินอาการเสีย",
      scenario: "ช่างประเมินเครื่อง MP เสีย → ลงผลการวินิจฉัย",
      role: "Technician",
      menu: "Media Player > Assessment Log",
      priority: "High",
      preconditions: ["มี MP record + มี Symptoms ใน Master Data"],
      steps: [
        { no: 1, action: "เปิดเมนู Assessment Log → 'สร้างใหม่'" },
        { no: 2, action: "เลือก MP → เลือก Symptom + กรอก Description" },
        { no: 3, action: "เลือก Assessment Result + Recommended Action" },
        { no: 4, action: "อัปโหลดรูป + เอกสาร → บันทึก" },
      ],
      acceptanceCriteria: [
        "ได้เลข Document No",
        "MP Profile แท็บ Journey แสดง Assessment ใหม่",
      ],
    },

    // ─────────── MP-TC-05 ───────────
    {
      id: "MP-TC-05",
      title: "Claim Tracker — เคลมประกัน",
      scenario: "ส่งเครื่องเคลม → ติดตามผล → คืนเข้าสต็อก",
      role: "Warehouse Manager",
      menu: "Media Player > Claim Tracker",
      priority: "High",
      preconditions: ["MP เครื่องนั้นยังอยู่ในประกัน"],
      steps: [
        { no: 1, action: "สร้างใหม่ → เลือก MP → กรอก Symptom + Supplier + Ticket No" },
        { no: 2, action: "ระบุ Warranty Status → บันทึก" },
        { no: 3, action: "เปลี่ยนสถานะเป็น Submitted → In Progress → Completed" },
        { no: 4, action: "เลือก Claim Result + กรอก Notes + วันที่คืน" },
      ],
      acceptanceCriteria: [
        "ProcessTracker แสดง stages ครบ",
        "MP Profile เห็น Claim history",
      ],
    },

    // ─────────── MP-TC-06 ───────────
    {
      id: "MP-TC-06",
      title: "Swap Wizard — สลับเครื่องเสีย ↔ เครื่องดี",
      scenario: "ถอดเครื่องเสียออกจากป้าย + ติดตั้งเครื่องใหม่ทดแทน",
      role: "Field Technician",
      menu: "Media Player > Swap Wizard",
      priority: "Critical",
      preconditions: ["มีเครื่อง installed บนป้าย + มีเครื่อง in_stock พร้อมใช้"],
      steps: [
        { no: 1, action: "เปิด Swap Wizard → Step 1: เลือกเครื่องเก่าที่จะถอด" },
        { no: 2, action: "Step 2: เลือกเครื่องใหม่ที่จะติดตั้ง (in_stock)" },
        { no: 3, action: "Step 3: ระบุเหตุผล + รูปภาพ" },
        { no: 4, action: "Step 4: ตรวจสรุป → ยืนยัน Swap" },
      ],
      acceptanceCriteria: [
        "เครื่องเก่าสถานะ → defective หรือ in_stock (ตาม flow)",
        "เครื่องใหม่สถานะ → installed บนป้ายเดิม",
        "ป้ายแสดงเครื่องใหม่ในแท็บ Media Player",
        "เกิด 2 movements: uninstall + install",
      ],
      crossCheck: [
        { menu: "ป้ายโฆษณา > Detail", verify: "เห็นเครื่องใหม่แทนเครื่องเก่า" },
        { menu: "MP Profile (เครื่องเก่า)", verify: "Journey เพิ่ม uninstall event" },
      ],
    },

    // ─────────── MP-TC-07 ───────────
    {
      id: "MP-TC-07",
      title: "รายงาน Media Player",
      scenario: "Manager ดูรายงานครอบคลุมทุกเครื่อง 1 row = 1 เครื่อง",
      role: "Manager",
      menu: "รายงาน > รายงาน Media Player",
      priority: "Medium",
      preconditions: ["มี MP records หลายเครื่อง"],
      steps: [
        { no: 1, action: "เปิดเมนู → ใช้ Filter (ฝ่าย/สถานะ/ป้าย)" },
        { no: 2, action: "Export Excel" },
      ],
      acceptanceCriteria: [
        "แสดง 1 row ต่อ 1 เครื่อง (physical unit)",
        "Filter ทำงานถูกต้อง",
        "Excel มีคอลัมน์ครบ",
      ],
    },
  ],
};
