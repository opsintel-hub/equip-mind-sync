import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { ToolList } from "@/components/tools/ToolList";

const ToolManagement = () => {
  const [refreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <Wrench className="h-7 w-7 sm:h-8 sm:w-8" />
            ข้อมูลเครื่องมือ
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            มุมมองอ่านอย่างเดียว — กดที่รายการเพื่อดูข้อมูล/ดาวน์โหลดรูปภาพและเอกสาร ·{" "}
            <strong>สำหรับเพิ่ม/แก้ไข/ลบ</strong> ต้องไปที่{" "}
            <strong>ข้อมูลหลัก → เครื่องมือ → รายการเครื่องมือ</strong>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div>
            <CardTitle className="text-base sm:text-lg">รายการเครื่องมือ</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              สรุปยอดจะปรับตามตัวกรองด้านล่าง
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
              💡 <strong>หมายเหตุ:</strong> เครื่องมือที่มีการตั้งค่า "ระยะเวลาที่ต้อง PM"
              ระบบจะสร้างงาน PM ให้อัตโนมัติตามรอบที่กำหนด
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <ToolList refreshKey={refreshKey} readOnly showSummary />
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolManagement;
