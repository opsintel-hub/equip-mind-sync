import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdDashboard } from "@/components/ad/AdDashboard";
import { AdList } from "@/components/ad/AdList";
import { AdMasterDataDialog } from "@/components/ad/AdMasterDataDialog";
import { AdNewForm } from "@/components/ad/AdNewForm";
import { AdTemporaryForm } from "@/components/ad/AdTemporaryForm";
import { AdOldForm } from "@/components/ad/AdOldForm";
import { ImageIcon, ChevronUp, ChevronDown, List } from "lucide-react";

const AdEntry = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [showDashboard, setShowDashboard] = useState(true);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleFilterChange = (filter: { type?: string; status?: string }) => {
    setFilterType(filter.type);
    setFilterStatus(filter.status);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">นำเข้าภาพโฆษณา</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            กรอกข้อมูลภาพโฆษณาใหม่ ฝากชั่วคราว หรือภาพเก่า
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdNewForm onSuccess={handleRefresh} />
          <AdTemporaryForm onSuccess={handleRefresh} />
          <AdOldForm onSuccess={handleRefresh} />
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
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">รายการภาพโฆษณา</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                รายการภาพโฆษณาทั้งหมดในระบบ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <AdList
            refresh={refreshKey}
            filterType={filterType}
            filterStatus={filterStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdEntry;
