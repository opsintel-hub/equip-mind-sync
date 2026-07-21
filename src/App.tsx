import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Eager: หน้าแรกที่เปิดบ่อย
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy: ทุกหน้าใน app เพื่อลดขนาด initial bundle
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DeliveryEntry = lazy(() => import("./pages/DeliveryEntry"));
const ReceiveGoods = lazy(() => import("./pages/ReceiveGoods"));
const GoodsIssue = lazy(() => import("./pages/GoodsIssue"));
const IssueRequest = lazy(() => import("./pages/IssueRequest"));
const IssueGoods = lazy(() => import("./pages/IssueGoods"));
const MasterData = lazy(() => import("./pages/MasterData"));
const Billboards = lazy(() => import("./pages/Billboards"));
const BillboardDetail = lazy(() => import("./pages/BillboardDetail"));
const BillboardPublicView = lazy(() => import("./pages/BillboardPublicView"));
const Admin = lazy(() => import("./pages/Admin"));
const QRCodePage = lazy(() => import("./pages/QRCode"));
const TransferHistory = lazy(() => import("./pages/TransferHistory"));
const PMHistory = lazy(() => import("./pages/PMHistory"));
const ToolPMTasks = lazy(() => import("./pages/ToolPMTasks"));
const ToolPMHistory = lazy(() => import("./pages/ToolPMHistory"));
const ToolPMSchedule = lazy(() => import("./pages/ToolPMSchedule"));
const ToolPMReport = lazy(() => import("./pages/ToolPMReport"));
const ToolManagement = lazy(() => import("./pages/ToolManagement"));
const EquipmentLoans = lazy(() => import("./pages/EquipmentLoans"));
const IncompleteIssues = lazy(() => import("./pages/IncompleteIssues"));
const BillboardIssueReport = lazy(() => import("./pages/BillboardIssueReport"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const DeadStockReport = lazy(() => import("./pages/DeadStockReport"));
const PurchaseRequests = lazy(() => import("./pages/PurchaseRequests"));
const WaitingStockRequests = lazy(() => import("./pages/WaitingStockRequests"));
const RequesterDashboard = lazy(() => import("./pages/RequesterDashboard"));
const UserManual = lazy(() => import("./pages/UserManual"));
const DocumentSearch = lazy(() => import("./pages/DocumentSearch"));
const Testing = lazy(() => import("./pages/Testing"));
const InventoryReport = lazy(() => import("./pages/InventoryReport"));
const PendingAssetCodes = lazy(() => import("./pages/PendingAssetCodes"));
const AdManagement = lazy(() => import("./pages/AdManagement"));
const AdEntry = lazy(() => import("./pages/AdEntry"));
const AdRequest = lazy(() => import("./pages/AdRequest"));
const AdIssue = lazy(() => import("./pages/AdIssue"));
const AdPublicView = lazy(() => import("./pages/AdPublicView"));
const AdContractorView = lazy(() => import("./pages/AdContractorView"));
const EquipmentTrackingReport = lazy(() => import("./pages/EquipmentTrackingReport"));
const BillboardPartsAvailability = lazy(() => import("./pages/BillboardPartsAvailability"));

const BillboardPMPage = lazy(() => import("./pages/BillboardPMPage"));
const DefectiveReturnEntry = lazy(() => import("./pages/DefectiveReturnEntry"));
const DisposalApproval = lazy(() => import("./pages/DisposalApproval"));
const StockCard = lazy(() => import("./pages/StockCard"));
const DeliveryConfirmation = lazy(() => import("./pages/DeliveryConfirmation"));
const ManagerApproval = lazy(() => import("./pages/ManagerApproval"));
const WarehousePickupPlanning = lazy(() => import("./pages/WarehousePickupPlanning"));
const DirectShippingEntry = lazy(() => import("./pages/DirectShippingEntry"));
const DirectShippingApproval = lazy(() => import("./pages/DirectShippingApproval"));
const DirectShippingProcurement = lazy(() => import("./pages/DirectShippingProcurement"));
const DirectShippingPublicView = lazy(() => import("./pages/DirectShippingPublicView"));
const BillboardPackages = lazy(() => import("./pages/BillboardPackages"));
const MediaPlayerProfile = lazy(() => import("./pages/MediaPlayerProfile"));
const MediaPlayerPublicView = lazy(() => import("./pages/MediaPlayerPublicView"));
const MediaPlayerReport = lazy(() => import("./pages/MediaPlayerReport"));
const KPIReport = lazy(() => import("./pages/KPIReport"));
const SwapWizard = lazy(() => import("./pages/SwapWizard"));
const AssessmentLog = lazy(() => import("./pages/AssessmentLog"));
const RepairReport = lazy(() => import("./pages/RepairReport"));
const ClaimTracker = lazy(() => import("./pages/ClaimTracker"));
const DatabaseGuide = lazy(() => import("./pages/DatabaseGuide"));
const StockReconciliation = lazy(() => import("./pages/StockReconciliation"));
const ImportEquipmentPage = lazy(() => import("./pages/setup/ImportEquipmentPage"));
const ImportMediaPlayerPage = lazy(() => import("./pages/setup/ImportMediaPlayerPage"));
const ImportToolPage = lazy(() => import("./pages/setup/ImportToolPage"));
const ToolLoans = lazy(() => import("./pages/ToolLoans"));
const ToolLoansReport = lazy(() => import("./pages/ToolLoansReport"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ลดการ refetch ที่ไม่จำเป็น — ข้อมูลถือว่าสดอยู่ 1 นาที, อยู่ใน cache 5 นาที
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
    </div>
  </div>
);

// Helper เพื่อลดความซ้ำซ้อนของ wrapping
const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </DashboardLayout>
  </ProtectedRoute>
);

const Public = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/delivery-entry" element={<Protected><DeliveryEntry /></Protected>} />
            <Route path="/receive-goods" element={<Protected><ReceiveGoods /></Protected>} />
            <Route path="/goods-issue" element={<Protected><GoodsIssue /></Protected>} />
            <Route path="/issue-request" element={<Protected><IssueRequest /></Protected>} />
            <Route path="/issue-goods" element={<Protected><IssueGoods /></Protected>} />
            <Route path="/master-data" element={<Protected><MasterData /></Protected>} />
            <Route path="/billboards" element={<Protected><Billboards /></Protected>} />
            <Route path="/billboards/:id" element={<Protected><BillboardDetail /></Protected>} />
            <Route path="/admin" element={<Protected><Admin /></Protected>} />
            <Route path="/qr-code" element={<Protected><QRCodePage /></Protected>} />
            <Route path="/transfer-history" element={<Protected><TransferHistory /></Protected>} />
            <Route path="/pm-history" element={<Protected><PMHistory /></Protected>} />
            <Route path="/equipment-loans" element={<Protected><EquipmentLoans /></Protected>} />
            <Route path="/incomplete-issues" element={<Protected><IncompleteIssues /></Protected>} />
            <Route path="/billboard-issue-report" element={<Protected><BillboardIssueReport /></Protected>} />
            <Route path="/notification-settings" element={<Protected><NotificationSettingsPage /></Protected>} />
            <Route path="/dead-stock" element={<Protected><DeadStockReport /></Protected>} />
            <Route path="/purchase-requests" element={<Protected><PurchaseRequests /></Protected>} />
            <Route path="/waiting-stock" element={<Protected><WaitingStockRequests /></Protected>} />
            <Route path="/requester-dashboard" element={<Protected><RequesterDashboard /></Protected>} />
            <Route path="/user-manual" element={<Protected><UserManual /></Protected>} />
            <Route path="/document-search" element={<Protected><DocumentSearch /></Protected>} />
            <Route path="/testing" element={<Protected><Testing /></Protected>} />
            {/* Stock Movement Log merged into Stock Card - redirect */}
            <Route path="/stock-movement-log" element={<Protected><StockCard /></Protected>} />
            <Route path="/inventory-report" element={<Protected><InventoryReport /></Protected>} />
            <Route path="/tool-pm-tasks" element={<Protected><ToolPMTasks /></Protected>} />
            <Route path="/tool-pm-history" element={<Protected><ToolPMHistory /></Protected>} />
            <Route path="/tool-pm-report" element={<Protected><ToolPMReport /></Protected>} />
            <Route path="/tool-pm-schedule" element={<Protected><ToolPMSchedule /></Protected>} />
            <Route path="/tool-management" element={<Protected><ToolManagement /></Protected>} />
            <Route path="/pending-asset-codes" element={<Protected><PendingAssetCodes /></Protected>} />
            {/* Media Player Profile */}
            <Route path="/media-player/search" element={<Protected><MediaPlayerProfile /></Protected>} />
            <Route path="/media-player/:id" element={<Protected><MediaPlayerProfile /></Protected>} />
            <Route path="/media-player-report" element={<Protected><MediaPlayerReport /></Protected>} />
            <Route path="/swap" element={<Protected><SwapWizard /></Protected>} />
            <Route path="/assessment" element={<Protected><AssessmentLog /></Protected>} />
            <Route path="/repair-report" element={<Protected><RepairReport /></Protected>} />
            <Route path="/claims" element={<Protected><ClaimTracker /></Protected>} />
            <Route path="/ad-entry" element={<Protected><AdEntry /></Protected>} />
            <Route path="/ad-receive" element={<Protected><AdManagement /></Protected>} />
            <Route path="/ad-request" element={<Protected><AdRequest /></Protected>} />
            <Route path="/ad-issue" element={<Protected><AdIssue /></Protected>} />
            <Route path="/equipment-tracking" element={<Protected><EquipmentTrackingReport /></Protected>} />
            <Route path="/billboard-parts-availability" element={<Protected><BillboardPartsAvailability /></Protected>} />

            <Route path="/pm-billboard" element={<Protected><BillboardPMPage /></Protected>} />
            <Route path="/billboard-packages" element={<Protected><BillboardPackages /></Protected>} />
            <Route path="/defective-return" element={<Protected><DefectiveReturnEntry /></Protected>} />
            <Route path="/disposal-approval" element={<Protected><DisposalApproval /></Protected>} />
            <Route path="/stock-card" element={<Protected><StockCard /></Protected>} />
            <Route path="/kpi-report" element={<Protected><KPIReport /></Protected>} />
            <Route path="/stock-reconciliation" element={<Protected><StockReconciliation /></Protected>} />
            <Route path="/delivery-confirmation" element={<Protected><DeliveryConfirmation /></Protected>} />
            <Route path="/manager-approval" element={<Protected><ManagerApproval /></Protected>} />
            <Route path="/warehouse-planning" element={<Protected><WarehousePickupPlanning /></Protected>} />
            <Route path="/direct-shipping" element={<Protected><DirectShippingEntry /></Protected>} />
            <Route path="/direct-shipping-approval" element={<Protected><DirectShippingApproval /></Protected>} />
            <Route path="/direct-shipping-procurement" element={<Protected><DirectShippingProcurement /></Protected>} />
            <Route path="/database-guide" element={<Protected><DatabaseGuide /></Protected>} />
            <Route path="/setup/import-equipment" element={<Protected><ImportEquipmentPage /></Protected>} />
            <Route path="/setup/import-media-player" element={<Protected><ImportMediaPlayerPage /></Protected>} />
            <Route path="/setup/import-tools" element={<Protected><ImportToolPage /></Protected>} />
            <Route path="/tool-loans" element={<Protected><ToolLoans mode="all" /></Protected>} />
            <Route path="/tool-loans/request" element={<Protected><ToolLoans mode="request" /></Protected>} />
            <Route path="/tool-loans/issue" element={<Protected><ToolLoans mode="issue" /></Protected>} />
            <Route path="/tool-loans/return" element={<Protected><ToolLoans mode="return" /></Protected>} />
            <Route path="/tool-loans/report" element={<Protected><ToolLoansReport /></Protected>} />
            {/* Public billboard view - no auth required */}
            <Route path="/billboard-view/:id" element={<Public><BillboardPublicView /></Public>} />
            <Route path="/p/media-player/:id" element={<Public><MediaPlayerPublicView /></Public>} />
            <Route path="/ad-view/:token" element={<Public><AdPublicView /></Public>} />
            <Route path="/ad-contractor/:token" element={<Public><AdContractorView /></Public>} />
            <Route path="/ds-view/:id" element={<Public><DirectShippingPublicView /></Public>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
