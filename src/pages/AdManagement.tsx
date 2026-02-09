import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdDashboard } from "@/components/ad/AdDashboard";
import { AdList } from "@/components/ad/AdList";
import { AdMasterDataDialog } from "@/components/ad/AdMasterDataDialog";
import { AdNewForm } from "@/components/ad/AdNewForm";
import { AdTemporaryForm } from "@/components/ad/AdTemporaryForm";
import { AdOldForm } from "@/components/ad/AdOldForm";
import { AdReceiveSection } from "@/components/ad/AdReceiveSection";
import { AdIssueDialog } from "@/components/ad/AdIssueDialog";
import { AdIssueList } from "@/components/ad/AdIssueList";
import { ImageIcon, ChevronUp, ChevronDown, Package, FileOutput, List } from "lucide-react";

const AdManagement = () => {
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">จัดการภาพโฆษณา</h1>
          <p className="text-muted-foreground mt-1">
            ระบบจัดการภาพโฆษณา การจัดเก็บ และการติดตามสถานะ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdNewForm onSuccess={handleRefresh} />
          <AdTemporaryForm onSuccess={handleRefresh} />
          <AdOldForm onSuccess={handleRefresh} />
          <AdIssueDialog onSuccess={handleRefresh} />
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

      {/* Tabs: All / Receive / Issue */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <List className="h-4 w-4" />
            รายการทั้งหมด
          </TabsTrigger>
          <TabsTrigger value="receive" className="gap-1.5">
            <Package className="h-4 w-4" />
            รับเข้าคลัง
          </TabsTrigger>
          <TabsTrigger value="issue" className="gap-1.5">
            <FileOutput className="h-4 w-4" />
            เอกสารเบิก
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
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
        </TabsContent>

        <TabsContent value="receive">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Package className="h-5 w-5 text-warning" />
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
        </TabsContent>

        <TabsContent value="issue">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <FileOutput className="h-5 w-5 text-success" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdManagement;
