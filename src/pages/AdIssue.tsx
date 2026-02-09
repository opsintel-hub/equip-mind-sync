import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdIssueList } from "@/components/ad/AdIssueList";
import { FileOutput } from "lucide-react";

const AdIssue = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">จ่ายภาพโฆษณา</h1>
        <p className="text-muted-foreground mt-1">
          ดูคำขอเบิกทั้งหมด ยืนยันจ่ายออก และยืนยันการติดตั้ง
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileOutput className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>เอกสารเบิกภาพโฆษณา</CardTitle>
              <CardDescription>
                รายการเอกสารเบิกทั้งหมด ทั้งที่สร้างอัตโนมัติและสร้างเอง
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdIssueList refresh={refreshKey} onUpdated={handleRefresh} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdIssue;
