import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdDashboard } from "@/components/ad/AdDashboard";
import { AdList } from "@/components/ad/AdList";
import { AdMasterDataDialog } from "@/components/ad/AdMasterDataDialog";
import { Plus, Clock, Archive, ImageIcon, ChevronUp, ChevronDown } from "lucide-react";

const AdManagement = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [showDashboard, setShowDashboard] = useState(true);

  const handleFilterChange = (filter: { type?: string; status?: string }) => {
    setFilterType(filter.type);
    setFilterStatus(filter.status);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">จัดการภาพโฆษณา</h1>
          <p className="text-muted-foreground mt-1">
            ระบบจัดการภาพโฆษณา การจัดเก็บ และการติดตามสถานะ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            ภาพใหม่
          </Button>
          <Button variant="outline" className="gap-2" disabled>
            <Clock className="h-4 w-4" />
            ขอใช้พื้นที่
          </Button>
          <Button variant="outline" className="gap-2" disabled>
            <Archive className="h-4 w-4" />
            ภาพเก่า
          </Button>
          <AdMasterDataDialog />
        </div>
      </div>

      {/* Dashboard Toggle */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground mb-2"
          onClick={() => setShowDashboard(!showDashboard)}
        >
          {showDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDashboard ? "ซ่อน Dashboard" : "แสดง Dashboard"}
        </Button>
        {showDashboard && (
          <AdDashboard refresh={refreshKey} onFilterChange={handleFilterChange} />
        )}
      </div>

      {/* Ad List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>รายการภาพโฆษณา</CardTitle>
              <CardDescription>
                รายการภาพโฆษณาทั้งหมดในระบบ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdList
            refresh={refreshKey}
            filterType={filterType}
            filterStatus={filterStatus}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center bg-muted/50 p-3 rounded-lg">
        💡 <strong>หมายเหตุ:</strong> ปุ่ม "ภาพใหม่", "ขอใช้พื้นที่" และ "ภาพเก่า" จะเปิดใช้งานในเฟสถัดไป 
        ตอนนี้สามารถจัดการ Master Data (ขนาดภาพ / ประเภทสื่อ) ได้ก่อน
      </p>
    </div>
  );
};

export default AdManagement;
