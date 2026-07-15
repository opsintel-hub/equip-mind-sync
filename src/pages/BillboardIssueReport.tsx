import { useState, useEffect } from "react";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePagination } from "@/components/TablePagination";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Download, Filter, Search, BarChart3, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CompatibilityBadgeCell } from "@/components/reports/CompatibilityBadgeCell";


interface BillboardEquipment {
  id: string;
  billboard_id: string;
  equipment_id: string;
  quantity: number;
  installation_date: string | null;
  equipment?: {
    code: string;
    name: string;
    unit: string;
    unit_price: number;
    category: string;
  };
  billboard?: {
    equipment_id: string;
    old_code: string | null;
    location_name: string | null;
    region: string | null;
  };
}

interface BillboardSummary {
  billboard_id: string;
  billboard_code: string;
  old_code: string | null;
  location_name: string | null;
  region: string | null;
  totalItems: number;
  totalQuantity: number;
  totalCost: number;
}

const CHART_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#F97316", "#84CC16", "#6366F1",
];

const BillboardIssueReport = () => {
  const [billboardEquipment, setBillboardEquipment] = useState<BillboardEquipment[]>([]);
  const [billboards, setBillboards] = useState<Array<{ id: string; equipment_id: string; old_code: string | null; location_name: string | null }>>([]);
  const [selectedBillboard, setSelectedBillboard] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch billboard equipment with details
    const { data: beData } = await supabase
      .from("billboard_equipment")
      .select(`
        id,
        billboard_id,
        equipment_id,
        quantity,
        installation_date,
        equipment:equipment_id (code, name, unit, unit_price, category, serial_number),
        billboard:billboard_id (equipment_id, old_code, location_name, region)
      `)
      .order("installation_date", { ascending: false });

    // Fetch all billboards
    const { data: billboardsData } = await supabase
      .from("billboards")
      .select("id, equipment_id, old_code, location_name, region")
      .eq("status", "active")
      .order("old_code");

    // Fetch installed media players (they live in media_players, not billboard_equipment)
    const { data: mpData } = await supabase
      .from("media_players")
      .select(`
        id, code, name, billboard_id, install_date, unit_price, serial_number_1,
        billboard:billboard_id (equipment_id, old_code, location_name, region)
      `)
      .not("billboard_id", "is", null);

    const bbMap = new Map((billboardsData || []).map((b: any) => [b.id, b]));
    const mpRows: BillboardEquipment[] = (mpData || []).map((mp: any) => {
      const bbFallback = bbMap.get(mp.billboard_id) as any;
      return {
        id: `mp-${mp.id}`,
        billboard_id: mp.billboard_id,
        equipment_id: mp.id,
        quantity: 1,
        installation_date: mp.install_date,
        equipment: {
          code: mp.code,
          name: mp.name || "Media Player",
          unit: "เครื่อง",
          unit_price: mp.unit_price || 0,
          category: "Media Player",
          serial_number: mp.serial_number_1,
        } as any,
        billboard: mp.billboard
          ? { ...mp.billboard, old_code: mp.billboard.old_code ?? bbFallback?.old_code ?? null }
          : (bbFallback ? {
              equipment_id: bbFallback.equipment_id,
              old_code: bbFallback.old_code ?? null,
              location_name: bbFallback.location_name,
              region: bbFallback.region,
            } : undefined),
      };
    });

    const typedData = [...((beData || []) as unknown as BillboardEquipment[]), ...mpRows];
    setBillboardEquipment(typedData);
    setBillboards(billboardsData || []);

    // Extract unique regions
    const uniqueRegions = [...new Set((billboardsData || []).map(b => b.region).filter(Boolean))] as string[];
    setRegions(uniqueRegions);

    setIsLoading(false);
  };

  // Filter data
  const filteredData = billboardEquipment.filter(item => {
    const matchesBillboard = selectedBillboard === "all" || item.billboard_id === selectedBillboard;
    const matchesRegion = selectedRegion === "all" || item.billboard?.region === selectedRegion;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.equipment?.name?.toLowerCase().includes(term) ||
      item.equipment?.code?.toLowerCase().includes(term) ||
      item.billboard?.equipment_id?.toLowerCase().includes(term) ||
      item.billboard?.old_code?.toLowerCase().includes(term) ||
      (item.equipment as any)?.serial_number?.toLowerCase().includes(term);
    return matchesBillboard && matchesRegion && matchesSearch;
  });

  // Calculate summary by billboard
  const billboardSummary: BillboardSummary[] = [];
  const summaryMap = new Map<string, BillboardSummary>();

  filteredData.forEach(item => {
    const existing = summaryMap.get(item.billboard_id);
    const cost = item.quantity * (item.equipment?.unit_price || 0);
    
    if (existing) {
      existing.totalItems += 1;
      existing.totalQuantity += item.quantity;
      existing.totalCost += cost;
    } else {
      summaryMap.set(item.billboard_id, {
        billboard_id: item.billboard_id,
        billboard_code: item.billboard?.equipment_id || "",
        old_code: item.billboard?.old_code || null,
        location_name: item.billboard?.location_name || null,
        region: item.billboard?.region || null,
        totalItems: 1,
        totalQuantity: item.quantity,
        totalCost: cost,
      });
    }
  });

  summaryMap.forEach(value => billboardSummary.push(value));
  billboardSummary.sort((a, b) => b.totalCost - a.totalCost);

  const { paginatedData: paginatedBillboards, currentPage, pageSize, totalPages, totalItems, handlePageChange, handlePageSizeChange } = useTablePagination(billboardSummary, 20);

  // Chart data - top 10 billboards by cost
  const chartData = billboardSummary.slice(0, 10).map((item, index) => ({
    name: item.billboard_code || item.billboard_id.slice(0, 8),
    value: item.totalCost,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Total stats
  const totalStats = {
    billboards: billboardSummary.length,
    items: filteredData.length,
    quantity: filteredData.reduce((sum, item) => sum + item.quantity, 0),
    cost: filteredData.reduce((sum, item) => sum + (item.quantity * (item.equipment?.unit_price || 0)), 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = () => {
    const detailData = filteredData.map(item => ({
      "Old Code": item.billboard?.old_code || "-",
      "Equipment ID": item.billboard?.equipment_id || "",
      "ตำแหน่ง": item.billboard?.location_name || "-",
      "ภูมิภาค": item.billboard?.region || "-",
      "รหัสสินค้า": item.equipment?.code || "",
      "ชื่อสินค้า": item.equipment?.name || "",
      "หมวดหมู่": item.equipment?.category || "",
      "จำนวน": item.quantity,
      "หน่วย": item.equipment?.unit || "",
      "ราคา/หน่วย": item.equipment?.unit_price || 0,
      "มูลค่ารวม": item.quantity * (item.equipment?.unit_price || 0),
      "วันที่ติดตั้ง": item.installation_date ? format(new Date(item.installation_date), "dd/MM/yyyy") : "-",
    }));

    const summaryData = billboardSummary.map(item => ({
      "Old Code": item.old_code || "-",
      "Equipment ID": item.billboard_code,
      "ตำแหน่ง": item.location_name || "-",
      "ภูมิภาค": item.region || "-",
      "จำนวนรายการ": item.totalItems,
      "จำนวนชิ้นรวม": item.totalQuantity,
      "มูลค่ารวม": item.totalCost,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(detailData);
    
    XLSX.utils.book_append_sheet(wb, ws1, "สรุปตามป้าย");
    XLSX.utils.book_append_sheet(wb, ws2, "รายละเอียด");
    
    XLSX.writeFile(wb, `billboard_issue_report_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          รายงานเบิกอะไหล่แยกตามป้ายโฆษณา
        </h1>
        <p className="text-muted-foreground">วิเคราะห์ต้นทุนและจำนวนอะไหล่ที่ใช้กับแต่ละป้ายโฆษณา</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนป้าย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.billboards.toLocaleString()}</div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">มูลค่ารวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalStats.cost)}</div>
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
              <label className="text-sm font-medium">ค้นหา</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา Old Code, Equipment ID, สินค้า, S/N..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ป้ายโฆษณา</label>
              <Select value={selectedBillboard} onValueChange={setSelectedBillboard}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกป้าย" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {billboards.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.old_code || b.equipment_id} - {b.location_name || "N/A"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ภูมิภาค</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกภูมิภาค" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 ป้ายที่มีต้นทุนสูงสุด</CardTitle>
            <CardDescription>มูลค่าอะไหล่ที่ติดตั้งในแต่ละป้าย</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`}
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
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>สรุปตามป้ายโฆษณา</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Old Code</TableHead>
                  <TableHead>Equipment ID</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>ภูมิภาค</TableHead>
                  <TableHead className="text-right">รายการ</TableHead>
                  <TableHead className="text-right">จำนวนชิ้น</TableHead>
                  <TableHead className="text-right">มูลค่ารวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">กำลังโหลด...</TableCell>
                  </TableRow>
                ) : billboardSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่มีข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBillboards.map((item) => (
                    <TableRow key={item.billboard_id}>
                      <TableCell className="font-mono font-medium">{item.old_code || "-"}</TableCell>
                      <TableCell className="font-mono">{item.billboard_code}</TableCell>
                      <TableCell>{item.location_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.region || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.totalItems}</TableCell>
                      <TableCell className="text-right">{item.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
        </CardContent>
      </Card>

      {/* Per-item detail table — 1 row = 1 S/N */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            รายละเอียดรายชิ้น (1 S/N = 1 แถว)
          </CardTitle>
          <CardDescription>รายการอุปกรณ์/Media Player ที่ติดตั้งบนป้ายแต่ละชิ้น</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Old Code</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>รหัสสินค้า</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>S/N</TableHead>
                  <TableHead>ป้ายที่รองรับ</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">มูลค่า</TableHead>
                  <TableHead>วันที่ติดตั้ง</TableHead>
                </TableRow>

              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">กำลังโหลด...</TableCell></TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">ไม่มีข้อมูล</TableCell></TableRow>
                ) : (
                  filteredData.map((item) => {
                    const sn = (item.equipment as any)?.serial_number || "-";
                    const cost = item.quantity * (item.equipment?.unit_price || 0);
                    const isMP = String(item.id).startsWith("mp-");
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.billboard?.old_code || "-"}</TableCell>
                        <TableCell className="text-sm">{item.billboard?.location_name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{item.equipment?.code || "-"}</TableCell>
                        <TableCell>{item.equipment?.name || "-"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.equipment?.category || "-"}</Badge></TableCell>
                        <TableCell className="font-mono text-xs whitespace-pre-line">{sn}</TableCell>
                        <TableCell><CompatibilityBadgeCell equipmentId={isMP ? null : item.equipment_id} skip={isMP} /></TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.installation_date ? format(new Date(item.installation_date), "d MMM yy", { locale: th }) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

              </TableBody>
            </Table>
          </div>
          <div className="px-3 pt-2 text-sm text-muted-foreground border-t mt-2">แสดงทั้งหมด {filteredData.length.toLocaleString()} รายการ</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillboardIssueReport;
