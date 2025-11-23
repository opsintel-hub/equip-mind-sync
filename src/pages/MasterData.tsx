import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Search, Plus, Edit, Trash2 } from "lucide-react";

const MasterData = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const mockEquipment = [
    { sku: "SKU-001", name: "อะไหล่ A", category: "อะไหล่", unit: "ชิ้น", stock: 450 },
    { sku: "SKU-102", name: "เครื่องมือ B", category: "เครื่องมือ", unit: "ชุด", stock: 125 },
    { sku: "SKU-203", name: "อุปกรณ์ C", category: "อุปกรณ์", unit: "ชิ้น", stock: 280 },
    { sku: "SKU-305", name: "อะไหล่ D", category: "อะไหล่", unit: "กล่อง", stock: 95 },
  ];

  const mockLocations = [
    { zone: "Zone A", aisle: "Aisle 1", shelf: "Shelf 1", bin: "Bin 01", capacity: "85%" },
    { zone: "Zone A", aisle: "Aisle 2", shelf: "Shelf 3", bin: "Bin 05", capacity: "62%" },
    { zone: "Zone B", aisle: "Aisle 1", shelf: "Shelf 2", bin: "Bin 03", capacity: "41%" },
    { zone: "Zone C", aisle: "Aisle 3", shelf: "Shelf 1", bin: "Bin 02", capacity: "28%" },
  ];

  const mockSuppliers = [
    { id: "SUP-001", name: "Supplier A", contact: "02-123-4567", email: "contact@supplier-a.com" },
    { id: "SUP-002", name: "Supplier B", contact: "02-234-5678", email: "contact@supplier-b.com" },
    { id: "SUP-003", name: "Supplier C", contact: "02-345-6789", email: "contact@supplier-c.com" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">ข้อมูลหลัก</h1>
        <p className="text-muted-foreground">จัดการข้อมูลหลักของระบบ</p>
      </div>

      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="equipment">อุปกรณ์/อะไหล่</TabsTrigger>
          <TabsTrigger value="locations">ตำแหน่งจัดเก็บ</TabsTrigger>
          <TabsTrigger value="suppliers">ผู้จัดจำหน่าย</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  รายการอุปกรณ์/อะไหล่
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหา SKU หรือชื่อ..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มรายการ
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>SKU</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>หน่วย</TableHead>
                      <TableHead>คงเหลือ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockEquipment.map((item) => (
                      <TableRow key={item.sku} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  ตำแหน่งจัดเก็บ
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มตำแหน่ง
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Zone</TableHead>
                      <TableHead>Aisle</TableHead>
                      <TableHead>Shelf</TableHead>
                      <TableHead>Bin</TableHead>
                      <TableHead>ความจุ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockLocations.map((location, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{location.zone}</TableCell>
                        <TableCell>{location.aisle}</TableCell>
                        <TableCell>{location.shelf}</TableCell>
                        <TableCell>{location.bin}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-24">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: location.capacity }} 
                              />
                            </div>
                            <span className="text-sm">{location.capacity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  ผู้จัดจำหน่าย
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มผู้จัดจำหน่าย
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>เบอร์ติดต่อ</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSuppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{supplier.id}</TableCell>
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell>{supplier.contact}</TableCell>
                        <TableCell>{supplier.email}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterData;
