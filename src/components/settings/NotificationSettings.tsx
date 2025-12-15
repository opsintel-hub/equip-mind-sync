import { useState, useEffect } from "react";
import { Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSettingsData {
  id?: string;
  notify_equipment_expiry: boolean;
  notify_warranty_expiry: boolean;
  notify_pm_schedule: boolean;
  notify_low_stock: boolean;
  advance_days: number;
  email_addresses: string[];
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    notify_equipment_expiry: true,
    notify_warranty_expiry: true,
    notify_pm_schedule: true,
    notify_low_stock: true,
    advance_days: 7,
    email_addresses: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          id: data.id,
          notify_equipment_expiry: data.notify_equipment_expiry,
          notify_warranty_expiry: data.notify_warranty_expiry,
          notify_pm_schedule: data.notify_pm_schedule,
          notify_low_stock: data.notify_low_stock,
          advance_days: data.advance_days,
          email_addresses: data.email_addresses || [],
        });
      }
    } catch (error: any) {
      console.error("Error fetching notification settings:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดการตั้งค่า");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        notify_equipment_expiry: settings.notify_equipment_expiry,
        notify_warranty_expiry: settings.notify_warranty_expiry,
        notify_pm_schedule: settings.notify_pm_schedule,
        notify_low_stock: settings.notify_low_stock,
        advance_days: settings.advance_days,
        email_addresses: settings.email_addresses,
        user_id: user?.id || null,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("notification_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_settings")
          .insert(payload);
        if (error) throw error;
      }

      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const addEmail = () => {
    const email = emailInput.trim();
    if (email && !settings.email_addresses.includes(email)) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setSettings((prev) => ({
          ...prev,
          email_addresses: [...prev.email_addresses, email],
        }));
        setEmailInput("");
      } else {
        toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      }
    }
  };

  const removeEmail = (email: string) => {
    setSettings((prev) => ({
      ...prev,
      email_addresses: prev.email_addresses.filter((e) => e !== email),
    }));
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          ตั้งค่าการแจ้งเตือน
        </CardTitle>
        <CardDescription>
          กำหนดประเภทและช่วงเวลาการแจ้งเตือนที่ต้องการรับ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="font-medium">ประเภทการแจ้งเตือน</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify_equipment_expiry">อุปกรณ์ใกล้หมดอายุ</Label>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนเมื่ออุปกรณ์ใกล้ถึงวันหมดอายุ
                </p>
              </div>
              <Switch
                id="notify_equipment_expiry"
                checked={settings.notify_equipment_expiry}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, notify_equipment_expiry: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify_warranty_expiry">ประกันใกล้หมดอายุ</Label>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนเมื่ออุปกรณ์ใกล้ถึงวันประกันหมด
                </p>
              </div>
              <Switch
                id="notify_warranty_expiry"
                checked={settings.notify_warranty_expiry}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, notify_warranty_expiry: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify_pm_schedule">กำหนดการ PM</Label>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนเมื่อถึงกำหนดบำรุงรักษาเชิงป้องกัน
                </p>
              </div>
              <Switch
                id="notify_pm_schedule"
                checked={settings.notify_pm_schedule}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, notify_pm_schedule: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify_low_stock">สต็อกต่ำ</Label>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนเมื่อสินค้าคงคลังต่ำกว่าระดับขั้นต่ำ
                </p>
              </div>
              <Switch
                id="notify_low_stock"
                checked={settings.notify_low_stock}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, notify_low_stock: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Advance Days */}
        <div className="space-y-2">
          <Label htmlFor="advance_days">จำนวนวันแจ้งเตือนล่วงหน้า</Label>
          <div className="flex items-center gap-2">
            <Input
              id="advance_days"
              type="number"
              min="1"
              max="90"
              value={settings.advance_days}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  advance_days: parseInt(e.target.value) || 7,
                }))
              }
              className="w-24"
            />
            <span className="text-muted-foreground">วัน</span>
          </div>
          <p className="text-sm text-muted-foreground">
            ระบบจะแจ้งเตือนล่วงหน้าก่อนถึงกำหนดตามจำนวนวันที่กำหนด
          </p>
        </div>

        {/* Email Addresses (for future email feature) */}
        <div className="space-y-2">
          <Label>อีเมลสำหรับรับการแจ้งเตือน (สำรองไว้สำหรับอนาคต)</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="example@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button type="button" variant="outline" onClick={addEmail}>
              เพิ่ม
            </Button>
          </div>
          {settings.email_addresses.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.email_addresses.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            สำหรับรับการแจ้งเตือนทางอีเมลในอนาคต (ยังไม่เปิดใช้งาน)
          </p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
      </CardContent>
    </Card>
  );
}
