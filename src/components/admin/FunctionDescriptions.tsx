import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Settings2, 
  ChevronDown,
  PackageOpen,
  Send,
  Package,
  FileText,
  BarChart3,
  MapPin,
  Calendar,
  Wrench,
  ArrowRightLeft,
  Shield
} from "lucide-react";
import { useState } from "react";

interface FunctionInfo {
  name: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  details: string[];
  relatedPages: string[];
}

const FUNCTION_DETAILS: FunctionInfo[] = [
  {
    name: "goods_receipt",
    label: "รับเข้าสินค้า",
    icon: <PackageOpen className="h-5 w-5" />,
    color: "bg-green-500/10 text-green-600 border-green-200",
    description: "บันทึกการรับสินค้าเข้าคลัง จากผู้จำหน่ายหรือโอนย้าย",
    details: [
      "สร้างรายการรับสินค้าใหม่ (Delivery Entry)",
      "ตรวจสอบและยืนยันรายการที่รอรับ",
      "เพิ่มสินค้าใหม่เข้าระบบขณะรับเข้า",
      "อัพโหลดเอกสารประกอบ (ใบส่งของ, ใบเสร็จ)"
    ],
    relatedPages: ["รับเข้าสินค้า", "บันทึกการส่ง", "รอรับสินค้า"]
  },
  {
    name: "issue_request",
    label: "ขอเบิกสินค้า",
    icon: <Send className="h-5 w-5" />,
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
    description: "สร้างคำขอเบิกสินค้าเพื่อส่งให้คลังดำเนินการ",
    details: [
      "สร้างคำขอเบิกสินค้า",
      "เลือกสินค้าและระบุจำนวนที่ต้องการ",
      "ระบุจุดประสงค์การเบิก (ติดตั้ง, ซ่อม, PM)",
      "ติดตามสถานะคำขอ"
    ],
    relatedPages: ["ขอเบิกสินค้า", "หน้าหลักผู้เบิก"]
  },
  {
    name: "goods_issue",
    label: "จ่ายสินค้า",
    icon: <Package className="h-5 w-5" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    description: "จ่ายสินค้าตามคำขอที่ได้รับอนุมัติ",
    details: [
      "ดูรายการคำขอที่รอจ่าย",
      "เลือกตำแหน่งจัดเก็บที่จะหยิบสินค้า",
      "จ่ายสินค้าบางส่วนหรือทั้งหมด",
      "พิมพ์ใบจ่ายสินค้า"
    ],
    relatedPages: ["จ่ายสินค้า", "รายการรอจ่าย", "รายการจ่ายไม่ครบ"]
  },
  {
    name: "master_data",
    label: "ข้อมูลหลัก",
    icon: <FileText className="h-5 w-5" />,
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
    description: "จัดการข้อมูลพื้นฐานของระบบ",
    details: [
      "จัดการหมวดหมู่สินค้า (Category, Subcategory)",
      "จัดการผู้จำหน่าย (Suppliers)",
      "จัดการสถานที่และคลังสินค้า",
      "จัดการฝ่าย, แผนก, บริษัท",
      "จัดการหน่วยนับ, ยี่ห้อ"
    ],
    relatedPages: ["ข้อมูลหลัก"]
  },
  {
    name: "reports",
    label: "รายงาน",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    description: "ดูรายงานและสถิติต่างๆ",
    details: [
      "รายงานสินค้าคงคลัง",
      "รายงานการเคลื่อนไหวสต็อก",
      "รายงานสินค้าใกล้หมดอายุ",
      "รายงานสินค้าค้างสต็อก (Dead Stock)",
      "ค้นหาเอกสาร"
    ],
    relatedPages: ["Dashboard", "รายงานสินค้าคงคลัง", "ประวัติเคลื่อนไหว", "ค้นหาเอกสาร"]
  },
  {
    name: "billboards",
    label: "ป้ายโฆษณา",
    icon: <MapPin className="h-5 w-5" />,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    description: "จัดการข้อมูลป้ายโฆษณา",
    details: [
      "ดูรายการป้ายโฆษณาทั้งหมด",
      "เพิ่ม/แก้ไขข้อมูลป้าย",
      "ดูอุปกรณ์ที่ติดตั้งในป้าย",
      "สร้าง QR Code สำหรับป้าย"
    ],
    relatedPages: ["ป้ายโฆษณา", "รายละเอียดป้าย", "แจ้งปัญหาป้าย"]
  },
  {
    name: "pm_schedule",
    label: "PM ป้ายโฆษณา",
    icon: <Calendar className="h-5 w-5" />,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    description: "จัดการตารางบำรุงรักษาป้ายโฆษณา",
    details: [
      "สร้างตาราง PM ป้ายโฆษณา",
      "ดูงาน PM ที่ต้องทำ",
      "บันทึกผล PM ที่ดำเนินการเสร็จ",
      "ดูประวัติ PM"
    ],
    relatedPages: ["ตาราง PM ป้าย", "งาน PM ป้าย", "ประวัติ PM ป้าย"]
  },
  {
    name: "equipment_pm",
    label: "PM เครื่องมือ",
    icon: <Wrench className="h-5 w-5" />,
    color: "bg-pink-500/10 text-pink-600 border-pink-200",
    description: "จัดการตารางบำรุงรักษาเครื่องมือและอุปกรณ์",
    details: [
      "สร้างตาราง PM เครื่องมือ",
      "ดูงาน PM ที่ต้องทำ",
      "บันทึกผลการตรวจสอบ",
      "อัพโหลดรูปภาพประกอบ"
    ],
    relatedPages: ["ตาราง PM เครื่องมือ", "งาน PM เครื่องมือ", "ประวัติ PM เครื่องมือ"]
  },
  {
    name: "transfer",
    label: "โอนย้ายสินค้า",
    icon: <ArrowRightLeft className="h-5 w-5" />,
    color: "bg-teal-500/10 text-teal-600 border-teal-200",
    description: "โอนย้ายสินค้าระหว่างสถานที่จัดเก็บ",
    details: [
      "โอนย้ายสินค้าระหว่างคลัง",
      "โอนย้ายระหว่างตำแหน่งจัดเก็บ",
      "ดูประวัติการโอนย้าย"
    ],
    relatedPages: ["โอนย้ายสินค้า", "ประวัติโอนย้าย"]
  },
  {
    name: "admin",
    label: "จัดการระบบ",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-red-500/10 text-red-600 border-red-200",
    description: "จัดการผู้ใช้งานและสิทธิ์การเข้าถึง",
    details: [
      "จัดการผู้ใช้งานในระบบ",
      "กำหนดบทบาทผู้ใช้",
      "กำหนดสิทธิ์ตามฟังก์ชัน",
      "กำหนดสิทธิ์ตามฝ่าย",
      "รีเซ็ตรหัสผ่าน"
    ],
    relatedPages: ["จัดการผู้ใช้งาน"]
  }
];

export function FunctionDescriptions() {
  const [openFunctions, setOpenFunctions] = useState<string[]>([]);

  const toggleFunction = (name: string) => {
    setOpenFunctions(prev => 
      prev.includes(name) 
        ? prev.filter(f => f !== name) 
        : [...prev, name]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5 text-primary" />
          คำอธิบายฟังก์ชัน
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          แต่ละฟังก์ชันควบคุมการเข้าถึงเมนูและความสามารถที่แตกต่างกัน
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {FUNCTION_DETAILS.map((func) => (
          <Collapsible 
            key={func.name} 
            open={openFunctions.includes(func.name)}
            onOpenChange={() => toggleFunction(func.name)}
          >
            <CollapsibleTrigger className="w-full">
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${func.color}`}>
                <div className="flex items-center gap-2">
                  {func.icon}
                  <span className="font-medium text-sm">{func.label}</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${openFunctions.includes(func.name) ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-3 text-sm">
                <p className="text-muted-foreground">{func.description}</p>
                <div>
                  <h4 className="font-medium mb-1">สิ่งที่ทำได้:</h4>
                  <ul className="space-y-1">
                    {func.details.map((detail, idx) => (
                      <li key={idx} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1">
                  {func.relatedPages.map((page, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {page}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

export { FUNCTION_DETAILS };
