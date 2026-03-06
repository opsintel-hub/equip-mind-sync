import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Truck, Warehouse, Building2, Target, Building, Wrench, PackageOpen, HardHat, Layers, FolderTree, Zap, Users, Monitor } from "lucide-react";
import { PMActionTypeList } from "@/components/pm/PMActionTypeList";
import { PMActionTypeForm } from "@/components/pm/PMActionTypeForm";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { EquipmentImport } from "@/components/equipment/EquipmentImport";
import { LocationForm } from "@/components/location/LocationForm";
import { LocationList } from "@/components/location/LocationList";
import { LocationImport } from "@/components/location/LocationImport";
import { SupplierForm } from "@/components/supplier/SupplierForm";
import { SupplierList } from "@/components/supplier/SupplierList";
import { SupplierImport } from "@/components/supplier/SupplierImport";
import { ContractorForm } from "@/components/contractor/ContractorForm";
import { ContractorList } from "@/components/contractor/ContractorList";
import { WarehouseForm } from "@/components/warehouse/WarehouseForm";
import { WarehouseList } from "@/components/warehouse/WarehouseList";
import { DepartmentForm } from "@/components/department/DepartmentForm";
import { DepartmentList } from "@/components/department/DepartmentList";
import { SectionForm } from "@/components/section/SectionForm";
import { SectionList } from "@/components/section/SectionList";
import { IssuePurposeForm } from "@/components/purpose/IssuePurposeForm";
import { IssuePurposeList } from "@/components/purpose/IssuePurposeList";
import { ReceiptPurposeForm } from "@/components/purpose/ReceiptPurposeForm";
import { ReceiptPurposeList } from "@/components/purpose/ReceiptPurposeList";
import { CompanyForm } from "@/components/company/CompanyForm";
import { CompanyList } from "@/components/company/CompanyList";
import { ToolForm } from "@/components/tools/ToolForm";
import { ToolList } from "@/components/tools/ToolList";
import { ToolImport } from "@/components/tools/ToolImport";
import { CategoryList } from "@/components/category/CategoryList";
import { CategoryForm } from "@/components/category/CategoryForm";
import { SubcategoryList } from "@/components/category/SubcategoryList";
import { SubcategoryForm } from "@/components/category/SubcategoryForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TechnicianForm } from "@/components/tools/TechnicianForm";
import { TechnicianList } from "@/components/tools/TechnicianList";

const MediaPlayerEntry = lazy(() => import("@/pages/MediaPlayerEntry"));

const MasterData = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">ข้อมูลหลัก</h1>
        <p className="text-muted-foreground mt-2">
          จัดการข้อมูลอุปกรณ์ ตำแหน่งจัดเก็บ และผู้จัดจำหน่าย
        </p>
      </div>

      <Tabs defaultValue="equipment" className="w-full">
        <ScrollArea className="w-full" type="scroll">
          <TabsList className="flex w-max h-10 mb-0">
            <TabsTrigger value="equipment" className="gap-1.5 text-xs px-3">
              <Package className="h-3.5 w-3.5" />
              อุปกรณ์
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs px-3">
              <Wrench className="h-3.5 w-3.5" />
              เครื่องมือ
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-xs px-3">
              <FolderTree className="h-3.5 w-3.5" />
              หมวดหมู่
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="gap-1.5 text-xs px-3">
              <Warehouse className="h-3.5 w-3.5" />
              คลังสินค้า
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1.5 text-xs px-3">
              <MapPin className="h-3.5 w-3.5" />
              ตำแหน่ง
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5 text-xs px-3">
              <Truck className="h-3.5 w-3.5" />
              ผู้จัดจำหน่าย
            </TabsTrigger>
            <TabsTrigger value="contractors" className="gap-1.5 text-xs px-3">
              <HardHat className="h-3.5 w-3.5" />
              ผู้รับเหมา
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5 text-xs px-3">
              <Building2 className="h-3.5 w-3.5" />
              ฝ่าย
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-1.5 text-xs px-3">
              <Layers className="h-3.5 w-3.5" />
              แผนก
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-1.5 text-xs px-3">
              <Building className="h-3.5 w-3.5" />
              บริษัท
            </TabsTrigger>
            <TabsTrigger value="issue_purposes" className="gap-1.5 text-xs px-3">
              <Target className="h-3.5 w-3.5" />
              วัตถุประสงค์เบิก
            </TabsTrigger>
            <TabsTrigger value="receipt_purposes" className="gap-1.5 text-xs px-3">
              <PackageOpen className="h-3.5 w-3.5" />
              วัตถุประสงค์รับ
            </TabsTrigger>
            <TabsTrigger value="technicians" className="gap-1.5 text-xs px-3">
              <Users className="h-3.5 w-3.5" />
              ช่าง
            </TabsTrigger>
            <TabsTrigger value="pm_action_types" className="gap-1.5 text-xs px-3">
              <Zap className="h-3.5 w-3.5" />
              PM Action Types
            </TabsTrigger>
            <TabsTrigger value="media_player" className="gap-1.5 text-xs px-3">
              <Monitor className="h-3.5 w-3.5" />
              จัดการ Media Player
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>รายการอุปกรณ์/อะไหล่</CardTitle>
                  <CardDescription>
                    กำหนดว่าสินค้าอะไรมีในระบบ พร้อมตั้งค่า Min Stock, หน่วย, ราคา
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                    💡 <strong>หมายเหตุ:</strong> การเพิ่มอุปกรณ์ที่นี่เป็นการกำหนดข้อมูลหลักเท่านั้น 
                    สำหรับการรับสินค้าเข้าคลังจริง ให้ไปที่ <strong>"นำเข้าสินค้า" → "รับสินค้าเข้าคลัง"</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <EquipmentImport onSuccess={handleSuccess} />
                  <EquipmentForm onSuccess={handleSuccess} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EquipmentList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
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
                <div className="flex gap-2">
                  <ToolImport onSuccess={handleSuccess} />
                  <ToolForm onSuccess={handleSuccess} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ToolList refreshKey={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>หมวดหมู่หลัก</CardTitle>
                  <CardDescription>
                    จัดการหมวดหมู่หลักของอุปกรณ์/อะไหล่
                  </CardDescription>
                </div>
                <CategoryForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <CategoryList refresh={refreshKey} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>หมวดหมู่ย่อย</CardTitle>
                  <CardDescription>
                    จัดการหมวดหมู่ย่อยและเชื่อมโยงกับหมวดหมู่หลัก
                  </CardDescription>
                </div>
                <SubcategoryForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <SubcategoryList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>คลังสินค้า</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลคลังสินค้าทั้งหมดในระบบ
                  </CardDescription>
                </div>
                <WarehouseForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <WarehouseList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ตำแหน่งจัดเก็บ</CardTitle>
                  <CardDescription>
                    จัดการตำแหน่งจัดเก็บสินค้าในคลัง
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <LocationImport onSuccess={handleSuccess} />
                  <LocationForm onSuccess={handleSuccess} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LocationList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ผู้จัดจำหน่าย</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลผู้จัดจำหน่ายและซัพพลายเออร์
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <SupplierImport onSuccess={handleSuccess} />
                  <SupplierForm onSuccess={handleSuccess} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SupplierList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ผู้รับเหมา</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลผู้รับเหมาทั้งหมดในระบบ
                  </CardDescription>
                </div>
                <ContractorForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <ContractorList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ฝ่าย</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลฝ่ายทั้งหมดในระบบ
                  </CardDescription>
                </div>
                <DepartmentForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <DepartmentList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>แผนก</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลแผนกทั้งหมดในระบบ (ผูกกับฝ่าย)
                  </CardDescription>
                </div>
                <SectionForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <SectionList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>บริษัท</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลบริษัทย่อยภายใต้แต่ละฝ่าย (เพื่อแยกงบประมาณและการจัดซื้อ)
                  </CardDescription>
                </div>
                <CompanyForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <CompanyList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue_purposes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>วัตถุประสงค์การเบิก</CardTitle>
                  <CardDescription>
                    จัดการวัตถุประสงค์การเบิกอะไหล่ พร้อมกำหนดเงื่อนไข (ต้องระบุป้าย/ต้องรับคืน)
                  </CardDescription>
                </div>
                <IssuePurposeForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <IssuePurposeList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt_purposes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>วัตถุประสงค์การนำสินค้าเข้า</CardTitle>
                  <CardDescription>
                    กำหนดวัตถุประสงค์การรับสินค้าเข้าคลัง (ฝากเก็บชั่วคราว / นำเข้าปกติ)
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                    💡 <strong>ฝากเก็บ:</strong> ไม่มี Process ต่อ รอเบิกออกเท่านั้น | 
                    <strong> นำเข้าปกติ:</strong> ต้องจัดเก็บตามตำแหน่ง มี Process ต่อ
                  </p>
                </div>
                <ReceiptPurposeForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <ReceiptPurposeList refresh={refreshKey} onRefresh={handleSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicians" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ทะเบียนช่าง</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลช่างและเครื่องมือประจำตัว
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                    💡 <strong>หมายเหตุ:</strong> เพิ่มช่างที่นี่ แล้วไปจัดกลุ่มเครื่องมือประจำตัวช่างแต่ละคนได้โดยกดปุ่ม 🔧 ที่แต่ละแถว
                  </p>
                </div>
                <TechnicianForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <TechnicianList refreshKey={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pm_action_types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ประเภท PM Action</CardTitle>
                  <CardDescription>
                    จัดการตัวเลือก Action สำหรับระบบแจ้ง PM ป้ายโฆษณา (สร้างตั๋ว / Snooze)
                  </CardDescription>
                </div>
                <PMActionTypeForm onSuccess={handleSuccess} />
              </div>
            </CardHeader>
            <CardContent>
              <PMActionTypeList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media_player" className="space-y-4">
          <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            <MediaPlayerEntry />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterData;
