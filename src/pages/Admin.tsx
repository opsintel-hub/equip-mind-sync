import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Shield, LayoutList, BookOpen } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { UserPermissionManager } from "@/components/admin/UserPermissionManager";
import { RoleDescriptions } from "@/components/admin/RoleDescriptions";
import { FunctionDescriptions } from "@/components/admin/FunctionDescriptions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

const Admin = () => {
  const { isAdmin, loading: permLoading } = useDepartmentPermissions();
  const { isSuperAdmin } = useIsSuperAdmin();
  const [viewMode, setViewMode] = useState<"card" | "guide">("card");

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
          กำหนด "ระดับผู้ใช้" และฝ่ายที่เข้าถึงได้ — ตั้งค่าที่เดียวจบ
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-muted-foreground max-w-2xl">
            {viewMode === "card" && "① ตั้งค่ารายคนที่นี่ที่เดียว — คลิกที่แถวผู้ใช้เพื่อเลือกระดับผู้ใช้ + ฝ่าย/แผนก"}
            {viewMode === "guide" && (isSuperAdmin
              ? "② คู่มืออ่านอย่างเดียว (ระดับผู้ใช้ & เมนู) — Super Admin แก้ข้อความคู่มือได้ที่ปุ่มดินสอ/ถังขยะ"
              : "② คู่มืออ่านอย่างเดียว (ระดับผู้ใช้ & เมนู) — เฉพาะ Super Admin เท่านั้นที่แก้ไขได้")}
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "card" | "guide")}
            className="border rounded-md"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="gap-2">
              <LayoutList className="h-4 w-4" />
              รายการผู้ใช้
            </ToggleGroupItem>
            <ToggleGroupItem value="guide" aria-label="Guide view" className="gap-2">
              <BookOpen className="h-4 w-4" />
              แนวทางสิทธิ์
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {viewMode === "card" && <UserPermissionManager />}
        {viewMode === "guide" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <RoleDescriptions />
            <FunctionDescriptions />
          </div>
        )}
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          💡 <strong>ตั้งค่า OCR:</strong> ย้ายไปที่ <strong>ข้อมูลหลัก → แท็บ "ตั้งค่า OCR"</strong> (ท้ายสุด)
        </p>
      </div>
    </div>
  );
};

export default Admin;


