import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 5: AD MANAGEMENT (จัดการภาพโฆษณา)
// ═══════════════════════════════════════════════════════════════
export const adManagementUAT: UATModule = {
  id: "ad-management",
  title: "Module 5: ภาพโฆษณา (Ad Management)",
  description: "ตรวจ Loop ภาพโฆษณา 3 ประเภท (ใหม่/เก่า/ฝาก) → รับ → เบิก → ส่งให้ผู้รับเหมาผ่าน Public Link + PIN",
  cases: [
    // ─────────── AD-TC-01 ───────────
    {
      id: "AD-TC-01",
      title: "นำเข้าภาพโฆษณาใหม่ (New)",
      scenario: "นำเข้าภาพโฆษณา 'น้ำดื่ม X' พร้อม 2 versions และเลือกป้ายปลายทาง",
      role: "Marketing",
      menu: "ภาพโฆษณา > นำเข้าภาพโฆษณา > ภาพใหม่",
      priority: "Critical",
      preconditions: [
        "มี Ad Size, Media Type, Contractor (ทีมติดตั้ง) ใน Master Data",
        "มี ป้ายโฆษณา ≥ 1 ที่ active",
      ],
      testData: [
        "ชื่อ: น้ำดื่ม X",
        "Versions: A (10 ผืน), B (5 ผืน)",
        "Size: 5x10 m",
        "Media Type: Inkjet",
        "ทีมติดตั้ง: Contractor A",
      ],
      steps: [
        { no: 1, action: "เปิดเมนู → 'ภาพใหม่'" },
        { no: 2, action: "กรอกชื่อ → กรอก Versions (ชื่อ + จำนวน)", expected: "Total Quantity = ผลรวม" },
        { no: 3, action: "อัปโหลดรูปภาพ ≥ 1 รูป" },
        { no: 4, action: "เลือก Size + Media Type + วันที่ติดตั้งเป้าหมาย + ทีมติดตั้ง" },
        { no: 5, action: "เลือกป้ายปลายทาง (เดี่ยว / Package)" },
        { no: 6, action: "(ถ้ามี) แนบเอกสารประกอบ + Notes → 'บันทึก'" },
      ],
      acceptanceCriteria: [
        "ได้เลข AD-YYYYMMDD-XXX",
        "สถานะ = 'รอรับเข้า' (pending)",
        "แสดงในรายการพร้อมปุ่ม 'แก้ไข' (เพราะยัง pending)",
        "Dashboard นับยอดเพิ่ม 1",
      ],
    },

    // ─────────── AD-TC-02 ───────────
    {
      id: "AD-TC-02",
      title: "แก้ไขภาพโฆษณา (เฉพาะตอนยัง Pending)",
      scenario: "ผู้ใช้คีย์ผิด ต้องการแก้ไขภายในก่อนรับเข้าคลัง",
      role: "Marketing",
      menu: "ภาพโฆษณา > นำเข้าภาพโฆษณา > รายการ",
      priority: "High",
      preconditions: ["มี AD จาก AD-TC-01 สถานะ pending"],
      steps: [
        { no: 1, action: "หา AD ในรายการ → กดปุ่มแก้ไข (ดินสอ)" },
        { no: 2, action: "แก้ Versions / ป้าย / รูป → บันทึก" },
      ],
      acceptanceCriteria: [
        "ข้อมูลเปลี่ยนตามที่แก้",
        "ad_versions, ad_target_billboards ถูก replace ถูกต้อง",
      ],
    },

    // ─────────── AD-TC-03 ───────────
    {
      id: "AD-TC-03",
      title: "นำเข้าภาพโฆษณาฝากชั่วคราว (Temporary)",
      scenario: "Contractor ฝากภาพไว้ก่อน → ระบบเริ่มนับ retention countdown",
      role: "Marketing",
      menu: "ภาพโฆษณา > นำเข้าภาพโฆษณา > ฝากชั่วคราว",
      priority: "Medium",
      preconditions: ["มี Master Data ที่จำเป็น"],
      steps: [
        { no: 1, action: "เปิด 'ฝากชั่วคราว' → กรอกชื่อ + Contractor + จำนวน" },
        { no: 2, action: "ระบุระยะจัดเก็บ (Retention Days) เช่น 30 วัน" },
        { no: 3, action: "อัปโหลดรูป + บันทึก" },
      ],
      acceptanceCriteria: [
        "AD ถูกสร้างประเภท temporary",
        "retention_start_date ถูกตั้งวันที่นำเข้า",
        "Dashboard แสดงเงื่อนไข retention",
      ],
      crossCheck: [
        { menu: "Notification Center", verify: "ใกล้หมดเวลาจะแจ้งเตือน" },
      ],
    },

    // ─────────── AD-TC-04 ───────────
    {
      id: "AD-TC-04",
      title: "รับเข้าคลัง + Auto-create ใบเบิก",
      scenario: "Warehouse รับภาพเข้าคลัง → ระบบสร้างคำขอเบิกอัตโนมัติ",
      role: "Warehouse Staff",
      menu: "ภาพโฆษณา > รับเข้าคลังภาพ",
      priority: "Critical",
      preconditions: ["มี AD สถานะ pending จาก AD-TC-01"],
      steps: [
        { no: 1, action: "เปิดเมนู → เลือก AD ที่จะรับ" },
        { no: 2, action: "ระบุตำแหน่งจัดเก็บ + วันเข้าคลัง → ยืนยัน" },
      ],
      acceptanceCriteria: [
        "AD เปลี่ยนสถานะ → 'พร้อมเบิก'",
        "ระบบสร้าง ad_issue_request อัตโนมัติ (ถ้าตั้ง)",
      ],
    },

    // ─────────── AD-TC-05 ───────────
    {
      id: "AD-TC-05",
      title: "เบิกภาพ + ส่งให้ Contractor ผ่าน Public Link + PIN",
      scenario: "เจ้าหน้าที่จ่ายภาพให้ Contractor → ส่งลิงก์ PIN ให้ Contractor confirm รับ",
      role: "Warehouse Staff + Contractor",
      menu: "ภาพโฆษณา > เบิกโฆษณา + Public Link",
      priority: "Critical",
      preconditions: ["มี AD พร้อมเบิก + Contractor มี Email/Phone"],
      steps: [
        { no: 1, action: "เปิดเบิกโฆษณา → เลือกรายการ → กด 'จ่ายให้ Contractor'" },
        { no: 2, action: "ระบบสร้าง PIN 4 หลัก + ลิงก์", expected: "Toast แสดง PIN + ลิงก์ Copy ได้" },
        { no: 3, action: "Contractor: เปิดลิงก์ใน Incognito → กรอก PIN" },
        { no: 4, action: "Contractor: ตรวจรายการ → กรอกชื่อผู้รับ → 'ยืนยันรับ'" },
      ],
      acceptanceCriteria: [
        "ad_issue_request สถานะ → confirmed",
        "confirmed_by_name + confirmed_at บันทึก",
        "Dashboard แสดงสถานะใหม่",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร", verify: "ค้นเลขใบเบิกโฆษณาเจอ + แสดงสถานะ confirmed" },
      ],
    },

    // ─────────── AD-TC-06 ───────────
    {
      id: "AD-TC-06",
      title: "Contractor View — ดูภาพที่ตัวเองได้รับ",
      scenario: "Contractor เปิดหน้าของตัวเองเพื่อดูทุก AD ที่ตัวเองได้รับ",
      role: "Contractor",
      menu: "ภาพโฆษณา > Contractor View (Public)",
      priority: "Medium",
      preconditions: ["Contractor มี access pin ที่เคยได้รับ"],
      steps: [
        { no: 1, action: "เปิด URL → กรอก PIN ของตัวเอง" },
        { no: 2, action: "ดูรายการ AD ที่ได้รับทั้งหมด" },
      ],
      acceptanceCriteria: [
        "เห็นเฉพาะ AD ของตัวเอง",
        "เห็นรูป + ป้ายปลายทาง",
      ],
    },
  ],
};
