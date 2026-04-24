import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 1: INVENTORY (คลังสินค้า) — ครบ Loop ตั้งแต่นำเข้า → คืน
// ═══════════════════════════════════════════════════════════════
export const inventoryUAT: UATModule = {
  id: "inventory",
  title: "Module 1: คลังสินค้า (Inventory Lifecycle)",
  description: "ตรวจสอบการไหลของสินค้าครบ Loop: นำเข้า → รับเข้า → ขอเบิก → อนุมัติ → จ่าย → ยืนยัน → ของเสีย",
  cases: [
    // ─────────── INV-TC-01 ───────────
    {
      id: "INV-TC-01",
      title: "นำสินค้าใหม่เข้าระบบ (สินค้ามีในระบบแล้ว)",
      scenario: "ผู้ดูแลคลังได้รับสินค้า LED 200W จำนวน 10 ชิ้น ราคา 1,500 บาท/ชิ้น จาก Supplier A ต้องบันทึกเข้าระบบ",
      role: "Warehouse Staff",
      menu: "รับเข้า > นำสินค้าใหม่เข้าระบบ",
      priority: "Critical",
      preconditions: [
        "Login ด้วยสิทธิ์ที่มี function 'delivery_entry'",
        "มีสินค้า 'LED 200W' ใน Master Data แล้ว",
        "มี Supplier A ใน Master Data",
        "มีอย่างน้อย 1 บริษัท + ฝ่าย ที่ผูกกัน",
      ],
      testData: [
        "สินค้า: LED 200W",
        "จำนวน: 10",
        "ราคา/ชิ้น: 1500",
        "Supplier: A",
        "วัตถุประสงค์: ซื้อ",
      ],
      steps: [
        { no: 1, action: "ไปเมนู 'รับเข้า > นำสินค้าใหม่เข้าระบบ'" },
        { no: 2, action: "เลือก 'วัตถุประสงค์ = ซื้อ' → เลือก 'ฝ่าย' → เลือก 'บริษัทที่สั่งซื้อ' → กรอก 'ชื่อผู้ส่ง'", expected: "ฟิลด์บริษัทถูกกรองตามฝ่ายที่เลือก" },
        { no: 3, action: "ในส่วน 'เลือกสินค้าจากระบบ' → ค้นหาและเลือก 'LED 200W'" },
        { no: 4, action: "กรอก จำนวน=10, ราคา=1500, เลือก Supplier=A" },
        { no: 5, action: "(ถ้ามี) อัปโหลดเอกสาร PO/ใบส่งของในส่วน Document Upload" },
        { no: 6, action: "กดปุ่ม 'เพิ่มลงตะกร้า'", expected: "รายการแสดงในตะกร้าด้านขวา/ล่าง" },
        { no: 7, action: "ตรวจสอบรายการในตะกร้า → กด 'ส่งรายการที่เลือก'", expected: "Toast แจ้งสำเร็จ + ตะกร้าถูกล้าง" },
        { no: 8, action: "เลื่อนลง 'ประวัติการนำสินค้าเข้า' → ตรวจสอบเอกสาร PD ล่าสุด" },
      ],
      acceptanceCriteria: [
        "ระบบสร้างเลขเอกสาร 'PD-YYYYMMDD-XXX' อัตโนมัติ",
        "เอกสารแสดงสถานะ 'รอรับเข้า' (สีเหลือง)",
        "ProcessTracker แสดง Step 1/3 (นำเข้าแล้ว)",
        "Stock ของ LED 200W ยังไม่เพิ่ม (รอรับเข้าคลัง)",
      ],
      crossCheck: [
        { menu: "คลังสินค้า > รับเข้าคลัง", verify: "ต้องเห็นเอกสาร PD นี้ในรายการรอรับเข้า" },
        { menu: "ค้นหาเอกสาร", verify: "ค้นเลข PD แล้วต้องเจอ + แสดงสถานะถูกต้อง" },
      ],
    },

    // ─────────── INV-TC-02 ───────────
    {
      id: "INV-TC-02",
      title: "นำสินค้าใหม่เข้าระบบ (สินค้ายังไม่มี — สร้างรหัส TEMP)",
      scenario: "ได้รับสินค้าใหม่ที่ยังไม่ได้ลงทะเบียน ระบบต้องสร้างรหัส TEMP ให้อัตโนมัติเพื่อบันทึกได้ทันที",
      role: "Warehouse Staff",
      menu: "รับเข้า > นำสินค้าใหม่เข้าระบบ",
      priority: "High",
      preconditions: ["Login ด้วยสิทธิ์ delivery_entry", "หมวดหมู่สินค้ามีอยู่ใน Master Data"],
      testData: ["ชื่อสินค้าใหม่: Sensor Module XYZ-100", "หมวดหมู่: Electronics", "จำนวน: 5"],
      steps: [
        { no: 1, action: "ไปเมนู 'นำสินค้าใหม่เข้าระบบ'" },
        { no: 2, action: "เลือกวัตถุประสงค์, ฝ่าย, บริษัท, ผู้ส่ง" },
        { no: 3, action: "เลือกแท็บ/ปุ่ม 'สินค้าใหม่ (ยังไม่มีในระบบ)'" },
        { no: 4, action: "กรอกชื่อสินค้า, หมวดหมู่, หน่วย, จำนวน, ราคา" },
        { no: 5, action: "กด 'เพิ่มลงตะกร้า' → ส่งรายการ", expected: "ระบบสร้างรหัส TEMP-XXXXX อัตโนมัติ" },
      ],
      acceptanceCriteria: [
        "ได้รหัส TEMP-XXXXX แสดงในเอกสาร PD",
        "เอกสาร PD ปรากฏใน 'รายการรอกำหนดรหัส' (Pending Asset Codes)",
        "Admin ต้องสามารถกำหนดรหัสจริงให้ในภายหลังได้",
      ],
      crossCheck: [
        { menu: "Admin > Pending Asset Codes", verify: "เห็นรายการ TEMP รอกำหนดรหัสจริง" },
      ],
    },

    // ─────────── INV-TC-03 ───────────
    {
      id: "INV-TC-03",
      title: "รับสินค้าเข้าคลัง (Receive Goods) จากเอกสาร PD",
      scenario: "เจ้าหน้าที่คลังตรวจรับของจริง บันทึกตำแหน่งจัดเก็บ + S/N",
      role: "Warehouse Manager",
      menu: "รับเข้า > รับสินค้าเข้าคลัง",
      priority: "Critical",
      preconditions: ["มีเอกสาร PD รอรับเข้าจาก INV-TC-01", "มี Warehouse + Location อย่างน้อย 1 ที่"],
      testData: ["เอกสาร: PD จากเคสก่อน", "Warehouse: คลังหลัก", "Location: ชั้น A1"],
      steps: [
        { no: 1, action: "ไปเมนู 'รับสินค้าเข้าคลัง' → เลือกฝ่าย" },
        { no: 2, action: "ค้นหาเอกสาร PD ที่สร้างใน TC-01 → เปิดดู" },
        { no: 3, action: "เลือก Warehouse + Location ที่จะจัดเก็บ" },
        { no: 4, action: "กรอก Serial Number ครบ 10 ตัว (ถ้าสินค้าต้อง track S/N)", expected: "ช่อง S/N มีให้กรอก/แปะ" },
        { no: 5, action: "กดปุ่ม 'ยืนยันรับเข้าคลัง'" },
      ],
      acceptanceCriteria: [
        "เอกสารเปลี่ยนสถานะเป็น 'รับเข้าแล้ว' (สีเขียว)",
        "Stock ของ LED 200W เพิ่มขึ้น 10 ชิ้นใน Location ที่เลือก",
        "S/N ทั้ง 10 ตัวถูกสร้างใน equipment_serial_numbers สถานะ 'in_stock'",
        "เกิด Stock Movement ประเภท 'receive' บันทึกใน Stock Card",
      ],
      crossCheck: [
        { menu: "รายงาน > สินค้าคงคลัง", verify: "จำนวน LED 200W เพิ่มขึ้น 10" },
        { menu: "รายงาน > Stock Card (LED 200W)", verify: "เห็นรายการ Movement type=receive" },
        { menu: "ค้นหาเอกสาร", verify: "เลข PD แสดงสถานะ 'รับเข้าแล้ว'" },
      ],
    },

    // ─────────── INV-TC-04 ───────────
    {
      id: "INV-TC-04",
      title: "ขอเบิกสินค้า (Issue Request) — สินค้าทั่วไป",
      scenario: "ช่างต้องการเบิก LED 200W จำนวน 2 ชิ้น เพื่อนำไปติดตั้งที่ป้ายโฆษณา",
      role: "Requester",
      menu: "เบิก/ส่ง > ขอเบิกสินค้า",
      priority: "Critical",
      preconditions: ["มี Stock LED 200W ≥ 2 ชิ้น", "มีวัตถุประสงค์เบิก 'ติดตั้ง' ใน Master Data"],
      testData: ["สินค้า: LED 200W", "จำนวน: 2", "วัตถุประสงค์: ติดตั้ง", "ป้ายปลายทาง: BB-001"],
      steps: [
        { no: 1, action: "ไปเมนู 'ขอเบิกสินค้า' → เลือกวัตถุประสงค์ = ติดตั้ง" },
        { no: 2, action: "เลือกป้ายปลายทาง BB-001", expected: "Field ป้ายแสดงตัวเลือกพร้อม Old Code-Location" },
        { no: 3, action: "เลือกรูปแบบรับสินค้า (รอรับที่คลัง / นัดรับ / จัดส่ง)" },
        { no: 4, action: "ค้นหา + เลือก LED 200W จำนวน 2 → เพิ่มลงตะกร้า", expected: "FIFO ทำงาน + S/N เลือกได้จาก in_stock" },
        { no: 5, action: "กด 'ส่งคำขอเบิก'", expected: "Toast แจ้งสำเร็จ + เลข GI" },
      ],
      acceptanceCriteria: [
        "ได้เลขเอกสาร 'GI-YYYYMMDD-XXX'",
        "เอกสารสถานะ 'รออนุมัติ' (ถ้าเป็นทรัพย์สิน) หรือ 'รอจ่าย' (ถ้าไม่ใช่)",
        "Stock LED 200W ยังไม่ลด (รอจ่ายจริง)",
      ],
      crossCheck: [
        { menu: "ผู้เบิก > Dashboard ของฉัน", verify: "เห็นคำขอใหม่ของตัวเอง" },
        { menu: "Manager > อนุมัติคำขอ", verify: "Manager ของฝ่ายเดียวกันต้องเห็นคำขอนี้" },
      ],
    },

    // ─────────── INV-TC-05 ───────────
    {
      id: "INV-TC-05",
      title: "Manager อนุมัติคำขอเบิก (Asset Items)",
      scenario: "ผู้จัดการฝ่ายตรวจคำขอเบิกทรัพย์สิน → อนุมัติ",
      role: "Manager",
      menu: "Manager > อนุมัติคำขอเบิก",
      priority: "High",
      preconditions: ["มีคำขอ GI สถานะ 'รออนุมัติ' จาก TC-04", "Login ด้วย Role Manager ของฝ่ายเดียวกัน"],
      steps: [
        { no: 1, action: "ไปเมนู 'อนุมัติคำขอเบิก'" },
        { no: 2, action: "ตรวจรายการ GI → กดปุ่ม 'อนุมัติ'", expected: "เปลี่ยนสถานะเป็น 'อนุมัติแล้ว/รอจ่าย'" },
      ],
      acceptanceCriteria: [
        "เอกสารเปลี่ยนเป็น 'รอจ่าย'",
        "ปรากฏในเมนู 'จ่ายสินค้า' ของเจ้าหน้าที่คลัง",
        "ผู้ขอเห็นสถานะอัปเดตใน Dashboard ของฉัน",
      ],
      crossCheck: [
        { menu: "เบิก/ส่ง > จ่ายสินค้า", verify: "เห็นรายการนี้พร้อมจ่าย" },
      ],
    },

    // ─────────── INV-TC-06 ───────────
    {
      id: "INV-TC-06",
      title: "จ่ายสินค้าให้ผู้เบิก (Issue Goods)",
      scenario: "เจ้าหน้าที่คลังจ่ายของจริงตามคำขอ พร้อมยืนยัน S/N",
      role: "Warehouse Staff",
      menu: "เบิก/ส่ง > จ่ายสินค้า",
      priority: "Critical",
      preconditions: ["มีเอกสาร GI สถานะ 'รอจ่าย' จาก TC-05"],
      steps: [
        { no: 1, action: "ไปเมนู 'จ่ายสินค้า' → เลือกเอกสาร GI" },
        { no: 2, action: "ตรวจรายการ → ยืนยัน S/N ที่จะจ่าย", expected: "S/N ต้องเป็น in_stock เท่านั้น" },
        { no: 3, action: "กด 'ยืนยันจ่ายสินค้า'", expected: "สร้างเอกสาร DC สำหรับยืนยันรับ" },
      ],
      acceptanceCriteria: [
        "Stock ลด 2 ชิ้น (เหลือ 8)",
        "S/N ที่จ่ายเปลี่ยนสถานะเป็น 'issued'",
        "เกิด Stock Movement ประเภท 'issue'",
        "เอกสาร DC ถูกสร้าง สถานะ 'รอยืนยันรับ'",
      ],
      crossCheck: [
        { menu: "รายงาน > Stock Card", verify: "เห็น movement type=issue ล่าสุด" },
        { menu: "รายงาน > สินค้าคงคลัง", verify: "Stock = 8" },
      ],
    },

    // ─────────── INV-TC-07 ───────────
    {
      id: "INV-TC-07",
      title: "ยืนยันรับสินค้า (Delivery Confirmation)",
      scenario: "ผู้รับยืนยันว่าได้รับของถูกต้องครบถ้วน → ปิด Loop",
      role: "Requester / Receiver",
      menu: "เบิก/ส่ง > ยืนยันรับสินค้า",
      priority: "Critical",
      preconditions: ["มีเอกสาร DC สถานะ 'รอยืนยันรับ'"],
      steps: [
        { no: 1, action: "ไปเมนู 'ยืนยันรับสินค้า' → เลือกเอกสาร DC" },
        { no: 2, action: "ตรวจจำนวน + คุณภาพ → กรอก 'จำนวนที่รับจริง'" },
        { no: 3, action: "(ถ้ามีปัญหา) เลือกประเภทปัญหา + อัปโหลดรูป" },
        { no: 4, action: "กด 'ยืนยันรับครบถ้วน'", expected: "สถานะเปลี่ยน + Loop ปิด" },
      ],
      acceptanceCriteria: [
        "DC สถานะ = 'ยืนยันแล้ว'",
        "S/N ติด equipment_id ของป้าย (ถ้ามี) — สถานะ 'installed'",
        "ProcessTracker แสดง 100% (Step 3/3)",
      ],
      crossCheck: [
        { menu: "ป้ายโฆษณา > BB-001", verify: "อุปกรณ์ใหม่แสดงในรายการ Equipment ของป้าย" },
        { menu: "ค้นหาเอกสาร", verify: "เลข GI แสดงสถานะ 'ยืนยันแล้ว'" },
      ],
    },

    // ─────────── INV-TC-08 ───────────
    {
      id: "INV-TC-08",
      title: "นำของเสียเข้าระบบ (Defective Return)",
      scenario: "ช่างถอด LED ที่เสียออกจากป้าย BB-001 → บันทึกเข้าระบบของเสีย",
      role: "Field Technician",
      menu: "คลังสินค้า > นำของเสียเข้าระบบ",
      priority: "High",
      preconditions: ["มี S/N สถานะ 'installed' บนป้าย BB-001 (จาก TC-07)"],
      steps: [
        { no: 1, action: "ไปเมนู 'นำของเสียเข้าระบบ'" },
        { no: 2, action: "ค้นหา S/N ที่เสีย", expected: "ระบบแสดงข้อมูลป้ายที่ติดตั้งอยู่อัตโนมัติ" },
        { no: 3, action: "กรอกเหตุผลที่เสีย + อัปโหลดรูปหลักฐาน" },
        { no: 4, action: "กด 'บันทึกของเสีย'" },
      ],
      acceptanceCriteria: [
        "ได้เลข DR-YYYYMMDD-XXX",
        "S/N เปลี่ยนสถานะเป็น 'defective'",
        "S/N ถูกถอดจาก billboard_equipment ของ BB-001 อัตโนมัติ",
        "เกิดรายการใน billboard_equipment_history (uninstall)",
      ],
      crossCheck: [
        { menu: "ป้ายโฆษณา > BB-001", verify: "อุปกรณ์ที่เสียหายไปจากรายการ Equipment" },
        { menu: "รายงาน > ติดตามอุปกรณ์", verify: "S/N แสดงสถานะ defective พร้อมประวัติ" },
      ],
    },

    // ─────────── INV-TC-09 ───────────
    {
      id: "INV-TC-09",
      title: "โอนย้ายอุปกรณ์ระหว่างคลัง (Equipment Transfer)",
      scenario: "ย้าย LED 200W จากคลังหลัก ไป คลังสาขา 1",
      role: "Warehouse Manager",
      menu: "ข้อมูลหลัก > อุปกรณ์ > Transfer (ในรายการ)",
      priority: "Medium",
      preconditions: ["มี LED 200W ใน คลังหลัก ≥ 1", "มีคลังปลายทาง 'คลังสาขา 1'"],
      steps: [
        { no: 1, action: "เปิดรายการ Equipment LED 200W → กดปุ่ม 'Transfer'" },
        { no: 2, action: "เลือกคลัง/Location ปลายทาง + จำนวน + เหตุผล" },
        { no: 3, action: "ยืนยันโอน" },
      ],
      acceptanceCriteria: [
        "Stock ต้นทางลด ปลายทางเพิ่ม จำนวนถูกต้อง",
        "เกิด 2 Movement: transfer_out + transfer_in",
        "ประวัติแสดงในเมนู 'ประวัติการโอนย้าย'",
      ],
      crossCheck: [
        { menu: "Transfer History", verify: "บันทึกการโอนแสดงครบถ้วน" },
      ],
    },

    // ─────────── INV-TC-10 ───────────
    {
      id: "INV-TC-10",
      title: "ปฏิเสธคำขอเบิก + ผู้เบิกส่งใหม่",
      scenario: "Manager ปฏิเสธคำขอ → ผู้เบิกแก้ไขและส่งใหม่",
      role: "Manager + Requester",
      menu: "Manager > อนุมัติ + ผู้เบิก > Dashboard",
      priority: "Medium",
      preconditions: ["มีคำขอ GI สถานะ 'รออนุมัติ'"],
      steps: [
        { no: 1, action: "Manager: เปิดคำขอ → กด 'ปฏิเสธ' + กรอกเหตุผล" },
        { no: 2, action: "Requester: เปิด Dashboard ของฉัน → เห็นสถานะ 'ปฏิเสธ' พร้อมเหตุผล" },
        { no: 3, action: "Requester: กด 'แก้ไขและส่งใหม่' → ปรับข้อมูล → ส่ง" },
      ],
      acceptanceCriteria: [
        "คำขอเดิมเปลี่ยนเป็น 'ปฏิเสธ'",
        "ระบบสร้างคำขอใหม่ที่อ้างอิงคำขอเดิม",
        "Manager เห็นคำขอใหม่อีกครั้ง",
      ],
    },
  ],
};
