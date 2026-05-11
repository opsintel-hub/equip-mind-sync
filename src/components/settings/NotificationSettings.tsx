import { useState, useEffect } from "react";
import { Save, Settings, Shield, Wrench, FileText, AlertTriangle, Plus, X, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSettingsData {
  id?: string;
  notify_equipment_expiry: boolean;
  notify_warranty_expiry: boolean;
  notify_pm_schedule: boolean;
  notify_low_stock: boolean;
  notify_ad_retention: boolean;
  notify_pending_assessment: boolean;
  notify_disposal_approval: boolean;
  notify_direct_shipping_approval: boolean;
  notify_manager_approval: boolean;
  notify_pending_asset_codes: boolean;
  advance_days: number;
  email_addresses: string[];
  department_emails: DepartmentEmail[];
}

interface DepartmentEmail {
  department_id: string;
  department_name: string;
  emails: string[];
}

interface Department {
  id: string;
  name: string;
}

type Priority = "critical" | "high" | "medium" | "low";

interface NotificationItem {
  key: keyof NotificationSettingsData;
  label: string;
  description: string;
  priority: Priority;
}

interface NotificationCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  items: NotificationItem[];
}

const priorityConfig: Record<Priority, { label: string; variant: "destructive" | "default" | "secondary" | "outline"; className: string }> = {
  critical: { label: "ด่วนมาก", variant: "destructive", className: "bg-destructive text-destructive-foreground" },
  high: { label: "ด่วน", variant: "default", className: "bg-orange-500 text-white" },
  medium: { label: "ปานกลาง", variant: "secondary", className: "bg-primary/20 text-primary" },
  low: { label: "ทั่วไป", variant: "outline", className: "border-muted-foreground/30 text-muted-foreground" },
};

const notificationCategories: NotificationCategory[] = [
  {
    id: "assets",
    title: "ทรัพย์สิน / สต็อก",
    icon: <Shield className="h-5 w-5" />,
    description: "แจ้งเตือนวันหมดอายุ, ประกัน และระดับสต็อก",
    items: [
      { key: "notify_equipment_expiry", label: "อุปกรณ์ใกล้หมดอายุ", description: "แจ้งเตือนเมื่ออุปกรณ์ใกล้ถึงวันหมดอายุ", priority: "high" },
      { key: "notify_warranty_expiry", label: "ประกันอุปกรณ์ใกล้หมด", description: "แจ้งเตือนเมื่ออุปกรณ์ใกล้ถึงวันประกันหมด", priority: "medium" },
      { key: "notify_low_stock", label: "สต็อกต่ำกว่าขั้นต่ำ", description: "แจ้งเตือนเมื่อสินค้าคงคลังต่ำกว่าระดับขั้นต่ำที่กำหนด (สร้าง PR อัตโนมัติ)", priority: "critical" },
    ],
  },
  {
    id: "pm",
    title: "บำรุงรักษาเชิงป้องกัน (PM)",
    icon: <Wrench className="h-5 w-5" />,
    description: "แจ้งเตือนกำหนดการ PM ของอุปกรณ์",
    items: [
      { key: "notify_pm_schedule", label: "PM อุปกรณ์", description: "แจ้งเตือนเมื่อถึงกำหนดบำรุงรักษาอุปกรณ์", priority: "high" },
    ],
  },
  {
    id: "approvals",
    title: "รออนุมัติ / ประเมิน",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "แจ้งเตือนรายการที่รอการดำเนินการของผู้มีอำนาจ",
    items: [
      { key: "notify_pending_assessment", label: "รายการรอประเมิน (Assessment)", description: "แจ้งเตือนเมื่อมีอุปกรณ์ชำรุดรอการประเมินผล", priority: "high" },
      { key: "notify_disposal_approval", label: "รออนุมัติทำลาย/จำหน่าย", description: "แจ้งเตือนเมื่อมีรายการ Defective รอการอนุมัติวิธีจัดการ (ทำลาย/ขายเศษ/CSR/ซ่อม)", priority: "high" },
      { key: "notify_direct_shipping_approval", label: "รออนุมัติส่งตรงถึงไซต์", description: "แจ้งเตือนเมื่อมีคำขอส่งตรงถึงไซต์รอการอนุมัติ", priority: "high" },
      { key: "notify_manager_approval", label: "รออนุมัติของผู้จัดการฝ่าย", description: "แจ้งเตือนเมื่อมีคำขอเบิก/ยืมข้ามฝ่ายรอการอนุมัติ", priority: "high" },
      { key: "notify_pending_asset_codes", label: "รอกำหนดรหัสทรัพย์สิน", description: "แจ้งเตือนเมื่อมีอุปกรณ์รอการกำหนดรหัสทรัพย์สินรายตัว", priority: "medium" },
    ],
  },
  {
    id: "documents",
    title: "เอกสาร / โฆษณา",
    icon: <FileText className="h-5 w-5" />,
    description: "แจ้งเตือนเอกสารและรายการป้ายโฆษณา",
    items: [
      { key: "notify_ad_retention", label: "ป้ายโฆษณาค้างส่งคืน", description: "แจ้งเตือนเมื่อป้ายโฆษณาค้างอยู่เกินระยะเวลาจัดเก็บ (7 วันก่อนครบกำหนด)", priority: "medium" },
    ],
  },
];

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    notify_equipment_expiry: true,
    notify_warranty_expiry: true,
    notify_pm_schedule: true,
    notify_low_stock: true,
    notify_ad_retention: true,
    notify_pending_assessment: true,
    notify_disposal_approval: true,
    notify_direct_shipping_approval: true,
    notify_manager_approval: true,
    notify_pending_asset_codes: true,
    advance_days: 7,
    email_addresses: [],
    department_emails: [],
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deptEmailInput, setDeptEmailInput] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, deptRes] = await Promise.all([
        supabase.from("notification_settings").select("*").limit(1).single(),
        supabase.from("departments").select("id, name").eq("is_active", true).order("name"),
      ]);

      if (settingsRes.error && settingsRes.error.code !== "PGRST116") throw settingsRes.error;
      if (deptRes.error) throw deptRes.error;

      setDepartments(deptRes.data || []);

      if (settingsRes.data) {
        const d = settingsRes.data as any;
        setSettings({
          id: d.id,
          notify_equipment_expiry: d.notify_equipment_expiry ?? true,
          notify_warranty_expiry: d.notify_warranty_expiry ?? true,
          notify_pm_schedule: d.notify_pm_schedule ?? true,
          notify_low_stock: d.notify_low_stock ?? true,
          notify_ad_retention: d.notify_ad_retention ?? true,
          notify_pending_assessment: d.notify_pending_assessment ?? true,
          notify_disposal_approval: d.notify_disposal_approval ?? true,
          notify_direct_shipping_approval: d.notify_direct_shipping_approval ?? true,
          notify_manager_approval: d.notify_manager_approval ?? true,
          notify_pending_asset_codes: d.notify_pending_asset_codes ?? true,
          advance_days: d.advance_days ?? 7,
          email_addresses: d.email_addresses || [],
          department_emails: (d.department_emails as DepartmentEmail[]) || [],
        });
      }
    } catch (error: any) {
      console.error("Error fetching notification settings:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดการตั้งค่า");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        notify_equipment_expiry: settings.notify_equipment_expiry,
        notify_warranty_expiry: settings.notify_warranty_expiry,
        notify_pm_schedule: settings.notify_pm_schedule,
        notify_low_stock: settings.notify_low_stock,
        notify_ad_retention: settings.notify_ad_retention,
        notify_pending_assessment: settings.notify_pending_assessment,
        notify_disposal_approval: settings.notify_disposal_approval,
        notify_direct_shipping_approval: settings.notify_direct_shipping_approval,
        notify_manager_approval: settings.notify_manager_approval,
        notify_pending_asset_codes: settings.notify_pending_asset_codes,
        advance_days: settings.advance_days,
        email_addresses: settings.email_addresses,
        department_emails: settings.department_emails as any,
        user_id: user?.id || null,
      };

      if (settings.id) {
        const { error } = await supabase.from("notification_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notification_settings").insert(payload);
        if (error) throw error;
      }

      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      fetchData();
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettingsData, checked: boolean) => {
    setSettings(prev => ({ ...prev, [key]: checked }));
  };

  const addDeptEmail = () => {
    if (!selectedDeptId || !deptEmailInput.trim()) return;
    const email = deptEmailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    const dept = departments.find(d => d.id === selectedDeptId);
    if (!dept) return;

    setSettings(prev => {
      const existing = prev.department_emails.find(de => de.department_id === selectedDeptId);
      if (existing) {
        if (existing.emails.includes(email)) {
          toast.error("อีเมลนี้ถูกเพิ่มแล้ว");
          return prev;
        }
        return {
          ...prev,
          department_emails: prev.department_emails.map(de =>
            de.department_id === selectedDeptId
              ? { ...de, emails: [...de.emails, email] }
              : de
          ),
        };
      }
      return {
        ...prev,
        department_emails: [...prev.department_emails, { department_id: selectedDeptId, department_name: dept.name, emails: [email] }],
      };
    });
    setDeptEmailInput("");
  };

  const removeDeptEmail = (deptId: string, email: string) => {
    setSettings(prev => ({
      ...prev,
      department_emails: prev.department_emails
        .map(de => de.department_id === deptId ? { ...de, emails: de.emails.filter(e => e !== email) } : de)
        .filter(de => de.emails.length > 0),
    }));
  };

  const getCategoryEnabledCount = (cat: NotificationCategory) => {
    return cat.items.filter(item => settings[item.key] as boolean).length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">กำลังโหลด...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category-based notification toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ประเภทการแจ้งเตือน
          </CardTitle>
          <CardDescription>เปิด/ปิดการแจ้งเตือนตามหมวดหมู่ — รายการที่มี Badge สีแดงหมายถึงต้องดำเนินการทันที</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={notificationCategories.map(c => c.id)} className="space-y-2">
            {notificationCategories.map(cat => (
              <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">{cat.icon}</div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {cat.title}
                        <Badge variant="secondary" className="text-xs font-normal">
                          {getCategoryEnabledCount(cat)}/{cat.items.length} เปิด
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-normal">{cat.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-3 pt-2">
                    {cat.items.map(item => {
                      const prio = priorityConfig[item.priority];
                      return (
                        <div key={item.key as string} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge className={`text-[10px] px-1.5 py-0 ${prio.className}`}>
                              {prio.label}
                            </Badge>
                            <div>
                              <Label htmlFor={item.key as string} className="font-medium cursor-pointer">{item.label}</Label>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                          <Switch
                            id={item.key as string}
                            checked={settings[item.key] as boolean}
                            onCheckedChange={(checked) => toggleSetting(item.key, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Advance Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            ระยะเวลาแจ้งเตือนล่วงหน้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              max="120"
              value={settings.advance_days}
              onChange={e => setSettings(prev => ({ ...prev, advance_days: parseInt(e.target.value) || 7 }))}
              className="w-24"
            />
            <span className="text-muted-foreground">วัน</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            ระบบจะแจ้งเตือนล่วงหน้าก่อนถึงกำหนดตามจำนวนวันที่กำหนด (ใช้กับการแจ้งเตือนหมดอายุ/ประกัน/PM ทั้งหมด)
          </p>
        </CardContent>
      </Card>

      {/* Department-specific Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            อีเมลแจ้งเตือนแยกตามฝ่าย
          </CardTitle>
          <CardDescription>กำหนดอีเมลผู้รับการแจ้งเตือนแยกตามฝ่าย — เฉพาะฝ่ายที่เกี่ยวข้องจะได้รับอีเมล (สำรองไว้สำหรับอนาคต)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="เลือกฝ่าย" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="email"
              placeholder="example@email.com"
              value={deptEmailInput}
              onChange={e => setDeptEmailInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDeptEmail()}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addDeptEmail} disabled={!selectedDeptId || !deptEmailInput.trim()}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่ม
            </Button>
          </div>

          {settings.department_emails.length > 0 && (
            <div className="space-y-3 mt-4">
              {settings.department_emails.map(de => (
                <div key={de.department_id} className="p-3 rounded-lg border bg-muted/20">
                  <div className="font-medium text-sm mb-2">{de.department_name}</div>
                  <div className="flex flex-wrap gap-2">
                    {de.emails.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        {email}
                        <button type="button" onClick={() => removeDeptEmail(de.department_id, email)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            สำหรับรับการแจ้งเตือนทางอีเมลในอนาคต (ยังไม่เปิดใช้งาน)
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
      </div>
    </div>
  );
}
