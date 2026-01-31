import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Truck, Warehouse, Building2, Target, Building, Wrench, PackageOpen, HardHat, Layers } from "lucide-react";
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
        <TabsList className="grid w-full grid-cols-11 max-w-7xl">
          <TabsTrigger value="equipment" className="gap-2">
            <Package className="h-4 w-4" />
            อุปกรณ์
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            เครื่องมือ
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-2">
            <Warehouse className="h-4 w-4" />
            คลังสินค้า
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            ตำแหน่ง
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="h-4 w-4" />
            ผู้จัดจำหน่าย
          </TabsTrigger>
          <TabsTrigger value="contractors" className="gap-2">
            <HardHat className="h-4 w-4" />
            ผู้รับเหมา
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            ฝ่าย
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="h-4 w-4" />
            แผนก
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building className="h-4 w-4" />
            บริษัท
          </TabsTrigger>
          <TabsTrigger value="issue_purposes" className="gap-2">
            <Target className="h-4 w-4" />
            วัตถุประสงค์เบิก
          </TabsTrigger>
          <TabsTrigger value="receipt_purposes" className="gap-2">
            <PackageOpen className="h-4 w-4" />
            วัตถุประสงค์รับ
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
};

export default MasterData;
