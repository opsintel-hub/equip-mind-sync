import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Download, ChevronDown, CheckCircle, FileText, GraduationCap,
  ClipboardCheck, Package, Truck, ShoppingCart, Shield, Users, Eye
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface Exercise {
  id: string;
  step: number;
  title: string;
  instruction: string;
  menu: string;
  expectedResult: string;
  checkItems: string[];
  fillField?: string;
}

interface TrainingModule {
  id: string;
  title: string;
  icon: React.ReactNode;
  role: string;
  description: string;
  exercises: Exercise[];
}

// ── Admin Training: Full Warehouse Flow ──
const adminFullFlowExercises: Exercise[] = [
  {
    id: "a1", step: 1, title: "นำสินค้าเข้าระบบ (Delivery Entry)",
    instruction: "ไปที่เมนู 'นำสินค้าเข้า' → เลือกสินค้าจากระบบ → กรอกจำนวน 10 ชิ้น, ระบุ Supplier, ใส่ S/N 3 ตัว → กด 'เพิ่มลงตะกร้า' → กด 'ส่งข้อมูลทั้งหมด'",
    menu: "คลังสินค้า > นำสินค้าเข้า",
    expectedResult: "ระบบสร้างเอกสาร PD-XXXXXXXX-XXXX อัตโนมัติ และ S/N ทั้ง 3 ตัวมีสถานะ 'pending'",
    checkItems: [
      "ได้รับเลขเอกสาร PD ขึ้นมาบนหน้าจอ",
      "ค้นหาเอกสาร PD ที่ได้ในเมนู 'ค้นหาเอกสาร' → พบเอกสาร",
      "เช็ค S/N ในหน้า Equipment List → สถานะ pending",
      "สต็อกยังไม่เพิ่ม (ยังไม่รับเข้าคลัง)"
    ],
    fillField: "เลขเอกสาร PD ที่ได้: ____________"
  },
  {
    id: "a2", step: 2, title: "รับเข้าคลัง (Receive Goods)",
    instruction: "ไปที่เมนู 'รับเข้าคลัง' → ค้นหาเอกสาร PD จากขั้นตอนที่ 1 → เลือกสถานที่จัดเก็บ (คลัง → ตำแหน่ง) → ตรวจสอบ S/N → กด 'รับเข้าคลัง'",
    menu: "คลังสินค้า > รับเข้าคลัง",
    expectedResult: "สต็อกเพิ่มขึ้น 10 ชิ้น, S/N เปลี่ยนเป็น 'in_stock', บันทึก Stock Movement อัตโนมัติ",
    checkItems: [
      "สต็อกในหน้า Equipment List เพิ่มขึ้น 10",
      "S/N ทั้ง 3 ตัว → สถานะ in_stock",
      "Stock Movement Log → มีรายการ 'receive' ของเอกสารนี้",
      "Stock Card ของสินค้านี้ → แสดง Lifecycle 'รับเข้าคลัง' สำเร็จ"
    ],
    fillField: "จำนวนสต็อกหลังรับเข้า: ____________"
  },
  {
    id: "a3", step: 3, title: "ขอเบิกสินค้า (Issue Request)",
    instruction: "ไปที่เมนู 'ขอเบิกสินค้า' → กรอกชื่อผู้ขอ, เลือกบริษัท, เลือกวัตถุประสงค์ → เลือกสินค้าจากขั้นตอนที่ 2 จำนวน 3 ชิ้น → เลือก S/N จากรายการ in_stock → กด 'ส่งคำขอเบิก'",
    menu: "คลังสินค้า > ขอเบิกสินค้า",
    expectedResult: "ระบบสร้างเอกสาร GI-XXXXXXXX-XXXX, คำขอแสดงในหน้า 'จ่ายสินค้า' ให้เจ้าหน้าที่คลัง",
    checkItems: [
      "ได้รับเลขเอกสาร GI",
      "ค้นหาเอกสาร GI → Process Tracker แสดง 'ส่งคำขอ ✓' และ 'จ่ายสินค้า กำลังดำเนินการ'",
      "สต็อกยังไม่ถูกตัด (รอจ่ายจริง)",
      "ถ้าสินค้าเป็นทรัพย์สิน → คำขอจะไปรออนุมัติก่อน",
      "Dashboard ผู้เบิก → แสดงคำขอสถานะ 'รอดำเนินการ'"
    ],
    fillField: "เลขเอกสาร GI ที่ได้: ____________"
  },
  {
    id: "a4", step: 4, title: "จ่ายสินค้า (Issue Goods)",
    instruction: "ไปที่เมนู 'จ่ายสินค้า' → ค้นหาเอกสาร GI จากขั้นตอนที่ 3 → ตรวจสอบ/แก้ไข S/N ที่จะจ่าย → กด 'จ่ายสินค้า'",
    menu: "คลังสินค้า > จ่ายสินค้า",
    expectedResult: "สต็อกลดลง 3 ชิ้น, S/N เปลี่ยนเป็น 'issued', สร้างเอกสาร DC (Delivery Confirmation) อัตโนมัติ",
    checkItems: [
      "สต็อกลดลงจากขั้นตอนที่ 2 = 3 ชิ้น (เหลือ 7)",
      "S/N ที่จ่าย → สถานะ issued",
      "Stock Movement → มีรายการ 'issue'",
      "Auto Create: เอกสาร DC สร้างอัตโนมัติ → ดูได้ที่ 'ยืนยันรับสินค้า'",
      "Process Tracker → 'จ่ายสินค้า ✓'"
    ],
    fillField: "จำนวนสต็อกคงเหลือ: ____________"
  },
  {
    id: "a5", step: 5, title: "ยืนยันรับสินค้า (Delivery Confirmation)",
    instruction: "ไปที่เมนู 'ยืนยันรับสินค้า' → ค้นหาเอกสาร DC ที่สร้างอัตโนมัติ → ตรวจสอบจำนวน → กด 'ยืนยันรับ' (หรือรายงานปัญหา)",
    menu: "คลังสินค้า > ยืนยันรับสินค้า",
    expectedResult: "Process Tracker แสดงครบทุกขั้นตอน ✓, สถานะเอกสารเปลี่ยนเป็น 'confirmed'",
    checkItems: [
      "Process Tracker: ส่งคำขอ ✓ → จ่ายสินค้า ✓ → ยืนยันรับ ✓",
      "ค้นหาเอกสาร GI → สถานะ 'issued' + ยืนยันรับแล้ว",
      "Stock Card → วงจรชีวิตสินค้าแสดงครบ"
    ],
    fillField: "สถานะสุดท้ายของเอกสาร: ____________"
  },
];

// ── Manager Training ──
const managerExercises: Exercise[] = [
  {
    id: "m1", step: 1, title: "ตรวจสอบคำขอที่รออนุมัติ",
    instruction: "ไปที่เมนู 'อนุมัติคำขอ' → ดูรายการคำขอเบิกทรัพย์สินที่รออนุมัติ → คำขอจะแสดงเฉพาะฝ่ายที่คุณดูแล",
    menu: "คลังสินค้า > อนุมัติคำขอ",
    expectedResult: "แสดงรายการคำขอเบิกที่มีสถานะ 'pending_approval' เฉพาะฝ่ายของตน",
    checkItems: [
      "เห็นเฉพาะคำขอของฝ่ายที่ตนดูแล",
      "แสดงรายละเอียด: ผู้ขอ, สินค้า, จำนวน, วัตถุประสงค์",
      "มีปุ่ม 'อนุมัติ' และ 'ปฏิเสธ'"
    ],
    fillField: "จำนวนคำขอที่รออนุมัติ: ____________"
  },
  {
    id: "m2", step: 2, title: "อนุมัติคำขอเบิกทรัพย์สิน",
    instruction: "เลือกคำขอ 1 รายการ → ตรวจสอบรายละเอียด → กด 'อนุมัติ'",
    menu: "คลังสินค้า > อนุมัติคำขอ",
    expectedResult: "สถานะเปลี่ยนเป็น 'approved', คำขอถูกส่งไปยังเจ้าหน้าที่คลังในหน้า 'จ่ายสินค้า'",
    checkItems: [
      "Process Tracker: ส่งคำขอ ✓ → อนุมัติ ✓ → จ่ายสินค้า (กำลังดำเนินการ)",
      "ค้นหาเอกสาร → สถานะ approved",
      "คำขอหายจากรายการรออนุมัติ"
    ],
    fillField: "เลขเอกสารที่อนุมัติ: ____________"
  },
  {
    id: "m3", step: 3, title: "ปฏิเสธคำขอเบิก",
    instruction: "เลือกคำขออีก 1 รายการ → กด 'ปฏิเสธ' → ระบุเหตุผล",
    menu: "คลังสินค้า > อนุมัติคำขอ",
    expectedResult: "สถานะเปลี่ยนเป็น 'rejected', Process Tracker แสดงกากบาทแดง, ผู้ขอเห็นเหตุผลการปฏิเสธ",
    checkItems: [
      "Process Tracker: ส่งคำขอ ✓ → อนุมัติ ✗ (ปฏิเสธ)",
      "Dashboard ผู้เบิก → แสดงสถานะ 'ปฏิเสธ' + เหตุผล",
      "ค้นหาเอกสาร → สถานะ rejected"
    ],
    fillField: "เลขเอกสารที่ปฏิเสธ: ____________"
  },
  {
    id: "m4", step: 4, title: "อนุมัติคำขอส่งตรง (Direct Shipping)",
    instruction: "ไปที่เมนู 'อนุมัติส่งตรง' → ตรวจสอบคำขอ DS → อนุมัติ/ปฏิเสธ",
    menu: "ส่งตรง > อนุมัติส่งตรง",
    expectedResult: "คำขอ DS ที่อนุมัติจะส่งไปยังขั้นตอน 'จัดซื้อ' ในหน้า Procurement",
    checkItems: [
      "DS Process Tracker: สร้างคำขอ ✓ → อนุมัติ ✓ → จัดซื้อ (กำลังดำเนินการ)",
      "ค้นหาเอกสาร DS → สถานะ approved"
    ],
    fillField: "เลขเอกสาร DS ที่อนุมัติ: ____________"
  },
];

// ── Super Admin Training ──
const superAdminExercises: Exercise[] = [
  {
    id: "s1", step: 1, title: "จัดการบทบาทผู้ใช้",
    instruction: "ไปที่เมนู 'จัดการผู้ใช้' → เลือกผู้ใช้ 1 คน → เปลี่ยนบทบาทเป็น 'Warehouse Staff'",
    menu: "ระบบ > จัดการผู้ใช้",
    expectedResult: "Badge สีของผู้ใช้เปลี่ยน, เมนูที่แสดงจะเปลี่ยนตามบทบาทใหม่",
    checkItems: [
      "Badge เปลี่ยนเป็นสีน้ำเงิน (Warehouse Staff)",
      "ผู้ใช้เห็นเมนูคลังสินค้า",
      "ผู้ใช้ไม่เห็นเมนู 'จัดการผู้ใช้'"
    ],
    fillField: "ชื่อผู้ใช้ที่แก้ไข: ____________"
  },
  {
    id: "s2", step: 2, title: "กำหนดสิทธิ์ตามฝ่าย",
    instruction: "ไปที่ Tab 'สิทธิ์ตามฝ่าย' → เลือกผู้ใช้ → เปิดสิทธิ์ 'ดู' และ 'สร้าง' ของฝ่ายที่ต้องการ → ปิดสิทธิ์ 'ลบ'",
    menu: "ระบบ > จัดการผู้ใช้ > สิทธิ์ตามฝ่าย",
    expectedResult: "ผู้ใช้สามารถดูและสร้างข้อมูลเฉพาะฝ่ายที่เปิดสิทธิ์ ไม่สามารถลบได้",
    checkItems: [
      "Toggle 'ดู' และ 'สร้าง' เป็น ON",
      "Toggle 'ลบ' เป็น OFF (ล็อคสำหรับ Non-Admin)",
      "ผู้ใช้เข้าหน้าข้อมูลของฝ่ายอื่น → ไม่แสดงข้อมูล"
    ],
    fillField: "ฝ่ายที่เปิดสิทธิ์: ____________"
  },
  {
    id: "s3", step: 3, title: "กำหนดสิทธิ์ตามฟังก์ชัน",
    instruction: "ไปที่ Tab 'สิทธิ์ตามฟังก์ชัน' → เลือกผู้ใช้ → เปิด/ปิดเมนูที่ต้องการ",
    menu: "ระบบ > จัดการผู้ใช้ > สิทธิ์ตามฟังก์ชัน",
    expectedResult: "เมนูที่ปิดจะหายจากแถบเมนูด้านซ้ายของผู้ใช้",
    checkItems: [
      "เมนูที่ปิด → ไม่แสดงใน Sidebar",
      "ผู้ใช้พยายามเข้า URL ตรง → ถูก Redirect",
      "เปิดเมนูกลับ → แสดงอีกครั้ง"
    ],
    fillField: "ฟังก์ชันที่ปิด: ____________"
  },
  {
    id: "s4", step: 4, title: "จัดการ Master Data ขั้นสูง",
    instruction: "ไปที่เมนู 'ข้อมูลหลัก' → เข้า Tab 'อุปกรณ์' (Super Admin Only) → เพิ่มรหัสนำหน้าใหม่ → เข้า Tab 'คลังสินค้า' → เพิ่มคลังสินค้าและตำแหน่งจัดเก็บ",
    menu: "ข้อมูลหลัก > อุปกรณ์ / คลังสินค้า / ตำแหน่งจัดเก็บ",
    expectedResult: "รหัสนำหน้าใหม่พร้อมใช้ในการสร้างสินค้า, คลังสินค้าใหม่แสดงในระบบ",
    checkItems: [
      "Prefix ใหม่แสดงในรายการเลือกตอนสร้างสินค้า",
      "คลังสินค้าใหม่แสดงในตัวเลือก Location",
      "Tab เหล่านี้ไม่แสดงสำหรับ Admin ปกติ"
    ],
    fillField: "รหัสนำหน้าที่สร้าง: ____________"
  },
  {
    id: "s5", step: 5, title: "ตรวจสอบ Stock Movement และรายงาน",
    instruction: "ไปที่เมนู 'Stock Movement' → กรองตามช่วงเวลา → ตรวจสอบรายการทั้งหมดจากแบบฝึกของ Admin → ไปที่ 'Stock Card' → ค้นหาสินค้าที่ใช้ฝึก",
    menu: "รายงาน > Stock Movement / Stock Card",
    expectedResult: "เห็นประวัติทุกรายการ (receive, issue) + Stock Card แสดง Lifecycle ครบ",
    checkItems: [
      "Stock Movement แสดงรายการ receive จากขั้นตอนรับเข้าคลัง",
      "Stock Movement แสดงรายการ issue จากขั้นตอนจ่ายสินค้า",
      "Stock Card แสดง Lifecycle Tracker ครบ + ยอดคงเหลือถูกต้อง"
    ],
    fillField: "ยอดคงเหลือสุดท้ายใน Stock Card: ____________"
  },
];

const trainingModules: TrainingModule[] = [
  {
    id: "admin-training",
    title: "แบบฝึก Admin: Full Warehouse Flow",
    icon: <Package className="h-5 w-5" />,
    role: "Admin / Warehouse Staff",
    description: "ฝึกการนำสินค้าเข้า → รับเข้าคลัง → ขอเบิก → จ่ายสินค้า → ยืนยันรับ ครบทุกขั้นตอน (UAT Ready)",
    exercises: adminFullFlowExercises,
  },
  {
    id: "manager-training",
    title: "แบบฝึก Manager: การอนุมัติ",
    icon: <Shield className="h-5 w-5" />,
    role: "Manager",
    description: "ฝึกการอนุมัติ/ปฏิเสธคำขอเบิกทรัพย์สิน และคำขอส่งตรง ตรวจสอบผลลัพธ์ทุกขั้นตอน",
    exercises: managerExercises,
  },
  {
    id: "superadmin-training",
    title: "แบบฝึก Super Admin: การจัดการระบบ",
    icon: <Users className="h-5 w-5" />,
    role: "Super Admin",
    description: "ฝึกจัดการผู้ใช้ สิทธิ์ตามฝ่าย สิทธิ์ตามฟังก์ชัน Master Data ขั้นสูง และตรวจสอบรายงาน",
    exercises: superAdminExercises,
  },
];

// ── Export Word Function ──
async function exportTrainingDoc(module: TrainingModule) {
  try {
    const cellBorder = {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    };

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: module.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `บทบาท: ${module.role}`, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: module.description })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "ชื่อผู้ฝึก: ________________________  ", size: 22 }),
              new TextRun({ text: "วันที่: ________________________", size: 22 }),
            ],
            spacing: { after: 300 },
          }),
          ...module.exercises.flatMap((ex) => [
            new Paragraph({
              text: `ขั้นตอนที่ ${ex.step}: ${ex.title}`,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "เมนู: ", bold: true, size: 20 }),
                new TextRun({ text: ex.menu, size: 20 }),
              ],
              spacing: { after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "คำสั่ง: ", bold: true, size: 20 }),
                new TextRun({ text: ex.instruction, size: 20 }),
              ],
              spacing: { after: 50 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "ผลลัพธ์ที่คาดหวัง: ", bold: true, size: 20 }),
                new TextRun({ text: ex.expectedResult, size: 20 }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: "รายการตรวจสอบ (Checklist):",
              spacing: { after: 50 },
              children: [new TextRun({ text: "รายการตรวจสอบ (Checklist):", bold: true, size: 20 })],
            }),
            ...ex.checkItems.map(item =>
              new Paragraph({
                children: [new TextRun({ text: `☐  ${item}`, size: 20 })],
                spacing: { after: 30 },
                indent: { left: 400 },
              })
            ),
            ...(ex.fillField ? [
              new Paragraph({
                children: [new TextRun({ text: ex.fillField, bold: true, size: 20 })],
                spacing: { before: 100, after: 100 },
              }),
            ] : []),
            new Paragraph({
              children: [new TextRun({ text: "หมายเหตุ: _______________________________________________________________", size: 20 })],
              spacing: { after: 50 },
            }),
            new Paragraph({
              children: [new TextRun({ text: "ผลการทดสอบ:  ☐ ผ่าน    ☐ ไม่ผ่าน    ลงชื่อผู้ตรวจ: ________________________", size: 20 })],
              spacing: { after: 200 },
            }),
          ]),
          new Paragraph({
            text: "สรุปผลการฝึกอบรม / UAT",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `จำนวนขั้นตอนทั้งหมด: ${module.exercises.length}`, size: 22 })],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "จำนวนที่ผ่าน: ________    จำนวนที่ไม่ผ่าน: ________", size: 22 })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "ความคิดเห็นเพิ่มเติม: _______________________________________________________________", size: 22 })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "_______________________________________________________________", size: 22 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "ลงชื่อผู้ฝึก: ________________________    ", size: 22 }),
              new TextRun({ text: "ลงชื่อผู้ตรวจ: ________________________", size: 22 }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "วันที่: ________________________    ", size: 22 }),
              new TextRun({ text: "วันที่: ________________________", size: 22 }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `แบบฝึกอบรม-${module.role}.docx`);
    toast.success(`ดาวน์โหลดแบบฝึก ${module.role} สำเร็จ`);
  } catch (error) {
    console.error(error);
    toast.error("เกิดข้อผิดพลาดในการสร้างเอกสาร");
  }
}

// ── Main Component ──
export function TrainingContent() {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-sm">เกี่ยวกับแบบฝึกอบรม & UAT</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          แบบฝึกนี้ออกแบบมาเพื่อให้ผู้ใช้ทดลองใช้งานระบบจริงแบบ Step-by-Step พร้อม Checklist ตรวจสอบผลลัพธ์ทุกขั้นตอน
          สามารถใช้เป็น <strong>User Acceptance Test (UAT)</strong> ได้ โดยกดปุ่ม "Export แบบฝึก" เพื่อดาวน์โหลดเอกสาร Word
          ที่มีช่องให้กรอกคำตอบ + ลงนาม แล้วนำส่งผู้ตรวจ
        </p>
      </div>

      {trainingModules.map((mod) => (
        <Card key={mod.id} className="overflow-hidden">
          <Collapsible open={expandedModules.has(mod.id)} onOpenChange={() => toggleModule(mod.id)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {mod.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {mod.title}
                        <Badge variant="info" className="text-[10px]">{mod.role}</Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportTrainingDoc(mod);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export แบบฝึก
                    </Button>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedModules.has(mod.id) ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                <Separator />
                {mod.exercises.map((ex) => (
                  <div key={ex.id} className="p-4 border rounded-lg space-y-3 bg-muted/10">
                    {/* Step Header */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {ex.step}
                      </div>
                      <h5 className="font-semibold text-sm">{ex.title}</h5>
                    </div>

                    {/* Menu */}
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                        📂 {ex.menu}
                      </Badge>
                    </div>

                    {/* Instruction */}
                    <div className="p-2.5 rounded bg-background border">
                      <p className="text-xs font-medium mb-1">📝 คำสั่ง:</p>
                      <p className="text-xs text-muted-foreground">{ex.instruction}</p>
                    </div>

                    {/* Expected Result */}
                    <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">✅ ผลลัพธ์ที่คาดหวัง:</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">{ex.expectedResult}</p>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5" /> รายการตรวจสอบ:
                      </p>
                      {ex.checkItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 ml-2">
                          <div className="w-4 h-4 rounded border-2 border-muted-foreground/30 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Fill Field */}
                    {ex.fillField && (
                      <div className="p-2 rounded border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          ✍️ {ex.fillField}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
