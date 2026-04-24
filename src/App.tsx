import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// GoodsReceipt removed - replaced by DeliveryEntry + ReceiveGoods flow
import DeliveryEntry from "./pages/DeliveryEntry";
import ReceiveGoods from "./pages/ReceiveGoods";
import GoodsIssue from "./pages/GoodsIssue";
import IssueRequest from "./pages/IssueRequest";
import IssueGoods from "./pages/IssueGoods";
import MasterData from "./pages/MasterData";
import Billboards from "./pages/Billboards";
import BillboardDetail from "./pages/BillboardDetail";
import BillboardPublicView from "./pages/BillboardPublicView";
import Admin from "./pages/Admin";
import QRCodePage from "./pages/QRCode";
import TransferHistory from "./pages/TransferHistory";
import PMHistory from "./pages/PMHistory";
import EquipmentPMSchedule from "./pages/EquipmentPMSchedule";
import EquipmentPMHistory from "./pages/EquipmentPMHistory";
import EquipmentPMTasks from "./pages/EquipmentPMTasks";
import ToolPMTasks from "./pages/ToolPMTasks";
import ToolPMHistory from "./pages/ToolPMHistory";
import ToolPMSchedule from "./pages/ToolPMSchedule";
import ToolPMReport from "./pages/ToolPMReport";
import ToolManagement from "./pages/ToolManagement";
import EquipmentLoans from "./pages/EquipmentLoans";
import IncompleteIssues from "./pages/IncompleteIssues";
import BillboardIssueReport from "./pages/BillboardIssueReport";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import DeadStockReport from "./pages/DeadStockReport";
import PurchaseRequests from "./pages/PurchaseRequests";
import WaitingStockRequests from "./pages/WaitingStockRequests";
import RequesterDashboard from "./pages/RequesterDashboard";
import UserManual from "./pages/UserManual";
import DocumentSearch from "./pages/DocumentSearch";
import Testing from "./pages/Testing";
// StockMovementLog merged into StockCard
import InventoryReport from "./pages/InventoryReport";
import PendingAssetCodes from "./pages/PendingAssetCodes";
// MediaPlayerEntry is now embedded in MasterData
import AdManagement from "./pages/AdManagement";
import AdEntry from "./pages/AdEntry";
import AdRequest from "./pages/AdRequest";
import AdIssue from "./pages/AdIssue";
import AdPublicView from "./pages/AdPublicView";
import AdContractorView from "./pages/AdContractorView";
import EquipmentTrackingReport from "./pages/EquipmentTrackingReport";
import BillboardPMPage from "./pages/BillboardPMPage";
import DefectiveReturnEntry from "./pages/DefectiveReturnEntry";
import StockCard from "./pages/StockCard";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import ManagerApproval from "./pages/ManagerApproval";
import WarehousePickupPlanning from "./pages/WarehousePickupPlanning";
import DirectShippingEntry from "./pages/DirectShippingEntry";
import DirectShippingApproval from "./pages/DirectShippingApproval";
import DirectShippingProcurement from "./pages/DirectShippingProcurement";
import DirectShippingPublicView from "./pages/DirectShippingPublicView";
import BillboardPackages from "./pages/BillboardPackages";
import MediaPlayerProfile from "./pages/MediaPlayerProfile";
import MediaPlayerReport from "./pages/MediaPlayerReport";
import KPIReport from "./pages/KPIReport";
import SwapWizard from "./pages/SwapWizard";
import AssessmentLog from "./pages/AssessmentLog";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            {/* /goods-receipt removed - replaced by /delivery-entry + /receive-goods */}
            <Route path="/delivery-entry" element={<ProtectedRoute><DashboardLayout><DeliveryEntry /></DashboardLayout></ProtectedRoute>} />
            <Route path="/receive-goods" element={<ProtectedRoute><DashboardLayout><ReceiveGoods /></DashboardLayout></ProtectedRoute>} />
            <Route path="/goods-issue" element={<ProtectedRoute><DashboardLayout><GoodsIssue /></DashboardLayout></ProtectedRoute>} />
            <Route path="/issue-request" element={<ProtectedRoute><DashboardLayout><IssueRequest /></DashboardLayout></ProtectedRoute>} />
            <Route path="/issue-goods" element={<ProtectedRoute><DashboardLayout><IssueGoods /></DashboardLayout></ProtectedRoute>} />
            <Route path="/master-data" element={<ProtectedRoute><DashboardLayout><MasterData /></DashboardLayout></ProtectedRoute>} />
            <Route path="/billboards" element={<ProtectedRoute><DashboardLayout><Billboards /></DashboardLayout></ProtectedRoute>} />
            <Route path="/billboards/:id" element={<ProtectedRoute><DashboardLayout><BillboardDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><DashboardLayout><Admin /></DashboardLayout></ProtectedRoute>} />
            <Route path="/qr-code" element={<ProtectedRoute><DashboardLayout><QRCodePage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/transfer-history" element={<ProtectedRoute><DashboardLayout><TransferHistory /></DashboardLayout></ProtectedRoute>} />
            <Route path="/pm-history" element={<ProtectedRoute><DashboardLayout><PMHistory /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipment-pm-schedule" element={<ProtectedRoute><DashboardLayout><EquipmentPMSchedule /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipment-pm-history" element={<ProtectedRoute><DashboardLayout><EquipmentPMHistory /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipment-pm-tasks" element={<ProtectedRoute><DashboardLayout><EquipmentPMTasks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipment-loans" element={<ProtectedRoute><DashboardLayout><EquipmentLoans /></DashboardLayout></ProtectedRoute>} />
            <Route path="/incomplete-issues" element={<ProtectedRoute><DashboardLayout><IncompleteIssues /></DashboardLayout></ProtectedRoute>} />
            <Route path="/billboard-issue-report" element={<ProtectedRoute><DashboardLayout><BillboardIssueReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/notification-settings" element={<ProtectedRoute><DashboardLayout><NotificationSettingsPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dead-stock" element={<ProtectedRoute><DashboardLayout><DeadStockReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/purchase-requests" element={<ProtectedRoute><DashboardLayout><PurchaseRequests /></DashboardLayout></ProtectedRoute>} />
            <Route path="/waiting-stock" element={<ProtectedRoute><DashboardLayout><WaitingStockRequests /></DashboardLayout></ProtectedRoute>} />
            <Route path="/requester-dashboard" element={<ProtectedRoute><DashboardLayout><RequesterDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/user-manual" element={<ProtectedRoute><DashboardLayout><UserManual /></DashboardLayout></ProtectedRoute>} />
            <Route path="/document-search" element={<ProtectedRoute><DashboardLayout><DocumentSearch /></DashboardLayout></ProtectedRoute>} />
            <Route path="/testing" element={<ProtectedRoute><DashboardLayout><Testing /></DashboardLayout></ProtectedRoute>} />
            {/* Stock Movement Log merged into Stock Card - redirect */}
            <Route path="/stock-movement-log" element={<ProtectedRoute><DashboardLayout><StockCard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/inventory-report" element={<ProtectedRoute><DashboardLayout><InventoryReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-tasks" element={<ProtectedRoute><DashboardLayout><ToolPMTasks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-history" element={<ProtectedRoute><DashboardLayout><ToolPMHistory /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-report" element={<ProtectedRoute><DashboardLayout><ToolPMReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-schedule" element={<ProtectedRoute><DashboardLayout><ToolPMSchedule /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-management" element={<ProtectedRoute><DashboardLayout><ToolManagement /></DashboardLayout></ProtectedRoute>} />
            <Route path="/pending-asset-codes" element={<ProtectedRoute><DashboardLayout><PendingAssetCodes /></DashboardLayout></ProtectedRoute>} />
            {/* Media Player Profile */}
            <Route path="/media-player/search" element={<ProtectedRoute><DashboardLayout><MediaPlayerProfile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/media-player/:id" element={<ProtectedRoute><DashboardLayout><MediaPlayerProfile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/media-player-report" element={<ProtectedRoute><DashboardLayout><MediaPlayerReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/swap" element={<ProtectedRoute><DashboardLayout><SwapWizard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/assessment" element={<ProtectedRoute><DashboardLayout><AssessmentLog /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ad-entry" element={<ProtectedRoute><DashboardLayout><AdEntry /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ad-receive" element={<ProtectedRoute><DashboardLayout><AdManagement /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ad-request" element={<ProtectedRoute><DashboardLayout><AdRequest /></DashboardLayout></ProtectedRoute>} />
            <Route path="/ad-issue" element={<ProtectedRoute><DashboardLayout><AdIssue /></DashboardLayout></ProtectedRoute>} />
             <Route path="/equipment-tracking" element={<ProtectedRoute><DashboardLayout><EquipmentTrackingReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/pm-billboard" element={<ProtectedRoute><DashboardLayout><BillboardPMPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/billboard-packages" element={<ProtectedRoute><DashboardLayout><BillboardPackages /></DashboardLayout></ProtectedRoute>} />
            <Route path="/defective-return" element={<ProtectedRoute><DashboardLayout><DefectiveReturnEntry /></DashboardLayout></ProtectedRoute>} />
            <Route path="/stock-card" element={<ProtectedRoute><DashboardLayout><StockCard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/kpi-report" element={<ProtectedRoute><DashboardLayout><KPIReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/delivery-confirmation" element={<ProtectedRoute><DashboardLayout><DeliveryConfirmation /></DashboardLayout></ProtectedRoute>} />
            <Route path="/manager-approval" element={<ProtectedRoute><DashboardLayout><ManagerApproval /></DashboardLayout></ProtectedRoute>} />
            <Route path="/warehouse-planning" element={<ProtectedRoute><DashboardLayout><WarehousePickupPlanning /></DashboardLayout></ProtectedRoute>} />
            <Route path="/direct-shipping" element={<ProtectedRoute><DashboardLayout><DirectShippingEntry /></DashboardLayout></ProtectedRoute>} />
            <Route path="/direct-shipping-approval" element={<ProtectedRoute><DashboardLayout><DirectShippingApproval /></DashboardLayout></ProtectedRoute>} />
            <Route path="/direct-shipping-procurement" element={<ProtectedRoute><DashboardLayout><DirectShippingProcurement /></DashboardLayout></ProtectedRoute>} />
            {/* Public billboard view - no auth required */}
            <Route path="/billboard-view/:id" element={<BillboardPublicView />} />
            <Route path="/ad-view/:token" element={<AdPublicView />} />
            <Route path="/ad-contractor/:token" element={<AdContractorView />} />
            <Route path="/ds-view/:id" element={<DirectShippingPublicView />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
