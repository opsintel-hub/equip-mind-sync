import React, { Suspense } from "react";
import { lazyRetry } from "@/lib/lazyRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import FunctionRouteGuard from "./components/FunctionRouteGuard";

// Eager: หน้าแรกที่เปิดบ่อย
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

// Lazy: ทุกหน้าใน app เพื่อลดขนาด initial bundle
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const DeliveryEntry = lazyRetry(() => import("./pages/DeliveryEntry"));
const ReceiveGoods = lazyRetry(() => import("./pages/ReceiveGoods"));
const GoodsIssue = lazyRetry(() => import("./pages/GoodsIssue"));
const IssueRequest = lazyRetry(() => import("./pages/IssueRequest"));
const IssueGoods = lazyRetry(() => import("./pages/IssueGoods"));
const MasterData = lazyRetry(() => import("./pages/MasterData"));
const Billboards = lazyRetry(() => import("./pages/Billboards"));
const BillboardDetail = lazyRetry(() => import("./pages/BillboardDetail"));
const BillboardPublicView = lazyRetry(() => import("./pages/BillboardPublicView"));
const Admin = lazyRetry(() => import("./pages/Admin"));
const QRCodePage = lazyRetry(() => import("./pages/QRCode"));
const TransferHistory = lazyRetry(() => import("./pages/TransferHistory"));
const PMHistory = lazyRetry(() => import("./pages/PMHistory"));
const ToolPMTasks = lazyRetry(() => import("./pages/ToolPMTasks"));
const ToolPMHistory = lazyRetry(() => import("./pages/ToolPMHistory"));
const ToolPMSchedule = lazyRetry(() => import("./pages/ToolPMSchedule"));
const ToolPMReport = lazyRetry(() => import("./pages/ToolPMReport"));
const ToolManagement = lazyRetry(() => import("./pages/ToolManagement"));
const EquipmentLoans = lazyRetry(() => import("./pages/EquipmentLoans"));
const IncompleteIssues = lazyRetry(() => import("./pages/IncompleteIssues"));
const BillboardIssueReport = lazyRetry(() => import("./pages/BillboardIssueReport"));
const NotificationSettingsPage = lazyRetry(() => import("./pages/NotificationSettingsPage"));
const DeadStockReport = lazyRetry(() => import("./pages/DeadStockReport"));
const PurchaseRequests = lazyRetry(() => import("./pages/PurchaseRequests"));
const WaitingStockRequests = lazyRetry(() => import("./pages/WaitingStockRequests"));
const RequesterDashboard = lazyRetry(() => import("./pages/RequesterDashboard"));
const UserManual = lazyRetry(() => import("./pages/UserManual"));
const DocumentSearch = lazyRetry(() => import("./pages/DocumentSearch"));
const Testing = lazyRetry(() => import("./pages/Testing"));
const InventoryReport = lazyRetry(() => import("./pages/InventoryReport"));
const PendingAssetCodes = lazyRetry(() => import("./pages/PendingAssetCodes"));
const AdManagement = lazyRetry(() => import("./pages/AdManagement"));
const AdEntry = lazyRetry(() => import("./pages/AdEntry"));
const AdRequest = lazyRetry(() => import("./pages/AdRequest"));
const AdIssue = lazyRetry(() => import("./pages/AdIssue"));
const AdPublicView = lazyRetry(() => import("./pages/AdPublicView"));
const AdContractorView = lazyRetry(() => import("./pages/AdContractorView"));
const EquipmentTrackingReport = lazyRetry(() => import("./pages/EquipmentTrackingReport"));
const BillboardPartsAvailability = lazyRetry(() => import("./pages/BillboardPartsAvailability"));

const BillboardPMPage = lazyRetry(() => import("./pages/BillboardPMPage"));
const DefectiveReturnEntry = lazyRetry(() => import("./pages/DefectiveReturnEntry"));
const DisposalApproval = lazyRetry(() => import("./pages/DisposalApproval"));
const DisposalReport = lazyRetry(() => import("./pages/DisposalReport"));
const AuditTrail = lazyRetry(() => import("./pages/AuditTrail"));
const StockCard = lazyRetry(() => import("./pages/StockCard"));
const DeliveryConfirmation = lazyRetry(() => import("./pages/DeliveryConfirmation"));
const ManagerApproval = lazyRetry(() => import("./pages/ManagerApproval"));
const WarehousePickupPlanning = lazyRetry(() => import("./pages/WarehousePickupPlanning"));
const DirectShippingEntry = lazyRetry(() => import("./pages/DirectShippingEntry"));
const DirectShippingApproval = lazyRetry(() => import("./pages/DirectShippingApproval"));
const DirectShippingProcurement = lazyRetry(() => import("./pages/DirectShippingProcurement"));
const DirectShippingPublicView = lazyRetry(() => import("./pages/DirectShippingPublicView"));
const BillboardPackages = lazyRetry(() => import("./pages/BillboardPackages"));
const MediaPlayerProfile = lazyRetry(() => import("./pages/MediaPlayerProfile"));
const MediaPlayerPublicView = lazyRetry(() => import("./pages/MediaPlayerPublicView"));
const MediaPlayerReport = lazyRetry(() => import("./pages/MediaPlayerReport"));
const KPIReport = lazyRetry(() => import("./pages/KPIReport"));
const SwapWizard = lazyRetry(() => import("./pages/SwapWizard"));
const AssessmentLog = lazyRetry(() => import("./pages/AssessmentLog"));
const RepairReport = lazyRetry(() => import("./pages/RepairReport"));
const ClaimTracker = lazyRetry(() => import("./pages/ClaimTracker"));
const DatabaseGuide = lazyRetry(() => import("./pages/DatabaseGuide"));
const StockReconciliation = lazyRetry(() => import("./pages/StockReconciliation"));
const ImportEquipmentPage = lazyRetry(() => import("./pages/setup/ImportEquipmentPage"));
const ImportMediaPlayerPage = lazyRetry(() => import("./pages/setup/ImportMediaPlayerPage"));
const ImportToolPage = lazyRetry(() => import("./pages/setup/ImportToolPage"));
const ToolLoans = lazyRetry(() => import("./pages/ToolLoans"));
const ToolLoansReport = lazyRetry(() => import("./pages/ToolLoansReport"));

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
      <FunctionRouteGuard>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </FunctionRouteGuard>
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
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/disposal-report" element={<Protected><DisposalReport /></Protected>} />
            <Route path="/audit-trail" element={<Protected><AuditTrail /></Protected>} />
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
            <Route path="/tool-loans/receive-return" element={<Protected><ToolLoans mode="receive-return" /></Protected>} />
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
