import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 8: SEARCH & VERIFICATION
// การค้นหา, ตรวจ Update, Recheck Data, Audit Log, ประวัติ
// ═══════════════════════════════════════════════════════════════
export const searchVerificationUAT: UATModule = {
  id: "search-verification",
  title: "Module 8: ค้นหา ตรวจสอบ และ Verify ข้อมูล (Search & Audit)",
  description:
    "ทดสอบการค้นหาข้อมูลทุกรูปแบบ การ Recheck ความถูกต้องหลังธุรกรรม การดู Log ประวัติย้อนหลัง และการ Verify หลัง Swap",
  cases: [
    // ───────────────────────────────────────────
    // SRCH-TC-01 — ค้นหาเอกสารแบบรวมศูนย์
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-01",
      title: "ค้นหาเอกสารทุกประเภทจากเมนูเดียว (Document Search)",
      scenario:
        "ผู้ใช้ต้องการค้นหาเอกสารโดยจำได้แค่บางส่วน เช่น เลขเอกสารบางตัว หรือชื่อผู้ขอ ระบบต้องค้นข้ามทุกประเภทเอกสารได้",
      role: "Any User",
      menu: "ค้นหาเอกสาร (Document Search)",
      priority: "Critical",
      preconditions: ["มีเอกสารหลายประเภทในระบบ (PD, GR, IR, DS, AD-RCV, AD-ISS)"],
      testData: ["คำค้น: '20240'", "ชื่อผู้ขอ: 'สมชาย'"],
      steps: [
        { no: 1, action: "เข้าเมนู 'ค้นหาเอกสาร' (อันดับ 2 ใน sidebar)" },
        {
          no: 2,
          action: "พิมพ์เลขเอกสารบางส่วน '20240'",
          expected: "ผลลัพธ์แสดงทุกประเภทเอกสารที่มีเลขนี้ + Badge สีตามประเภท",
        },
        { no: 3, action: "เปลี่ยนคำค้นเป็นชื่อผู้ขอ 'สมชาย'", expected: "พบเอกสารทั้งหมดที่ผู้ขอชื่อสมชาย" },
        { no: 4, action: "เลือก Filter ประเภทเอกสาร = 'รับโฆษณา' เท่านั้น" },
        {
          no: 5,
          action: "เลือกช่วงวันที่ (Date Range Picker)",
          expected: "ผลลัพธ์ถูกกรองตามช่วงเวลา + Badge สีถูกต้อง",
        },
        { no: 6, action: "คลิก 1 รายการ", expected: "Navigate ไปหน้ารายละเอียดที่ถูกต้อง" },
      ],
      acceptanceCriteria: [
        "ค้นได้ครอบคลุม 7 ประเภทเอกสาร",
        "Badge สีต่างกันแยกประเภทชัดเจน",
        "Filter วันที่ + ประเภท + คำค้น ทำงานพร้อมกันได้",
      ],
      crossCheck: [
        { menu: "หน้าจริงของเอกสาร", verify: "ข้อมูลตรงกับที่ search แสดง" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-02 — ค้นหาด้วย S/N
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-02",
      title: "ค้นหาประวัติอุปกรณ์/Media Player ด้วย Serial Number",
      scenario:
        "ช่างต้องการรู้ว่า S/N นี้ผ่านป้ายไหนบ้าง, ปัจจุบันอยู่ที่ไหน, มีประวัติ Swap/Claim หรือไม่",
      role: "Engineer",
      menu: "Equipment Tracking Report / Media Player Profile",
      priority: "Critical",
      preconditions: ["มี S/N ที่เคยผ่านการติดตั้ง+ถอด+Swap หลายครั้ง"],
      testData: ["S/N ทดสอบ: 'MP-A001'"],
      steps: [
        { no: 1, action: "เข้าเมนู 'รายงานติดตามอุปกรณ์'" },
        { no: 2, action: "พิมพ์ S/N ในช่องค้นหา (ใช้ได้ทั้ง code, name, S/N)" },
        {
          no: 3,
          action: "ตรวจรายการที่พบ",
          expected: "แสดง S/N + ป้ายปัจจุบัน + สถานะ (installed/in_stock/defective)",
        },
        { no: 4, action: "คลิกเข้าไปดูประวัติ", expected: "Timeline แสดง install/uninstall/swap ครบทุกครั้ง" },
        {
          no: 5,
          action: "ไปหน้า Media Player Profile → ค้น S/N เดียวกัน",
          expected: "เห็น Spec, อายุการใช้งาน, รูป, เอกสาร, Journey ครบ",
        },
        {
          no: 6,
          action: "ทดสอบค้นด้วย S/N รูปแบบ '/' หรือ newline",
          expected: "ระบบ split serial parts ค้นเจอ (ผ่าน serialSearch util)",
        },
      ],
      acceptanceCriteria: [
        "ค้นด้วย S/N ได้จากทุกหน้าที่มี SearchableSelect",
        "ประวัติย้อนหลังครบทุกธุรกรรม",
        "Aliases (S/N รอง / multi-S/N) ค้นเจอด้วย",
      ],
      crossCheck: [
        { menu: "Stock Card", verify: "Movement ของ S/N นั้นตรงกับ Timeline" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-03 — Recheck หลัง Swap
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-03",
      title: "ตรวจความถูกต้องของข้อมูลหลัง Swap (Post-Swap Verification)",
      scenario:
        "หลังจาก Swap Wizard เสร็จ ต้องตรวจ 4 จุด: (1) ป้ายเป้าหมาย (2) Stock spare (3) Defective Return ของเก่า (4) Timeline ของ Swap",
      role: "Engineer + Warehouse",
      menu: "Multi-menu verification",
      priority: "Critical",
      preconditions: ["เพิ่งทำ Swap Wizard เสร็จ 1 รายการ"],
      steps: [
        { no: 1, action: "เปิด Swap Request ที่ทำเสร็จ → จดเลข Spare S/N + Old S/N + Billboard" },
        {
          no: 2,
          action: "[Check 1] เปิด Billboard Detail ของป้ายเป้าหมาย",
          expected: "Spare S/N ติดตั้งใหม่ + Old S/N ไม่อยู่ในรายการแล้ว",
        },
        {
          no: 3,
          action: "[Check 2] เปิด Stock Card ของ Spare",
          expected: "Movement type='swap_out' / quantity ลดลง 1",
        },
        {
          no: 4,
          action: "[Check 3] เข้า 'นำของเสียเข้าระบบ' (Defective Returns)",
          expected: "Old S/N เข้าคิวรอประเมินอัตโนมัติ + status='pending_assessment'",
        },
        {
          no: 5,
          action: "[Check 4] ไปดู Swap Execution Timeline",
          expected: "เวลา + ผู้ทำ + รูปก่อน/หลัง ครบ",
        },
        {
          no: 6,
          action: "ค้น Old S/N ใน Search → กดปุ่ม 'ส่งประเมิน'",
          expected: "Navigate ไป Assessment Log พร้อม prefill subject + อาการ",
        },
      ],
      acceptanceCriteria: [
        "ทั้ง 4 จุดข้อมูลตรงกัน",
        "ไม่มี orphaned record",
        "Old S/N ไหลต่อไปยัง Assessment ได้แบบไร้รอยต่อ",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร", verify: "ค้นเลข SWP-... เจอ" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-04 — ค้นหาป้ายและอุปกรณ์ที่ติดตั้ง
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-04",
      title: "ค้นหาป้ายโฆษณา + ดูอุปกรณ์ที่ติดตั้งปัจจุบัน",
      scenario:
        "Manager ต้องการตรวจสอบว่าป้ายไหนยังขาดอุปกรณ์ หรือมีอุปกรณ์ครบตามแพ็กเกจหรือยัง",
      role: "Manager",
      menu: "Billboards / Billboard Detail",
      priority: "High",
      preconditions: ["มีป้ายและการติดตั้งอุปกรณ์ครบ"],
      steps: [
        { no: 1, action: "เข้าเมนู 'ป้ายโฆษณา'" },
        { no: 2, action: "ใช้ Filter ตาม region/district/media_type" },
        { no: 3, action: "ค้นหาด้วย Old Code หรือ Location Name", expected: "พบป้ายตรงกับคำค้น" },
        { no: 4, action: "คลิกเข้าหน้า Billboard Detail" },
        {
          no: 5,
          action: "ดู section 'อุปกรณ์ที่ติดตั้ง' + 'Media Player ที่ติดตั้ง'",
          expected: "แสดง quantity, S/N, installation_date ครบ",
        },
        {
          no: 6,
          action: "เทียบกับ Billboard Package (ถ้ามี)",
          expected: "ระบบบอกได้ว่าครบ/ไม่ครบ vs Package template",
        },
      ],
      acceptanceCriteria: [
        "Filter หลายชั้นทำงานพร้อมกัน",
        "Asset list อัปเดต real-time",
        "Export รายงานอุปกรณ์ป้ายได้ (Excel)",
      ],
      crossCheck: [
        { menu: "Billboard Equipment Export", verify: "ไฟล์ Excel ตรงกับที่เห็นใน UI" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-05 — Stock Card รวม Movement
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-05",
      title: "ดู Stock Card + ตรวจ Movement Log แบบครบทุกประเภท",
      scenario:
        "ผู้ดูแลคลังต้องการ audit ว่า Stock ของอุปกรณ์ X ถูกต้องไหม โดยดูทุก Movement (in/out/transfer/adjust)",
      role: "Warehouse Staff",
      menu: "Stock Card",
      priority: "Critical",
      preconditions: ["มี Equipment ที่มี movement หลายประเภท"],
      steps: [
        { no: 1, action: "เข้า Stock Card → ค้น Equipment X" },
        {
          no: 2,
          action: "ดูแท็บ 'ภาพรวม'",
          expected: "เห็น quantity_in_stock + ราคาเฉลี่ย + วันหมดอายุที่ใกล้สุด",
        },
        {
          no: 3,
          action: "เปลี่ยนแท็บไป 'Movement Log'",
          expected: "แสดงทุก in/out พร้อม document_no + user + timestamp",
        },
        { no: 4, action: "ใช้ DepartmentMultiFilter เลือกหลายฝ่าย", expected: "Movement กรองตามฝ่าย" },
        { no: 5, action: "เลือกช่วงวันที่ (Date Range)" },
        { no: 6, action: "Export Stock Card เป็น Excel", expected: "ไฟล์มียอดเริ่มต้น+เคลื่อนไหว+ยอดคงเหลือถูกต้อง" },
        {
          no: 7,
          action: "ตรวจสอบสมการ: ยอดต้นงวด + รับเข้า - จ่ายออก = ยอดปลายงวด",
          expected: "ตัวเลขลงตัว ไม่มี discrepancy",
        },
      ],
      acceptanceCriteria: [
        "Movement Log ครบทุก document type",
        "Filter ทำงานถูกต้อง",
        "Export ตรงกับ UI",
        "ไม่มี movement ที่ orphaned (ไม่มี document อ้างอิง)",
      ],
      crossCheck: [
        { menu: "Document ต้นทาง (PD/GR/IR/DS)", verify: "เปิดเอกสารต้นทางจาก movement ได้" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-06 — Assessment + Claim history
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-06",
      title: "ค้นหาประวัติการประเมิน (Assessment) และเคลม (Claim) ของอุปกรณ์",
      scenario:
        "ก่อนจะส่งเคลมใหม่ ต้องเช็คว่าอุปกรณ์เครื่องนี้เคยถูกประเมิน/เคลมมาก่อนหรือไม่ เพื่อไม่ให้เคลมซ้ำ",
      role: "QC / Engineer",
      menu: "Assessment Log + Claim Tracker",
      priority: "High",
      preconditions: ["มีอุปกรณ์ที่ผ่าน assessment + claim หลายครั้ง"],
      steps: [
        { no: 1, action: "เข้า 'บันทึกการประเมินทรัพย์สิน' (/assessment)" },
        { no: 2, action: "ค้นด้วย S/N หรือเลข ASM-..." , expected: "เจอประวัติทุกครั้ง" },
        {
          no: 3,
          action: "เปิดรายการ → ดู symptom + diagnosis + recommended_action",
          expected: "ครบ พร้อมรูป/เอกสารแนบ",
        },
        { no: 4, action: "เปลี่ยนไปเมนู 'ติดตามการเคลม' (/claims)" },
        { no: 5, action: "ค้นด้วย S/N เดียวกัน", expected: "เห็น claim ทั้งหมดของเครื่อง" },
        {
          no: 6,
          action: "ตรวจ warranty status",
          expected: "Auto-fill warranty + supplier ถูกต้อง + status flow pending→submitted→returned→closed",
        },
      ],
      acceptanceCriteria: [
        "ประวัติเชื่อมโยงข้าม Assessment ↔ Claim ↔ Defective Return",
        "ไม่มี duplicate claim โดยไม่ตั้งใจ",
        "Warranty calculation ถูกต้อง",
      ],
      crossCheck: [
        { menu: "Equipment / MP profile", verify: "เห็นประวัติ Assessment+Claim บนหน้า profile" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-07 — Audit Log การแก้ไข (created_by/updated_at)
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-07",
      title: "ตรวจ Log ผู้แก้ไขข้อมูล (Who Changed What When)",
      scenario:
        "Admin ต้องการรู้ว่าใครแก้ไข Master Data ตัวไหน เมื่อไหร่ — ใช้ created_by, updated_at, และ logs (ถ้ามี)",
      role: "Admin",
      menu: "Master Data + Admin",
      priority: "High",
      preconditions: ["มี user หลายคนเคยแก้ไข master data"],
      steps: [
        { no: 1, action: "เปิด Master Data → เลือก Equipment" },
        {
          no: 2,
          action: "ดู column 'updated_at' ในตาราง",
          expected: "เห็นเวลาแก้ไขล่าสุด เรียงได้",
        },
        {
          no: 3,
          action: "(ถ้ามี audit log) เปิดประวัติการเปลี่ยนแปลง",
          expected: "เห็น user_id + ฟิลด์ที่เปลี่ยน + ค่าเดิม/ใหม่",
        },
        {
          no: 4,
          action: "ทดสอบ: แก้ไข 1 รายการ → reload → ดู updated_at",
          expected: "เวลาเปลี่ยนเป็นปัจจุบัน",
        },
        {
          no: 5,
          action: "ใช้ Document Search ค้นเอกสารของผู้ใช้คนนั้น",
          expected: "เห็นเอกสารที่ผู้ใช้สร้างทั้งหมด",
        },
      ],
      acceptanceCriteria: [
        "ทุกตารางมี created_by + updated_at",
        "ค่า updated_at อัปเดตอัตโนมัติผ่าน trigger",
        "Admin trace ได้ว่าใครทำอะไร",
      ],
      crossCheck: [
        { menu: "Admin > User Management", verify: "Map user_id เป็นชื่อจริงได้" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-08 — Recheck Notification + Dismissal
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-08",
      title: "ตรวจ Notification + ทดสอบ Dismiss/Snooze",
      scenario:
        "ผู้ใช้เห็นการแจ้งเตือน 'PM ถึงกำหนด' หลายรายการ ต้องสามารถซ่อนรายตัว (dismiss) หรือ snooze ได้ และ Recheck ว่าหายเฉพาะของตัวเอง",
      role: "Engineer",
      menu: "Notification Center + Settings",
      priority: "Medium",
      preconditions: ["มี PM ถึงกำหนดอย่างน้อย 3 รายการ"],
      steps: [
        { no: 1, action: "เปิด Notification Center (icon กระดิ่ง)" },
        { no: 2, action: "เห็น 3 รายการแจ้งเตือน PM" },
        { no: 3, action: "กด dismiss 1 รายการ", expected: "หายเฉพาะของ user คนนี้ (ใช้ notification_dismissals)" },
        {
          no: 4,
          action: "Login ด้วย user อื่น → ดู Notification เดียวกัน",
          expected: "ยังเห็นรายการที่ user แรก dismiss (เพราะเป็น per-user)",
        },
        { no: 5, action: "ไป Notification Settings → ปรับ advance days สำหรับ expiry" },
        {
          no: 6,
          action: "Recheck แจ้งเตือน",
          expected: "จำนวน notification เปลี่ยนตาม config",
        },
      ],
      acceptanceCriteria: [
        "Dismiss เป็น per-user ไม่กระทบคนอื่น",
        "Snooze มี expiration",
        "Settings มีผลกับ logic แจ้งเตือน",
      ],
      crossCheck: [
        { menu: "Database (notification_dismissals)", verify: "มี record ของ user + notification_id" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-09 — Edge Function Log (Tester)
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-09",
      title: "ดู Log ของ Edge Function (สำหรับ Admin debug)",
      scenario:
        "Admin สงสัยว่า Edge Function 'check-low-stock' ทำงานหรือไม่ ต้องดู log การรันได้",
      role: "Super Admin",
      menu: "Testing > Edge Function Tester",
      priority: "Medium",
      preconditions: ["Login ด้วย Super Admin"],
      steps: [
        { no: 1, action: "เข้าเมนู 'Testing' (/testing)" },
        { no: 2, action: "เลือก function 'check-low-stock'" },
        { no: 3, action: "กด 'Test Run' พร้อม payload ตัวอย่าง" },
        {
          no: 4,
          action: "ตรวจ response + log ที่แสดง",
          expected: "เห็น HTTP status, body, execution time",
        },
        {
          no: 5,
          action: "ตรวจว่า notification ถูกสร้างจริง",
          expected: "ไป Notification Center เห็น 'low stock' record ใหม่",
        },
        {
          no: 6,
          action: "(ถ้ามี) เปิด Log Viewer ของ Edge Function",
          expected: "เห็น console.log จาก function ตามเวลาจริง",
        },
      ],
      acceptanceCriteria: [
        "Test Run รัน function ได้จริง",
        "Log ครบเพียงพอที่จะ debug",
        "ผลลัพธ์ side-effect ตรวจสอบได้",
      ],
      crossCheck: [
        { menu: "Notification Center", verify: "Notification ถูกสร้างจาก function จริง" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-10 — ค้นหาคำขอเบิกของตนเอง (Requester Dashboard)
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-10",
      title: "Requester ค้นหาและติดตามสถานะคำขอของตนเอง",
      scenario:
        "ผู้ขอเบิกต้องการดูคำขอย้อนหลัง 30 วัน, สถานะ, และ filter เฉพาะที่ pending/approved/rejected",
      role: "Requester",
      menu: "แดชบอร์ดผู้เบิก (Requester Dashboard)",
      priority: "High",
      preconditions: ["Requester มีคำขอย้อนหลังอย่างน้อย 5 รายการ"],
      steps: [
        { no: 1, action: "เข้า 'แดชบอร์ดผู้เบิก'" },
        {
          no: 2,
          action: "ดูสถิติด้านบน",
          expected: "เห็นจำนวน Total/Pending/Approved/Rejected",
        },
        { no: 3, action: "Filter เฉพาะ 'Rejected'", expected: "เห็นเฉพาะที่ถูกปฏิเสธ + ปุ่มแก้ไข" },
        { no: 4, action: "ค้นด้วยเลขเอกสาร หรือชื่อสินค้า" },
        {
          no: 5,
          action: "เปิด 1 รายการ → ดู Timeline",
          expected: "เห็น created → approved → issued → confirmed ครบ",
        },
        {
          no: 6,
          action: "ตรวจ analytics ของรูปแบบการเบิก (Pattern Analysis)",
          expected: "กราฟแสดงสินค้าที่เบิกบ่อย + ความถี่",
        },
      ],
      acceptanceCriteria: [
        "Requester เห็นเฉพาะของตัวเอง (RLS)",
        "Filter + Search ทำงานถูกต้อง",
        "Timeline ครบทุก stage",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร", verify: "ค้นเลขเดียวกันได้ผลลัพธ์เดียวกัน" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-11 — PM History รายป้าย / รายเครื่องมือ
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-11",
      title: "ดูประวัติ PM ของป้ายโฆษณาและเครื่องมือ (PM History)",
      scenario:
        "Manager ต้องการรู้ว่าป้าย X ถูก PM ครั้งล่าสุดเมื่อไหร่ ทำอะไรไปบ้าง และตามมาตรฐานหรือไม่",
      role: "Manager",
      menu: "PM History (Billboard) + Tool PM History",
      priority: "High",
      preconditions: ["มีป้ายและเครื่องมือที่ทำ PM เสร็จแล้วหลายครั้ง"],
      steps: [
        { no: 1, action: "เข้า '/pm-history' (Billboard)" },
        { no: 2, action: "ค้นด้วย Old Code หรือ Location Name" },
        {
          no: 3,
          action: "ดูตารางประวัติ",
          expected: "แสดง action_label, pm_reason, ผู้ทำ, เวลา, รูป",
        },
        { no: 4, action: "เปลี่ยนไป '/tool-pm-history' (Tool)" },
        { no: 5, action: "ค้นด้วย Tool code → ดู inspector + result + notes" },
        {
          no: 6,
          action: "เปรียบเทียบ pm_interval_days vs ความถี่จริง",
          expected: "ตรวจ compliance — ทำตรงรอบหรือล่าช้า",
        },
      ],
      acceptanceCriteria: [
        "ประวัติย้อนหลังครบทุก PM cycle",
        "เชื่อมโยงไป snooze/skip ได้",
        "Export รายงาน PM ได้",
      ],
      crossCheck: [
        { menu: "KPI Report > BillboardPMComplianceKPI", verify: "ตัวเลข compliance ตรงกับประวัติจริง" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-12 — Verify หลัง Import ข้อมูลจำนวนมาก
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-12",
      title: "Recheck ความถูกต้องหลัง Import Excel จำนวนมาก",
      scenario:
        "Admin Import 500 records (เช่น Equipment) ต้อง verify ว่าเข้าครบ ไม่มีตกหล่น และข้อมูลตรงกับไฟล์ต้นฉบับ",
      role: "Admin",
      menu: "Master Data > Import + List",
      priority: "Critical",
      preconditions: ["มีไฟล์ Excel 500 แถวพร้อม Import"],
      steps: [
        { no: 1, action: "นับจำนวน record ก่อน Import (เช่น 1,200)" },
        { no: 2, action: "Import ไฟล์ 500 แถว" },
        {
          no: 3,
          action: "อ่านสรุปผลหลัง Import",
          expected: "แสดง 'success: 500, failed: 0' หรือรายงาน error ละเอียด",
        },
        { no: 4, action: "ไปที่หน้า List ของตารางนั้น → นับ record ใหม่", expected: "ต้องเป็น 1,700 (เพิ่ม 500)" },
        {
          no: 5,
          action: "Sample check 5 records แบบสุ่มจากไฟล์ต้นทาง vs UI",
          expected: "ค่าตรงกันทุกฟิลด์",
        },
        {
          no: 6,
          action: "Export ใหม่ + diff กับไฟล์เดิม",
          expected: "ไฟล์ที่ Export มี record ใหม่ครบ ไม่มีของเก่าหายไป",
        },
      ],
      acceptanceCriteria: [
        "จำนวน record ก่อน/หลัง ตรงกับสรุป",
        "ไม่มี record ตกหล่นหรือซ้ำ",
        "Export กลับได้ข้อมูลครบ (lossless)",
      ],
      crossCheck: [
        { menu: "Database (psql count)", verify: "SELECT COUNT(*) ตรงกับที่ UI แสดง" },
      ],
    },

    // ───────────────────────────────────────────
    // SRCH-TC-13 — ค้นหาข้ามภาษา / case-insensitive
    // ───────────────────────────────────────────
    {
      id: "SRCH-TC-13",
      title: "ค้นหาแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ + ค้นไทย/อังกฤษผสม",
      scenario:
        "ผู้ใช้พิมพ์คำค้นด้วย case ที่ต่างกัน หรือผสมไทย-อังกฤษ ระบบต้องค้นเจอเหมือนกัน",
      role: "Any User",
      menu: "ทุกหน้าที่มี search",
      priority: "Medium",
      preconditions: ["มีข้อมูลที่มีทั้งไทยและอังกฤษในชื่อ"],
      steps: [
        { no: 1, action: "ค้น 'led' (lowercase)", expected: "พบ 'LED 200W' (uppercase)" },
        { no: 2, action: "ค้น 'LED' (uppercase)", expected: "พบเหมือนกัน" },
        { no: 3, action: "ค้นชื่อภาษาไทย 'ป้าย' → พบทุกป้าย" },
        { no: 4, action: "ค้นผสม 'led ป้าย'", expected: "ระบบ AND ทุก term หรือ tokenize ได้" },
        { no: 5, action: "ทดสอบใน SearchableSelect ทุกหน้า", expected: "พฤติกรรมเดียวกันทุกที่" },
      ],
      acceptanceCriteria: [
        "Search case-insensitive ทุกหน้า",
        "Multi-language token ทำงานถูก",
        "ผลลัพธ์เรียงตามความเกี่ยวข้อง",
      ],
      crossCheck: [
        { menu: "Searchable Select component", verify: "พฤติกรรม consistent ทั่วระบบ" },
      ],
    },
  ],
};
