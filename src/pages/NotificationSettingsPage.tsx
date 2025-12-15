import DashboardLayout from "@/components/DashboardLayout";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

const NotificationSettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">ตั้งค่าการแจ้งเตือน</h1>
          <p className="text-muted-foreground">
            กำหนดประเภทและช่วงเวลาการแจ้งเตือนที่ต้องการรับ
          </p>
        </div>
        <NotificationSettings />
      </div>
    </DashboardLayout>
  );
};

export default NotificationSettingsPage;
