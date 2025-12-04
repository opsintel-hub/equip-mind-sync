import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Package, MapPin, Eye } from "lucide-react";

interface LocationData {
  id: string;
  name: string;
  code: string;
  equipmentCount: number;
  totalQuantity: number;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity_in_stock: number;
  unit: string;
  department: string | null;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const LocationInventoryChart = () => {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [locationEquipment, setLocationEquipment] = useState<Equipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    try {
      const { data: locations, error: locError } = await supabase
        .from("locations")
        .select("id, name, code")
        .eq("is_active", true);

      if (locError) throw locError;

      const { data: equipment, error: eqError } = await supabase
        .from("equipment")
        .select("location_id, quantity_in_stock")
        .eq("is_active", true)
        .not("location_id", "is", null);

      if (eqError) throw eqError;

      const locationStats = (locations || []).map((loc) => {
        const locEquipment = (equipment || []).filter((eq) => eq.location_id === loc.id);
        return {
          id: loc.id,
          name: loc.name,
          code: loc.code,
          equipmentCount: locEquipment.length,
          totalQuantity: locEquipment.reduce((sum, eq) => sum + (eq.quantity_in_stock || 0), 0),
        };
      }).filter(loc => loc.totalQuantity > 0);

      setLocationData(locationStats);
    } catch (error) {
      console.error("Error fetching location data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarClick = async (data: LocationData) => {
    setSelectedLocation(data);
    setLoadingEquipment(true);

    try {
      const { data: equipment, error } = await supabase
        .from("equipment")
        .select("id, code, name, category, quantity_in_stock, unit, department")
        .eq("location_id", data.id)
        .eq("is_active", true);

      if (error) throw error;
      setLocationEquipment(equipment || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoadingEquipment(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            สินค้าคงคลังแยกตามตำแหน่งจัดเก็บ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            กำลังโหลด...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locationData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            สินค้าคงคลังแยกตามตำแหน่งจัดเก็บ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            ไม่มีข้อมูลสินค้าในตำแหน่งจัดเก็บ
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            สินค้าคงคลังแยกตามตำแหน่งจัดเก็บ
          </CardTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Eye className="w-4 h-4" />
            คลิกที่แท่งกราฟเพื่อดูรายละเอียดสินค้า
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                label={{ value: "จำนวน", angle: -90, position: "insideLeft", className: "fill-muted-foreground" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "totalQuantity" ? "จำนวนสินค้ารวม" : "รายการสินค้า",
                ]}
              />
              <Bar
                dataKey="totalQuantity"
                name="จำนวนสินค้ารวม"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => handleBarClick(data)}
              >
                {locationData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              รายการสินค้าใน {selectedLocation?.name} ({selectedLocation?.code})
            </DialogTitle>
          </DialogHeader>

          {loadingEquipment ? (
            <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
          ) : locationEquipment.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">ไม่มีสินค้าในตำแหน่งนี้</div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <Badge variant="outline" className="px-3 py-1">
                  รายการทั้งหมด: {locationEquipment.length}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  จำนวนรวม: {locationEquipment.reduce((sum, eq) => sum + eq.quantity_in_stock, 0)}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>ฝ่าย</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead>หน่วย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationEquipment.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-mono">{eq.code}</TableCell>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell>{eq.category}</TableCell>
                      <TableCell>{eq.department || "-"}</TableCell>
                      <TableCell className="text-right font-semibold">{eq.quantity_in_stock}</TableCell>
                      <TableCell>{eq.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
