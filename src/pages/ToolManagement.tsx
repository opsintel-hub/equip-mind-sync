import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { ToolForm } from "@/components/tools/ToolForm";
import { ToolList } from "@/components/tools/ToolList";

const ToolManagement = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wrench className="h-8 w-8" />
          จัดการเครื่องมือ
        </h1>
        <p className="text-muted-foreground mt-2">
          เพิ่ม แก้ไข และจัดการข้อมูลเครื่องมือทั้งหมดในระบบ
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>รายการเครื่องมือ</CardTitle>
              <CardDescription>
                จัดการเครื่องมือทั้งหมด พร้อมตั้งค่าการ PM ประจำ
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                💡 <strong>หมายเหตุ:</strong> เครื่องมือที่มีการตั้งค่า "ระยะเวลาที่ต้อง PM" 
                ระบบจะสร้างงาน PM ให้อัตโนมัติตามรอบที่กำหนด
              </p>
            </div>
            <ToolForm onSuccess={handleSuccess} />
          </div>
        </CardHeader>
        <CardContent>
          <ToolList refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolManagement;
