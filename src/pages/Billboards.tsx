import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Plus, Eye } from "lucide-react";

const Billboards = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const mockBillboards = [
    { 
      id: "BRD-045", 
      name: "ป้ายสุขุมวิท", 
      location: "สุขุมวิท ซอย 21", 
      status: "ใช้งาน", 
      equipment: 12,
      lastUpdate: "2025-01-15"
    },
    { 
      id: "BRD-128", 
      name: "ป้ายพระราม 4", 
      location: "ถนนพระราม 4 กม.5", 
      status: "ใช้งาน", 
      equipment: 8,
      lastUpdate: "2025-01-14"
    },
    { 
      id: "BRD-089", 
      name: "ป้ายรัชดา", 
      location: "ถนนรัชดาภิเษก", 
      status: "บำรุงรักษา", 
      equipment: 5,
      lastUpdate: "2025-01-10"
    },
    { 
      id: "BRD-156", 
      name: "ป้ายวงศ์สว่าง", 
      location: "แยกวงศ์สว่าง", 
      status: "ใช้งาน", 
      equipment: 15,
      lastUpdate: "2025-01-13"
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ใช้งาน":
        return <Badge className="bg-success/10 text-success hover:bg-success/20">{status}</Badge>;
      case "บำรุงรักษา":
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">ฐานข้อมูลป้ายโฆษณา</h1>
        <p className="text-muted-foreground">จัดการข้อมูลป้ายโฆษณาและอุปกรณ์ที่ติดตั้ง</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ป้ายทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">324</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-success">289</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">บำรุงรักษา</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-warning">35</div>
            <p className="text-sm text-muted-foreground mt-1">จุด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">อุปกรณ์รวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-primary">3,245</div>
            <p className="text-sm text-muted-foreground mt-1">ชิ้น</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              รายการป้ายโฆษณา
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหารหัสหรือชื่อป้าย..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มป้าย
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>รหัสป้าย</TableHead>
                  <TableHead>ชื่อป้าย</TableHead>
                  <TableHead>ที่อยู่</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>อุปกรณ์</TableHead>
                  <TableHead>อัพเดทล่าสุด</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockBillboards.map((billboard) => (
                  <TableRow key={billboard.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{billboard.id}</TableCell>
                    <TableCell>{billboard.name}</TableCell>
                    <TableCell>{billboard.location}</TableCell>
                    <TableCell>{getStatusBadge(billboard.status)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
                        {billboard.equipment} ชิ้น
                      </span>
                    </TableCell>
                    <TableCell>{billboard.lastUpdate}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        ดูรายละเอียด
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billboards;
