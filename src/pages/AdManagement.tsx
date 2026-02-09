import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdReceiveSection } from "@/components/ad/AdReceiveSection";
import { Package } from "lucide-react";

const AdManagement = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">รับเข้าคลังภาพ</h1>
        <p className="text-muted-foreground mt-1">
          ตรวจสอบและยืนยันรับภาพโฆษณาเข้าคลัง
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>รับเข้าคลัง</CardTitle>
              <CardDescription>
                รายการภาพโฆษณารอรับเข้าคลัง — ภาพใหม่จะสร้างเอกสารเบิกอัตโนมัติ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdReceiveSection refresh={refreshKey} onReceived={handleRefresh} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdManagement;
