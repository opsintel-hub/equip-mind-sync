import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 2: DIRECT SHIPPING — ส่งตรงจาก Supplier ไปปลายทาง
// ═══════════════════════════════════════════════════════════════
export const directShippingUAT: UATModule = {
  id: "direct-shipping",
  title: "Module 2: Direct Shipping (ส่งตรง)",
  description: "ตรวจ Loop การส่งของตรงจาก Supplier → ปลายทาง โดยไม่ผ่านคลังจริง",
  cases: [
    // ─────────── DS-TC-01 ───────────
    {
      id: "DS-TC-01",
      title: "สร้างคำขอส่งตรง (DS Request) พร้อมแนบ PR และพิกัด",
      scenario: "ฝ่ายจะให้ Supplier ส่งของไปติดตั้งที่ไซต์โดยตรง ต้องการ Track ผ่านระบบ",
      role: "Requester",
      menu: "ส่งตรง > สร้างคำขอส่งตรง",
      priority: "Critical",
      preconditions: [
        "Login ด้วยสิทธิ์ direct_shipping_entry",
        "มี Supplier และ Section ใน Master Data",
      ],
      testData: [
        "เลข PR: PR-2026-001",
        "Supplier: Supplier B",
        "ปลายทาง: 13.736717, 100.523186 (กรุงเทพ)",
        "ผู้รับ: คุณสมชาย / 081-234-5678",
      ],
      steps: [
        { no: 1, action: "ไปเมนู 'สร้างคำขอส่งตรง'" },
        { no: 2, action: "กรอกเลข PR + แนบไฟล์ PR" },
        { no: 3, action: "เลือก Supplier + กรอกรายการสินค้าที่จะให้ส่ง" },
        { no: 4, action: "กรอก Lat/Lng ปลายทาง", expected: "แผนที่ OpenStreetMap แสดง marker" },
        { no: 5, action: "กรอกชื่อผู้รับ + เบอร์" },
        { no: 6, action: "กด 'ส่งคำขอ'" },
      ],
      acceptanceCriteria: [
        "ได้เลข DS-YYYYMMDD-XXX",
        "สถานะ = 'รออนุมัติ'",
        "DSTimeline แสดง Step 1/5",
        "Manager ของฝ่ายเดียวกันเห็นคำขอ",
      ],
      crossCheck: [
        { menu: "ส่งตรง > อนุมัติส่งตรง", verify: "Manager เห็นคำขอใหม่" },
      ],
    },

    // ─────────── DS-TC-02 ───────────
    {
      id: "DS-TC-02",
      title: "Manager อนุมัติคำขอส่งตรง",
      scenario: "Manager ตรวจ + อนุมัติคำขอ DS",
      role: "Manager",
      menu: "ส่งตรง > อนุมัติส่งตรง",
      priority: "High",
      preconditions: ["มี DS สถานะ 'รออนุมัติ' จาก DS-TC-01"],
      steps: [
        { no: 1, action: "เปิดเมนู 'อนุมัติส่งตรง' → ตรวจรายการ" },
        { no: 2, action: "เปิด PDF ของ PR ที่แนบมา → กด 'อนุมัติ'" },
      ],
      acceptanceCriteria: [
        "DS เปลี่ยนเป็น 'รอจัดซื้อ'",
        "ฝ่ายจัดซื้อเห็นในเมนู 'จัดซื้อส่งตรง'",
      ],
    },

    // ─────────── DS-TC-03 ───────────
    {
      id: "DS-TC-03",
      title: "จัดซื้อแนบ PO + ออก Public Link สำหรับ Supplier",
      scenario: "ฝ่ายจัดซื้อแนบ PO และส่งลิงก์ให้ Supplier ดูรายการ",
      role: "Procurement",
      menu: "ส่งตรง > จัดซื้อส่งตรง",
      priority: "High",
      preconditions: ["มี DS 'รอจัดซื้อ'"],
      steps: [
        { no: 1, action: "เปิดเมนู 'จัดซื้อส่งตรง' → เลือก DS" },
        { no: 2, action: "กรอกเลข PO + แนบไฟล์ PO + ระบุวันที่คาดว่าจะถึง" },
        { no: 3, action: "กด 'ยืนยันจัดส่ง' → ระบบสร้าง Public Link" },
        { no: 4, action: "Copy ลิงก์ → เปิดใน Incognito → ตรวจว่า Supplier เห็นรายการได้" },
      ],
      acceptanceCriteria: [
        "DS สถานะ = 'จัดส่งแล้ว'",
        "Public Link เปิดได้โดยไม่ต้อง Login",
        "Virtual Receipt + Issue ถูกสร้างใน background (สำหรับ Stock Card)",
      ],
      crossCheck: [
        { menu: "Public View", verify: "Supplier เห็นรายการ + Map" },
      ],
    },

    // ─────────── DS-TC-04 ───────────
    {
      id: "DS-TC-04",
      title: "ผู้รับปลายทางยืนยันรับสินค้า",
      scenario: "ผู้รับที่ไซต์ตรวจรับ + ยืนยันใน Delivery Confirmation",
      role: "Receiver",
      menu: "เบิก/ส่ง > ยืนยันรับสินค้า",
      priority: "Critical",
      preconditions: ["มี DS สถานะ 'จัดส่งแล้ว'"],
      steps: [
        { no: 1, action: "เปิดเมนู 'ยืนยันรับสินค้า' → กรอง DS" },
        { no: 2, action: "เปิดรายการ → กรอกจำนวนรับจริง + อัปโหลดรูป" },
        { no: 3, action: "กด 'ยืนยันรับครบ'" },
      ],
      acceptanceCriteria: [
        "DS สถานะ = 'ยืนยันแล้ว / ปิด'",
        "DSTimeline แสดง 100%",
      ],
    },

    // ─────────── DS-TC-05 ───────────
    {
      id: "DS-TC-05",
      title: "Manager ปฏิเสธคำขอ DS",
      scenario: "Manager ตรวจพบข้อมูลไม่ถูกต้อง → ปฏิเสธพร้อมเหตุผล",
      role: "Manager",
      menu: "ส่งตรง > อนุมัติส่งตรง",
      priority: "Medium",
      preconditions: ["มี DS 'รออนุมัติ'"],
      steps: [
        { no: 1, action: "เปิด DS → กดปุ่ม 'ปฏิเสธ'" },
        { no: 2, action: "กรอกเหตุผลปฏิเสธ → ยืนยัน" },
      ],
      acceptanceCriteria: [
        "DS สถานะ = 'ปฏิเสธ'",
        "ผู้ขอเห็นเหตุผลปฏิเสธ",
      ],
    },
  ],
};
