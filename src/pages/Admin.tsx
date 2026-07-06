import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Shield, Users, Info, HelpCircle, Settings2, Grid3x3, LayoutList } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { RoleDescriptions } from "@/components/admin/RoleDescriptions";
import { FunctionDescriptions } from "@/components/admin/FunctionDescriptions";
import { UserPermissionManager } from "@/components/admin/UserPermissionManager";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { OCRConfigManager } from "@/components/admin/OCRConfigManager";



const Admin = () => {
  const { isAdmin, isSuperAdmin, loading: permLoading } = useDepartmentPermissions();

  if (permLoading) {
    return <div className="flex items-center justify-center h-screen">กำลังโหลด...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          จัดการผู้ใช้งาน
        </h1>
        <p className="text-muted-foreground">
          กำหนดบทบาท, สิทธิ์ตามฟังก์ชัน และสิทธิ์ตามฝ่ายให้กับผู้ใช้แต่ละคน
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className={`grid w-full lg:w-auto lg:inline-grid ${isSuperAdmin ? 'grid-cols-4 lg:grid-cols-4' : 'grid-cols-3 lg:grid-cols-3'}`}>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            จัดการผู้ใช้
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Matrix สิทธิ์
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            คู่มือและแนวทางสิทธิ์
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="ocr-config" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              ตั้งค่า OCR
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserPermissionManager />
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <PermissionMatrix />
        </TabsContent>


        <TabsContent value="help" className="space-y-6">
          {/* System Overview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Info className="h-6 w-6 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    ระบบสิทธิ์ 3 ชั้น
                  </h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-blue-600 min-w-[24px]">1.</span>
                      <div>
                        <strong>บทบาท (Role)</strong> - กำหนดความสามารถพื้นฐาน เช่น Admin มีสิทธิ์ทุกอย่าง, เจ้าหน้าที่คลังรับเข้า-จ่ายสินค้าได้
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-blue-600 min-w-[24px]">2.</span>
                      <div>
                        <strong>สิทธิ์ตามฟังก์ชัน</strong> - กำหนดว่าเข้าถึงเมนูหลักไหนได้บ้าง เช่น รับเข้าสินค้า, จ่ายสินค้า, รายงาน
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-bold text-blue-600 min-w-[24px]">3.</span>
                      <div>
                        <strong>สิทธิ์ตามฝ่าย</strong> - กำหนดว่าเห็นข้อมูลของฝ่ายใดได้บ้าง และทำอะไรกับข้อมูลได้ (ดู/สร้าง/แก้ไข/ลบ)
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg mt-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>💡 หมายเหตุ:</strong> ผู้ใช้ที่มีบทบาท <strong>Admin</strong> จะได้สิทธิ์เต็มทุกอย่างโดยอัตโนมัติ 
                      ไม่ต้องกำหนดสิทธิ์ฟังก์ชันหรือฝ่ายเพิ่มเติม สามารถปรับ Dropdown ด้านล่างเพื่อดูตัวอย่างแนวทางการกำหนดสิทธิ์ที่เหมาะสมกับแต่ละบทบาทและฟังก์ชัน
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <RoleDescriptions />
            <FunctionDescriptions />
          </div>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="ocr-config" className="space-y-4">
            <OCRConfigManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Admin;
