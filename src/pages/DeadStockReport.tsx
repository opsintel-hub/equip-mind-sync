import { useState, useEffect, useMemo } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Archive, Download, Filter, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";

interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  department: string | null;
  quantity_in_stock: number;
  unit: string;
  unit_price: number;
  warehouse_entry_date: string;
  location_id: string | null;
  item_condition: string;
}

interface Location {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface AgeGroup {
  label: string;
  minDays: number;
  maxDays: number;
  count: number;
  quantity: number;
  totalCost: number;
}

const AGE_GROUPS: Omit<AgeGroup, 'count' | 'quantity' | 'totalCost'>[] = [
  { label: "< 30 วัน", minDays: 0, maxDays: 29 },
  { label: "1-3 เดือน", minDays: 30, maxDays: 89 },
  { label: "4-6 เดือน", minDays: 90, maxDays: 179 },
  { label: "7-9 เดือน", minDays: 180, maxDays: 269 },
  { label: "10-12 เดือน", minDays: 270, maxDays: 364 },
  { label: "1-2 ปี", minDays: 365, maxDays: 729 },
  { label: "3-4 ปี", minDays: 730, maxDays: 1459 },
  { label: "5 ปี", minDays: 1460, maxDays: 1824 },
  { label: "> 5 ปี", minDays: 1825, maxDays: Infinity },
];

// Modern color palette for charts
const CHART_COLORS = [
  "#10B981", // emerald-500
  "#3B82F6", // blue-500
  "#8B5CF6", // violet-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#F97316", // orange-500
  "#DC2626", // red-600
];

const DeadStockReport = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { allowedDepartments, isAdmin, isSingleDepartment, loading: permLoading } = useAllowedDepartments();
  const allowedDeptNames = useMemo(() => allowedDepartments.map(d => d.name), [allowedDepartments]);

  // Filter departments by permissions
  const departments = useMemo(() => {
    return isAdmin ? allDepartments : allDepartments.filter(d => allowedDeptNames.includes(d));
  }, [allDepartments, isAdmin, allowedDeptNames]);

  // Auto-select if single department
  useEffect(() => {
    if (!permLoading && isSingleDepartment && allowedDepartments.length === 1 && selectedDepartment === "all") {
      setSelectedDepartment(allowedDepartments[0].name);
    }
  }, [permLoading, isSingleDepartment, allowedDepartments, selectedDepartment]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [equipmentRes, locationsRes, deptRes, catRes] = await Promise.all([
      supabase
        .from("equipment")
        .select("id, code, name, category, department, quantity_in_stock, unit, unit_price, warehouse_entry_date, location_id, item_condition")
        .eq("is_active", true)
        .gt("quantity_in_stock", 0),
      supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true),
      supabase
        .from("departments")
        .select("name")
        .eq("is_active", true),
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true),
    ]);

    if (equipmentRes.data) {
      setEquipment(equipmentRes.data);
    }
    if (locationsRes.data) {
      setLocations(locationsRes.data);
    }
    if (deptRes.data) {
      setAllDepartments(deptRes.data.map(d => d.name));
    }
    if (catRes.data) {
      setCategories(catRes.data);
    }
    
    setIsLoading(false);
  };

  const getAgeDays = (entryDate: string): number => {
    return differenceInDays(new Date(), new Date(entryDate));
  };

  const getAgeGroupLabel = (days: number): string => {
    const group = AGE_GROUPS.find(g => days >= g.minDays && days <= g.maxDays);
    return group?.label || "> 5 ปี";
  };

  const getAgeGroupBadgeColor = (days: number): string => {
    if (days < 30) return "bg-success/10 text-success";
    if (days < 90) return "bg-info/10 text-info";
    if (days < 180) return "bg-warning/10 text-warning";
    if (days < 365) return "bg-orange-500/10 text-orange-500";
    return "bg-destructive/10 text-destructive";
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesDept = selectedDepartment === "all" || item.department === selectedDepartment;
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesCondition = selectedCondition === "all" || (item.item_condition || 'normal') === selectedCondition;
    const days = getAgeDays(item.warehouse_entry_date);
    const ageGroup = AGE_GROUPS.find(g => days >= g.minDays && days <= g.maxDays);
    const matchesAge = selectedAgeGroup === "all" || ageGroup?.label === selectedAgeGroup;
    return matchesDept && matchesAge && matchesCategory && matchesCondition;
  });

  const ageGroupSummary: AgeGroup[] = AGE_GROUPS.map(group => {
    const items = equipment.filter(item => {
      const days = getAgeDays(item.warehouse_entry_date);
      const matchesDept = selectedDepartment === "all" || item.department === selectedDepartment;
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesDept && matchesCategory && days >= group.minDays && days <= group.maxDays;
    });
    return {
      ...group,
      count: items.length,
      quantity: items.reduce((sum, item) => sum + item.quantity_in_stock, 0),
      totalCost: items.reduce((sum, item) => sum + (item.quantity_in_stock * item.unit_price), 0),
    };
  });

  // Chart data
  const quantityChartData = ageGroupSummary.map((group, index) => ({
    name: group.label,
    value: group.quantity,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const amountChartData = ageGroupSummary.map((group, index) => ({
    name: group.label,
    value: group.totalCost,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const totalStats = {
    items: filteredEquipment.length,
    quantity: filteredEquipment.reduce((sum, item) => sum + item.quantity_in_stock, 0),
    cost: filteredEquipment.reduce((sum, item) => sum + (item.quantity_in_stock * item.unit_price), 0),
  };

  const getLocationName = (locationId: string | null): string => {
    if (!locationId) return "-";
    return locations.find(l => l.id === locationId)?.name || "-";
  };

  const exportToExcel = () => {
    const conditionLabel = (c: string) => c === 'defective' ? 'เสีย/ชำรุด' : c === 'pending_inspection' ? 'รอตรวจสอบ' : 'ปกติ';
    const exportData = filteredEquipment.map(item => ({
      "รหัสสินค้า": item.code,
      "ชื่อสินค้า": item.name,
      "หมวดหมู่": item.category,
      "ฝ่าย": item.department || "-",
      "คลังสินค้า": getLocationName(item.location_id),
      "สภาพสินค้า": conditionLabel(item.item_condition || 'normal'),
      "จำนวน": item.quantity_in_stock,
      "หน่วย": item.unit,
      "ราคา/ชิ้น": item.unit_price,
      "มูลค่ารวม": item.quantity_in_stock * item.unit_price,
      "วันที่นำเข้า": format(new Date(item.warehouse_entry_date), "dd/MM/yyyy"),
      "อายุ (วัน)": getAgeDays(item.warehouse_entry_date),
      "ช่วงอายุ": getAgeGroupLabel(getAgeDays(item.warehouse_entry_date)),
    }));

    const summaryData = ageGroupSummary.map(group => ({
      "ช่วงอายุ": group.label,
      "จำนวนรายการ": group.count,
      "จำนวนชิ้น": group.quantity,
      "มูลค่ารวม": group.totalCost,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(exportData);
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    
    XLSX.utils.book_append_sheet(wb, ws1, "รายละเอียด Dead Stock");
    XLSX.utils.book_append_sheet(wb, ws2, "สรุปตามช่วงอายุ");
    
    XLSX.writeFile(wb, `dead_stock_report_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("th-TH").format(num);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <Archive className="w-8 h-8" />
          รายงาน Dead Stock
        </h1>
        <p className="text-muted-foreground">วิเคราะห์สินค้าค้างสต็อกตามระยะเวลา เพื่อการบริหารจัดการสินค้าคงคลังแบบ FIFO</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนรายการ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.items.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนชิ้นรวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.quantity.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">มูลค่า Dead Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalStats.cost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              สินค้าเกิน 1 ปี
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(ageGroupSummary.filter(g => g.minDays >= 365).reduce((sum, g) => sum + g.totalCost, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>ตัวกรอง</CardTitle>
            </div>
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ฝ่าย</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isSingleDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกฝ่าย" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                  {!isSingleDepartment && <SelectItem value="all">ทั้งหมด</SelectItem>}
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">หมวดหมู่</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ช่วงอายุสินค้า</label>
              <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่วงอายุ" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {AGE_GROUPS.map(group => (
                    <SelectItem key={group.label} value={group.label}>{group.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">สภาพสินค้า</label>
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสภาพ" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-background z-[200] max-h-60 overflow-y-auto">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="defective">เสีย/ชำรุด</SelectItem>
                  <SelectItem value="pending_inspection">รอตรวจสอบ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">จำนวนชิ้นตามช่วงอายุ</CardTitle>
            <CardDescription>แสดงจำนวนสินค้า (ชิ้น) ในแต่ละช่วงอายุ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quantityChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={formatNumber}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value) + " ชิ้น", "จำนวน"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {quantityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">มูลค่าตามช่วงอายุ</CardTitle>
            <CardDescription>แสดงมูลค่าสินค้า (บาท) ในแต่ละช่วงอายุ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amountChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "มูลค่า"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {amountChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Age Group Summary */}
      <Card>
        <CardHeader>
          <CardTitle>สรุปตามช่วงอายุ</CardTitle>
          <CardDescription>แสดงจำนวนและมูลค่าสินค้าในแต่ละช่วงอายุ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {ageGroupSummary.map((group, index) => (
              <Card 
                key={group.label} 
                className={`cursor-pointer transition-all ${selectedAgeGroup === group.label ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedAgeGroup(selectedAgeGroup === group.label ? "all" : group.label)}
                style={{ borderTopColor: CHART_COLORS[index % CHART_COLORS.length], borderTopWidth: '3px' }}
              >
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{group.label}</div>
                  <div className="font-bold text-lg">{group.count}</div>
                  <div className="text-xs text-muted-foreground">{group.quantity} ชิ้น</div>
                  <div className="text-xs font-medium text-destructive mt-1">
                    {formatCurrency(group.totalCost)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดสินค้า Dead Stock</CardTitle>
          <CardDescription>เรียงตามอายุมากที่สุดก่อน (FIFO)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>คลัง</TableHead>
                  <TableHead>สภาพ</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">ราคา/ชิ้น</TableHead>
                  <TableHead className="text-right">มูลค่ารวม</TableHead>
                  <TableHead>วันที่นำเข้า</TableHead>
                  <TableHead>ช่วงอายุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filteredEquipment
                    .sort((a, b) => getAgeDays(b.warehouse_entry_date) - getAgeDays(a.warehouse_entry_date))
                    .map((item) => {
                      const days = getAgeDays(item.warehouse_entry_date);
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.department || "-"}</TableCell>
                          <TableCell>{getLocationName(item.location_id)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${
                              (item.item_condition || 'normal') === 'defective' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                              (item.item_condition || 'normal') === 'pending_inspection' ? 'bg-warning/10 text-warning border-warning/30' :
                              'bg-green-500/10 text-green-600 border-green-500/30'
                            }`}>
                              {(item.item_condition || 'normal') === 'defective' ? 'เสีย/ชำรุด' : (item.item_condition || 'normal') === 'pending_inspection' ? 'รอตรวจสอบ' : 'ปกติ'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity_in_stock} {item.unit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.quantity_in_stock * item.unit_price)}</TableCell>
                          <TableCell>{format(new Date(item.warehouse_entry_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <Badge className={getAgeGroupBadgeColor(days)}>
                              {getAgeGroupLabel(days)} ({days} วัน)
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {!isLoading && filteredEquipment.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeadStockReport;