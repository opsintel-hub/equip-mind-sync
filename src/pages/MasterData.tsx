import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDepartmentPermissions } from "@/hooks/useDepartmentPermissions";
import { useFunctionPermissions } from "@/hooks/useFunctionPermissions";
import { Package, MapPin, Truck, Warehouse, Building2, Target, Building, Wrench, PackageOpen, HardHat, Layers, FolderTree, Zap, Users, Monitor, Database } from "lucide-react";

import { PMActionTypeList } from "@/components/pm/PMActionTypeList";
import { PMActionTypeForm } from "@/components/pm/PMActionTypeForm";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { EquipmentImport } from "@/components/equipment/EquipmentImport";
import { LocationForm } from "@/components/location/LocationForm";
import { LocationImport } from "@/components/location/LocationImport";
import { SupplierForm } from "@/components/supplier/SupplierForm";
import { SupplierList } from "@/components/supplier/SupplierList";
import { SupplierImport } from "@/components/supplier/SupplierImport";
import { SupplierExport } from "@/components/supplier/SupplierExport";
import { ContractorForm } from "@/components/contractor/ContractorForm";
import { ContractorList } from "@/components/contractor/ContractorList";
import { WarehouseForm } from "@/components/warehouse/WarehouseForm";
import { WarehouseList } from "@/components/warehouse/WarehouseList";
import { WarehouseLocationAccordion } from "@/components/warehouse/WarehouseLocationAccordion";
import { DepartmentForm } from "@/components/department/DepartmentForm";
import { DepartmentList } from "@/components/department/DepartmentList";
import { DepartmentSectionAccordion } from "@/components/department/DepartmentSectionAccordion";
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
import { PMTypeManager } from "@/components/tools/PMTypeManager";
import { PMResultManager } from "@/components/tools/PMResultManager";
import { CategoryList } from "@/components/category/CategoryList";
import { CategoryForm } from "@/components/category/CategoryForm";
import { SubcategoryList } from "@/components/category/SubcategoryList";
import { SubcategoryForm } from "@/components/category/SubcategoryForm";
import { ToolCategoryList } from "@/components/tools/ToolCategoryList";
import { ToolSubcategoryList } from "@/components/tools/ToolSubcategoryList";
import { CategoryAccordion } from "@/components/category/CategoryAccordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TechnicianForm } from "@/components/tools/TechnicianForm";
import { TechnicianList } from "@/components/tools/TechnicianList";
import { SimpleListManager } from "@/components/master-data/SimpleListManager";
import { RepairActionsManager } from "@/components/master-data/RepairActionsManager";

const MediaPlayerEntry = lazy(() => import("@/pages/MediaPlayerEntry"));

const MasterData = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { loading: permLoading } = useDepartmentPermissions();
  const { hasFunctionAccess, loading: fnLoading } = useFunctionPermissions();

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Per-tab visibility (Super Admin sees all; others need md_* function key)
  const can = (key: string) => hasFunctionAccess(key);

  if (permLoading || fnLoading) {
    return <div className="flex items-center justify-center h-64">กำลังโหลด...</div>;
  }

  // First accessible tab becomes default
  const tabOrder: Array<[string, boolean]> = [
    ["equipment", can("md_equipment")],
    ["tools", can("md_tools")],
    ["categories", can("md_categories")],
    ["warehouses", can("md_warehouses") || can("md_locations")],
    ["suppliers", can("md_suppliers")],
    ["contractors", can("md_contractors")],
    ["departments", can("md_departments") || can("md_sections")],
    ["companies", can("md_companies")],
    ["issue_purposes", can("md_issue_purposes")],
    ["receipt_purposes", can("md_receipt_purposes")],
    ["technicians", can("md_technicians")],
    ["pm_action_types", can("md_pm_action_types")],
    ["media_player", can("md_media_player")],
  ];
  const defaultTab = tabOrder.find(([, v]) => v)?.[0] ?? "categories";


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">ข้อมูลหลัก</h1>
        <p className="text-muted-foreground mt-2">
          จัดการข้อมูลอุปกรณ์ ตำแหน่งจัดเก็บ และผู้จัดจำหน่าย
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-max h-10 mb-0">
            {can("md_equipment") && (
              <TabsTrigger value="equipment" className="gap-1.5 text-xs px-3">
                <Package className="h-3.5 w-3.5" />
                อุปกรณ์
              </TabsTrigger>
            )}
            {can("md_tools") && (
              <TabsTrigger value="tools" className="gap-1.5 text-xs px-3">
                <Wrench className="h-3.5 w-3.5" />
                เครื่องมือ
              </TabsTrigger>
            )}
            {can("md_categories") && (
              <TabsTrigger value="categories" className="gap-1.5 text-xs px-3">
                <FolderTree className="h-3.5 w-3.5" />
                หมวดหมู่
              </TabsTrigger>
            )}
            {(can("md_warehouses") || can("md_locations")) && (
              <TabsTrigger value="warehouses" className="gap-1.5 text-xs px-3">
                <Warehouse className="h-3.5 w-3.5" />
                คลัง & ตำแหน่งจัดเก็บ
              </TabsTrigger>
            )}
            {can("md_suppliers") && (
              <TabsTrigger value="suppliers" className="gap-1.5 text-xs px-3">
                <Truck className="h-3.5 w-3.5" />
                ผู้จัดจำหน่าย
              </TabsTrigger>
            )}
            {can("md_contractors") && (
              <TabsTrigger value="contractors" className="gap-1.5 text-xs px-3">
                <HardHat className="h-3.5 w-3.5" />
                ผู้รับเหมา
              </TabsTrigger>
            )}
            {(can("md_departments") || can("md_sections")) && (
              <TabsTrigger value="departments" className="gap-1.5 text-xs px-3">
                <Building2 className="h-3.5 w-3.5" />
                ฝ่าย & แผนก
              </TabsTrigger>
            )}
            {can("md_companies") && (
              <TabsTrigger value="companies" className="gap-1.5 text-xs px-3">
                <Building className="h-3.5 w-3.5" />
                บริษัท
              </TabsTrigger>
            )}
            {can("md_issue_purposes") && (
              <TabsTrigger value="issue_purposes" className="gap-1.5 text-xs px-3">
                <Target className="h-3.5 w-3.5" />
                วัตถุประสงค์เบิก
              </TabsTrigger>
            )}
            {can("md_receipt_purposes") && (
              <TabsTrigger value="receipt_purposes" className="gap-1.5 text-xs px-3">
                <PackageOpen className="h-3.5 w-3.5" />
                วัตถุประสงค์รับ
              </TabsTrigger>
            )}
            {can("md_technicians") && (
              <TabsTrigger value="technicians" className="gap-1.5 text-xs px-3">
                <Users className="h-3.5 w-3.5" />
                ช่าง
              </TabsTrigger>
            )}
            {can("md_pm_action_types") && (
              <TabsTrigger value="pm_action_types" className="gap-1.5 text-xs px-3">
                <Zap className="h-3.5 w-3.5" />
                PM Action Types
              </TabsTrigger>
            )}
            {can("md_media_player") && (
              <TabsTrigger value="media_player" className="gap-1.5 text-xs px-3">
                <Monitor className="h-3.5 w-3.5" />
                จัดการ Media Player
              </TabsTrigger>
            )}
          </TabsList>

        </div>

        {can("md_equipment") && (
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
        )}

        {can("md_tools") && (
        <TabsContent value="tools" className="space-y-4">
          <Tabs defaultValue="tool_list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="tool_list" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                รายการเครื่องมือ
              </TabsTrigger>
              <TabsTrigger value="tool_pm_types" className="gap-1.5">
                🔧 ประเภทการ PM (เครื่องมือ)
              </TabsTrigger>
              <TabsTrigger value="tool_pm_results" className="gap-1.5">
                ✅ ผลการตรวจ PM (เครื่องมือ)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tool_list" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>รายการเครื่องมือ</CardTitle>
                      <CardDescription>
                        จัดการเครื่องมือทั้งหมด พร้อมตั้งค่าการ PM ประจำ
                      </CardDescription>
                      <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                        💡 <strong>หมายเหตุ:</strong> เครื่องมือที่กำหนด "PM Matrix" จะสร้างงาน PM อัตโนมัติตามรอบวันของแต่ละประเภท —
                        แก้ไขประเภทการ PM ได้ที่แท็บ "ประเภทการ PM (เครื่องมือ)" ด้านข้าง
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

            <TabsContent value="tool_pm_types" className="space-y-4">
              <PMTypeManager />
            </TabsContent>

            <TabsContent value="tool_pm_results" className="space-y-4">
              <PMResultManager />
            </TabsContent>
          </Tabs>
        </TabsContent>
        )}


        {can("md_categories") && (
        <TabsContent value="categories" className="space-y-4">
          <Tabs defaultValue="equipment_cat" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="equipment_cat" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                หมวดหมู่อุปกรณ์/อะไหล่
              </TabsTrigger>
              <TabsTrigger value="tool_cat" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                หมวดหมู่เครื่องมือ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="equipment_cat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>หมวดหมู่อุปกรณ์/อะไหล่</CardTitle>
                  <CardDescription>
                    จัดการหมวดหมู่หลักและหมวดหมู่ย่อยของอุปกรณ์/อะไหล่ในหน้าเดียว — กด ▶ เพื่อขยายดูหมวดหมู่ย่อย
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryAccordion
                    key={`eq-${refreshKey}`}
                    parentTable="categories"
                    childTable="subcategories"
                    childFk="category_id"
                    storageKey="md:categories:eq:expanded"
                    labels={{
                      parentSingular: "หมวดหมู่หลัก",
                      childSingular: "หมวดหมู่ย่อย",
                      parentEmpty: "ยังไม่มีหมวดหมู่หลัก",
                      childEmpty: "ยังไม่มีหมวดหมู่ย่อยในกลุ่มนี้",
                      parentPlaceholder: "เช่น อุปกรณ์ไฟฟ้า",
                      childPlaceholder: "เช่น สายไฟฟ้า",
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tool_cat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>หมวดหมู่เครื่องมือ</CardTitle>
                  <CardDescription>
                    จัดการหมวดหมู่หลักและหมวดหมู่ย่อยของเครื่องมือช่างในหน้าเดียว — กด ▶ เพื่อขยายดูหมวดหมู่ย่อย
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryAccordion
                    key={`tool-${refreshKey}`}
                    parentTable="tool_categories"
                    childTable="tool_subcategories"
                    childFk="tool_category_id"
                    storageKey="md:categories:tool:expanded"
                    labels={{
                      parentSingular: "หมวดหมู่หลัก",
                      childSingular: "หมวดหมู่ย่อย",
                      parentEmpty: "ยังไม่มีหมวดหมู่หลัก",
                      childEmpty: "ยังไม่มีหมวดหมู่ย่อยในกลุ่มนี้",
                      parentPlaceholder: "เช่น เครื่องมือช่างไฟฟ้า",
                      childPlaceholder: "เช่น สว่าน",
                    }}
                    
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        )}

        {(can("md_warehouses") || can("md_locations")) && (
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>คลัง & ตำแหน่งจัดเก็บ</CardTitle>
              <CardDescription>
                จัดการคลังสินค้าและตำแหน่งจัดเก็บในหน้าเดียว — กด ▶ เพื่อขยายดูตำแหน่งจัดเก็บของแต่ละคลัง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WarehouseLocationAccordion
                key={`wl-${refreshKey}`}
                canManageWarehouse={can("md_warehouses")}
                canManageLocation={can("md_locations")}
              />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {can("md_suppliers") && (
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
                <div className="flex flex-wrap gap-2">
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
        )}

        {can("md_contractors") && (
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
        )}

        {(can("md_departments") || can("md_sections")) && (
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ฝ่าย &amp; แผนก</CardTitle>
              <CardDescription>
                จัดการโครงสร้างฝ่ายและแผนกในรูปแบบต้นไม้ ขยาย/ยุบเพื่อดูแผนกในแต่ละฝ่าย
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentSectionAccordion
                canManageDepartment={can("md_departments")}
                canManageSection={can("md_sections")}
              />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {can("md_companies") && (
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
        )}

        {can("md_issue_purposes") && (
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
        )}

        {can("md_receipt_purposes") && (
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
        )}

        {can("md_technicians") && (
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
        )}

        {can("md_pm_action_types") && (
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
        )}

        {can("md_media_player") && (
        <TabsContent value="media_player" className="space-y-6">
          <Suspense fallback={<div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            <MediaPlayerEntry />
          </Suspense>

          {/* ตัวเลือกระบบ Workflow (Swap / Assessment / Claim) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                ตัวเลือกระบบ Workflow
              </CardTitle>
              <CardDescription>
                จัดการรายการ Dropdown ที่ใช้ในระบบ Swap / Assessment / Claim ของ Media Player และอุปกรณ์อื่นๆ
              </CardDescription>
            </CardHeader>
          </Card>

          <SimpleListManager
            tableName="mp_symptoms"
            title="① อาการเสีย (Symptoms)"
            description="รายการอาการเสียที่พบได้ — ใช้ในขั้นตอนแจ้ง Swap และ Assessment"
            itemLabel="อาการ"
          />
          <SimpleListManager
            tableName="mp_assessment_results"
            title="② ผลการประเมิน (Assessment Results)"
            description="ผลลัพธ์หลังตรวจประเมินเครื่องที่กลับเข้าคลัง"
            itemLabel="ผลการประเมิน"
          />
          <SimpleListManager
            tableName="mp_swap_reject_reasons"
            title="③ เหตุผลการ Reject Swap"
            description="เหตุผลที่ใช้เมื่อยกเลิกการ Swap ในขั้นตอน Confirm"
            itemLabel="เหตุผล"
          />
          <SimpleListManager
            tableName="mp_claim_results"
            title="④ ผลการเคลม (Claim Results)"
            description="ผลลัพธ์หลังรับเครื่องกลับจากการส่งเคลมประกัน Vendor"
            itemLabel="ผลการเคลม"
          />
          <RepairActionsManager />

        </TabsContent>
        )}

      </Tabs>
    </div>
  );
};

export default MasterData;
