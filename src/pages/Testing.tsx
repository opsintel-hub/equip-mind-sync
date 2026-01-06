import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestDataGenerator } from "@/components/testing/TestDataGenerator";
import { EdgeFunctionTester } from "@/components/testing/EdgeFunctionTester";
import { FlaskConical, Database, Bell, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Testing = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-primary" />
          ทดสอบระบบ
        </h1>
        <p className="text-muted-foreground mt-2">
          สร้างข้อมูลทดสอบและทดสอบ Edge Functions
        </p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="generate" className="gap-2">
            <Database className="h-4 w-4" />
            สร้างข้อมูลทดสอบ
          </TabsTrigger>
          <TabsTrigger value="functions" className="gap-2">
            <Bell className="h-4 w-4" />
            ทดสอบ Edge Function
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-6">
          <TestDataGenerator />
        </TabsContent>

        <TabsContent value="functions" className="space-y-4 mt-6">
          <EdgeFunctionTester />
        </TabsContent>
      </Tabs>

      {/* Testing Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            ขั้นตอนการทดสอบแนะนำ
          </CardTitle>
          <CardDescription>ทำตามขั้นตอนเพื่อทดสอบระบบครบวงจร</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <span className="font-medium">สร้างข้อมูลทดสอบ</span>
              </div>
              <p className="text-sm text-muted-foreground">
                กดปุ่ม "สร้างข้อมูลทดสอบ" ด้านบนเพื่อสร้าง Supplier, Equipment, และ PM Schedule
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/master-data">ดูข้อมูลหลัก</Link>
              </Button>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <span className="font-medium">ทดสอบรับ-จ่ายสินค้า</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ทดสอบนำสินค้าเข้า และรับเข้าคลัง จากนั้นทดสอบขอเบิกและจ่ายสินค้า
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/delivery-entry">นำเข้า</Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/issue-request">ขอเบิก</Link>
                </Button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <span className="font-medium">เรียก Edge Function</span>
              </div>
              <p className="text-sm text-muted-foreground">
                กดปุ่ม "เรียก Edge Function" เพื่อตรวจสอบอุปกรณ์ใกล้หมดอายุและสร้าง Notifications
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/equipment-pm-tasks">ดู PM Tasks</Link>
              </Button>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <span className="font-medium">ตรวจสอบผลลัพธ์</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ไปที่ Dashboard เพื่อดู Alerts และ Notifications ที่ระบบสร้างขึ้น
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/dashboard">ดู Dashboard</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Testing;
