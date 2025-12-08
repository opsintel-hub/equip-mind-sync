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
import MasterData from "./pages/MasterData";
import Billboards from "./pages/Billboards";
import Admin from "./pages/Admin";
import QRCodePage from "./pages/QRCode";
import TransferHistory from "./pages/TransferHistory";
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
            <Route path="/master-data" element={<ProtectedRoute><DashboardLayout><MasterData /></DashboardLayout></ProtectedRoute>} />
            <Route path="/billboards" element={<ProtectedRoute><DashboardLayout><Billboards /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><DashboardLayout><Admin /></DashboardLayout></ProtectedRoute>} />
            <Route path="/qr-code" element={<ProtectedRoute><DashboardLayout><QRCodePage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/transfer-history" element={<ProtectedRoute><DashboardLayout><TransferHistory /></DashboardLayout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
