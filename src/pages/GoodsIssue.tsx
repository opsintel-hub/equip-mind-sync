import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageOpen, Search } from "lucide-react";
import { toast } from "sonner";

const GoodsIssue = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const mockIssues = [
    { id: "GI-001", date: "2025-01-15", sku: "SKU-001", name: "อะไหล่ A", quantity: 25, destination: "BRD-045", status: "เบิกแล้ว" },
    { id: "GI-002", date: "2025-01-15", sku: "SKU-102", name: "เครื่องมือ B", quantity: 10, destination: "ทีม Engineering", status: "เบิกแล้ว" },
    { id: "GI-003", date: "2025-01-14", sku: "SKU-203", name: "อุปกรณ์ C", quantity: 15, destination: "BRD-128", status: "เบิกแล้ว" },
    { id: "GI-004", date: "2025-01-14", sku: "SKU-305", name: "อะไหล่ D", quantity: 30, destination: "ทีม Maintenance", status: "เบิกแล้ว" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("บันทึกการเบิกจ่ายสินค้าสำเร็จ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">เบิกจ่ายสินค้า (GI)</h1>
        <p className="text-muted-foreground">บันทึกการเบิกจ่ายสินค้าออกจากคลัง</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5" />
            สร้างเอกสารเบิกจ่ายใหม่
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">รหัสสินค้า (SKU)</Label>
                <Select>
                  <SelectTrigger id="sku">
                    <SelectValue placeholder="เลือก SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sku-001">SKU-001 - อะไหล่ A</SelectItem>
                    <SelectItem value="sku-102">SKU-102 - เครื่องมือ B</SelectItem>
                    <SelectItem value="sku-203">SKU-203 - อุปกรณ์ C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">จำนวน</Label>
                <Input id="quantity" type="number" placeholder="กรอกจำนวน" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">หน่วย</Label>
                <Select>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="เลือกหน่วย" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">ชิ้น</SelectItem>
                    <SelectItem value="box">กล่อง</SelectItem>
                    <SelectItem value="set">ชุด</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination-type">ประเภทผู้รับ</Label>
                <Select>
                  <SelectTrigger id="destination-type">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billboard">ป้ายโฆษณา</SelectItem>
                    <SelectItem value="team">ทีมงาน</SelectItem>
                    <SelectItem value="project">โครงการ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">ผู้รับ/ป้ายโฆษณา</Label>
                <Select>
                  <SelectTrigger id="destination">
                    <SelectValue placeholder="เลือกผู้รับ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brd-045">BRD-045 - สุขุมวิท</SelectItem>
                    <SelectItem value="brd-128">BRD-128 - พระราม 4</SelectItem>
                    <SelectItem value="team-eng">ทีม Engineering</SelectItem>
                    <SelectItem value="team-maint">ทีม Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">วัตถุประสงค์</Label>
              <Input id="purpose" type="text" placeholder="ระบุวัตถุประสงค์การเบิก" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">หมายเหตุ</Label>
              <Input id="remarks" type="text" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
            </div>

            <Button type="submit" className="w-full md:w-auto">
              บันทึกการเบิกจ่าย
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ประวัติการเบิกจ่าย</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ผู้รับ/ปลายทาง</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockIssues.map((issue) => (
                  <TableRow key={issue.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{issue.id}</TableCell>
                    <TableCell>{issue.date}</TableCell>
                    <TableCell>{issue.sku}</TableCell>
                    <TableCell>{issue.name}</TableCell>
                    <TableCell>{issue.quantity}</TableCell>
                    <TableCell>{issue.destination}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                        {issue.status}
                      </span>
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

export default GoodsIssue;
