import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Package, Truck, MapPin, Check, X, PlayCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface TestResult {
  step: string;
  status: "pending" | "running" | "success" | "error";
  message?: string;
}

export const TestDataGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (step: string, status: TestResult["status"], message?: string) => {
    setResults((prev) => {
      const existing = prev.find((r) => r.step === step);
      if (existing) {
        return prev.map((r) => (r.step === step ? { ...r, status, message } : r));
      }
      return [...prev, { step, status, message }];
    });
  };

  const generateTestData = async () => {
    setIsGenerating(true);
    setResults([]);

    try {
      // Step 1: Create Suppliers
      updateResult("สร้างผู้จัดจำหน่าย", "running");
      const suppliers = [
        { code: "SUP-TEST-001", name: "บริษัท ทดสอบอะไหล่ จำกัด", contact_person: "คุณทดสอบ", phone: "02-123-4567", email: "test@supplier1.com" },
        { code: "SUP-TEST-002", name: "ร้านป้ายโฆษณา", contact_person: "คุณสมชาย", phone: "02-765-4321", email: "test@supplier2.com" },
        { code: "SUP-TEST-003", name: "บริษัท อิเล็กทรอนิกส์ไทย จำกัด", contact_person: "คุณสมหญิง", phone: "02-111-2222", email: "test@supplier3.com" },
      ];

      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .upsert(suppliers, { onConflict: "code" })
        .select();

      if (supplierError) throw new Error(`สร้างผู้จัดจำหน่ายไม่สำเร็จ: ${supplierError.message}`);
      updateResult("สร้างผู้จัดจำหน่าย", "success", `สร้าง ${suppliers.length} รายการ`);

      // Step 2: Get existing locations
      updateResult("ตรวจสอบตำแหน่งจัดเก็บ", "running");
      const { data: locations, error: locationError } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .limit(5);

      if (locationError) throw new Error(`ดึงข้อมูลตำแหน่งไม่สำเร็จ: ${locationError.message}`);
      if (!locations || locations.length === 0) {
        throw new Error("ไม่พบตำแหน่งจัดเก็บในระบบ กรุณาสร้างตำแหน่งจัดเก็บก่อน");
      }
      updateResult("ตรวจสอบตำแหน่งจัดเก็บ", "success", `พบ ${locations.length} ตำแหน่ง`);

      // Step 3: Get departments
      updateResult("ตรวจสอบฝ่าย", "running");
      const { data: departments, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .limit(3);

      if (deptError) throw new Error(`ดึงข้อมูลฝ่ายไม่สำเร็จ: ${deptError.message}`);
      updateResult("ตรวจสอบฝ่าย", "success", `พบ ${departments?.length || 0} ฝ่าย`);

      const departmentName = departments?.[0]?.name || "ฝ่ายป้าย";

      // Step 4: Create Equipment
      updateResult("สร้างอุปกรณ์/อะไหล่", "running");
      const today = new Date();
      const equipment = [
        {
          code: "EQ-TEST-001",
          name: "หลอดไฟ LED 100W",
          category: "อะไหล่ไฟฟ้า",
          unit: "หลอด",
          quantity_in_stock: 50,
          min_stock_level: 10,
          unit_price: 250,
          location_id: locations[0].id,
          department: departmentName,
          warranty_expiry_date: format(addDays(today, 15), "yyyy-MM-dd"), // 15 days from now
          expiry_date: format(addDays(today, 90), "yyyy-MM-dd"),
          description: "หลอดไฟ LED สำหรับป้ายโฆษณา",
        },
        {
          code: "EQ-TEST-002",
          name: "แผงวงจร Controller V2",
          category: "อะไหล่อิเล็กทรอนิกส์",
          unit: "ชิ้น",
          quantity_in_stock: 20,
          min_stock_level: 5,
          unit_price: 1500,
          location_id: locations[0].id,
          department: departmentName,
          warranty_expiry_date: format(addDays(today, 10), "yyyy-MM-dd"), // 10 days from now
          description: "แผงควบคุมระบบไฟป้าย",
        },
        {
          code: "EQ-TEST-003",
          name: "สายไฟ 2x1.5mm",
          category: "อะไหล่ไฟฟ้า",
          unit: "เมตร",
          quantity_in_stock: 5, // Low stock for testing alert
          min_stock_level: 20,
          unit_price: 15,
          location_id: locations[0].id,
          department: departmentName,
          description: "สายไฟคู่สำหรับเดินสายป้าย",
        },
        {
          code: "EQ-TEST-004",
          name: "หม้อแปลงไฟฟ้า 12V 10A",
          category: "อะไหล่ไฟฟ้า",
          unit: "ตัว",
          quantity_in_stock: 15,
          min_stock_level: 3,
          unit_price: 850,
          location_id: locations[0].id,
          department: departmentName,
          warranty_expiry_date: format(addDays(today, 7), "yyyy-MM-dd"), // 7 days - very urgent
          description: "หม้อแปลงสำหรับระบบไฟป้าย",
        },
        {
          code: "EQ-TEST-005",
          name: "น็อตสแตนเลส M8",
          category: "อะไหล่โครงสร้าง",
          unit: "ตัว",
          quantity_in_stock: 200,
          min_stock_level: 50,
          unit_price: 5,
          location_id: locations[0].id,
          department: departmentName,
          description: "น็อตสำหรับยึดโครงป้าย",
        },
      ];

      const { data: equipmentData, error: equipmentError } = await supabase
        .from("equipment")
        .upsert(equipment, { onConflict: "code" })
        .select();

      if (equipmentError) throw new Error(`สร้างอุปกรณ์ไม่สำเร็จ: ${equipmentError.message}`);
      updateResult("สร้างอุปกรณ์/อะไหล่", "success", `สร้าง ${equipment.length} รายการ`);

      // Step 5: Create PM Schedules
      updateResult("สร้าง PM Schedule", "running");
      if (equipmentData && equipmentData.length > 0) {
        const pmSchedules = [
          {
            equipment_id: equipmentData[0].id,
            title: "ตรวจสอบหลอดไฟรายเดือน",
            description: "ตรวจสอบสภาพหลอดไฟ LED และวัดค่าความสว่าง",
            department: departmentName,
            equipment_type: "หลอดไฟ LED",
            schedule_type: "monthly",
            next_due_date: format(today, "yyyy-MM-dd"), // Due today for testing
            advance_notice_days: 7,
            is_active: true,
          },
          {
            equipment_id: equipmentData[1].id,
            title: "ตรวจสอบแผงควบคุมรายไตรมาส",
            description: "ตรวจสอบการทำงานของแผงวงจร Controller",
            department: departmentName,
            equipment_type: "แผงควบคุม",
            schedule_type: "quarterly",
            next_due_date: format(addDays(today, 5), "yyyy-MM-dd"),
            advance_notice_days: 14,
            is_active: true,
          },
        ];

        const { error: pmError } = await supabase.from("equipment_pm_schedules").upsert(pmSchedules, {
          onConflict: "id",
        });

        if (pmError) throw new Error(`สร้าง PM Schedule ไม่สำเร็จ: ${pmError.message}`);
        updateResult("สร้าง PM Schedule", "success", `สร้าง ${pmSchedules.length} รายการ`);
      }

      // Final
      toast.success("สร้างข้อมูลทดสอบสำเร็จ!");
    } catch (error: any) {
      console.error("Test data generation error:", error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการสร้างข้อมูลทดสอบ");
      
      // Find the running step and mark it as error
      setResults((prev) =>
        prev.map((r) => (r.status === "running" ? { ...r, status: "error" as const, message: error.message } : r))
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />;
      case "running":
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case "success":
        return <Check className="w-5 h-5 text-success" />;
      case "error":
        return <X className="w-5 h-5 text-destructive" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              สร้างข้อมูลทดสอบ
            </CardTitle>
            <CardDescription>สร้าง Supplier, Equipment, PM Schedule สำหรับทดสอบระบบ</CardDescription>
          </div>
          <Button onClick={generateTestData} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังสร้าง...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                สร้างข้อมูลทดสอบ
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview of what will be created */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Truck className="w-4 h-4 text-primary" />
                ผู้จัดจำหน่าย
              </div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">SUP-TEST-001, 002, 003</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="w-4 h-4 text-success" />
                อุปกรณ์/อะไหล่
              </div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">รวมรายการที่ใกล้หมดประกัน</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="w-4 h-4 text-warning" />
                PM Schedule
              </div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-xs text-muted-foreground">รวมรายการที่ครบกำหนดวันนี้</p>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3 border rounded-lg p-4">
              <h4 className="font-medium text-sm text-muted-foreground">ผลการสร้างข้อมูล</h4>
              {results.map((result) => (
                <div
                  key={result.step}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.step}</span>
                  </div>
                  {result.message && (
                    <Badge variant={result.status === "error" ? "destructive" : "secondary"}>
                      {result.message}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2">หมายเหตุ</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• อุปกรณ์ EQ-TEST-001, 002, 004 มีวันหมดประกัน 7-15 วัน (สำหรับทดสอบ Expiry Alert)</li>
              <li>• อุปกรณ์ EQ-TEST-003 มี Stock ต่ำกว่า Min Level (สำหรับทดสอบ Low Stock Alert)</li>
              <li>• PM Schedule จะครบกำหนดวันนี้หรือใน 5 วัน (สำหรับทดสอบ PM Task)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
