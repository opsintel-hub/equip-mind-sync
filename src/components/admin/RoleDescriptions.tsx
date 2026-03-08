import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchableMultiSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { SYSTEM_FUNCTIONS } from "@/hooks/useFunctionPermissions";
import { 
  Shield, 
  ClipboardCheck, 
  Warehouse, 
  PackageOpen, 
  Send,
  ChevronDown,
  Eye,
  Settings,
  Users,
} from "lucide-react";
import { useState, useMemo } from "react";

interface RoleInfo {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  capabilities: string[];
  defaultFunctions: string[]; // function_name keys from SYSTEM_FUNCTIONS
}

const ROLE_DETAILS: RoleInfo[] = [
  {
    value: "super_admin",
    label: "Super Admin (ผู้ดูแลระบบสูงสุด)",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-amber-500/10 text-amber-700 border-amber-200",
    description: "สิทธิ์สูงสุดในระบบ จัดการข้อมูลหลักทั้งหมดรวมถึงอุปกรณ์ คลังสินค้า ตำแหน่งจัดเก็บ",
    capabilities: [
      "ทุกสิทธิ์ของ Admin",
      "จัดการ Tab อุปกรณ์/อะไหล่ ในหน้าข้อมูลหลัก",
      "จัดการ Tab เครื่องมือ ในหน้าข้อมูลหลัก",
      "จัดการ Tab คลังสินค้า ในหน้าข้อมูลหลัก",
      "จัดการ Tab ตำแหน่งจัดเก็บ ในหน้าข้อมูลหลัก",
      "จัดการ Tab Media Player ในหน้าข้อมูลหลัก",
    ],
    defaultFunctions: SYSTEM_FUNCTIONS.map(f => f.name),
  },
  {
    value: "admin",
    label: "Admin (ผู้ดูแลระบบ)",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-red-500/10 text-red-600 border-red-200",
    description: "จัดการระบบทั่วไป ยกเว้นข้อมูลหลักบางส่วนที่สงวนให้ Super Admin",
    capabilities: [
      "จัดการผู้ใช้งานและกำหนดสิทธิ์ทั้งหมด",
      "เข้าถึงข้อมูลทุกฝ่ายโดยไม่มีข้อจำกัด",
      "ใช้งานทุกฟังก์ชันในระบบ",
      "รีเซ็ตรหัสผ่านผู้ใช้อื่น",
      "จัดการข้อมูลหลัก (ยกเว้น อุปกรณ์/คลัง/ตำแหน่ง/Media Player)",
      "ลบข้อมูลสินค้าและรายการต่างๆ"
    ],
    defaultFunctions: SYSTEM_FUNCTIONS.map(f => f.name),
  },
  {
    value: "manager",
    label: "Manager (ผู้จัดการ)",
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
    description: "ดูแลภาพรวม อนุมัติรายการ และดูรายงาน",
    capabilities: [
      "อนุมัติเบิกทรัพย์สิน (เฉพาะฝ่ายที่รับผิดชอบ)",
      "ดูรายงานและสถิติการเคลื่อนไหวสต็อก",
      "ติดตามคำขอเบิกสินค้าของทีม",
      "ดูข้อมูลคลังสินค้าตามฝ่ายที่ได้รับสิทธิ์",
      "ตรวจสอบประวัติการทำรายการ",
      "ดูเฉพาะข้อมูลของฝ่ายที่รับผิดชอบ"
    ],
    defaultFunctions: ["reports", "manager_approval"],
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
    defaultFunctions: ["goods_receipt", "goods_issue", "transfer", "pm_schedule", "equipment_pm", "delivery_entry"],
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
    defaultFunctions: ["delivery_entry"],
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
    defaultFunctions: ["issue_request"],
  }
];

export function RoleDescriptions() {
  const [openRoles, setOpenRoles] = useState<string[]>([]);
  
  // Build initial selected functions per role from defaults
  const [selectedByRole, setSelectedByRole] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    ROLE_DETAILS.forEach(role => {
      initial[role.value] = [...role.defaultFunctions];
    });
    return initial;
  });

  // Build options from SYSTEM_FUNCTIONS (dynamic - auto-updates when new functions added)
  const functionOptions: SearchableSelectOption[] = useMemo(() => 
    SYSTEM_FUNCTIONS.map(f => ({
      value: f.name,
      label: f.label,
      description: f.description,
    })),
    []
  );

  const toggleRole = (value: string) => {
    setOpenRoles(prev => 
      prev.includes(value) 
        ? prev.filter(r => r !== value) 
        : [...prev, value]
    );
  };

  const handleFunctionsChange = (roleValue: string, newValues: string[]) => {
    // Admin and Super Admin always have all functions - don't allow change
    if (roleValue === "admin" || roleValue === "super_admin") return;
    setSelectedByRole(prev => ({ ...prev, [roleValue]: newValues }));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          แนวทางสิทธิ์ตามบทบาท (Roles)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          คลิกเพื่อดูรายละเอียด และปรับแนวทางฟังก์ชันที่แต่ละบทบาทควรเข้าถึงได้
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
                  <SearchableMultiSelect
                    options={functionOptions}
                    values={selectedByRole[role.value] || []}
                    onValuesChange={(vals) => handleFunctionsChange(role.value, vals)}
                    placeholder="เลือกฟังก์ชันที่เข้าถึงได้..."
                    searchPlaceholder="ค้นหาฟังก์ชัน..."
                    emptyMessage="ไม่พบฟังก์ชัน"
                    disabled={role.value === "admin" || role.value === "super_admin"}
                    maxDisplay={3}
                  />
                  {(role.value === "admin" || role.value === "super_admin") && (
                    <p className="text-xs text-muted-foreground mt-1">
                      * {role.value === "super_admin" ? "Super Admin" : "Admin"} มีสิทธิ์เข้าถึงทุกฟังก์ชันโดยอัตโนมัติ
                    </p>
                  )}
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
