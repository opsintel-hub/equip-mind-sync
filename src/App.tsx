import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GoodsReceipt from "./pages/GoodsReceipt";
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
import PMSchedule from "./pages/PMSchedule";
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
import StockMovementLog from "./pages/StockMovementLog";
import InventoryReport from "./pages/InventoryReport";
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
            <Route path="/goods-receipt" element={<ProtectedRoute><DashboardLayout><GoodsReceipt /></DashboardLayout></ProtectedRoute>} />
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
            <Route path="/pm-schedule" element={<ProtectedRoute><DashboardLayout><PMSchedule /></DashboardLayout></ProtectedRoute>} />
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
            <Route path="/stock-movement-log" element={<ProtectedRoute><DashboardLayout><StockMovementLog /></DashboardLayout></ProtectedRoute>} />
            <Route path="/inventory-report" element={<ProtectedRoute><DashboardLayout><InventoryReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-tasks" element={<ProtectedRoute><DashboardLayout><ToolPMTasks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-history" element={<ProtectedRoute><DashboardLayout><ToolPMHistory /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-report" element={<ProtectedRoute><DashboardLayout><ToolPMReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-pm-schedule" element={<ProtectedRoute><DashboardLayout><ToolPMSchedule /></DashboardLayout></ProtectedRoute>} />
            <Route path="/tool-management" element={<ProtectedRoute><DashboardLayout><ToolManagement /></DashboardLayout></ProtectedRoute>} />
            {/* Public billboard view - no auth required */}
            <Route path="/billboard-view/:id" element={<BillboardPublicView />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
