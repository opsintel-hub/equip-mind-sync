import type { UATModule } from "./types";

// ═══════════════════════════════════════════════════════════════
// MODULE 7: EDGE CASES — เคสคีย์ผิด, Reject, แก้ไข, ส่งใหม่, Error Handling
// ═══════════════════════════════════════════════════════════════
export const edgeCasesUAT: UATModule = {
  id: "edge-cases",
  title: "Module 7: เคสผิดปกติและการแก้ไข (Edge Cases & Error Handling)",
  description:
    "ทดสอบสถานการณ์ที่ผู้ใช้คีย์ผิด, Reject, ต้องแก้ไขและส่งใหม่, รวมถึง Error ที่เกิดขึ้นบ่อย และวิธีแก้ไขที่ถูกต้อง",
  cases: [
    // ───────────────────────────────────────────
    // EDGE-TC-01 — คีย์จำนวนเกิน Stock
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-01",
      title: "ขอเบิกสินค้าเกินจำนวน Stock ที่มี",
      scenario:
        "พนักงานคีย์ขอเบิก LED 200W จำนวน 100 ชิ้น แต่ Stock มีแค่ 20 ชิ้น ระบบต้องเตือนหรือบันทึกเป็น 'รอ Stock'",
      role: "Requester",
      menu: "เบิกออก > ขอเบิกสินค้า",
      priority: "Critical",
      preconditions: [
        "Stock LED 200W เหลือ 20 ชิ้น",
        "Login ด้วยสิทธิ์ Requester",
      ],
      testData: ["สินค้า: LED 200W", "ขอเบิก: 100 ชิ้น", "Stock จริง: 20"],
      steps: [
        { no: 1, action: "เข้าเมนู 'ขอเบิกสินค้า'" },
        { no: 2, action: "เลือก LED 200W → คีย์จำนวน 100" },
        {
          no: 3,
          action: "สังเกตป้ายเตือน Stock ในแบบฟอร์ม",
          expected: "ระบบแสดง warning 'จำนวนเกิน Stock (เหลือ 20)' หรือคำแนะนำ",
        },
        { no: 4, action: "กรอกป้ายปลายทาง + เหตุผล แล้วกด 'เพิ่มลงตะกร้า'" },
        { no: 5, action: "กดส่งคำขอ" },
        {
          no: 6,
          action: "ไปดูที่ 'รายการรอ Stock' (Waiting Stock Requests)",
          expected: "ส่วนเกิน 80 ชิ้น ถูกบันทึกเป็น 'รอ Stock' โดยอัตโนมัติ",
        },
      ],
      acceptanceCriteria: [
        "ระบบไม่ปฏิเสธคำขอ แต่แยกส่วนเกินไปเป็น 'รอ Stock'",
        "เมื่อมีการรับเข้าใหม่ ระบบแจ้งเตือนผู้ขอเดิม",
        "Stock ปัจจุบันต้องไม่ติดลบ",
      ],
      crossCheck: [
        { menu: "รายการรอ Stock", verify: "ต้องเห็นคำขอนี้พร้อม remaining_quantity = 80" },
        { menu: "การแจ้งเตือน", verify: "เมื่อรับเข้า LED 200W ใหม่ ต้องมีแจ้งเตือน" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-02 — ผู้จัดการ Reject + ผู้ขอแก้ไขส่งใหม่
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-02",
      title: "ผู้จัดการ Reject คำขอเบิก → ผู้ขอแก้ไขและส่งใหม่",
      scenario:
        "ผู้ขอคีย์เหตุผลไม่ชัดเจน ผู้จัดการ Reject พร้อมเหตุผล ผู้ขอต้องสามารถดูเหตุผล แก้ไข และส่งใหม่ได้โดยไม่สร้างเอกสารใหม่",
      role: "Requester + Manager",
      menu: "เบิกออก > ขอเบิกสินค้า + ผู้จัดการอนุมัติ",
      priority: "Critical",
      preconditions: ["มีคำขอเบิกที่อยู่ในสถานะ pending_approval"],
      testData: ["เหตุผล Reject: 'กรุณาระบุป้ายปลายทางให้ชัดเจน'"],
      steps: [
        { no: 1, action: "[Manager] เข้าเมนู 'ผู้จัดการอนุมัติ'" },
        { no: 2, action: "[Manager] เลือกคำขอ → กด 'Reject' → กรอกเหตุผล" },
        {
          no: 3,
          action: "[Manager] ยืนยัน Reject",
          expected: "สถานะเปลี่ยนเป็น 'rejected' + แสดงเหตุผลใน Timeline",
        },
        {
          no: 4,
          action: "[Requester] เข้าหน้า 'แดชบอร์ดผู้ขอเบิก'",
          expected: "เห็นการ์ดสีแดง 'ถูกปฏิเสธ' พร้อมเหตุผล + ปุ่ม 'แก้ไขและส่งใหม่'",
        },
        { no: 5, action: "[Requester] กด 'แก้ไขและส่งใหม่'" },
        { no: 6, action: "[Requester] แก้ไขข้อมูลตามเหตุผล แล้วกดส่ง" },
        {
          no: 7,
          action: "[Requester] ตรวจสอบสถานะ",
          expected: "สถานะกลับเป็น 'pending_approval' + เลขเอกสารเดิม (ไม่สร้างใหม่)",
        },
      ],
      acceptanceCriteria: [
        "ผู้ขอเห็นเหตุผล Reject ชัดเจน",
        "เลขเอกสารเดิมถูกใช้ต่อ ไม่สร้างใหม่",
        "Timeline บันทึกประวัติทั้ง Reject และ Resubmit",
        "Manager เห็นคำขอกลับเข้า Queue ใหม่",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร", verify: "ค้นเลขเดิม → เห็นประวัติทั้ง Reject + Resubmit" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-03 — คีย์ S/N ผิดในการรับเข้า → แก้ไข
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-03",
      title: "คีย์ Serial Number ผิดในขั้นรับเข้า → ตรวจพบหลังรับ → แก้ไข",
      scenario:
        "พนักงานคลังคีย์ S/N ของ Media Player ผิด 1 ตัว (พิมพ์เลขสลับ) ตรวจพบจากการ Audit ต้องแก้ไขให้ถูกต้องและมี Log ผู้แก้ไข",
      role: "Warehouse Staff + Admin",
      menu: "Stock Card / Equipment Tracking Report",
      priority: "High",
      preconditions: [
        "มีการรับเข้า MP เครื่องใหม่ที่คีย์ S/N ผิด 1 ตัว",
        "มีสิทธิ์ edit ข้อมูล",
      ],
      testData: ["S/N ผิด: SN12345 → S/N ถูก: SN12354"],
      steps: [
        { no: 1, action: "เข้าเมนู 'รายงานติดตามอุปกรณ์' หรือ 'Media Player Profile'" },
        { no: 2, action: "ค้นหา S/N ที่สงสัยว่าผิด", expected: "ตรวจพบ S/N ที่ไม่ตรงกับเอกสารต้นทาง" },
        { no: 3, action: "เปิดหน้ารายละเอียด → กด 'แก้ไข S/N'" },
        { no: 4, action: "ใส่เหตุผลการแก้ไข แล้วบันทึก" },
        {
          no: 5,
          action: "กลับไปดู Stock Card ของอุปกรณ์",
          expected: "S/N ใหม่แสดงถูกต้อง + Log การแก้ไขมีบันทึก ผู้แก้ไข + เวลา",
        },
        {
          no: 6,
          action: "ค้นหา S/N เก่าและใหม่",
          expected: "S/N เก่าหาไม่เจอ, S/N ใหม่หาเจอและ Link ไปยังประวัติเดิมได้",
        },
      ],
      acceptanceCriteria: [
        "S/N ใหม่ถูกบันทึกในตาราง equipment_serial_numbers",
        "ประวัติการรับเข้าและธุรกรรมก่อนหน้าไม่หาย",
        "มี audit trail ผู้แก้ไข + เวลา",
      ],
      crossCheck: [
        { menu: "Stock Card", verify: "S/N ใหม่ปรากฏในประวัติ" },
        { menu: "ค้นหา S/N (Searchable Select)", verify: "S/N ใหม่ค้นเจอในทุก dropdown" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-04 — รับสินค้าผิดประเภท / จำนวนไม่ตรง
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-04",
      title: "ยืนยันรับสินค้า — ของมาไม่ครบ / ผิดรุ่น (Delivery Confirmation Issue)",
      scenario:
        "ผู้ขอเบิกได้รับสินค้าแต่จำนวนไม่ครบ (สั่ง 10 มา 8) ต้องบันทึกเป็น 'มีปัญหา' พร้อมรูปและเหตุผล ระบบแจ้งกลับคลัง",
      role: "Requester",
      menu: "ยืนยันรับสินค้า",
      priority: "Critical",
      preconditions: ["มีการ Issue Goods แล้วและรอ Delivery Confirmation"],
      testData: ["สั่ง: 10, มา: 8, ขาด: 2"],
      steps: [
        { no: 1, action: "เข้าเมนู 'ยืนยันรับสินค้า'" },
        { no: 2, action: "เลือกเอกสารที่รอยืนยัน" },
        {
          no: 3,
          action: "เลือก 'มีปัญหา' → ระบุประเภท 'จำนวนไม่ครบ'",
          expected: "ฟิลด์ 'จำนวนจริงที่ได้รับ' + อัปโหลดรูป + คำอธิบาย เปิดให้กรอก",
        },
        { no: 4, action: "คีย์ actual_quantity = 8 + อัปโหลดรูปเป็นหลักฐาน + อธิบาย" },
        { no: 5, action: "บันทึก", expected: "สถานะ delivery_confirmation = 'has_issue'" },
        {
          no: 6,
          action: "ตรวจ Notification ของ Warehouse",
          expected: "มีการแจ้งเตือนกลับคลังให้ตรวจสอบ",
        },
      ],
      acceptanceCriteria: [
        "บันทึกความแตกต่างระหว่างจำนวนที่จ่ายและที่รับจริง",
        "รูปและเหตุผลถูกเก็บใน delivery_confirmations",
        "Stock ไม่ถูกหักผิดพลาด (มีกระบวนการ adjust ภายหลัง)",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร", verify: "เอกสารแสดงสถานะ 'มีปัญหา' พร้อม badge สีแดง" },
        { menu: "Stock Card", verify: "ตรวจ movement ว่าถูกต้องตามจริง" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-05 — Direct Shipping ผู้อนุมัติ Reject
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-05",
      title: "Direct Shipping — ผู้อนุมัติ Reject พร้อมเหตุผล + ผู้ขอแก้ไขส่งใหม่",
      scenario:
        "คำขอ Direct Shipping ระบุพิกัดผิด ผู้อนุมัติ Reject ผู้ขอต้องแก้พิกัดและส่งใหม่ได้โดยใช้เลขเดิม",
      role: "Approver + Requester",
      menu: "Direct Shipping",
      priority: "High",
      preconditions: ["มีคำขอ Direct Shipping สถานะ pending_approval"],
      steps: [
        { no: 1, action: "[Approver] เข้า 'อนุมัติ Direct Shipping' → เลือกรายการ" },
        { no: 2, action: "[Approver] กด Reject → กรอก 'พิกัดไม่ตรงตามใบงาน'" },
        {
          no: 3,
          action: "[Requester] เปิดเอกสาร",
          expected: "เห็นเหตุผล Reject + ปุ่ม 'แก้ไข'",
        },
        { no: 4, action: "[Requester] แก้ Lat/Lng → ตรวจพิกัดบนแผนที่ → ส่งใหม่" },
        {
          no: 5,
          action: "[Approver] เห็นคำขอกลับมา",
          expected: "Timeline แสดงประวัติ Reject + Resubmit ครบ",
        },
      ],
      acceptanceCriteria: [
        "เอกสารใช้เลขเดิม",
        "Map preview แสดงพิกัดใหม่ถูกต้อง",
        "ประวัติ Reject ไม่หาย",
      ],
      crossCheck: [
        { menu: "Public View ของ Direct Shipping", verify: "พิกัดใหม่แสดงถูก" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-06 — Ad Management: คีย์ผิดก่อนรับเข้า → แก้ไขได้
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-06",
      title: "Ad Management — แก้ไขข้อมูลโฆษณาที่คีย์ผิด ก่อนรับเข้า",
      scenario:
        "พนักงานคีย์ชื่อโฆษณาผิด/จำนวน Version ผิด ต้องสามารถแก้ไขได้ตราบที่ยังไม่ถูกรับเข้า (status = pending_receive)",
      role: "Ad Staff",
      menu: "Ad Management > รับโฆษณา",
      priority: "High",
      preconditions: ["มีรายการ Ad สถานะ 'pending_receive'"],
      steps: [
        { no: 1, action: "เข้าเมนู Ad Management → ค้นหารายการที่ผิด" },
        {
          no: 2,
          action: "ตรวจสอบสถานะ",
          expected: "ปุ่ม 'แก้ไข' แสดงเฉพาะเมื่อ status = pending_receive",
        },
        { no: 3, action: "กดแก้ไข → ปรับชื่อ/จำนวน Version → บันทึก" },
        { no: 4, action: "เปลี่ยนสถานะเป็น 'received'", expected: "ปุ่ม 'แก้ไข' หายไป" },
        {
          no: 5,
          action: "ลองกดแก้ไขอีกครั้ง (ถ้ามีช่องทาง)",
          expected: "ระบบป้องกัน — ต้องใช้กระบวนการอื่น (เช่น Defective Return)",
        },
      ],
      acceptanceCriteria: [
        "แก้ไขได้เฉพาะ pending_receive",
        "หลัง received ถูก lock ป้องกันการแก้ไขข้อมูลย้อนหลัง",
        "Total quantity คำนวณใหม่ถูกต้องเมื่อแก้ Version",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร (รับโฆษณา)", verify: "ข้อมูลใหม่แสดงถูก" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-07 — ลบ/ยกเลิกรายการที่คีย์ผิด
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-07",
      title: "ยกเลิกรายการนำเข้าที่คีย์ผิด (ก่อนรับเข้าคลัง)",
      scenario:
        "พนักงานคีย์เอกสาร PD ผิดทั้งฉบับ (เลือกผิดบริษัท) ต้องสามารถยกเลิกหรือแก้ไขได้ก่อนรับเข้าคลัง",
      role: "Warehouse Staff",
      menu: "นำสินค้าเข้าระบบ / รับเข้าคลัง",
      priority: "High",
      preconditions: ["มีเอกสาร PD สถานะ 'pending_receive'"],
      steps: [
        { no: 1, action: "เข้าหน้า 'ประวัติการนำเข้า' หรือเอกสารต้นทาง" },
        { no: 2, action: "เลือกเอกสารที่ต้องการยกเลิก/แก้ไข" },
        {
          no: 3,
          action: "ตรวจสอบ action ที่มี",
          expected: "มีปุ่ม 'แก้ไข' หรือ 'ยกเลิก' ตามสิทธิ์",
        },
        { no: 4, action: "หากเลือกผิดบริษัท → กดยกเลิก + ระบุเหตุผล" },
        {
          no: 5,
          action: "สร้างเอกสารใหม่ที่ถูกต้อง",
          expected: "เลขเอกสารใหม่ถูกสร้าง, เลขเก่าแสดง 'cancelled'",
        },
      ],
      acceptanceCriteria: [
        "Stock ไม่ถูกเปลี่ยนแปลงจากเอกสารที่ยกเลิก",
        "เอกสารที่ยกเลิกยังค้นหาได้แต่มี badge 'ยกเลิก'",
        "มี Audit log ของผู้ยกเลิก + เหตุผล",
      ],
      crossCheck: [
        { menu: "Stock Card", verify: "ไม่มี movement ของเอกสารที่ยกเลิก" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-08 — Swap แล้วกรอกข้อมูลผิด → ต้อง Recheck
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-08",
      title: "Swap Wizard — เลือกอุปกรณ์ผิดในขั้น Swap → ตรวจพบและยกเลิก/แก้",
      scenario:
        "วิศวกรเลือก spare ผิดเครื่อง (S/N ใกล้เคียง) ตรวจพบหลัง execute ต้องมีกระบวนการแก้ไข/ย้อนกลับได้",
      role: "Engineer",
      menu: "จัดการทรัพย์สิน > Swap Wizard",
      priority: "Critical",
      preconditions: ["มี Swap Request สถานะ in_progress"],
      steps: [
        { no: 1, action: "เปิด Wizard → เลือก Spare ผิดเครื่อง → execute" },
        {
          no: 2,
          action: "ตรวจสอบที่ Billboard Detail หลัง Swap",
          expected: "พบว่า S/N ที่ติดตั้งใหม่ไม่ตรงกับเอกสาร",
        },
        {
          no: 3,
          action: "เปิด Swap Execution → กด 'แก้ไข' หรือสร้าง Swap ย้อนกลับ",
          expected: "ระบบรองรับการแก้ไขหรือทำ reverse swap",
        },
        { no: 4, action: "บันทึกเหตุผล + แนบรูปยืนยัน" },
        {
          no: 5,
          action: "ตรวจ Billboard Detail อีกครั้ง",
          expected: "ข้อมูลตรงกับสภาพจริง + Timeline บันทึกครบ",
        },
      ],
      acceptanceCriteria: [
        "ระบบไม่อนุญาตให้ลบ swap_executions ตรงๆ — ต้อง reverse",
        "ประวัติ Swap ผิด + แก้ไข ครบใน Timeline",
        "Stock ของ spare กลับมาถูกต้อง",
      ],
      crossCheck: [
        { menu: "Billboard Detail", verify: "อุปกรณ์ที่ติดตั้งตรงกับ S/N จริง" },
        { menu: "Stock Card", verify: "Movement ของ spare ทั้ง out + in ครบ" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-09 — Import Excel ที่มีข้อมูลผิด
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-09",
      title: "Import Excel — ไฟล์มี Error (ข้อมูลขาด, format ผิด)",
      scenario:
        "ผู้ดูแลระบบ Import Master Data จาก Excel แต่บางแถวขาดฟิลด์บังคับหรือ format ผิด ระบบต้องรายงาน Error เป็นรายแถวและไม่บันทึกแถวที่ผิด",
      role: "Admin",
      menu: "ข้อมูลหลัก > Import",
      priority: "High",
      preconditions: ["มีไฟล์ Excel ที่มีทั้งแถวถูกและผิด (เช่น 5 ถูก 3 ผิด)"],
      steps: [
        { no: 1, action: "ไปเมนู Import (เช่น Equipment / Billboard / Location)" },
        { no: 2, action: "ดาวน์โหลด Template → เปรียบเทียบกับไฟล์ที่จะ Import" },
        { no: 3, action: "อัปโหลดไฟล์ที่มี Error" },
        {
          no: 4,
          action: "ตรวจหน้า Preview ก่อน Import",
          expected: "ระบบไฮไลต์แถวที่ผิด + แสดงเหตุผล (เช่น 'ขาดฟิลด์ name')",
        },
        { no: 5, action: "กด Import เฉพาะแถวที่ผ่าน validation" },
        {
          no: 6,
          action: "ตรวจผลลัพธ์",
          expected: "5 แถวถูกบันทึก, 3 แถวผิดถูกข้าม + รายงานสรุปดาวน์โหลดได้",
        },
      ],
      acceptanceCriteria: [
        "ไม่มีแถวที่ผิดถูกบันทึก",
        "รายงาน Error ระบุเลขแถว + เหตุผลชัดเจน",
        "ผู้ใช้แก้ไฟล์ Excel แล้ว Import ใหม่เฉพาะแถวที่ผิดได้",
      ],
      crossCheck: [
        { menu: "ตารางข้อมูล Master ที่ Import", verify: "นับจำนวน record ใหม่ตรงกับที่ระบบรายงาน" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-10 — ผู้ใช้ไม่มีสิทธิ์
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-10",
      title: "ผู้ใช้พยายามเข้าเมนูที่ไม่มีสิทธิ์",
      scenario:
        "ผู้ใช้บทบาท Requester พยายามเข้า /admin หรือกดปุ่มที่ต้องการสิทธิ์ Manager ระบบต้องป้องกันและแสดงข้อความที่เข้าใจง่าย",
      role: "Requester",
      menu: "ทุกเมนู (RBAC test)",
      priority: "Critical",
      preconditions: ["Login ด้วย Requester ที่ไม่มีสิทธิ์ admin/manager"],
      steps: [
        { no: 1, action: "พิมพ์ URL /admin บนเบราว์เซอร์โดยตรง" },
        {
          no: 2,
          action: "ตรวจผลลัพธ์",
          expected: "Redirect ไปหน้าที่อนุญาต หรือแสดง 'ไม่มีสิทธิ์เข้าถึง'",
        },
        { no: 3, action: "ลองกดเมนู 'ผู้จัดการอนุมัติ'", expected: "เมนูไม่ปรากฏใน sidebar หรือ disabled" },
        {
          no: 4,
          action: "ลองยิง API ตรง (เช่นผ่าน DevTools) เพื่อ delete record",
          expected: "RLS ปฏิเสธ + แสดง error 403/permission denied",
        },
      ],
      acceptanceCriteria: [
        "Sidebar แสดงเฉพาะเมนูที่มีสิทธิ์",
        "Direct URL access ถูกป้องกันโดย ProtectedRoute",
        "RLS ป้องกันการเข้าถึงข้อมูลใน database layer",
      ],
      crossCheck: [
        { menu: "Admin > User Permissions", verify: "ตรวจสิทธิ์จริงของ user ตรงกับที่เห็นใน UI" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-11 — Network Error / Submit ซ้ำ
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-11",
      title: "Network Error ระหว่างส่งฟอร์ม → ป้องกัน Duplicate Submit",
      scenario:
        "ผู้ใช้กดบันทึก แต่ Network ขาดชั่วคราว ระบบต้องไม่สร้างเอกสารซ้ำหากผู้ใช้กดซ้ำ และต้องแสดง Error ที่เข้าใจง่าย",
      role: "Any User",
      menu: "ทุกฟอร์มที่มี Submit",
      priority: "High",
      preconditions: ["เปิด DevTools → Network → Throttle เป็น Offline ก่อนกด Submit"],
      steps: [
        { no: 1, action: "เปิดฟอร์มใดก็ได้ (เช่น ขอเบิกสินค้า)" },
        { no: 2, action: "กรอกข้อมูลครบ → ตั้ง Network = Offline ใน DevTools" },
        {
          no: 3,
          action: "กด Submit",
          expected: "ปุ่ม disabled + Loading spinner + Toast แสดง 'เครือข่ายมีปัญหา'",
        },
        { no: 4, action: "เปิด Network กลับ → กด Submit อีกครั้ง" },
        {
          no: 5,
          action: "ตรวจฐานข้อมูล",
          expected: "มีเอกสารเพียง 1 ใบ ไม่ซ้ำ",
        },
      ],
      acceptanceCriteria: [
        "ปุ่ม Submit ถูก disabled ระหว่างรอ response",
        "Error message เข้าใจง่าย ไม่ใช่ stacktrace ดิบ",
        "ไม่มี duplicate document",
      ],
      crossCheck: [
        { menu: "ค้นหาเอกสาร", verify: "ค้นด้วยช่วงเวลาเดียวกัน → มี 1 ใบเท่านั้น" },
      ],
    },

    // ───────────────────────────────────────────
    // EDGE-TC-12 — กรอก S/N ซ้ำ
    // ───────────────────────────────────────────
    {
      id: "EDGE-TC-12",
      title: "พยายามรับเข้า S/N ที่มีอยู่แล้วในระบบ (Duplicate S/N)",
      scenario:
        "พนักงานคีย์ S/N ที่ซ้ำกับเครื่องที่มีในระบบ (เช่น พิมพ์เลข MP เดิม) ระบบต้องเตือนและไม่อนุญาต",
      role: "Warehouse Staff",
      menu: "นำสินค้าเข้าระบบ (Per-unit)",
      priority: "Critical",
      preconditions: ["มี S/N 'MP-A001' อยู่ในระบบแล้ว"],
      steps: [
        { no: 1, action: "เข้าหน้านำเข้าแบบ Per-unit" },
        { no: 2, action: "คีย์ S/N = 'MP-A001' (ซ้ำ)" },
        {
          no: 3,
          action: "ตรวจ validation",
          expected: "Inline error 'S/N นี้มีในระบบแล้ว' + ปุ่มเพิ่มถูก disabled",
        },
        { no: 4, action: "เปลี่ยนเป็น S/N ใหม่", expected: "Error หาย + เพิ่มได้" },
      ],
      acceptanceCriteria: [
        "ระบบตรวจซ้ำแบบ real-time",
        "ไม่สามารถ submit S/N ซ้ำลง database",
        "DB constraint UNIQUE บังคับใช้",
      ],
      crossCheck: [
        { menu: "Equipment Tracking Report", verify: "S/N เดิมยัง active อยู่เครื่องเดียว" },
      ],
    },
  ],
};
