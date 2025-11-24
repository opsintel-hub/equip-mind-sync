import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Truck } from "lucide-react";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { EquipmentList } from "@/components/equipment/EquipmentList";
import { supabase } from "@/integrations/supabase/client";

interface Location {
  id: string;
  code: string;
  name: string;
}

const MasterData = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

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
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="equipment" className="gap-2">
            <Package className="h-4 w-4" />
            อุปกรณ์
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            ตำแหน่งจัดเก็บ
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="h-4 w-4" />
            ผู้จัดจำหน่าย
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>รายการอุปกรณ์/อะไหล่</CardTitle>
                  <CardDescription>
                    จัดการข้อมูลอุปกรณ์และอะไหล่ทั้งหมด
                  </CardDescription>
                </div>
                <EquipmentForm onSuccess={handleSuccess} locations={locations} />
              </div>
            </CardHeader>
            <CardContent>
              <EquipmentList refresh={refreshKey} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ตำแหน่งจัดเก็บ</CardTitle>
              <CardDescription>
                จัดการตำแหน่งจัดเก็บสินค้าในคลัง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                กำลังพัฒนา...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ผู้จัดจำหน่าย</CardTitle>
              <CardDescription>
                จัดการข้อมูลผู้จัดจำหน่ายและซัพพลายเออร์
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                กำลังพัฒนา...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterData;
