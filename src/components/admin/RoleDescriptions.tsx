import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Shield, 
  ClipboardCheck, 
  Warehouse, 
  PackageOpen, 
  Send,
  ChevronDown,
  Eye,
  FileText,
  Settings,
  Users,
  Package,
  MapPin,
  Calendar,
  BarChart3
} from "lucide-react";
import { useState } from "react";

interface RoleInfo {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  capabilities: string[];
  accessiblePages: string[];
}

const ROLE_DETAILS: RoleInfo[] = [
  {
    value: "admin",
    label: "Admin (ผู้ดูแลระบบ)",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-red-500/10 text-red-600 border-red-200",
    description: "สิทธิ์สูงสุดในระบบ สามารถจัดการทุกอย่างได้",
    capabilities: [
      "จัดการผู้ใช้งานและกำหนดสิทธิ์ทั้งหมด",
      "เข้าถึงข้อมูลทุกฝ่ายโดยไม่มีข้อจำกัด",
      "ใช้งานทุกฟังก์ชันในระบบ",
      "รีเซ็ตรหัสผ่านผู้ใช้อื่น",
      "จัดการข้อมูลหลัก (Master Data) ทั้งหมด",
      "ลบข้อมูลสินค้าและรายการต่างๆ"
    ],
    accessiblePages: [
      "ทุกหน้าในระบบ"
    ]
  },
  {
    value: "manager",
    label: "Manager (ผู้จัดการ)",
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
    description: "ดูแลภาพรวม อนุมัติรายการ และดูรายงาน",
    capabilities: [
      "ดูรายงานและสถิติการเคลื่อนไหวสต็อก",
      "ติดตามคำขอเบิกสินค้าของทีม",
      "ดูข้อมูลคลังสินค้าตามฝ่ายที่ได้รับสิทธิ์",
      "ตรวจสอบประวัติการทำรายการ"
    ],
    accessiblePages: [
      "Dashboard",
      "รายงานสินค้าคงคลัง",
      "ประวัติการเคลื่อนไหวสต็อก"
    ]
  },
  {
    value: "warehouse_staff",
    label: "เจ้าหน้าที่คลัง",
    icon: <Warehouse className="h-5 w-5" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    description: "ดูแลคลังสินค้า รับเข้า-จ่ายออก จัดการสต็อก",
    capabilities: [
      "รับสินค้าเข้าคลัง (Goods Receipt)",
      "จ่ายสินค้าตามคำขอ (Goods Issue)",
      "โอนย้ายสินค้าระหว่างสถานที่",
      "แก้ไขข้อมูลสินค้าและจำนวนสต็อก",
      "จัดการตำแหน่งจัดเก็บ",
      "บันทึกงาน PM (บำรุงรักษา)"
    ],
    accessiblePages: [
      "รับเข้าสินค้า",
      "จ่ายสินค้า",
      "โอนย้ายสินค้า",
      "จัดการสินค้าและอะไหล่",
      "PM ป้ายโฆษณา / เครื่องมือ"
    ]
  },
  {
    value: "receiver",
    label: "ผู้รับเข้าสินค้า",
    icon: <PackageOpen className="h-5 w-5" />,
    color: "bg-green-500/10 text-green-600 border-green-200",
    description: "รับสินค้าจากผู้จำหน่าย บันทึกการส่งมอบ",
    capabilities: [
      "บันทึกการรับสินค้าเข้าคลัง",
      "ตรวจสอบและยืนยันรายการที่รอรับ",
      "อัพโหลดเอกสารการรับสินค้า",
      "เพิ่มสินค้าใหม่เข้าระบบ (ถ้าได้รับสิทธิ์)"
    ],
    accessiblePages: [
      "รับเข้าสินค้า",
      "รายการรอรับ"
    ]
  },
  {
    value: "requester",
    label: "ผู้เบิกสินค้า",
    icon: <Send className="h-5 w-5" />,
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
    description: "สร้างคำขอเบิกสินค้า ติดตามสถานะ",
    capabilities: [
      "สร้างคำขอเบิกสินค้า",
      "ดูสถานะคำขอที่ส่งไป",
      "ดูรายการสินค้าที่มีในคลัง (ตามฝ่ายที่ได้รับสิทธิ์)",
      "ยกเลิกคำขอที่ยังไม่ได้จ่าย"
    ],
    accessiblePages: [
      "ขอเบิกสินค้า",
      "หน้าหลักผู้เบิก"
    ]
  }
];

export function RoleDescriptions() {
  const [openRoles, setOpenRoles] = useState<string[]>([]);

  const toggleRole = (value: string) => {
    setOpenRoles(prev => 
      prev.includes(value) 
        ? prev.filter(r => r !== value) 
        : [...prev, value]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          คำอธิบายบทบาท (Roles)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          คลิกเพื่อดูรายละเอียดสิทธิ์และหน้าที่เข้าถึงได้ของแต่ละบทบาท
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {ROLE_DETAILS.map((role) => (
          <Collapsible 
            key={role.value} 
            open={openRoles.includes(role.value)}
            onOpenChange={() => toggleRole(role.value)}
          >
            <CollapsibleTrigger className="w-full">
              <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-muted/50 ${role.color}`}>
                <div className="flex items-center gap-3">
                  {role.icon}
                  <div className="text-left">
                    <span className="font-medium">{role.label}</span>
                    <p className="text-sm opacity-80">{role.description}</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${openRoles.includes(role.value) ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 ml-4 p-4 bg-muted/30 rounded-lg space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    สิทธิ์ที่ทำได้:
                  </h4>
                  <ul className="space-y-1">
                    {role.capabilities.map((cap, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    หน้าที่เข้าถึงได้:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {role.accessiblePages.map((page, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {page}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

export { ROLE_DETAILS };
