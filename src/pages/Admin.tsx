import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Shield, Grid3x3, LayoutList } from "lucide-react";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { UserPermissionManager } from "@/components/admin/UserPermissionManager";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";

const Admin = () => {
  const { isAdmin, loading: permLoading } = useDepartmentPermissions();
  const [viewMode, setViewMode] = useState<"card" | "matrix">("card");

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

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-muted-foreground">
            {viewMode === "card"
              ? "มุมมองรายผู้ใช้ — แก้โปรไฟล์/บทบาท/สิทธิ์ที่ปุ่ม ✨ Wizard (มีปุ่ม 'ดูคำอธิบาย' บทบาท/ฟังก์ชันในหน้าต่างเดียวกัน)"
              : "มุมมอง Matrix — ปรับสิทธิ์ Function หลายคนพร้อมกันแบบ Bulk พร้อม Apply Preset"}
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "card" | "matrix")}
            className="border rounded-md"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="gap-2">
              <LayoutList className="h-4 w-4" />
              รายการผู้ใช้
            </ToggleGroupItem>
            <ToggleGroupItem value="matrix" aria-label="Matrix view" className="gap-2">
              <Grid3x3 className="h-4 w-4" />
              Matrix สิทธิ์
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {viewMode === "card" ? <UserPermissionManager /> : <PermissionMatrix />}
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          💡 <strong>ตั้งค่า OCR:</strong> ย้ายไปที่ <strong>ข้อมูลหลัก → แท็บ "ตั้งค่า OCR"</strong> (ท้ายสุด)
        </p>
      </div>
    </div>
  );
};

export default Admin;
